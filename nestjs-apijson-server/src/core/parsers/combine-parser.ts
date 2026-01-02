import { Injectable, Logger } from '@nestjs/common';
import { ConditionErrorException } from '../exceptions';

/**
 * CombineParser
 * 组合查询解析器
 * 负责解析 @combine 字段，支持多表组合查询
 */
@Injectable()
export class CombineParser {
  private readonly logger = new Logger(CombineParser.name);

  /**
   * 解析 @combine 字段
   * @param combineValue @combine 字段的值
   * @returns 解析后的组合配置
   */
  parse(combineValue: string | string[]): CombineConfig {
    this.logger.debug(`解析 @combine: ${JSON.stringify(combineValue)}`);

    const config: CombineConfig = [];

    if (typeof combineValue === 'string') {
      // 字符串格式："User&,Moment&,Comment&"
      this.parseString(combineValue, config);
    } else if (Array.isArray(combineValue)) {
      // 数组格式：["User&", "Moment&", "Comment&"]
      this.parseArray(combineValue, config);
    }

    return config;
  }

  /**
   * 解析字符串格式的组合配置
   * @param value 字符串值
   * @param config 组合配置数组
   */
  private parseString(value: string, config: CombineConfig): void {
    const combines = value.split(',').map(c => c.trim());

    for (const combine of combines) {
      const item = this.parseCombineItem(combine);
      config.push(item);
    }
  }

  /**
   * 解析数组格式的组合配置
   * @param value 数组值
   * @param config 组合配置数组
   */
  private parseArray(value: string[], config: CombineConfig): void {
    for (const combine of value) {
      const item = this.parseCombineItem(combine.trim());
      config.push(item);
    }
  }

  /**
   * 解析单个组合项
   * @param item 组合项字符串
   * @returns 组合项配置
   */
  private parseCombineItem(item: string): CombineItem {
    // 解析表名和类型
    let tableName = item;
    let type: 'APPEND' | 'REPLACE' | 'MERGE' = 'APPEND';

    if (item.endsWith('&')) {
      // 追加：User&
      tableName = item.substring(0, item.length - 1);
      type = 'APPEND';
    } else if (item.endsWith('|')) {
      // 替换：User|
      tableName = item.substring(0, item.length - 1);
      type = 'REPLACE';
    } else if (item.endsWith('^')) {
      // 合并：User^
      tableName = item.substring(0, item.length - 1);
      type = 'MERGE';
    }

    if (!tableName) {
      throw new ConditionErrorException('组合项表名不能为空');
    }

    return { table: tableName, type };
  }

  /**
   * 验证组合配置
   * @param config 组合配置
   * @param availableTables 可用的表名
   * @throws ConditionErrorException 当表名不存在时抛出异常
   */
  validate(config: CombineConfig, availableTables: string[]): void {
    for (const item of config) {
      if (!availableTables.includes(item.table)) {
        throw new ConditionErrorException(`组合表 ${item.table} 不存在`);
      }
    }
  }
}

/**
 * 组合配置接口
 */
export interface CombineConfig extends Array<CombineItem> {}

/**
 * 组合项接口
 */
export interface CombineItem {
  /** 表名 */
  table: string;
  /** 组合类型：APPEND(追加), REPLACE(替换), MERGE(合并) */
  type: 'APPEND' | 'REPLACE' | 'MERGE';
}
