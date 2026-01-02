import { Injectable, Logger } from '@nestjs/common';
import { ConditionErrorException } from '../exceptions';

/**
 * CacheParser
 * 缓存解析器
 * 负责解析 @cache 字段，支持缓存时间配置
 */
@Injectable()
export class CacheParser {
  private readonly logger = new Logger(CacheParser.name);

  /**
   * 解析 @cache 字段
   * @param cacheValue @cache 字段的值
   * @returns 解析后的缓存配置
   */
  parse(cacheValue: number | string | boolean): CacheConfig {
    this.logger.debug(`解析 @cache: ${JSON.stringify(cacheValue)}`);

    const config: CacheConfig = {
      enabled: false,
      ttl: 0,
    };

    if (cacheValue === undefined || cacheValue === null) {
      return config;
    }

    // 布尔值
    if (typeof cacheValue === 'boolean') {
      config.enabled = cacheValue;
      config.ttl = cacheValue ? 3600 : 0; // 默认1小时
      return config;
    }

    // 数字
    if (typeof cacheValue === 'number') {
      if (cacheValue < 0) {
        throw new ConditionErrorException('缓存时间不能为负数');
      }

      config.enabled = cacheValue > 0;
      config.ttl = cacheValue;
      return config;
    }

    // 字符串
    if (typeof cacheValue === 'string') {
      const trimmed = cacheValue.trim();

      if (trimmed === 'true' || trimmed === '1') {
        config.enabled = true;
        config.ttl = 3600; // 默认1小时
      } else if (trimmed === 'false' || trimmed === '0') {
        config.enabled = false;
        config.ttl = 0;
      } else {
        // 解析时间字符串：1h, 30m, 60s
        const ttl = this.parseTimeString(trimmed);
        config.enabled = ttl > 0;
        config.ttl = ttl;
      }

      return config;
    }

    return config;
  }

  /**
   * 解析时间字符串
   * @param value 时间字符串
   * @returns 秒数
   */
  private parseTimeString(value: string): number {
    const match = value.match(/^(\d+)([smhd])?$/i);

    if (!match) {
      throw new ConditionErrorException(`无效的时间格式: ${value}`);
    }

    const num = parseInt(match[1], 10);
    const unit = (match[2] || 's').toLowerCase();

    switch (unit) {
      case 's':
        return num;
      case 'm':
        return num * 60;
      case 'h':
        return num * 3600;
      case 'd':
        return num * 86400;
      default:
        return num;
    }
  }

  /**
   * 格式化TTL为可读字符串
   * @param ttl 秒数
   * @returns 可读字符串
   */
  formatTTL(ttl: number): string {
    if (ttl === 0) {
      return '0s';
    }

    const days = Math.floor(ttl / 86400);
    const hours = Math.floor((ttl % 86400) / 3600);
    const minutes = Math.floor((ttl % 3600) / 60);
    const seconds = ttl % 60;

    const parts: string[] = [];

    if (days > 0) {
      parts.push(`${days}d`);
    }

    if (hours > 0) {
      parts.push(`${hours}h`);
    }

    if (minutes > 0) {
      parts.push(`${minutes}m`);
    }

    if (seconds > 0 || parts.length === 0) {
      parts.push(`${seconds}s`);
    }

    return parts.join(' ');
  }
}

/**
 * 缓存配置接口
 */
export interface CacheConfig {
  /** 是否启用缓存 */
  enabled: boolean;
  /** 缓存时间（秒） */
  ttl: number;
}
