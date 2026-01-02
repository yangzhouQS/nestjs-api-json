/**
 * Transaction Interface
 * 事务接口
 * 定义事务的基本操作
 */
export interface ITransaction {
  /**
   * 开始事务
   */
  begin(): Promise<void>;

  /**
   * 提交事务
   */
  commit(): Promise<void>;

  /**
   * 回滚事务
   */
  rollback(): Promise<void>;

  /**
   * 创建保存点
   * @param name 保存点名称
   */
  savepoint(name: string): Promise<void>;

  /**
   * 释放保存点
   * @param name 保存点名称
   */
  releaseSavepoint(name: string): Promise<void>;

  /**
   * 回滚到保存点
   * @param name 保存点名称
   */
  rollbackToSavepoint(name: string): Promise<void>;

  /**
   * 检查是否在事务中
   * @returns 是否在事务中
   */
  isInTransaction(): boolean;

  /**
   * 获取事务ID
   * @returns 事务ID
   */
  getId(): string;

  /**
   * 获取事务状态
   * @returns 事务状态
   */
  getStatus(): TransactionStatus;

  /**
   * 获取事务隔离级别
   * @returns 隔离级别
   */
  getIsolationLevel(): TransactionIsolationLevel;

  /**
   * 获取保存点列表
   * @returns 保存点名称数组
   */
  getSavepoints(): string[];
}

/**
 * 事务状态枚举
 */
export enum TransactionStatus {
  /** 未开始 */
  NOT_STARTED = 'NOT_STARTED',
  /** 进行中 */
  ACTIVE = 'ACTIVE',
  /** 已提交 */
  COMMITTED = 'COMMITTED',
  /** 已回滚 */
  ROLLED_BACK = 'ROLLED_BACK',
  /** 失败 */
  FAILED = 'FAILED',
}

/**
 * 事务隔离级别枚举
 */
export enum TransactionIsolationLevel {
  /** 读未提交 */
  READ_UNCOMMITTED = 'READ_UNCOMMITTED',
  /** 读已提交 */
  READ_COMMITTED = 'READ_COMMITTED',
  /** 可重复读 */
  REPEATABLE_READ = 'REPEATABLE_READ',
  /** 串行化 */
  SERIALIZABLE = 'SERIALIZABLE',
}

/**
 * 事务配置接口
 */
export interface TransactionOptions {
  /** 隔离级别 */
  isolationLevel?: TransactionIsolationLevel;
  /** 是否只读 */
  readOnly?: boolean;
  /** 超时时间（秒） */
  timeout?: number;
}

/**
 * 事务管理器接口
 */
export interface ITransactionManager {
  /**
   * 开始新事务
   * @param options 事务选项
   * @returns 事务实例
   */
  beginTransaction(options?: TransactionOptions): Promise<ITransaction>;

  /**
   * 获取当前事务
   * @returns 当前事务实例
   */
  getCurrentTransaction(): ITransaction | null;

  /**
   * 提交当前事务
   */
  commitCurrentTransaction(): Promise<void>;

  /**
   * 回滚当前事务
   */
  rollbackCurrentTransaction(): Promise<void>;

  /**
   * 在事务中执行操作
   * @param callback 回调函数
   * @param options 事务选项
   * @returns 回调函数的返回值
   */
  runInTransaction<T>(
    callback: (transaction: ITransaction) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T>;

  /**
   * 检查是否有活动事务
   * @returns 是否有活动事务
   */
  hasActiveTransaction(): boolean;
}

/**
 * 事务错误接口
 */
export interface TransactionError extends Error {
  /** 事务ID */
  transactionId: string;
  /** 原始错误 */
  originalError?: Error;
}
