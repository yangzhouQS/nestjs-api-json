/**
 * Cache Interface
 * 缓存接口
 * 定义缓存的基本操作
 */
export interface ICache {
  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存值
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒）
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * 删除缓存
   * @param key 缓存键
   */
  delete(key: string): Promise<void>;

  /**
   * 清空所有缓存
   */
  clear(): Promise<void>;

  /**
   * 检查缓存是否存在
   * @param key 缓存键
   * @returns 是否存在
   */
  has(key: string): Promise<boolean>;

  /**
   * 获取缓存过期时间
   * @param key 缓存键
   * @returns 过期时间（秒），-1表示永不过期，0表示不存在
   */
  ttl(key: string): Promise<number>;

  /**
   * 设置缓存过期时间
   * @param key 缓存键
   * @param ttl 过期时间（秒）
   */
  expire(key: string, ttl: number): Promise<void>;

  /**
   * 批量获取缓存
   * @param keys 缓存键数组
   * @returns 缓存值映射
   */
  mget<T>(keys: string[]): Promise<Map<string, T>>;

  /**
   * 批量设置缓存
   * @param items 缓存项映射
   * @param ttl 过期时间（秒）
   */
  mset<T>(items: Map<string, T>, ttl?: number): Promise<void>;

  /**
   * 批量删除缓存
   * @param keys 缓存键数组
   */
  mdelete(keys: string[]): Promise<void>;
}

/**
 * 缓存项接口
 */
export interface CacheItem<T> {
  /** 缓存值 */
  value: T;
  /** 过期时间戳 */
  expiresAt: number;
  /** 创建时间戳 */
  createdAt: number;
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  /** 缓存命中次数 */
  hits: number;
  /** 缓存未命中次数 */
  misses: number;
  /** 缓存项数量 */
  size: number;
  /** 缓存命中率 */
  hitRate: number;
}
