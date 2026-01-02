import { Injectable, Logger } from '@nestjs/common';
import { ConditionErrorException } from '../exceptions';

/**
 * ArrayParser
 * 数组查询解析器
 * 负责解析数组查询，支持Table[]和[]语法
 */
@Injectable()
export class ArrayParser {
  private readonly logger = new Logger(ArrayParser.name);

  /**
   * 解析数组查询
   * @param key 键名（如：User[], []）
   * @param value 键值
   * @returns 解析后的数组查询配置
   */
  parse(key: string, value: any): ArrayQueryConfig {
    this.logger.debug(`解析数组查询: ${key} = ${JSON.stringify(value)}`);

    const config: ArrayQueryConfig = {
      type: 'CONTAINER',
      table: '',
      extractKey: '',
      count: 10,
      page: 0,
      conditions: {},
    };

    // 判断数组类型
    if (key === '[]') {
      // 数组容器：[]
      config.type = 'CONTAINER';
      config.table = '';
    } else if (key.endsWith('[]')) {
      // 表数组：User[]
      config.type = 'TABLE_ARRAY';
      config.table = key.substring(0, key.length - 2);

      // 检查是否为提取数组：User-id[]
      if (config.table.includes('-')) {
        const parts = config.table.split('-');
        config.table = parts[0];
        config.extractKey = parts[1];
      }
    } else {
      throw new ConditionErrorException(`数组查询格式错误: ${key}`);
    }

    // 解析数组内容
    if (typeof value === 'object' && value !== null) {
      // 提取count和page
      if (value.count !== undefined) {
        config.count = this.parseCount(value.count);
      }

      if (value.page !== undefined) {
        config.page = this.parsePage(value.page);
      }

      if (value.query !== undefined) {
        config.query = this.parseQuery(value.query);
      }

      // 提取条件
      for (const [k, v] of Object.entries(value)) {
        if (k !== 'count' && k !== 'page' && k !== 'query' && k !== 'join') {
          config.conditions[k] = v;
        }
      }
    }

    return config;
  }

  /**
   * 解析count
   * @param count count值
   * @returns 解析后的count
   */
  parseCount(count: number): number {
    if (typeof count !== 'number' || count < 0) {
      throw new ConditionErrorException('count 必须是非负整数');
    }

    return count;
  }

  /**
   * 解析page
   * @param page page值
   * @returns 解析后的page
   */
  parsePage(page: number): number {
    if (typeof page !== 'number' || page < 0) {
      throw new ConditionErrorException('page 必须是非负整数');
    }

    return page;
  }

  /**
   * 解析query
   * @param query query值
   * @returns 解析后的query
   */
  parseQuery(query: number): QueryType {
    if (typeof query !== 'number' || query < 0 || query > 2) {
      throw new ConditionErrorException('query 必须是 0, 1, 或 2');
    }

    return query as QueryType;
  }

  /**
   * 提取数组结果
   * @param result 原始结果
   * @param config 数组查询配置
   * @returns 提取后的数组
   */
  extractArray(result: any, config: ArrayQueryConfig): any[] {
    if (!result) {
      return [];
    }

    // 如果有提取键，提取指定字段
    if (config.extractKey) {
      return this.extractByKey(result, config.extractKey);
    }

    // 如果是数组容器，直接返回
    if (config.type === 'CONTAINER') {
      if (Array.isArray(result)) {
        return result;
      }
      return [result];
    }

    // 如果是表数组，提取表数据
    if (config.type === 'TABLE_ARRAY' && config.table) {
      if (result[config.table]) {
        const tableData = result[config.table];
        if (Array.isArray(tableData)) {
          return tableData;
        }
        return [tableData];
      }
    }

    return [];
  }

  /**
   * 根据键提取数据
   * @param result 原始结果
   * @param key 提取键
   * @returns 提取后的数组
   */
  private extractByKey(result: any, key: string): any[] {
    if (!result) {
      return [];
    }

    const values: any[] = [];

    // 递归查找并提取指定键的值
    const extract = (obj: any) => {
      if (!obj || typeof obj !== 'object') {
        return;
      }

      if (key in obj) {
        values.push(obj[key]);
      }

      // 递归处理子对象
      for (const v of Object.values(obj)) {
        if (typeof v === 'object' && v !== null) {
          extract(v);
        }
      }
    };

    extract(result);
    return values;
  }

  /**
   * 验证数组查询配置
   * @param config 数组查询配置
   * @param availableTables 可用的表名
   * @throws ConditionErrorException 当表名不存在时抛出异常
   */
  validate(config: ArrayQueryConfig, availableTables: string[]): void {
    if (config.table && !availableTables.includes(config.table)) {
      throw new ConditionErrorException(`数组查询表 ${config.table} 不存在`);
    }
  }

  /**
   * 检查是否为数组查询
   * @param key 键名
   * @returns 是否为数组查询
   */
  isArrayQuery(key: string): boolean {
    return key === '[]' || key.endsWith('[]');
  }

  /**
   * 检查是否为数组容器
   * @param key 键名
   * @returns 是否为数组容器
   */
  isContainer(key: string): boolean {
    return key === '[]';
  }

  /**
   * 检查是否为表数组
   * @param key 键名
   * @returns 是否为表数组
   */
  isTableArray(key: string): boolean {
    return key !== '[]' && key.endsWith('[]');
  }

  /**
   * 检查是否为提取数组
   * @param key 键名
   * @returns 是否为提取数组
   */
  isExtractArray(key: string): boolean {
    return key.includes('-') && key.endsWith('[]');
  }
}

/**
 * 数组查询配置接口
 */
export interface ArrayQueryConfig {
  /** 数组类型：CONTAINER(容器), TABLE_ARRAY(表数组) */
  type: 'CONTAINER' | 'TABLE_ARRAY';
  /** 表名 */
  table: string;
  /** 提取键 */
  extractKey: string;
  /** 每页数量 */
  count: number;
  /** 页码 */
  page: number;
  /** 查询类型：0-对象，1-总数，2-数据+总数 */
  query?: QueryType;
  /** 条件 */
  conditions: Record<string, any>;
}

/**
 * 查询类型
 */
export type QueryType = 0 | 1 | 2;
