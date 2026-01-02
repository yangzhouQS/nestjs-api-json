import { Injectable, Logger } from '@nestjs/common';
import { SQLConfig } from './sql-config.interface';
import { APIJSONConfig } from './apijson-config';
import { NotLoggedInException, ConditionErrorException } from './exceptions';

/**
 * AbstractSQLExecutor
 * SQL执行器抽象类
 * 负责SQL执行、结果处理、缓存管理、事务管理
 */
@Injectable()
export abstract class AbstractSQLExecutor<
  T = any,
  M extends Record<string, any> = Record<string, any>,
  L extends any[] = any[]
> {
  protected readonly logger = new Logger(this.constructor.name);

  /** 数据库类型 */
  protected database: string = APIJSONConfig.DEFAULT_DATABASE;

  /** 数据库名称 */
  protected databaseName: string = APIJSONConfig.DEFAULT_DATABASE;

  /** Schema名称 */
  protected schema: string = APIJSONConfig.DEFAULT_SCHEMA;

  /** 数据源名称 */
  protected datasource: string = APIJSONConfig.DEFAULT_DATASOURCE;

  /** Catalog名称 */
  protected catalog: string = '';

  /** 命名空间 */
  protected namespace: string = '';

  /** 是否启用缓存 */
  protected enableCache: boolean = APIJSONConfig.ENABLE_CACHE;

  /** 缓存过期时间（秒） */
  protected cacheExpireTime: number = APIJSONConfig.CACHE_EXPIRE_TIME;

  /** 最大缓存大小 */
  protected maxCacheSize: number = APIJSONConfig.MAX_CACHE_SIZE;

  /** 内存缓存 */
  protected cache: Map<string, { data: M; expireTime: number }> = new Map();

  /** 当前事务连接 */
  protected transactionConnection: any = null;

  /** 是否在事务中 */
  protected inTransaction: boolean = false;

  /**
   * 执行SQL配置
   */
  async execute(config: SQLConfig<T, M, L>, isSubquery: boolean): Promise<M> {
    this.logger.debug('执行SQL配置');

    // 检查缓存
    const cacheKey = await this.getCacheKey(config, isSubquery);
    if (this.enableCache && !isSubquery) {
      const cached = this.cache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        this.logger.debug('从缓存获取结果');
        return cached.data;
      }
    }

    // 执行SQL
    const result = await this.executeSQLConfig(config);

    // 缓存结果
    if (this.enableCache && !isSubquery && result) {
      this.putCache(cacheKey, result);
    }

    return result;
  }

  /**
   * 执行查询SQL
   */
  async executeQuery(sql: string, values: any[]): Promise<Map<string, Object>[]> {
    this.logger.debug(`执行查询SQL: ${sql}, 参数数量: ${values.length}`);

    try {
      const connection = await this.getConnection();
      const result = await this.executeQueryOnConnection(connection, sql, values);
      await this.closeConnection(connection);

      return result;
    } catch (error) {
      this.logger.error(`查询执行失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 执行更新SQL
   */
  async executeUpdate(sql: string, values: any[]): Promise<number> {
    this.logger.debug(`执行更新SQL: ${sql}, 参数数量: ${values.length}`);

    try {
      const connection = await this.getConnection();
      const result = await this.executeUpdateOnConnection(connection, sql, values);
      await this.closeConnection(connection);

      return result;
    } catch (error) {
      this.logger.error(`更新执行失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 执行原始SQL语句
   */
  async executeSQL(sql: string): Promise<any> {
    this.logger.debug(`执行原始SQL: ${sql}`);

    try {
      const connection = await this.getConnection();
      const result = await this.executeRawSQL(connection, sql);
      await this.closeConnection(connection);

      return result;
    } catch (error) {
      this.logger.error(`SQL执行失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 执行表操作（插入、更新、删除）
   */
  async executeTable(table: string, data: Record<string, any>): Promise<any> {
    this.logger.debug(`执行表操作: ${table}`);

    try {
      const connection = await this.getConnection();
      const result = await this.executeTableOperation(connection, table, data);
      await this.closeConnection(connection);

      return result;
    } catch (error) {
      this.logger.error(`表操作执行失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取缓存
   */
  getCache(key: string): M | null {
    const cached = this.cache.get(key);
    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }
    return null;
  }

  /**
   * 设置缓存
   */
  putCache(key: string, value: M): void {
    this.logger.debug(`设置缓存: ${key}`);

    const expireTime = Date.now() + this.cacheExpireTime * 1000;
    this.cache.set(key, { data: value, expireTime });

    // 清理过期缓存
    this.cleanExpiredCache();
  }

  /**
   * 删除缓存
   */
  removeCache(key: string): void {
    this.logger.debug(`删除缓存: ${key}`);
    this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.logger.debug('清空缓存');
    this.cache.clear();
  }

  /**
   * 开始事务
   */
  async begin(transactionIsolation: number): Promise<void> {
    this.logger.debug(`开始事务, 隔离级别: ${transactionIsolation}`);

    if (this.inTransaction) {
      this.logger.warn('已在事务中');
      return;
    }

    try {
      const connection = await this.getConnection();
      await this.beginTransaction(connection, transactionIsolation);
      this.transactionConnection = connection;
      this.inTransaction = true;
    } catch (error) {
      this.logger.error(`开始事务失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 提交事务
   */
  async commit(): Promise<void> {
    this.logger.debug('提交事务');

    if (!this.inTransaction || !this.transactionConnection) {
      this.logger.warn('不在事务中');
      return;
    }

    try {
      await this.commitTransaction(this.transactionConnection);
      await this.closeConnection(this.transactionConnection);
      this.transactionConnection = null;
      this.inTransaction = false;
    } catch (error) {
      this.logger.error(`提交事务失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 回滚到保存点
   */
  async rollback(savepoint?: any): Promise<void> {
    this.logger.debug('回滚到保存点');

    if (!this.inTransaction || !this.transactionConnection) {
      this.logger.warn('不在事务中');
      return;
    }

    try {
      if (savepoint) {
        await this.rollbackToSavepoint(this.transactionConnection, savepoint);
      } else {
        await this.rollbackTransaction(this.transactionConnection);
        await this.closeConnection(this.transactionConnection);
        this.transactionConnection = null;
        this.inTransaction = false;
      }
    } catch (error) {
      this.logger.error(`回滚到保存点失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 设置保存点
   */
  async setSavepoint(name: string): Promise<any> {
    this.logger.debug(`设置保存点: ${name}`);

    if (!this.inTransaction || !this.transactionConnection) {
      throw new ConditionErrorException('不在事务中，无法设置保存点');
    }

    try {
      return await this.createSavepoint(this.transactionConnection, name);
    } catch (error) {
      this.logger.error(`设置保存点失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取数据库连接
   */
  async getConnection(): Promise<any> {
    this.logger.debug('获取数据库连接');

    if (this.inTransaction && this.transactionConnection) {
      return this.transactionConnection;
    }

    return await this.createConnection();
  }

  /**
   * 关闭数据库连接
   */
  async closeConnection(connection: any): Promise<void> {
    this.logger.debug('关闭数据库连接');

    try {
      await this.releaseConnection(connection);
    } catch (error) {
      this.logger.error(`关闭连接失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ========== 抽象方法，子类必须实现 ==========

  /**
   * 执行SQL配置
   */
  abstract executeSQLConfig(config: SQLConfig<T, M, L>): Promise<M>;

  /**
   * 执行查询SQL
   */
  abstract executeQueryOnConnection(connection: any, sql: string, values: any[]): Promise<Map<string, Object>[]>;

  /**
   * 执行更新SQL
   */
  abstract executeUpdateOnConnection(connection: any, sql: string, values: any[]): Promise<number>;

  /**
   * 开始事务
   */
  abstract beginTransaction(connection: any, transactionIsolation: number): Promise<void>;

  /**
   * 提交事务
   */
  abstract commitTransaction(connection: any): Promise<void>;

  /**
   * 回滚事务
   */
  abstract rollbackTransaction(connection: any): Promise<void>;

  /**
   * 回滚到保存点
   */
  abstract rollbackToSavepoint(connection: any, savepoint: any): Promise<void>;

  /**
   * 创建保存点
   */
  abstract createSavepoint(connection: any, name: string): Promise<any>;

  /**
   * 获取数据库连接
   */
  abstract createConnection(): Promise<any>;

  /**
   * 执行原始SQL语句
   */
  abstract executeRawSQL(connection: any, sql: string): Promise<any>;

  /**
   * 执行表操作
   */
  abstract executeTableOperation(connection: any, table: string, data: Record<string, any>): Promise<any>;

  /**
   * 释放数据库连接
   */
  abstract releaseConnection(connection: any): Promise<void>;

  // ========== 受保护方法 ==========

  /**
   * 获取缓存键
   */
  protected async getCacheKey(config: SQLConfig<T, M, L>, isSubquery: boolean): Promise<string> {
    const sql = await config.getSQL(true);
    return `${this.database}:${this.schema}:${sql}:${isSubquery}`;
  }

  /**
   * 判断缓存是否有效
   */
  protected isCacheValid(cached: { data: M; expireTime: number }): boolean {
    return Date.now() < cached.expireTime;
  }

  /**
   * 清理过期缓存
   */
  protected cleanExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, cached] of this.cache.entries()) {
      if (now >= cached.expireTime) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      this.logger.debug(`清理过期缓存: ${keysToDelete.length}个`);
    }
  }

  // ========== Getter/Setter 方法 ==========

  /**
   * 获取数据库类型
   */
  getDatabase(): string {
    return this.database;
  }

  /**
   * 设置数据库类型
   */
  setDatabase(database: string): AbstractSQLExecutor<T, M, L> {
    this.database = database;
    return this;
  }

  /**
   * 获取数据库名称
   */
  getDatabaseName(): string {
    return this.databaseName;
  }

  /**
   * 设置数据库名称
   */
  setDatabaseName(database: string): AbstractSQLExecutor<T, M, L> {
    this.databaseName = database;
    return this;
  }

  /**
   * 获取Schema名称
   */
  getSchema(): string {
    return this.schema;
  }

  /**
   * 设置Schema名称
   */
  setSchema(schema: string): AbstractSQLExecutor<T, M, L> {
    this.schema = schema;
    return this;
  }

  /**
   * 获取数据源名称
   */
  getDatasource(): string {
    return this.datasource;
  }

  /**
   * 设置数据源名称
   */
  setDatasource(datasource: string): AbstractSQLExecutor<T, M, L> {
    this.datasource = datasource;
    return this;
  }

  /**
   * 获取Catalog名称
   */
  getCatalog(): string {
    return this.catalog;
  }

  /**
   * 设置Catalog名称
   */
  setCatalog(catalog: string): AbstractSQLExecutor<T, M, L> {
    this.catalog = catalog;
    return this;
  }

  /**
   * 获取命名空间
   */
  getNamespace(): string {
    return this.namespace;
  }

  /**
   * 设置命名空间
   */
  setNamespace(namespace: string): AbstractSQLExecutor<T, M, L> {
    this.namespace = namespace;
    return this;
  }

  /**
   * 获取是否启用缓存
   */
  isEnableCache(): boolean {
    return this.enableCache;
  }

  /**
   * 设置是否启用缓存
   */
  setEnableCache(enableCache: boolean): AbstractSQLExecutor<T, M, L> {
    this.enableCache = enableCache;
    return this;
  }

  /**
   * 获取缓存过期时间
   */
  getCacheExpireTime(): number {
    return this.cacheExpireTime;
  }

  /**
   * 设置缓存过期时间
   */
  setCacheExpireTime(cacheExpireTime: number): AbstractSQLExecutor<T, M, L> {
    this.cacheExpireTime = cacheExpireTime;
    return this;
  }

  /**
   * 获取最大缓存大小
   */
  getMaxCacheSize(): number {
    return this.maxCacheSize;
  }

  /**
   * 设置最大缓存大小
   */
  setMaxCacheSize(maxCacheSize: number): AbstractSQLExecutor<T, M, L> {
    this.maxCacheSize = maxCacheSize;
    return this;
  }
}
