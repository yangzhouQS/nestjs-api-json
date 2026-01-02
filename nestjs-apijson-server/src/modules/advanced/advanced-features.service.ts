import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ParseResult } from '@/interfaces/apijson-request.interface';

/**
 * 子查询接口
 */
export interface Subquery {
  alias: string;
  sql: string;
  params: any[];
}

/**
 * 高级特性服务
 * 负责处理子查询、聚合函数等高级特性
 */
@Injectable()
export class AdvancedFeaturesService {
  private readonly logger = new Logger(AdvancedFeaturesService.name);

  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * 执行子查询
   * @param subqueries 子查询数组
   * @returns 子查询结果映射
   */
  async executeSubqueries(subqueries: Subquery[]): Promise<Map<string, any[]>> {
    this.logger.log(`执行 ${subqueries.length} 个子查询`);

    const results = new Map<string, any[]>();

    for (const subquery of subqueries) {
      try {
        const queryResult = await this.databaseService.query(subquery.sql, subquery.params);
        const data = Array.isArray(queryResult) ? queryResult : [];

        results.set(subquery.alias, data);
      } catch (error) {
        this.logger.error(`子查询 ${subquery.alias} 执行失败`, error);
        results.set(subquery.alias, []);
      }
    }

    return results;
  }

  /**
   * 构建子查询 SQL
   * @param tableName 表名
   * @param where WHERE 条件
   * @param alias 别名
   * @returns 子查询对象
   */
  buildSubquery(
    tableName: string,
    where: any,
    alias: string
  ): Subquery {
    this.logger.debug(`构建子查询: ${alias} FROM ${tableName}`);

    const whereClause = this.buildWhereClause(where);
    const sql = `SELECT * FROM \`${tableName}\`${whereClause.where}`;

    return {
      alias,
      sql,
      params: whereClause.params,
    };
  }

  /**
   * 构建 WHERE 子句
   * @param where WHERE 条件
   * @returns WHERE 子句和参数
   */
  private buildWhereClause(where: any): { where: string; params: any[] } {
    if (!where || Object.keys(where).length === 0) {
      return { where: '', params: [] };
    }

    const conditions: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(where)) {
      if (typeof value === 'object' && value !== null) {
        for (const [operator, operand] of Object.entries(value)) {
          switch (operator) {
            case '$gte':
              conditions.push(`\`${key}\` >= ?`);
              params.push(operand);
              break;
            case '$gt':
              conditions.push(`\`${key}\` > ?`);
              params.push(operand);
              break;
            case '$lte':
              conditions.push(`\`${key}\` <= ?`);
              params.push(operand);
              break;
            case '$lt':
              conditions.push(`\`${key}\` < ?`);
              params.push(operand);
              break;
            case '$ne':
              conditions.push(`\`${key}\` != ?`);
              params.push(operand);
              break;
            case '$like':
              conditions.push(`\`${key}\` LIKE ?`);
              params.push(operand);
              break;
            case '$notLike':
              conditions.push(`\`${key}\` NOT LIKE ?`);
              params.push(operand);
              break;
            case '$in':
              conditions.push(`\`${key}\` IN (${Array.isArray(operand) ? operand.map(() => '?').join(', ') : '?'})`);
              params.push(...(Array.isArray(operand) ? operand : [operand]));
              break;
            case '$nin':
              conditions.push(`\`${key}\` NOT IN (${Array.isArray(operand) ? operand.map(() => '?').join(', ') : '?'})`);
              params.push(...(Array.isArray(operand) ? operand : [operand]));
              break;
            case '$between':
              conditions.push(`\`${key}\` BETWEEN ? AND ?`);
              params.push(...(Array.isArray(operand) ? operand : [operand]));
              break;
            default:
              conditions.push(`\`${key}\` = ?`);
              params.push(operand);
          }
        }
      } else {
        conditions.push(`\`${key}\` = ?`);
        params.push(value);
      }
    }

    return {
      where: conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '',
      params,
    };
  }

  /**
   * 构建聚合函数查询
   * @param tableName 表名
   * @param aggregateFunction 聚合函数（COUNT, SUM, AVG, MIN, MAX）
   * @param column 列名
   * @param where WHERE 条件（可选）
   * @returns 查询对象
   */
  buildAggregateQuery(
    tableName: string,
    aggregateFunction: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX',
    column: string,
    where?: any
  ): { sql: string; params: any[] } {
    this.logger.debug(`构建聚合函数查询: ${aggregateFunction}(${column}) FROM ${tableName}`);

    const aggregateColumn = `${aggregateFunction}(\`${column}\`)`;
    const sql = `SELECT ${aggregateColumn} FROM \`${tableName}\``;

    const whereResult = where
      ? this.buildWhereClause(where)
      : { where: '', params: [] };

    return {
      sql: `${sql}${whereResult.where}`,
      params: whereResult.params,
    };
  }

  /**
   * 执行聚合函数查询
   * @param tableName 表名
   * @param aggregateFunction 聚合函数
   * @param column 列名
   * @param where WHERE 条件（可选）
   * @returns 聚合结果
   */
  async executeAggregateQuery(
    tableName: string,
    aggregateFunction: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX',
    column: string,
    where?: any
  ): Promise<number> {
    this.logger.log(`执行聚合函数查询: ${aggregateFunction}(${column}) FROM ${tableName}`);

    const query = this.buildAggregateQuery(tableName, aggregateFunction, column, where);
    const result = await this.databaseService.query(query.sql, query.params);
    const data = Array.isArray(result) ? result : [];

    if (data.length > 0) {
      const aggregateKey = Object.keys(data[0])[0];
      return data[0][aggregateKey];
    }

    return 0;
  }

  /**
   * 构建分组聚合查询
   * @param tableName 表名
   * @param groupBy 分组列
   * @param aggregateFunctions 聚合函数映射
   * @param where WHERE 条件（可选）
   * @returns 查询对象
   */
  buildGroupAggregateQuery(
    tableName: string,
    groupBy: string[],
    aggregateFunctions: { [key: string]: string },
    where?: any
  ): { sql: string; params: any[] } {
    this.logger.debug(`构建分组聚合查询: ${tableName} GROUP BY ${groupBy.join(', ')}`);

    const aggregateColumns = Object.entries(aggregateFunctions).map(([key, func]) => {
      return `${func} AS \`${key}\``;
    }).join(', ');

    const sql = `SELECT ${aggregateColumns} FROM \`${tableName}\``;

    const whereResult = where
      ? this.buildWhereClause(where)
      : { where: '', params: [] };

    const groupClause = groupBy.length > 0
      ? ` GROUP BY ${groupBy.map(col => `\`${col}\``).join(', ')}`
      : '';

    return {
      sql: `${sql}${whereResult.where}${groupClause}`,
      params: whereResult.params,
    };
  }

  /**
   * 执行分组聚合查询
   * @param tableName 表名
   * @param groupBy 分组列
   * @param aggregateFunctions 聚合函数映射
   * @param where WHERE 条件（可选）
   * @returns 分组聚合结果
   */
  async executeGroupAggregateQuery(
    tableName: string,
    groupBy: string[],
    aggregateFunctions: { [key: string]: string },
    where?: any
  ): Promise<any[]> {
    this.logger.log(`执行分组聚合查询: ${tableName} GROUP BY ${groupBy.join(', ')}`);

    const query = this.buildGroupAggregateQuery(tableName, groupBy, aggregateFunctions, where);
    const result = await this.databaseService.query(query.sql, query.params);

    return Array.isArray(result) ? result : [];
  }

  /**
   * 构建事务查询
   * @param queries 查询数组
   * @returns 查询数组
   */
  buildTransactionQueries(queries: Array<{
    tableName: string;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    data: any;
    where?: any;
  }>): Array<{ sql: string; params: any[] }> {
    this.logger.log(`构建事务查询，共 ${queries.length} 个操作`);

    const builtQueries: Array<{ sql: string; params: any[] }> = [];

    for (const q of queries) {
      let sql = '';
      let params: any[] = [];

      switch (q.operation) {
        case 'INSERT':
          const columns = Object.keys(q.data);
          const values = Object.values(q.data);
          sql = `INSERT INTO \`${q.tableName}\` (\`${columns.join('`, `')}\`) VALUES (${values.map(() => '?').join(', ')})`;
          params = values;
          break;
        case 'UPDATE':
          const updateColumns = Object.keys(q.data);
          const updateValues = Object.values(q.data);
          const setClause = updateColumns.map(col => `\`${col}\` = ?`).join(', ');
          const whereClause = this.buildWhereClause(q.where || {});
          sql = `UPDATE \`${q.tableName}\` SET ${setClause}${whereClause.where}`;
          params = [...updateValues, ...whereClause.params];
          break;
        case 'DELETE':
          const deleteWhereClause = this.buildWhereClause(q.where || {});
          sql = `DELETE FROM \`${q.tableName}\`${deleteWhereClause.where}`;
          params = deleteWhereClause.params;
          break;
      }

      builtQueries.push({ sql, params });
    }

    return builtQueries;
  }

  /**
   * 执行事务
   * @param queries 查询配置数组
   * @returns 执行结果数组
   */
  async executeTransaction(queries: Array<{
    tableName: string;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    data: any;
    where?: any;
  }>): Promise<any[]> {
    this.logger.log(`执行事务，共 ${queries.length} 个操作`);

    const builtQueries = this.buildTransactionQueries(queries);
    const results = await this.databaseService.executeTransaction(builtQueries);

    return results;
  }

  /**
   * 构建包含子查询的 WHERE 条件
   * @param columnName 列名
   * @param operator 运算符
   * @param subquery 子查询
   * @returns WHERE 条件
   */
  buildSubqueryCondition(
    columnName: string,
    operator: string,
    subquery: Subquery
  ): any {
    return {
      [columnName]: {
        [`$${operator}`]: `(${subquery.sql})`,
        $subqueryParams: subquery.params,
      },
    };
  }

  /**
   * 构建复杂的 WHERE 条件（支持子查询）
   * @param conditions 条件数组
   * @param subqueries 子查询映射
   * @returns WHERE 条件
   */
  buildComplexWhere(conditions: any[], subqueries: Map<string, Subquery>): any {
    const where: any = {};

    for (const condition of conditions) {
      for (const [key, value] of Object.entries(condition)) {
        if (typeof value === 'object' && value !== null) {
          for (const [operator, operand] of Object.entries(value)) {
            if (typeof operand === 'string' && operand.startsWith('subquery:')) {
              // 处理子查询引用
              const subqueryAlias = operand.substring(9);
              const subquery = subqueries.get(subqueryAlias);
              
              if (subquery) {
                where[key] = {
                  [`$${operator}`]: `(${subquery.sql})`,
                  $subqueryParams: subquery.params,
                };
              }
            } else {
              where[key] = {
                [`$${operator}`]: operand,
              };
            }
          }
        } else {
          where[key] = value;
        }
      }
    }

    return where;
  }

  /**
   * 解析并执行 APIJSON 请求中的高级特性
   * @param parseResult 解析结果
   * @param subqueries 子查询映射
   * @returns 执行结果
   */
  async executeAdvancedFeatures(
    parseResult: ParseResult,
    subqueries: Map<string, Subquery>
  ): Promise<any> {
    this.logger.log('执行高级特性');

    const results: { [key: string]: any } = {};

    // 执行子查询
    if (subqueries.size > 0) {
      const subqueryResults = await this.executeSubqueries(Array.from(subqueries.values()));
      for (const [alias, data] of subqueryResults.entries()) {
        results[alias] = data;
      }
    }

    return results;
  }
}
