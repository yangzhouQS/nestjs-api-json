import { Injectable, Logger } from '@nestjs/common';
import { OutOfRangeException, ConditionErrorException } from '../exceptions';
import { APIJSONConfig } from '../apijson-config';

/**
 * PaginationParser
 * 分页解析器
 * 负责解析 count 和 page 字段，支持分页查询
 */
@Injectable()
export class PaginationParser {
  private readonly logger = new Logger(PaginationParser.name);

  /** 默认每页数量 */
  private defaultCount: number = APIJSONConfig.DEFAULT_QUERY_COUNT;

  /** 最大每页数量 */
  private maxCount: number = APIJSONConfig.MAX_QUERY_COUNT;

  /**
   * 解析分页参数
   * @param countValue count 字段的值
   * @param pageValue page 字段的值
   * @returns 解析后的分页配置
   */
  parse(countValue?: number, pageValue?: number): PaginationConfig {
    this.logger.debug(`解析分页: count=${countValue}, page=${pageValue}`);

    const config: PaginationConfig = {
      count: this.defaultCount,
      page: 0,
      offset: 0,
    };

    // 解析 count
    if (countValue !== undefined && countValue !== null) {
      if (typeof countValue !== 'number' || countValue < 0) {
        throw new ConditionErrorException('count 必须是非负整数');
      }

      if (countValue > this.maxCount) {
        throw new OutOfRangeException(`count 超过最大值 ${this.maxCount}`);
      }

      config.count = countValue;
    }

    // 解析 page
    if (pageValue !== undefined && pageValue !== null) {
      if (typeof pageValue !== 'number' || pageValue < 0) {
        throw new ConditionErrorException('page 必须是非负整数');
      }

      config.page = pageValue;
    }

    // 计算偏移量
    config.offset = config.page * config.count;

    return config;
  }

  /**
   * 生成 LIMIT 子句
   * @param config 分页配置
   * @returns LIMIT 子句
   */
  toLimitClause(config: PaginationConfig): string {
    if (config.count === 0) {
      return '';
    }

    return `LIMIT ${config.offset}, ${config.count}`;
  }

  /**
   * 获取默认每页数量
   */
  getDefaultCount(): number {
    return this.defaultCount;
  }

  /**
   * 设置默认每页数量
   */
  setDefaultCount(defaultCount: number): PaginationParser {
    this.defaultCount = defaultCount;
    return this;
  }

  /**
   * 获取最大每页数量
   */
  getMaxCount(): number {
    return this.maxCount;
  }

  /**
   * 设置最大每页数量
   */
  setMaxCount(maxCount: number): PaginationParser {
    this.maxCount = maxCount;
    return this;
  }
}

/**
 * 分页配置接口
 */
export interface PaginationConfig {
  /** 每页数量 */
  count: number;
  /** 页码（从0开始） */
  page: number;
  /** 偏移量 */
  offset: number;
}
