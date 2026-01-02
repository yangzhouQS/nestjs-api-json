import { Injectable, Logger } from '@nestjs/common';
import { ParseResult, BuildResult, Query, TableQuery } from '@/interfaces/apijson-request.interface';
import { 
  TableOperation, 
  JoinType,
  SortDirection 
} from '@/types/request-method.type';

/**
 * MySQL SQL 构建器服务
 * 负责将解析结果转换为 MySQL SQL 语句
 */
@Injectable()
export class MySQLBuilderService {
  private readonly logger = new Logger(MySQLBuilderService.name);

  /**
   * 构建 SQL 查询
   * @param parseResult 解析结果
   * @returns 构建结果
   */
  async build(parseResult: ParseResult): Promise<BuildResult> {
    this.logger.log('开始构建 MySQL SQL 查询');

    const queries: Query[] = [];

    // 构建表查询
    for (const [tableName, tableQuery] of Object.entries(parseResult.tables)) {
      const query = await this.buildTableQuery(tableName, tableQuery);
      queries.push(query);
    }

    const result: BuildResult = {
      queries,
      directives: parseResult.directives,
      original: parseResult,
    };

    this.logger.log(`MySQL SQL 查询构建完成，查询数量: ${queries.length}`);
    return result;
  }

  /**
   * 构建表查询
   */
  private async buildTableQuery(tableName: string, tableQuery: TableQuery): Promise<Query> {
    this.logger.log(`构建表查询: ${tableName}, 操作: ${tableQuery.operation}`);

    let sql = '';
    let params: any[] = [];

    // 根据操作类型构建 SQL
    const operation = tableQuery.operation;
    
    if (!operation) {
      throw new Error(`表操作类型未定义: ${tableName}`);
    }
    
    switch (operation) {
      case TableOperation.SELECT:
        const selectResult = this.buildSelectQuery(tableName, tableQuery);
        sql = selectResult.sql;
        params = selectResult.params;
        break;

      case TableOperation.INSERT:
        const insertResult = this.buildInsertQuery(tableName, tableQuery);
        sql = insertResult.sql;
        params = insertResult.params;
        break;

      case TableOperation.UPDATE:
        const updateResult = this.buildUpdateQuery(tableName, tableQuery);
        sql = updateResult.sql;
        params = updateResult.params;
        break;

      case TableOperation.DELETE:
        const deleteResult = this.buildDeleteQuery(tableName, tableQuery);
        sql = deleteResult.sql;
        params = deleteResult.params;
        break;

      case TableOperation.COUNT:
        const countResult = this.buildCountQuery(tableName, tableQuery);
        sql = countResult.sql;
        params = countResult.params;
        break;

      default:
        throw new Error(`不支持的表操作类型: ${operation}`);
    }

    return {
      table: tableName,
      operation: tableQuery.operation,
      type: operation, // 使用已验证的 operation 变量
      columns: tableQuery.columns,
      where: tableQuery.where,
      joins: tableQuery.joins,
      group: tableQuery.group,
      having: tableQuery.having,
      order: tableQuery.order,
      limit: tableQuery.limit,
      offset: tableQuery.offset,
      sql,
      params,
      references: tableQuery.references, // 传递引用字段映射
    };
  }

  /**
   * 构建 SELECT 查询
   */
  private buildSelectQuery(tableName: string, tableQuery: TableQuery): { sql: string; params: any[] } {
    const params: any[] = [];

    // 构建 SELECT 子句
    const selectClause = this.buildSelectClause(tableQuery.columns, tableName);

    // 构建 FROM 子句
    const fromClause = `\`${tableName}\``;

    // 构建 JOIN 子句
    const joinResult = this.buildJoinClause(tableQuery.joins, tableName);
    const joinClause = joinResult.join;
    params.push(...joinResult.params);

    // 构建 WHERE 子句（传递 references 参数）
    const whereResult = this.buildWhereClause(tableQuery.where, tableQuery.references);
    const whereClause = whereResult.where;
    params.push(...whereResult.params);

    // 构建 GROUP BY 子句
    const groupByClause = this.buildGroupByClause(tableQuery.group);

    // 构建 HAVING 子句
    const havingResult = this.buildHavingClause(tableQuery.having);
    const havingClause = havingResult.having;
    params.push(...havingResult.params);

    // 构建 ORDER BY 子句
    const orderByClause = this.buildOrderByClause(tableQuery.order);

    // 构建 LIMIT 子句
    const limitClause = this.buildLimitClause(tableQuery.limit);

    // 构建 OFFSET 子句
    const offsetClause = this.buildOffsetClause(tableQuery.offset);

    // 组合 SQL
    const sql = [
      'SELECT',
      selectClause,
      'FROM',
      fromClause,
      joinClause,
      whereClause,
      groupByClause,
      havingClause,
      orderByClause,
      limitClause,
      offsetClause,
    ]
      .filter(clause => clause.trim() !== '')
      .join(' ');

    return { sql, params };
  }

  /**
   * 构建 INSERT 查询
   */
  private buildInsertQuery(tableName: string, tableQuery: TableQuery): { sql: string; params: any[] } {
    const params: any[] = [];

    // 提取要插入的数据（排除指令和特殊字段）
    const data = this.extractInsertData(tableQuery.data);

    if (Array.isArray(data)) {
      // 批量插入
      const columns = Object.keys(data[0]).filter(col => !col.startsWith('@'));
      const values = data.map(row => {
        const rowValues = columns.map(col => row[col]);
        params.push(...rowValues);
        return `(${columns.map(() => '?').join(', ')})`;
      }).join(', ');

      const sql = `INSERT INTO \`${tableName}\` (\`${columns.join('`,`')}\`) VALUES ${values}`;
      return { sql, params };
    } else {
      // 单条插入
      const columns = Object.keys(data).filter(col => !col.startsWith('@'));
      const values = columns.map(col => data[col]);
      params.push(...values);

      const sql = `INSERT INTO \`${tableName}\` (\`${columns.join('`,`')}\`) VALUES (${columns.map(() => '?').join(', ')})`;
      return { sql, params };
    }
  }

  /**
   * 构建 UPDATE 查询
   */
  private buildUpdateQuery(tableName: string, tableQuery: TableQuery): { sql: string; params: any[] } {
    const params: any[] = [];

    // 提取要更新的数据
    const data = this.extractUpdateData(tableQuery.data);

    // 构建 SET 子句
    const setClause = Object.keys(data)
      .filter(col => !col.startsWith('@') && col !== 'id')
      .map(col => {
        params.push(data[col]);
        return `\`${col}\` = ?`;
      })
      .join(', ');

    // 构建 WHERE 子句（传递 references 参数）
    const whereResult = this.buildWhereClause(tableQuery.where, tableQuery.references);
    const whereClause = whereResult.where;
    params.push(...whereResult.params);

    // 确保在 WHERE 前添加空格（如果 whereClause 不为空）
    const sql = `UPDATE \`${tableName}\` SET ${setClause}${whereClause ? ' ' + whereClause : ''}`;
    return { sql, params };
  }

  /**
   * 构建 DELETE 查询
   */
  private buildDeleteQuery(tableName: string, tableQuery: TableQuery): { sql: string; params: any[] } {
    const params: any[] = [];

    // 构建 WHERE 子句（传递 references 参数）
    const whereResult = this.buildWhereClause(tableQuery.where, tableQuery.references);
    const whereClause = whereResult.where;
    params.push(...whereResult.params);

    const sql = `DELETE FROM \`${tableName}\`${whereClause}`;
    return { sql, params };
  }

  /**
   * 构建 COUNT 查询
   */
  private buildCountQuery(tableName: string, tableQuery: TableQuery): { sql: string; params: any[] } {
    const params: any[] = [];

    // 构建 COUNT 子句
    const countClause = tableQuery.columns && tableQuery.columns.length > 0 && tableQuery.columns[0] !== '*'
      ? tableQuery.columns[0]
      : 'COUNT(*)';

    // 构建 FROM 子句
    const fromClause = `\`${tableName}\``;

    // 构建 JOIN 子句
    const joinResult = this.buildJoinClause(tableQuery.joins, tableName);
    const joinClause = joinResult.join;
    params.push(...joinResult.params);

    // 构建 WHERE 子句（传递 references 参数）
    const whereResult = this.buildWhereClause(tableQuery.where, tableQuery.references);
    const whereClause = whereResult.where;
    params.push(...whereResult.params);

    // 构建 GROUP BY 子句
    const groupByClause = this.buildGroupByClause(tableQuery.group);

    // 构建 HAVING 子句
    const havingResult = this.buildHavingClause(tableQuery.having);
    const havingClause = havingResult.having;
    params.push(...havingResult.params);

    const sql = [
      'SELECT',
      countClause,
      'FROM',
      fromClause,
      joinClause,
      whereClause,
      groupByClause,
      havingClause,
    ]
      .filter(clause => clause.trim() !== '')
      .join(' ');

    return { sql, params };
  }

  /**
   * 构建 SELECT 子句
   */
  private buildSelectClause(columns: string[], tableName: string): string {
    if (!columns || columns.length === 0 || columns[0] === '*') {
      return '*';
    }

    return columns.map(col => {
      // 检查是否为聚合函数
      if (this.isAggregateFunction(col)) {
        return col;
      }
      return `\`${tableName}\`.\`${col}\``;
    }).join(', ');
  }

  /**
   * 构建 JOIN 子句
   */
  private buildJoinClause(joins: any[], tableName: string): { join: string; params: any[] } {
    if (!joins || joins.length === 0) {
      return { join: '', params: [] };
    }

    const params: any[] = [];
    const joinClauses = joins.map(join => {
      const joinType = this.getJoinType(join.type);
      const joinTable = `\`${join.table}\``;
      const joinOn = this.buildJoinOnCondition(join.on, tableName, join.table, params);
      return `${joinType} JOIN ${joinTable} ON ${joinOn}`;
    });

    return { join: joinClauses.join(' '), params };
  }

  /**
   * 构建 JOIN ON 条件
   */
  private buildJoinOnCondition(on: any, mainTable: string, joinTable: string, params: any[]): string {
    if (typeof on === 'string') {
      // 解析字符串格式的 JOIN 条件，如 "id@/User/id"
      const match = on.match(/^(\w+)@\/(\w+)\/(\w+)$/);
      if (match) {
        const [, joinField, refTable, refField] = match;
        return `\`${mainTable}\`.\`${joinField}\` = \`${refTable}\`.\`${refField}\``;
      }
      return on;
    }

    if (typeof on === 'object') {
      // 解析对象格式的 JOIN 条件
      const conditions = Object.entries(on).map(([key, value]) => {
        params.push(value);
        return `\`${mainTable}\`.\`${key}\` = \`${joinTable}\`.\`${value}\``;
      });
      return conditions.join(' AND ');
    }

    return '';
  }

  /**
   * 获取 JOIN 类型
   */
  private getJoinType(type: string): string {
    switch (type) {
      case 'APP':
        return 'LEFT'; // APP JOIN 使用 LEFT JOIN 实现
      case 'INNER':
        return 'INNER';
      case 'FULL':
        return 'FULL';
      case 'LEFT':
        return 'LEFT';
      case 'RIGHT':
        return 'RIGHT';
      case 'OUTER':
        return 'LEFT OUTER';
      case 'SIDE':
        return 'LEFT';
      case 'ANTI':
        return 'LEFT';
      case 'FOREIGN':
        return 'INNER';
      case 'ASOF':
        return 'INNER';
      default:
        return 'INNER';
    }
  }

  /**
   * 构建 WHERE 子句
   */
  private buildWhereClause(where: any, references?: { [key: string]: string }): { where: string; params: any[] } {
    if (!where || Object.keys(where).length === 0) {
      return { where: '', params: [] };
    }

    const params: any[] = [];
    const conditions = this.buildConditions(where, params, references);
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return { where: whereClause, params };
  }

  /**
   * 构建条件
   */
  private buildConditions(conditions: any, params: any[], references?: { [key: string]: string }): string[] {
    const result: string[] = [];

    for (const [key, value] of Object.entries(conditions)) {
      // 检查是否为引用字段
      if (references && references[key]) {
        // 引用字段，使用特殊标记
        result.push(`\`${key}\` = ?`);
        params.push({ _reference: references[key] }); // 使用特殊对象标记引用
        continue;
      }

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // 处理对象条件
        for (const [operator, operand] of Object.entries(value)) {
          const condition = this.buildCondition(key, operator, operand, params);
          if (condition) {
            result.push(condition);
          }
        }
      } else {
        // 处理简单条件（等于）
        const condition = this.buildCondition(key, '$eq', value, params);
        if (condition) {
          result.push(condition);
        }
      }
    }

    return result;
  }

  /**
   * 构建单个条件
   */
  private buildCondition(key: string, operator: string, operand: any, params: any[]): string | null {
    const fieldName = key.endsWith('@') ? key.slice(0, -1) : key;
    const quotedField = `\`${fieldName}\``;

    switch (operator) {
      case '$eq':
        params.push(operand);
        return `${quotedField} = ?`;

      case '$ne':
        params.push(operand);
        return `${quotedField} != ?`;

      case '$gt':
        params.push(operand);
        return `${quotedField} > ?`;

      case '$gte':
        params.push(operand);
        return `${quotedField} >= ?`;

      case '$lt':
        params.push(operand);
        return `${quotedField} < ?`;

      case '$lte':
        params.push(operand);
        return `${quotedField} <= ?`;

      case '$in':
        if (Array.isArray(operand)) {
          const placeholders = operand.map(() => '?').join(', ');
          params.push(...operand);
          return `${quotedField} IN (${placeholders})`;
        }
        return null;

      case '$nin':
        if (Array.isArray(operand)) {
          const placeholders = operand.map(() => '?').join(', ');
          params.push(...operand);
          return `${quotedField} NOT IN (${placeholders})`;
        }
        return null;

      case '$between':
        if (Array.isArray(operand) && operand.length === 2) {
          params.push(operand[0], operand[1]);
          return `${quotedField} BETWEEN ? AND ?`;
        }
        return null;

      case '$like':
        params.push(operand);
        return `${quotedField} LIKE ?`;

      case '$notLike':
        params.push(operand);
        return `${quotedField} NOT LIKE ?`;

      case '$contains':
        params.push(`%${operand}%`);
        return `${quotedField} LIKE ?`;

      case '$and':
        if (Array.isArray(operand)) {
          const subConditions = operand.map(cond => {
            const subParams: any[] = [];
            const conditions = this.buildConditions(cond, subParams);
            params.push(...subParams);
            return conditions.length > 0 ? `(${conditions.join(' AND ')})` : '';
          }).filter(cond => cond !== '');
          return subConditions.join(' AND ');
        }
        return null;

      case '$or':
        if (Array.isArray(operand)) {
          const subConditions = operand.map(cond => {
            const subParams: any[] = [];
            const conditions = this.buildConditions(cond, subParams);
            params.push(...subParams);
            return conditions.length > 0 ? `(${conditions.join(' AND ')})` : '';
          }).filter(cond => cond !== '');
          return subConditions.join(' OR ');
        }
        return null;

      case '$not':
        if (typeof operand === 'object') {
          const subParams: any[] = [];
          const conditions = this.buildConditions(operand, subParams);
          params.push(...subParams);
          return conditions.length > 0 ? `NOT (${conditions.join(' AND ')})` : '';
        }
        return null;

      default:
        return null;
    }
  }

  /**
   * 构建 GROUP BY 子句
   */
  private buildGroupByClause(group: string[]): string {
    if (!group || group.length === 0) {
      return '';
    }

    return `GROUP BY ${group.map(g => `\`${g}\``).join(', ')}`;
  }

  /**
   * 构建 HAVING 子句
   */
  private buildHavingClause(having: any): { having: string; params: any[] } {
    if (!having || Object.keys(having).length === 0) {
      return { having: '', params: [] };
    }

    const params: any[] = [];
    const conditions = this.buildConditions(having, params);
    const havingClause = conditions.length > 0 ? `HAVING ${conditions.join(' AND ')}` : '';

    return { having: havingClause, params };
  }

  /**
   * 构建 ORDER BY 子句
   */
  private buildOrderByClause(order: string[]): string {
    if (!order || order.length === 0) {
      return '';
    }

    const orderClauses = order.map(column => {
      let fieldName = column;
      let direction = 'ASC';

      if (column.endsWith(SortDirection.ASC)) {
        fieldName = column.slice(0, -1);
        direction = 'ASC';
      } else if (column.endsWith(SortDirection.DESC)) {
        fieldName = column.slice(0, -1);
        direction = 'DESC';
      }

      return `\`${fieldName}\` ${direction}`;
    });

    return `ORDER BY ${orderClauses.join(', ')}`;
  }

  /**
   * 构建 LIMIT 子句
   */
  private buildLimitClause(limit: number): string {
    if (!limit || limit <= 0) {
      return '';
    }

    return `LIMIT ${limit}`;
  }

  /**
   * 构建 OFFSET 子句
   */
  private buildOffsetClause(offset: number): string {
    if (!offset || offset < 0) {
      return '';
    }

    return `OFFSET ${offset}`;
  }

  /**
   * 提取插入数据
   */
  private extractInsertData(data: any): any {
    if (Array.isArray(data)) {
      return data;
    }

    if (typeof data === 'object' && data !== null) {
      return data;
    }

    return {};
  }

  /**
   * 提取更新数据
   */
  private extractUpdateData(data: any): any {
    if (typeof data === 'object' && data !== null) {
      return data;
    }

    return {};
  }

  /**
   * 判断是否为聚合函数
   */
  private isAggregateFunction(column: string): boolean {
    const aggregateFunctions = [
      'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
      'count', 'sum', 'avg', 'min', 'max',
    ];
    return aggregateFunctions.some(func => column.toUpperCase().startsWith(func));
  }
}
