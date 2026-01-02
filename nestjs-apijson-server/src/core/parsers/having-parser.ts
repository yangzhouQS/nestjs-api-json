import { Injectable, Logger } from '@nestjs/common';
import { OperatorParser } from '../operator-parser';
import { ConditionErrorException } from '../exceptions';

/**
 * HavingParser
 * 分组过滤解析器
 * 负责解析 @having 字段，支持分组后的条件过滤
 */
@Injectable()
export class HavingParser {
  private readonly logger = new Logger(HavingParser.name);
  private readonly operatorParser = new OperatorParser();

  /**
   * 解析 @having 字段
   * @param havingValue @having 字段的值
   * @returns 解析后的HAVING配置
   */
  parse(havingValue: Record<string, any>): HavingConfig {
    this.logger.debug(`解析 @having: ${JSON.stringify(havingValue)}`);

    const config: HavingConfig = [];

    for (const [key, value] of Object.entries(havingValue)) {
      // 解析字段名和运算符
      const { field, operator } = OperatorParser.parseKey(key);

      // 构建HAVING条件
      const condition: HavingCondition = {
        field,
        operator,
        value,
      };

      config.push(condition);
    }

    return config;
  }

  /**
   * 生成 HAVING 子句
   * @param config HAVING配置
   * @param quote 引用符
   * @returns HAVING 子句
   */
  toHavingClause(config: HavingConfig, quote: string = '`'): string {
    if (config.length === 0) {
      return '';
    }

    const conditions = config.map(condition => {
      const { field, operator, value } = condition;

      // 使用运算符解析器生成SQL条件
      return OperatorParser.toSQLCondition(field, operator, value, quote);
    });

    return `HAVING ${conditions.join(' AND ')}`;
  }

  /**
   * 验证HAVING配置
   * @param config HAVING配置
   * @param availableColumns 可用的列名
   * @throws ConditionErrorException 当列名不存在时抛出异常
   */
  validate(config: HavingConfig, availableColumns: string[]): void {
    for (const condition of config) {
      if (!availableColumns.includes(condition.field)) {
        throw new ConditionErrorException(`HAVING字段 ${condition.field} 不存在`);
      }
    }
  }
}

/**
 * HAVING配置接口
 */
export interface HavingConfig extends Array<HavingCondition> {}

/**
 * HAVING条件接口
 */
export interface HavingCondition {
  /** 字段名（可以是聚合函数，如 COUNT(id)） */
  field: string;
  /** 运算符 */
  operator: string;
  /** 值 */
  value: any;
}
