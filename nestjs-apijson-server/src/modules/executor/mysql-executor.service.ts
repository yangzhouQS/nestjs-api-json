import { Injectable, Logger } from '@nestjs/common';
import { BuildResult, ExecuteResult, Query, QueryExecuteResult } from '@/interfaces/apijson-request.interface';
import { DatabaseService } from '@/modules/database/database.service';
import { TableOperation, QueryType } from '@/types/request-method.type';

/**
 * MySQL 执行器服务
 * 负责执行 MySQL SQL 查询并处理结果
 */
@Injectable()
export class MySQLExecutorService {
  private readonly logger = new Logger(MySQLExecutorService.name);

  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * 执行 SQL 查询
   * @param buildResult 构建结果
   * @returns 执行结果
   */
  async execute(buildResult: BuildResult): Promise<ExecuteResult> {
    this.logger.log('开始执行 MySQL SQL 查询');

    const data: { [key: string]: any } = {};
    
    // 确定查询顺序：主表（无引用）优先，关联表（有引用）后执行
    const queryOrder = this.determineQueryOrder(buildResult.queries);
    
    // 按顺序执行查询
    for (const query of queryOrder) {
      // 解析引用
      const resolvedQuery = this.resolveReferences(query, data);
      const result = await this.executeQuery(resolvedQuery);
      data[query.table] = result;
    }

    const result: ExecuteResult = {
      data,
      directives: buildResult.directives,
      original: buildResult,
    };

    this.logger.log('MySQL SQL 预警执行完成');
    return result;
  }

  /**
   * 确定查询顺序
   * 主表（无引用）优先，关联表（有引用）后执行
   */
  private determineQueryOrder(queries: Query[]): Query[] {
    const mainQueries: Query[] = [];
    const refQueries: Query[] = [];

    for (const query of queries) {
      const hasReferences = this.hasReferences(query);
      if (hasReferences) {
        refQueries.push(query);
      } else {
        mainQueries.push(query);
      }
    }

    return [...mainQueries, ...refQueries];
  }

  /**
   * 检查查询是否有引用
   */
  private hasReferences(query: Query): boolean {
    if (!query.params) {
      return false;
    }

    return query.params.some(param =>
      param && typeof param === 'object' && param._reference
    );
  }

  /**
   * 解析引用
   * 从已执行的查询结果中提取引用值
   */
  private resolveReferences(query: Query, executedData: { [key: string]: any }): Query {
    if (!this.hasReferences(query)) {
      return query;
    }

    const resolvedParams: any[] = [];
    const resolvedQuery = { ...query, params: resolvedParams };

    for (const param of query.params) {
      if (param && typeof param === 'object' && param._reference) {
        // 解析引用路径
        const value = this.extractReferenceValue(param._reference, executedData);
        resolvedParams.push(value);
      } else {
        resolvedParams.push(param);
      }
    }

    return resolvedQuery;
  }

  /**
   * 从引用路径提取值
   * 支持格式：/table/field, []/table/field
   */
  private extractReferenceValue(referencePath: string, executedData: { [key: string]: any }): any {
    this.logger.debug(`解析引用路径: ${referencePath}`);

    // 解析引用路径
    const match = referencePath.match(/^(\[\])?\/(\w+)\/(\w+)$/);
    if (!match) {
      throw new Error(`无效的引用路径: ${referencePath}`);
    }

    const [, isArray, tableName, fieldName] = match;

    // 获取表的数据
    const tableData = executedData[tableName];
    if (!tableData) {
      throw new Error(`引用的表不存在: ${tableName}`);
    }

    // 提取字段值
    if (isArray) {
      // 数组引用：提取所有记录的字段值
      const rows = tableData.data || [];
      const values = rows.map((row: any) => row[fieldName]);
      this.logger.debug(`数组引用提取: ${tableName}.${fieldName} = [${values.join(', ')}]`);
      return values;
    } else {
      // 单值引用：提取第一条记录的字段值
      const rows = tableData.data || [];
      if (rows.length === 0) {
        throw new Error(`表 ${tableName} 没有数据`);
      }
      const value = rows[0][fieldName];
      this.logger.debug(`单值引用提取: ${tableName}.${fieldName} = ${value}`);
      return value;
    }
  }

  /**
   * 执行查询
   * @param query 查询对象
   * @returns 查询执行结果
   */
  private async executeQuery(query: Query): Promise<QueryExecuteResult> {
    this.logger.log(`执行查询: ${query.sql}, 参数: ${JSON.stringify(query.params)}`);

    try {
      // 根据操作类型执行不同的查询
      // 使用 type 字段作为操作类型（与接口定义一致）
      const operation = query.type || query.operation;
      
      if (!operation) {
        throw new Error(`查询操作类型未定义: ${query.table}`);
      }
      
      switch (operation) {
        case TableOperation.SELECT:
          return await this.executeSelect(query);
        case TableOperation.INSERT:
          return await this.executeInsert(query);
        case TableOperation.UPDATE:
          return await this.executeUpdate(query);
        case TableOperation.DELETE:
          return await this.executeDelete(query);
        case TableOperation.COUNT:
          return await this.executeCount(query);
        default:
          throw new Error(`不支持的表操作类型: ${operation}`);
      }
    } catch (error) {
      this.logger.error(`查询执行失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 执行 SELECT 查询
   */
  private async executeSelect(query: Query): Promise<QueryExecuteResult> {
    this.logger.debug(`执行 SELECT 查询: ${query.table}`);

    // 检查是否需要查询总数
    const queryType = query.query as any;
    const needTotal = queryType === QueryType.DATA_AND_COUNT || queryType === QueryType.COUNT_ONLY;
    
    let data: any[] = [];
    let total = 0;
    let count = 0;

    if (needTotal) {
      // 执行 COUNT 查询
      const countSql = this.buildCountSql(query.sql);
      const countResult = await this.databaseService.query(countSql, query.params);
      total = this.extractCount(countResult);
    }

    if (queryType !== QueryType.COUNT_ONLY) {
      // 执行数据查询
      const result = await this.databaseService.query(query.sql, query.params);
      data = this.extractRows(result);
      count = data.length;
    }

    // 处理 JOIN 查询结果
    if (query.joins && query.joins.length > 0) {
      data = this.processJoinResults(data, query);
    }

    return {
      data,
      total,
      count,
    };
  }

  /**
   * 执行 INSERT 查询
   */
  private async executeInsert(query: Query): Promise<QueryExecuteResult> {
    this.logger.debug(`执行 INSERT 查询: ${query.table}`);
    this.logger.debug(`SQL: ${query.sql}`);
    this.logger.debug(`参数: ${JSON.stringify(query.params)}`);
    this.logger.debug(`query.data 类型: ${typeof query.data}`);
    this.logger.debug(`query.data 是否为数组: ${Array.isArray(query.data)}`);
    this.logger.debug(`query.data 内容: ${JSON.stringify(query.data)}`);
    this.logger.debug(`query.data 长度: ${Array.isArray(query.data) ? query.data.length : 'N/A'}`);

    const result = await this.databaseService.query(query.sql, query.params);
    const insertId = this.extractInsertId(result);
    const affectedRows = this.extractAffectedRows(result);

    this.logger.debug(`执行结果: insertId=${insertId}, affectedRows=${affectedRows}`);
    this.logger.debug(`完整结果: ${JSON.stringify(result)}`);

    // 如果是批量插入，使用insertId和affectedRows查询
    if (Array.isArray(query.data) && query.data.length > 1) {
      this.logger.debug(`✅ 检测到批量插入: ${query.data.length} 条记录`);
      this.logger.debug(`insertId: ${insertId}, affectedRows: ${affectedRows}`);
      
      // 查询从insertId开始的affectedRows条记录
      const insertedData = await this.queryInsertedRecordsByIdRange(
        query.table,
        insertId,
        affectedRows
      );

      this.logger.debug(`查询结果数量: ${insertedData.length}`);
      this.logger.debug(`查询结果: ${JSON.stringify(insertedData)}`);

      return {
        data: insertedData,
        total: insertedData.length,
        count: insertedData.length,
      };
    }

    this.logger.debug(`❌ 未检测到批量插入，执行单条插入逻辑`);
    // 单条插入，查询插入的完整记录
    const insertedData = await this.queryInsertedRecords(query.table, [insertId]);

    return {
      data: insertedData,
      total: 1,
      count: 1,
    };
  }

  /**
   * 查询插入的记录
   * @param table 表名
   * @param ids 插入的 ID 列表
   * @returns 插入的完整记录
   */
  private async queryInsertedRecords(table: string, ids: number[]): Promise<any[]> {
    this.logger.debug(`查询插入的记录: ${table}, IDs: ${ids.join(', ')}`);

    if (ids.length === 0) {
      return [];
    }

    // 构建 SELECT 查询，获取所有字段
    const placeholders = ids.map(() => '?').join(',');
    const sql = `SELECT * FROM \`${table}\` WHERE id IN (${placeholders})`;
    
    try {
      const result = await this.databaseService.query(sql, ids);
      const rows = this.extractRows(result);
      
      this.logger.debug(`查询到 ${rows.length} 条记录`);
      return rows;
    } catch (error) {
      this.logger.error(`查询插入记录失败: ${error.message}`, error.stack);
      // 如果查询失败，返回包含 ID 的原始数据
      return ids.map(id => ({ id }));
    }
  }

  /**
   * 根据ID范围查询插入的记录
   * @param table 表名
   * @param startId 起始ID
   * @param count 记录数量
   * @returns 插入的完整记录
   */
  private async queryInsertedRecordsByIdRange(table: string, startId: number, count: number): Promise<any[]> {
    this.logger.debug(`根据ID范围查询插入的记录: ${table}, 起始ID: ${startId}, 数量: ${count}`);

    if (count <= 0 || startId <= 0) {
      this.logger.warn(`无效的查询参数: count=${count}, startId=${startId}`);
      return [];
    }

    // 计算 endId
    const endId = startId + count - 1;

    // 构建 SELECT 查询，获取指定ID范围的记录
    const sql = `SELECT * FROM \`${table}\` WHERE id BETWEEN ? AND ? ORDER BY id ASC`;
    
    this.logger.debug(`查询SQL: ${sql}`);
    this.logger.debug(`查询参数: [${startId}, ${endId}]`);
    
    try {
      const result = await this.databaseService.query(sql, [startId, endId]);
      const rows = this.extractRows(result);
      
      this.logger.debug(`查询到 ${rows.length} 条记录`);
      
      // 如果查询到的记录数量少于期望数量，尝试使用LIMIT查询
      if (rows.length < count) {
        this.logger.warn(`查询到的记录数(${rows.length})少于期望数(${count})，尝试使用LIMIT查询`);
        const fallbackSql = `SELECT * FROM \`${table}\` WHERE id >= ? ORDER BY id ASC LIMIT ?`;
        const fallbackResult = await this.databaseService.query(fallbackSql, [startId, count]);
        const fallbackRows = this.extractRows(fallbackResult);
        this.logger.debug(`备用查询到 ${fallbackRows.length} 条记录`);
        return fallbackRows;
      }
      
      return rows;
    } catch (error) {
      this.logger.error(`根据ID范围查询插入记录失败: ${error.message}`, error.stack);
      // 如果查询失败，返回空数组
      return [];
    }
  }

  /**
   * 执行 UPDATE 查询
   */
  private async executeUpdate(query: Query): Promise<QueryExecuteResult> {
    this.logger.debug(`执行 UPDATE 查询: ${query.table}`);

    const result = await this.databaseService.query(query.sql, query.params);
    const affectedRows = this.extractAffectedRows(result);

    // 如果是批量更新，返回更新后的数据
    if (Array.isArray(query.data)) {
      return {
        data: query.data,
        total: query.data.length,
        count: query.data.length,
      };
    }

    // 单条更新，查询更新后的完整记录
    // 从 where 条件中提取 id（因为解析器将 id 从 data 中分离到 where）
    let recordId: number | undefined;
    
    // 优先从 where 条件中查找 id
    if (query.where && query.where.id !== undefined) {
      recordId = query.where.id;
    }
    // 如果 where 中没有，尝试从 data 中查找
    else if (query.data && query.data.id !== undefined) {
      recordId = query.data.id;
    }

    if (recordId !== undefined) {
      try {
        const updatedData = await this.queryUpdatedRecord(query.table, recordId);
        return {
          data: updatedData,
          total: 1,
          count: 1,
        };
      } catch (error) {
        this.logger.error(`查询更新后的记录失败: ${error.message}`, error.stack);
        // 如果查询失败，返回原始数据
        return {
          data: [query.data],
          total: 1,
          count: 1,
        };
      }
    }

    // 单条更新，没有 id，返回原始数据
    return {
      data: [query.data],
      total: 1,
      count: 1,
    };
  }

  /**
   * 查询更新后的记录
   * @param table 表名
   * @param id 记录 ID
   * @returns 更新后的完整记录
   */
  private async queryUpdatedRecord(table: string, id: number): Promise<any[]> {
    this.logger.debug(`查询更新后的记录: ${table}, ID: ${id}`);

    const sql = `SELECT * FROM \`${table}\` WHERE id = ?`;
    
    try {
      const result = await this.databaseService.query(sql, [id]);
      const rows = this.extractRows(result);
      return rows;
    } catch (error) {
      this.logger.error(`查询更新后的记录失败: ${error.message}`, error.stack);
      return [{ id }];
    }
  }

  /**
   * 执行 DELETE 查询
   */
  private async executeDelete(query: Query): Promise<QueryExecuteResult> {
    this.logger.debug(`执行 DELETE 查询: ${query.table}`);

    const result = await this.databaseService.query(query.sql, query.params);
    const affectedRows = this.extractAffectedRows(result);

    return {
      data: [],
      total: affectedRows,
      count: affectedRows,
    };
  }

  /**
   * 执行 COUNT 查询
   */
  private async executeCount(query: Query): Promise<QueryExecuteResult> {
    this.logger.debug(`执行 COUNT 查询: ${query.table}`);

    const result = await this.databaseService.query(query.sql, query.params);
    const count = this.extractCount(result);

    return {
      data: [{ count }],
      total: count,
      count: 1,
    };
  }

  /**
   * 执行事务
   * @param queries 查询数组
   * @returns 执行结果数组
   */
  async executeTransaction(queries: Query[]): Promise<QueryExecuteResult[]> {
    this.logger.log(`开始执行事务，查询数量: ${queries.length}`);

    const sqlQueries = queries.map(q => ({
      sql: q.sql,
      params: q.params,
    }));

    try {
      const results = await this.databaseService.executeTransaction(sqlQueries);
      
      // 处理每个查询的结果
      const executeResults = queries.map((query, index) => {
        const result = results[index];
        const rows = this.extractRows(result);
        const affectedRows = this.extractAffectedRows(result);
        const insertId = this.extractInsertId(result);

        return {
          data: rows,
          total: rows.length || affectedRows,
          count: rows.length,
        };
      });

      this.logger.log('事务执行成功');
      return executeResults;
    } catch (error) {
      this.logger.error(`事务执行失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 构建 COUNT SQL
   */
  private buildCountSql(sql: string): string {
    // 将 SELECT 字段替换为 COUNT(*)
    const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM/i);
    if (selectMatch) {
      return sql.replace(selectMatch[1], 'COUNT(*)');
    }
    return sql;
  }

  /**
   * 提取查询结果行
   */
  private extractRows(result: any): any[] {
    if (Array.isArray(result)) {
      return result;
    }

    if (result && result.rows) {
      return Array.isArray(result.rows) ? result.rows : [];
    }

    return [];
  }

  /**
   * 提取影响的行数
   */
  private extractAffectedRows(result: any): number {
    if (result && result.affectedRows !== undefined) {
      return result.affectedRows;
    }

    if (result && result.rowCount !== undefined) {
      return result.rowCount;
    }

    return 0;
  }

  /**
   * 提取插入的 ID
   */
  private extractInsertId(result: any): number {
    if (result && result.insertId !== undefined) {
      return result.insertId;
    }

    if (result && result.rows && result.rows[0] && result.rows[0].insertId !== undefined) {
      return result.rows[0].insertId;
    }

    return 0;
  }

  /**
   * 提取 COUNT 结果
   */
  private extractCount(result: any): number {
    const rows = this.extractRows(result);
    
    if (rows.length > 0) {
      // 查找 count 字段
      if (rows[0].count !== undefined) {
        return rows[0].count;
      }
      
      // 查找 COUNT(*) 字段
      const countKey = Object.keys(rows[0]).find(key => 
        key.toLowerCase().includes('count')
      );
      if (countKey) {
        return rows[0][countKey];
      }
    }

    return 0;
  }

  /**
   * 处理 JOIN 查询结果
   */
  private processJoinResults(data: any[], query: Query): any[] {
    if (!query.joins || query.joins.length === 0) {
      return data;
    }

    // 处理 JOIN 结果，将关联表的数据合并到主表
    return data.map(row => {
      const processedRow = { ...row };

      // 处理每个 JOIN
      for (const join of query.joins) {
        const joinTable = join.table;
        
        // 查找关联表的数据
        const joinData = data.filter(r => r._joinTable === joinTable);
        
        if (joinData.length > 0) {
          processedRow[joinTable] = joinData;
        }
      }

      return processedRow;
    });
  }

  /**
   * 测试数据库连接
   */
  async testConnection(): Promise<boolean> {
    this.logger.debug('测试数据库连接');
    
    try {
      return await this.databaseService.testConnection();
    } catch (error) {
      this.logger.error(`数据库连接测试失败: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 获取数据库版本
   */
  async getDatabaseVersion(): Promise<string> {
    this.logger.debug('获取数据库版本');
    
    try {
      return await this.databaseService.getDatabaseVersion();
    } catch (error) {
      this.logger.error(`获取数据库版本失败: ${error.message}`, error.stack);
      return 'unknown';
    }
  }

  /**
   * 获取数据库大小
   */
  async getDatabaseSize(): Promise<{ database: string; size: number; unit: string }> {
    this.logger.debug('获取数据库大小');
    
    try {
      return await this.databaseService.getDatabaseSize();
    } catch (error) {
      this.logger.error(`获取数据库大小失败: ${error.message}`, error.stack);
      return {
        database: 'unknown',
        size: 0,
        unit: 'MB',
      };
    }
  }
}
