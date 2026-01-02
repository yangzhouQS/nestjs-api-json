import { Injectable, Logger } from '@nestjs/common';
import { ParseResult, BuildResult, Query, TableQuery } from '@/interfaces/apijson-request.interface';

/**
 * 构建器服务
 */
@Injectable()
export class BuilderService {
  private readonly logger = new Logger(BuilderService.name);

  /**
   * 构建SQL查询
   */
  async build(parseResult: ParseResult): Promise<BuildResult> {
    this.logger.log('开始构建SQL查询');

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

    this.logger.log('SQL查询构建完成');
    return result;
  }

  /**
   * 构建表查询
   */
  private async buildTableQuery(tableName: string, tableQuery: TableQuery): Promise<Query> {
    this.logger.debug(`构建表查询: ${tableName}`);

    // 构建SELECT子句
    const selectClause = this.buildSelectClause(tableQuery.columns);

    // 构建FROM子句
    const fromClause = this.buildFromClause(tableName);

    // 构建JOIN子句
    const joinClause = this.buildJoinClause(tableQuery.joins);

    // 构建WHERE子句
    const whereClause = this.buildWhereClause(tableQuery.where);

    // 构建GROUP BY子句
    const groupByClause = this.buildGroupByClause(tableQuery.group);

    // 构建HAVING子句
    const havingClause = this.buildHavingClause(tableQuery.having);

    // 构建ORDER BY子句
    const orderByClause = this.buildOrderByClause(tableQuery.order);

    // 构建LIMIT子句
    const limitClause = this.buildLimitClause(tableQuery.limit);

    // 构建OFFSET子句
    const offsetClause = this.buildOffsetClause(tableQuery.offset);

    // 组合SQL查询
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

    // 构建参数
    const params = this.buildParams(tableQuery);

    return {
      table: tableName,
      type: 'SELECT',
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
    };
  }

  /**
   * 构建SELECT子句
   */
  private buildSelectClause(columns: any[]): string {
    if (!columns || columns.length === 0) {
      return '*';
    }

    return columns.join(', ');
  }

  /**
   * 构建FROM子句
   */
  private buildFromClause(tableName: string): string {
    return tableName;
  }

  /**
   * 构建JOIN子句
   */
  private buildJoinClause(joins: any[]): string {
    if (!joins || joins.length === 0) {
      return '';
    }

    return joins
      .map(join => {
        const joinType = join.type || 'INNER';
        const joinTable = join.table;
        const joinOn = join.on;

        return `${joinType} JOIN ${joinTable} ON ${joinOn}`;
      })
      .join(' ');
  }

  /**
   * 构建WHERE子句
   */
  private buildWhereClause(where: any): string {
    if (!where || Object.keys(where).length === 0) {
      return '';
    }

    const conditions = this.buildConditions(where);
    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  }

  /**
   * 构建GROUP BY子句
   */
  private buildGroupByClause(group: any[]): string {
    if (!group || group.length === 0) {
      return '';
    }

    return `GROUP BY ${group.join(', ')}`;
  }

  /**
   * 构建HAVING子句
   */
  private buildHavingClause(having: any): string {
    if (!having || Object.keys(having).length === 0) {
      return '';
    }

    const conditions = this.buildConditions(having);
    return conditions.length > 0 ? `HAVING ${conditions.join(' AND ')}` : '';
  }

  /**
   * 构建ORDER BY子句
   */
  private buildOrderByClause(order: any[]): string {
    if (!order || order.length === 0) {
      return '';
    }

    const orderClauses = order.map(column => {
      if (column.endsWith('+')) {
        return `${column.slice(0, -1)} ASC`;
      } else if (column.endsWith('-')) {
        return `${column.slice(0, -1)} DESC`;
      } else {
        return `${column} ASC`;
      }
    });

    return `ORDER BY ${orderClauses.join(', ')}`;
  }

  /**
   * 构建LIMIT子句
   */
  private buildLimitClause(limit: number): string {
    if (!limit || limit <= 0) {
      return '';
    }

    return `LIMIT ${limit}`;
  }

  /**
   * 构建OFFSET子句
   */
  private buildOffsetClause(offset: number): string {
    if (!offset || offset < 0) {
      return '';
    }

    return `OFFSET ${offset}`;
  }

  /**
   * 构建条件
   */
  private buildConditions(conditions: any): string[] {
    const result: string[] = [];

    for (const [key, value] of Object.entries(conditions)) {
      if (typeof value === 'object' && value !== null) {
        // 处理对象条件
        for (const [operator, operand] of Object.entries(value)) {
          switch (operator) {
            case '$gt':
              result.push(`${key} > ${this.formatValue(operand)}`);
              break;
            case '$gte':
              result.push(`${key} >= ${this.formatValue(operand)}`);
              break;
            case '$lt':
              result.push(`${key} < ${this.formatValue(operand)}`);
              break;
            case '$lte':
              result.push(`${key} <= ${this.formatValue(operand)}`);
              break;
            case '$ne':
              result.push(`${key} != ${this.formatValue(operand)}`);
              break;
            case '$eq':
              result.push(`${key} = ${this.formatValue(operand)}`);
              break;
            case '$in':
              if (Array.isArray(operand)) {
                const values = operand.map(v => this.formatValue(v)).join(', ');
                result.push(`${key} IN (${values})`);
              }
              break;
            case '$nin':
              if (Array.isArray(operand)) {
                const values = operand.map(v => this.formatValue(v)).join(', ');
                result.push(`${key} NOT IN (${values})`);
              }
              break;
            case '$like':
              result.push(`${key} LIKE ${this.formatValue(operand)}`);
              break;
            case '$ilike':
              result.push(`${key} ILIKE ${this.formatValue(operand)}`);
              break;
            case '$not':
              if (typeof operand === 'object') {
                const subConditions = this.buildConditions(operand);
                result.push(`NOT (${subConditions.join(' AND ')})`);
              }
              break;
            case '$and':
              if (Array.isArray(operand)) {
                const subConditions = operand.map(cond => {
                  const conditions = this.buildConditions(cond);
                  return conditions.length > 0 ? `(${conditions.join(' AND ')})` : '';
                }).filter(cond => cond !== '');
                result.push(subConditions.join(' AND '));
              }
              break;
            case '$or':
              if (Array.isArray(operand)) {
                const subConditions = operand.map(cond => {
                  const conditions = this.buildConditions(cond);
                  return conditions.length > 0 ? `(${conditions.join(' AND ')})` : '';
                }).filter(cond => cond !== '');
                result.push(subConditions.join(' OR '));
              }
              break;
          }
        }
      } else {
        // 处理简单条件
        result.push(`${key} = ${this.formatValue(value)}`);
      }
    }

    return result;
  }

  /**
   * 格式化值
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }

    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }

    if (typeof value === 'number') {
      return value.toString();
    }

    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }

    if (Array.isArray(value)) {
      return `(${value.map(v => this.formatValue(v)).join(', ')})`;
    }

    if (typeof value === 'object') {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    }

    return `'${value}'`;
  }

  /**
   * 构建参数
   */
  private buildParams(tableQuery: TableQuery): any[] {
    const params: any[] = [];

    // 从WHERE条件提取参数
    if (tableQuery.where) {
      this.extractParams(tableQuery.where, params);
    }

    // 从HAVING条件提取参数
    if (tableQuery.having) {
      this.extractParams(tableQuery.having, params);
    }

    return params;
  }

  /**
   * 提取参数
   */
  private extractParams(conditions: any, params: any[]): void {
    for (const [key, value] of Object.entries(conditions)) {
      if (typeof value === 'object' && value !== null) {
        for (const [operator, operand] of Object.entries(value)) {
          if (operator === '$in' || operator === '$nin') {
            if (Array.isArray(operand)) {
              params.push(...operand);
            }
          } else if (operator === '$and' || operator === '$or') {
            if (Array.isArray(operand)) {
              for (const cond of operand) {
                this.extractParams(cond, params);
              }
            }
          } else if (operator === '$not') {
            if (typeof operand === 'object') {
              this.extractParams(operand, params);
            }
          } else {
            params.push(operand);
          }
        }
      } else {
        params.push(value);
      }
    }
  }
}
