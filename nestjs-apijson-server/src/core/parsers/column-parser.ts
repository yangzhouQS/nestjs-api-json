import { Injectable, Logger } from '@nestjs/common';
import { ConditionErrorException } from '../exceptions';

/**
 * ColumnParser
 * 列选择解析器
 * 负责解析 @column 字段，支持字段选择、排除、重命名等功能
 */
@Injectable()
export class ColumnParser {
  private readonly logger = new Logger(ColumnParser.name);

  /**
   * 解析 @column 字段
   * @param columnValue @column 字段的值
   * @returns 解析后的列配置
   */
  parse(columnValue: string | string[] | Record<string, string>): ColumnConfig {
    this.logger.debug(`解析 @column: ${JSON.stringify(columnValue)}`);

    const config: ColumnConfig = {
      select: [],
      exclude: [],
      alias: {},
    };

    if (typeof columnValue === 'string') {
      // 字符串格式："id,name,age" 或 "id,name:userName,age"
      this.parseString(columnValue, config);
    } else if (Array.isArray(columnValue)) {
      // 数组格式：["id", "name", "age"] 或 ["id", "name:userName", "age"]
      this.parseArray(columnValue, config);
    } else if (typeof columnValue === 'object' && columnValue !== null) {
      // 对象格式：{"id": "userId", "name": "userName"}
      this.parseObject(columnValue, config);
    }

    return config;
  }

  /**
   * 解析字符串格式的列配置
   * @param value 字符串值
   * @param config 列配置对象
   */
  private parseString(value: string, config: ColumnConfig): void {
    const columns = value.split(',').map(col => col.trim());

    for (const column of columns) {
      if (column.startsWith('-')) {
        // 排除字段：-password
        config.exclude.push(column.substring(1));
      } else if (column.includes(':')) {
        // 别名：name:userName
        const [name, alias] = column.split(':').map(s => s.trim());
        config.select.push(name);
        config.alias[name] = alias;
      } else {
        // 普通字段
        config.select.push(column);
      }
    }
  }

  /**
   * 解析数组格式的列配置
   * @param value 数组值
   * @param config 列配置对象
   */
  private parseArray(value: string[], config: ColumnConfig): void {
    for (const column of value) {
      const trimmed = column.trim();

      if (trimmed.startsWith('-')) {
        // 排除字段
        config.exclude.push(trimmed.substring(1));
      } else if (trimmed.includes(':')) {
        // 别名
        const [name, alias] = trimmed.split(':').map(s => s.trim());
        config.select.push(name);
        config.alias[name] = alias;
      } else {
        // 普通字段
        config.select.push(trimmed);
      }
    }
  }

  /**
   * 解析对象格式的列配置
   * @param value 对象值
   * @param config 列配置对象
   */
  private parseObject(value: Record<string, string>, config: ColumnConfig): void {
    for (const [name, alias] of Object.entries(value)) {
      config.select.push(name);
      config.alias[name] = alias;
    }
  }

  /**
   * 生成 SELECT 子句
   * @param config 列配置
   * @param quote 引用符
   * @returns SELECT 子句
   */
  toSelectClause(config: ColumnConfig, quote: string = '`'): string {
    if (config.select.length === 0 && config.exclude.length === 0) {
      return '*';
    }

    const columns: string[] = [];

    for (const column of config.select) {
      if (config.alias[column]) {
        columns.push(`${quote}${column}${quote} AS ${quote}${config.alias[column]}${quote}`);
      } else {
        columns.push(`${quote}${column}${quote}`);
      }
    }

    return columns.join(', ');
  }

  /**
   * 验证列配置
   * @param config 列配置
   * @param availableColumns 可用的列名
   * @throws ConditionErrorException 当列名不存在时抛出异常
   */
  validate(config: ColumnConfig, availableColumns: string[]): void {
    const allColumns = [...config.select, ...config.exclude];

    for (const column of allColumns) {
      if (!availableColumns.includes(column)) {
        throw new ConditionErrorException(`列名 ${column} 不存在`);
      }
    }
  }
}

/**
 * 列配置接口
 */
export interface ColumnConfig {
  /** 选择的列 */
  select: string[];
  /** 排除的列 */
  exclude: string[];
  /** 列别名映射 */
  alias: Record<string, string>;
}
