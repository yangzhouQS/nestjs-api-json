import { Injectable, Logger } from '@nestjs/common';
import { ICache, CacheItem, CacheStats } from './cache.interface';

/**
 * MemoryCacheService
 * 内存缓存服务
 * 基于内存的缓存实现，适合单机应用
 */
@Injectable()
export class MemoryCacheService implements ICache {
  private readonly logger = new Logger(MemoryCacheService.name);
  private readonly cache: Map<string, CacheItem<any>> = new Map();
  private readonly stats = {
    hits: 0,
    misses: 0,
  };

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    this.logger.debug(`获取缓存: ${key}`);

    const item = this.cache.get(key);

    if (!item) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    if (item.expiresAt > 0 && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return item.value as T;
  }

  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒），0表示永不过期
   */
  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    this.logger.debug(`设置缓存: ${key}, TTL: ${ttl}s`);

    const now = Date.now();
    const item: CacheItem<T> = {
      value,
      expiresAt: ttl > 0 ? now + ttl * 1000 : 0,
      createdAt: now,
    };

    this.cache.set(key, item);

    // 如果设置了TTL，设置自动清理
    if (ttl > 0) {
      this.scheduleCleanup(ttl * 1000);
    }
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  async delete(key: string): Promise<void> {
    this.logger.debug(`删除缓存: ${key}`);
    this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    this.logger.debug('清空所有缓存');
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * 检查缓存是否存在
   * @param key 缓存键
   * @returns 是否存在
   */
  async has(key: string): Promise<boolean> {
    const item = this.cache.get(key);

    if (!item) {
      return false;
    }

    // 检查是否过期
    if (item.expiresAt > 0 && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 获取缓存过期时间
   * @param key 缓存键
   * @returns 过期时间（秒），-1表示永不过期，0表示不存在
   */
  async ttl(key: string): Promise<number> {
    const item = this.cache.get(key);

    if (!item) {
      return 0;
    }

    if (item.expiresAt === 0) {
      return -1;
    }

    const remaining = Math.ceil((item.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  }

  /**
   * 设置缓存过期时间
   * @param key 缓存键
   * @param ttl 过期时间（秒）
   */
  async expire(key: string, ttl: number): Promise<void> {
    const item = this.cache.get(key);

    if (!item) {
      return;
    }

    item.expiresAt = ttl > 0 ? Date.now() + ttl * 1000 : 0;
  }

  /**
   * 批量获取缓存
   * @param keys 缓存键数组
   * @returns 缓存值映射
   */
  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();

    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) {
        result.set(key, value);
      }
    }

    return result;
  }

  /**
   * 批量设置缓存
   * @param items 缓存项映射
   * @param ttl 过期时间（秒）
   */
  async mset<T>(items: Map<string, T>, ttl?: number): Promise<void> {
    for (const [key, value] of items.entries()) {
      await this.set(key, value, ttl);
    }
  }

  /**
   * 批量删除缓存
   * @param keys 缓存键数组
   */
  async mdelete(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.delete(key);
    }
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计信息
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate,
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt > 0 && now > item.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`清理了 ${cleaned} 个过期缓存项`);
    }
  }

  /**
   * 调度清理任务
   * @param delay 延迟时间（毫秒）
   */
  private scheduleCleanup(delay: number): void {
    setTimeout(() => {
      this.cleanup();
    }, delay);
  }

  /**
   * 获取所有缓存键
   * @returns 缓存键数组
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取缓存大小
   * @returns 缓存项数量
   */
  size(): number {
    return this.cache.size;
  }
}
