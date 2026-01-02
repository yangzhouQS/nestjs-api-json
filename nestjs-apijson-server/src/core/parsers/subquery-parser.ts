import { Injectable, Logger } from '@nestjs/common';
import { ConditionErrorException } from '../exceptions';
import { Subquery } from '../subquery.model';

/**
 * SubqueryParser
 * 子查询解析器
 * 负责解析子查询，支持WHERE、FROM、SELECT子查询，以及ALL/ANY范围
 */
@Injectable()
export class SubqueryParser {
  private readonly logger = new Logger(SubqueryParser.name);

  /**
   * 解析子查询
   * @param key 键名（如：id@, id>@, id<@）
   * @param value 键值
   * @returns 解析后的子查询配置
   */
  parse(key: string, value: any): SubqueryParseResult {
    this.logger.debug(`解析子查询: ${key} = ${JSON.stringify(value)}`);

    const result: SubqueryParseResult = {
      type: 'WHERE',
      range: '',
      key: '',
      from: '',
      conditions: {},
    };

    // 解析键名，提取字段名和运算符
    const { fieldName, operator } = this.parseKey(key);

    // 判断子查询类型
    if (key.endsWith('@')) {
      // WHERE子查询：id@
      result.type = 'WHERE';
      result.key = fieldName;
      result.operator = operator || '=';
    } else if (key.endsWith('}@')) {
      // EXISTS子查询：id}@
      result.type = 'EXISTS';
      result.key = fieldName;
    } else if (key.includes('>@') || key.includes('<@')) {
      // ALL/ANY子查询：id>@, id<@
      result.type = 'WHERE';
      result.key = fieldName;
      result.operator = operator;

      // 提取范围
      if (key.includes('ALL')) {
        result.range = Subquery.RANGE_ALL;
      } else if (key.includes('ANY')) {
        result.range = Subquery.RANGE_ANY;
      }
    }

    // 解析子查询内容
    if (typeof value === 'object' && value !== null) {
      // 对象格式：{"from":"Comment","Comment":{"@column":"min(userId)"}}
      if (value.from) {
        result.from = value.from;
      }

      // 提取条件
      for (const [k, v] of Object.entries(value)) {
        if (k !== 'from' && k !== 'range') {
          result.conditions[k] = v;
        }
      }

      // 提取范围
      if (value.range) {
        result.range = value.range;
      }
    }

    return result;
  }

  /**
   * 解析键名
   * @param key 键名
   * @returns 解析后的字段名和运算符
   */
  private parseKey(key: string): { fieldName: string; operator: string } {
    // 移除后缀
    let cleanKey = key;
    if (cleanKey.endsWith('@')) {
      cleanKey = cleanKey.substring(0, cleanKey.length - 1);
    } else if (cleanKey.endsWith('}@')) {
      cleanKey = cleanKey.substring(0, cleanKey.length - 2);
    } else if (cleanKey.includes('>@')) {
      cleanKey = cleanKey.replace('>@', '');
    } else if (cleanKey.includes('<@')) {
      cleanKey = cleanKey.replace('<@', '');
    }

    // 提取运算符
    let operator = '=';
    if (cleanKey.endsWith('>') || cleanKey.endsWith('<')) {
      operator = cleanKey[cleanKey.length - 1];
      cleanKey = cleanKey.substring(0, cleanKey.length - 1);
    } else if (cleanKey.endsWith('>=')) {
      operator = '>=';
      cleanKey = cleanKey.substring(0, cleanKey.length - 2);
    } else if (cleanKey.endsWith('<=')) {
      operator = '<=';
      cleanKey = cleanKey.substring(0, cleanKey.length - 2);
    } else if (cleanKey.endsWith('!=')) {
      operator = '!=';
      cleanKey = cleanKey.substring(0, cleanKey.length - 2);
    }

    return { fieldName: cleanKey, operator };
  }

  /**
   * 生成子查询SQL
   * @param result 子查询解析结果
   * @param quote 引用符
   * @returns 子查询SQL
   */
  toSQLSubquery(result: SubqueryParseResult, quote: string = '`'): string {
    if (result.type === 'EXISTS') {
      return this.generateExistsSubquery(result, quote);
    } else if (result.type === 'WHERE') {
      return this.generateWhereSubquery(result, quote);
    } else if (result.type === 'FROM') {
      return this.generateFromSubquery(result, quote);
    } else if (result.type === 'SELECT') {
      return this.generateSelectSubquery(result, quote);
    }

    return '';
  }

  /**
   * 生成WHERE子查询
   * @param result 子查询解析结果
   * @param quote 引用符
   * @returns WHERE子查询SQL
   */
  private generateWhereSubquery(result: SubqueryParseResult, quote: string): string {
    const { key, operator, from, conditions, range } = result;

    // 生成子查询
    const subquery = this.generateSubqueryBody(from, conditions, quote);

    // 添加范围
    if (range === Subquery.RANGE_ALL) {
      return `${quote}${key}${quote} ${operator} ALL (${subquery})`;
    } else if (range === Subquery.RANGE_ANY) {
      return `${quote}${key}${quote} ${operator} ANY (${subquery})`;
    } else {
      return `${quote}${key}${quote} ${operator} (${subquery})`;
    }
  }

  /**
   * 生成EXISTS子查询
   * @param result 子查询解析结果
   * @param quote 引用符
   * @returns EXISTS子查询SQL
   */
  private generateExistsSubquery(result: SubqueryParseResult, quote: string): string {
    const { from, conditions } = result;

    // 生成子查询
    const subquery = this.generateSubqueryBody(from, conditions, quote);

    return `EXISTS (${subquery})`;
  }

  /**
   * 生成FROM子查询
   * @param result 子查询解析结果
   * @param quote 引用符
   * @returns FROM子查询SQL
   */
  private generateFromSubquery(result: SubqueryParseResult, quote: string): string {
    const { from, conditions } = result;

    // 生成子查询
    const subquery = this.generateSubqueryBody(from, conditions, quote);

    return `(${subquery})`;
  }

  /**
   * 生成SELECT子查询
   * @param result 子查询解析结果
   * @param quote 引用符
   * @returns SELECT子查询SQL
   */
  private generateSelectSubquery(result: SubqueryParseResult, quote: string): string {
    const { from, conditions } = result;

    // 生成子查询
    const subquery = this.generateSubqueryBody(from, conditions, quote);

    return `(${subquery})`;
  }

  /**
   * 生成子查询主体
   * @param from FROM表
   * @param conditions 条件
   * @param quote 引用符
   * @returns 子查询主体SQL
   */
  private generateSubqueryBody(from: string, conditions: any, quote: string): string {
    // 简单实现：生成基本的SELECT语句
    // 实际应用中需要根据conditions生成完整的WHERE条件
    let sql = `SELECT * FROM ${quote}${from}${quote}`;

    // 生成WHERE条件
    const whereConditions: string[] = [];
    for (const [key, value] of Object.entries(conditions)) {
      if (key.startsWith('@')) {
        // 特殊字段，如@column
        continue;
      }
      whereConditions.push(`${quote}${key}${quote} = ${this.formatValue(value)}`);
    }

    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    return sql;
  }

  /**
   * 格式化值
   * @param value 值
   * @returns 格式化后的值
   */
  private formatValue(value: any): string {
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    } else if (value === null) {
      return 'NULL';
    } else {
      return String(value);
    }
  }

  /**
   * 验证子查询配置
   * @param result 子查询解析结果
   * @param availableTables 可用的表名
   * @throws ConditionErrorException 当表名不存在时抛出异常
   */
  validate(result: SubqueryParseResult, availableTables: string[]): void {
    if (result.from && !availableTables.includes(result.from)) {
      throw new ConditionErrorException(`子查询表 ${result.from} 不存在`);
    }
  }
}

/**
 * 子查询解析结果接口
 */
export interface SubqueryParseResult {
  /** 子查询类型：WHERE, FROM, SELECT, EXISTS */
  type: 'WHERE' | 'FROM' | 'SELECT' | 'EXISTS';
  /** 范围：ALL, ANY */
  range: string;
  /** 键名 */
  key: string;
  /** 运算符 */
  operator?: string;
  /** FROM表 */
  from: string;
  /** 条件 */
  conditions: Record<string, any>;
}
