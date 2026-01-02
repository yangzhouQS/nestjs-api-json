import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheConfig } from '@/interfaces/apijson-request.interface';

/**
 * 缓存服务
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly cache = new Map<string, { value: any; expiry: number }>();
  private readonly config: CacheConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<CacheConfig>('cache')
    
    // 启动清理任务
    this.startCleanupTask();
  }

  /**
   * 获取缓存值
   */
  async get(key: string): Promise<any> {
    const prefixedKey = this.getPrefixedKey(key);
    const item = this.cache.get(prefixedKey);

    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.expiry) {
      this.cache.delete(prefixedKey);
      return null;
    }

    this.logger.debug(`缓存命中: ${prefixedKey}`);
    return item.value;
  }

  /**
   * 设置缓存值
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const prefixedKey = this.getPrefixedKey(key);
    const expiry = Date.now() + (ttl || this.config.defaultTTL);

    // 检查缓存大小
    if (this.cache.size >= this.config.maxSize) {
      await this.evictLRU();
    }

    this.cache.set(prefixedKey, { value, expiry });
    this.logger.debug(`缓存设置: ${prefixedKey}, TTL: ${ttl || this.config.defaultTTL}ms`);
  }

  /**
   * 删除缓存值
   */
  async del(key: string): Promise<void> {
    const prefixedKey = this.getPrefixedKey(key);
    const deleted = this.cache.delete(prefixedKey);

    if (deleted) {
      this.logger.debug(`缓存删除: ${prefixedKey}`);
    }
  }

  /**
   * 检查缓存值是否存在
   */
  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * 设置缓存值（仅当键不存在时）
   */
  async setnx(key: string, value: any, ttl?: number): Promise<number> {
    const prefixedKey = this.getPrefixedKey(key);
    const exists = await this.exists(key);

    if (!exists) {
      await this.set(key, value, ttl);
      return 1;
    }

    return 0;
  }

  /**
   * 获取并设置缓存值
   */
  async getset(key: string, value: any, ttl?: number): Promise<any> {
    const oldValue = await this.get(key);
    await this.set(key, value, ttl);
    return oldValue;
  }

  /**
   * 增加缓存值
   */
  async incr(key: string, increment: number = 1): Promise<number> {
    const prefixedKey = this.getPrefixedKey(key);
    const item = this.cache.get(prefixedKey);

    if (!item) {
      await this.set(key, increment);
      return increment;
    }

    // 检查是否过期
    if (Date.now() > item.expiry) {
      this.cache.delete(prefixedKey);
      await this.set(key, increment);
      return increment;
    }

    // 检查是否为数字
    if (typeof item.value !== 'number') {
      throw new Error(`缓存值 "${prefixedKey}" 不是数字`);
    }

    const newValue = item.value + increment;
    item.value = newValue;
    this.cache.set(prefixedKey, item);

    return newValue;
  }

  /**
   * 减少缓存值
   */
  async decr(key: string, decrement: number = 1): Promise<number> {
    return await this.incr(key, -decrement);
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<any> {
    const now = Date.now();
    let expiredCount = 0;
    let totalSize = 0;

    for (const [key, item] of this.cache.entries()) {
      totalSize += this.getItemSize(item);

      if (now > item.expiry) {
        expiredCount++;
      }
    }

    return {
      type: this.config.type,
      size: this.cache.size,
      maxSize: this.config.maxSize,
      expiredCount,
      totalSize,
      hitRate: this.getHitRate(),
    };
  }

  /**
   * 清理过期缓存
   */
  async clearExpired(): Promise<number> {
    const now = Date.now();
    let count = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      this.logger.debug(`清理过期缓存: ${count} 项`);
    }

    return count;
  }

  /**
   * 清空所有缓存
   */
  async flush(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.debug(`清空所有缓存: ${size} 项`);
  }

  /**
   * 获取所有键
   */
  async keys(): Promise<string[]> {
    const keys: string[] = [];
    const prefix = this.config.keyPrefix;

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keys.push(key.substring(prefix.length));
      }
    }

    return keys;
  }

  /**
   * 批量获取缓存值
   */
  async mget(keys: string[]): Promise<any[]> {
    const values: any[] = [];

    for (const key of keys) {
      const value = await this.get(key);
      values.push(value);
    }

    return values;
  }

  /**
   * 批量设置缓存值
   */
  async mset(keyValues: { [key: string]: any }, ttl?: number): Promise<void> {
    for (const [key, value] of Object.entries(keyValues)) {
      await this.set(key, value, ttl);
    }
  }

  /**
   * 批量删除缓存值
   */
  async mdel(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.del(key);
    }
  }

  /**
   * 获取带前缀的键
   */
  private getPrefixedKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * 获取项目大小
   */
  private getItemSize(item: { value: any; expiry: number }): number {
    return JSON.stringify(item).length;
  }

  /**
   * 淘汰最近最少使用的缓存
   */
  private async evictLRU(): Promise<void> {
    // 简单实现：删除第一个键
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
      this.logger.debug(`LRU淘汰: ${firstKey}`);
    }
  }

  /**
   * 获取命中率
   */
  private getHitRate(): number {
    // 这里应该实现命中率计算
    // 简单实现：返回0
    return 0;
  }

  /**
   * 启动清理任务
   */
  private startCleanupTask(): void {
    // 每分钟清理一次过期缓存
    setInterval(async () => {
      await this.clearExpired();
    }, 60000);
  }
}
