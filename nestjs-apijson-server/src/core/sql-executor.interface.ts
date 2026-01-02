import { SQLConfig } from './sql-config.interface';

/**
 * SQLExecutor接口
 * SQL执行器接口，负责SQL语句的执行和结果处理
 */
export interface SQLExecutor<
  T = any,
  M extends Record<string, any> = Record<string, any>,
  L extends any[] = any[]
> {
  /**
   * 执行SQL配置
   * @param config SQL配置
   * @param isSubquery 是否为子查询
   * @returns 执行结果
   */
  execute(config: SQLConfig<T, M, L>, isSubquery: boolean): Promise<M>;

  /**
   * 执行查询SQL
   * @param sql SQL语句
   * @param values 参数值
   * @returns 查询结果
   */
  executeQuery(sql: string, values: any[]): Promise<Map<string, Object>[]>;

  /**
   * 执行更新SQL
   * @param sql SQL语句
   * @param values 参数值
   * @returns 影响行数
   */
  executeUpdate(sql: string, values: any[]): Promise<number>;

  /**
   * 执行原始SQL语句
   * @param sql SQL语句
   * @returns 执行结果
   */
  executeSQL(sql: string): Promise<any>;

  /**
   * 执行表操作（插入、更新、删除）
   * @param table 表名
   * @param data 数据对象
   * @returns 执行结果
   */
  executeTable(table: string, data: Record<string, any>): Promise<any>;

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存值
   */
  getCache(key: string): M | null;

  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   */
  putCache(key: string, value: M): void;

  /**
   * 删除缓存
   * @param key 缓存键
   */
  removeCache(key: string): void;

  /**
   * 清空缓存
   */
  clearCache(): void;

  /**
   * 开始事务
   * @param transactionIsolation 事务隔离级别
   */
  begin(transactionIsolation: number): Promise<void>;

  /**
   * 提交事务
   */
  commit(): Promise<void>;

  /**
   * 回滚事务
   */
  rollback(): Promise<void>;

  /**
   * 回滚到保存点
   * @param savepoint 保存点
   */
  rollback(savepoint: any): Promise<void>;

  /**
   * 设置保存点
   * @param name 保存点名称
   * @returns 保存点
   */
  setSavepoint(name: string): Promise<any>;

  /**
   * 获取数据库连接
   * @returns 数据库连接
   */
  getConnection(): Promise<any>;

  /**
   * 关闭数据库连接
   * @param connection 数据库连接
   */
  closeConnection(connection: any): Promise<void>;

  /**
   * 获取数据库类型
   * @returns 数据库类型
   */
  getDatabase(): string;

  /**
   * 设置数据库类型
   * @param database 数据库类型
   */
  setDatabase(database: string): void;

  /**
   * 获取数据源名称
   * @returns 数据源名称
   */
  getDatasource(): string;

  /**
   * 设置数据源名称
   * @param datasource 数据源名称
   */
  setDatasource(datasource: string): void;

  /**
   * 获取数据库名称
   * @returns 数据库名称
   */
  getDatabaseName(): string;

  /**
   * 设置数据库名称
   * @param database 数据库名称
   */
  setDatabaseName(database: string): void;

  /**
   * 获取Schema名称
   * @returns Schema名称
   */
  getSchema(): string;

  /**
   * 设置Schema名称
   * @param schema Schema名称
   */
  setSchema(schema: string): void;

  /**
   * 获取Catalog名称
   * @returns Catalog名称
   */
  getCatalog(): string;

  /**
   * 设置Catalog名称
   * @param catalog Catalog名称
   */
  setCatalog(catalog: string): void;

  /**
   * 获取命名空间
   * @returns 命名空间
   */
  getNamespace(): string;

  /**
   * 设置命名空间
   * @param namespace 命名空间
   */
  setNamespace(namespace: string): void;

  /**
   * 获取是否启用缓存
   * @returns 是否启用缓存
   */
  isEnableCache(): boolean;

  /**
   * 设置是否启用缓存
   * @param enableCache 是否启用缓存
   */
  setEnableCache(enableCache: boolean): void;

  /**
   * 获取缓存过期时间
   * @returns 缓存过期时间（秒）
   */
  getCacheExpireTime(): number;

  /**
   * 设置缓存过期时间
   * @param cacheExpireTime 缓存过期时间（秒）
   */
  setCacheExpireTime(cacheExpireTime: number): void;

  /**
   * 获取最大缓存大小
   * @returns 最大缓存大小
   */
  getMaxCacheSize(): number;

  /**
   * 设置最大缓存大小
   * @param maxCacheSize 最大缓存大小
   */
  setMaxCacheSize(maxCacheSize: number): void;
}
