import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ICache, CacheStats } from './cache.interface';

/**
 * Redis客户端接口
 * 支持多种Redis客户端实现
 */
export interface IRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<'OK' | null>;
  del(key: string | string[]): Promise<number>;
  exists(key: string): Promise<number>;
  ttl(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  mget(keys: string[]): Promise<(string | null)[]>;
  mset(items: [string, string][]): Promise<'OK' | null>;
  keys(pattern: string): Promise<string[]>;
  dbsize(): Promise<number>;
  flushdb(): Promise<'OK'>;
  on(event: string, listener: (...args: any[]) => void): void;
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
  quit?(): Promise<void>;
}

/**
 * RedisCacheService
 * Redis缓存服务
 * 基于Redis的缓存实现，适合分布式应用
 */
@Injectable()
export class RedisCacheService implements ICache, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly stats = {
    hits: 0,
    misses: 0,
  };
  private isConnected = false;

  constructor(private readonly redisClient: IRedisClient) {
    // 如果客户端有connect方法，调用它
    if (this.redisClient.connect) {
      this.redisClient.connect()
        .then(() => {
          this.isConnected = true;
          this.logger.log('Redis连接成功');
        })
        .catch((error) => {
          this.logger.error('Redis连接失败', error);
        });
    } else {
      this.isConnected = true;
    }

    // 监听错误事件
    this.redisClient.on('error', (error) => {
      this.logger.error('Redis错误', error);
      this.isConnected = false;
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ping();
      this.logger.log('Redis缓存服务初始化成功');
    } catch (error) {
      this.logger.error('Redis缓存服务初始化失败', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.redisClient.quit) {
        await this.redisClient.quit();
      } else if (this.redisClient.disconnect) {
        await this.redisClient.disconnect();
      }
      this.isConnected = false;
      this.logger.log('Redis连接已关闭');
    } catch (error) {
      this.logger.error('关闭Redis连接失败', error);
    }
  }

  /**
   * 测试Redis连接
   */
  private async ping(): Promise<void> {
    // Redis的ping命令可以通过get一个不存在的键来测试
    await this.redisClient.get('__ping__');
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    this.logger.debug(`获取Redis缓存: ${key}`);

    try {
      const value = await this.redisClient.get(key);

      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`获取Redis缓存失败: ${key}`, error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒），0表示永不过期
   */
  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    this.logger.debug(`设置Redis缓存: ${key}, TTL: ${ttl}s`);

    try {
      const serialized = JSON.stringify(value);

      if (ttl > 0) {
        await this.redisClient.set(key, serialized, 'EX', ttl);
      } else {
        await this.redisClient.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(`设置Redis缓存失败: ${key}`, error);
      throw error;
    }
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  async delete(key: string): Promise<void> {
    this.logger.debug(`删除Redis缓存: ${key}`);

    try {
      await this.redisClient.del(key);
    } catch (error) {
      this.logger.error(`删除Redis缓存失败: ${key}`, error);
      throw error;
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    this.logger.debug('清空所有Redis缓存');

    try {
      await this.redisClient.flushdb();
      this.stats.hits = 0;
      this.stats.misses = 0;
    } catch (error) {
      this.logger.error('清空Redis缓存失败', error);
      throw error;
    }
  }

  /**
   * 检查缓存是否存在
   * @param key 缓存键
   * @returns 是否存在
   */
  async has(key: string): Promise<boolean> {
    try {
      const exists = await this.redisClient.exists(key);
      return exists > 0;
    } catch (error) {
      this.logger.error(`检查Redis缓存是否存在失败: ${key}`, error);
      return false;
    }
  }

  /**
   * 获取缓存过期时间
   * @param key 缓存键
   * @returns 过期时间（秒），-1表示永不过期，-2表示不存在
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redisClient.ttl(key);
    } catch (error) {
      this.logger.error(`获取Redis缓存TTL失败: ${key}`, error);
      return -2;
    }
  }

  /**
   * 设置缓存过期时间
   * @param key 缓存键
   * @param ttl 过期时间（秒）
   */
  async expire(key: string, ttl: number): Promise<void> {
    this.logger.debug(`设置Redis缓存过期时间: ${key}, TTL: ${ttl}s`);

    try {
      await this.redisClient.expire(key, ttl);
    } catch (error) {
      this.logger.error(`设置Redis缓存过期时间失败: ${key}`, error);
      throw error;
    }
  }

  /**
   * 批量获取缓存
   * @param keys 缓存键数组
   * @returns 缓存值映射
   */
  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();

    if (keys.length === 0) {
      return result;
    }

    try {
      const values = await this.redisClient.mget(keys);

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = values[i];

        if (value !== null) {
          try {
            result.set(key, JSON.parse(value) as T);
          } catch (error) {
            this.logger.warn(`解析Redis缓存值失败: ${key}`, error);
          }
        }
      }
    } catch (error) {
      this.logger.error('批量获取Redis缓存失败', error);
    }

    return result;
  }

  /**
   * 批量设置缓存
   * @param items 缓存项映射
   * @param ttl 过期时间（秒）
   */
  async mset<T>(items: Map<string, T>, ttl?: number): Promise<void> {
    if (items.size === 0) {
      return;
    }

    try {
      const keyValuePairs: [string, string][] = [];
      for (const [key, value] of items.entries()) {
        keyValuePairs.push([key, JSON.stringify(value)]);
      }

      await this.redisClient.mset(keyValuePairs);

      // 如果需要设置TTL，需要逐个设置
      if (ttl && ttl > 0) {
        for (const key of items.keys()) {
          await this.expire(key, ttl);
        }
      }
    } catch (error) {
      this.logger.error('批量设置Redis缓存失败', error);
      throw error;
    }
  }

  /**
   * 批量删除缓存
   * @param keys 缓存键数组
   */
  async mdelete(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    try {
      await this.redisClient.del(keys);
    } catch (error) {
      this.logger.error('批量删除Redis缓存失败', error);
      throw error;
    }
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计信息
   */
  async getStats(): Promise<CacheStats> {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    // 获取Redis数据库大小
    let size = 0;
    try {
      size = await this.redisClient.dbsize();
    } catch (error) {
      this.logger.error('获取Redis数据库大小失败', error);
    }

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size,
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
   * 获取所有缓存键
   * @param pattern 键模式
   * @returns 缓存键数组
   */
  async keys(pattern: string = '*'): Promise<string[]> {
    try {
      return await this.redisClient.keys(pattern);
    } catch (error) {
      this.logger.error('获取Redis缓存键失败', error);
      return [];
    }
  }

  /**
   * 检查连接状态
   * @returns 是否已连接
   */
  isReady(): boolean {
    return this.isConnected;
  }
}
