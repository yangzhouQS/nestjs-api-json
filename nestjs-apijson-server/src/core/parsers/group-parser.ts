import { Injectable, Logger } from '@nestjs/common';
import { ConditionErrorException } from '../exceptions';

/**
 * GroupParser
 * 分组解析器
 * 负责解析 @group 字段，支持单字段和多字段分组
 */
@Injectable()
export class GroupParser {
  private readonly logger = new Logger(GroupParser.name);

  /**
   * 解析 @group 字段
   * @param groupValue @group 字段的值
   * @returns 解析后的分组配置
   */
  parse(groupValue: string | string[]): GroupConfig {
    this.logger.debug(`解析 @group: ${JSON.stringify(groupValue)}`);

    const config: GroupConfig = [];

    if (typeof groupValue === 'string') {
      // 字符串格式："department,position" 或 "department,position"
      this.parseString(groupValue, config);
    } else if (Array.isArray(groupValue)) {
      // 数组格式：["department", "position"]
      this.parseArray(groupValue, config);
    }

    return config;
  }

  /**
   * 解析字符串格式的分组配置
   * @param value 字符串值
   * @param config 分组配置数组
   */
  private parseString(value: string, config: GroupConfig): void {
    const groups = value.split(',').map(g => g.trim());

    for (const group of groups) {
      config.push(group);
    }
  }

  /**
   * 解析数组格式的分组配置
   * @param value 数组值
   * @param config 分组配置数组
   */
  private parseArray(value: string[], config: GroupConfig): void {
    for (const group of value) {
      config.push(group.trim());
    }
  }

  /**
   * 生成 GROUP BY 子句
   * @param config 分组配置
   * @param quote 引用符
   * @returns GROUP BY 子句
   */
  toGroupByClause(config: GroupConfig, quote: string = '`'): string {
    if (config.length === 0) {
      return '';
    }

    const groups = config.map(group => {
      return `${quote}${group}${quote}`;
    });

    return `GROUP BY ${groups.join(', ')}`;
  }

  /**
   * 验证分组配置
   * @param config 分组配置
   * @param availableColumns 可用的列名
   * @throws ConditionErrorException 当列名不存在时抛出异常
   */
  validate(config: GroupConfig, availableColumns: string[]): void {
    for (const group of config) {
      if (!availableColumns.includes(group)) {
        throw new ConditionErrorException(`分组字段 ${group} 不存在`);
      }
    }
  }
}

/**
 * 分组配置接口
 */
export interface GroupConfig extends Array<string> {}
