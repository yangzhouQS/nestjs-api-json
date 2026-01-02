/**
 * Batch Operation Interface
 * 批量操作接口
 * 定义批量操作的基本操作
 */
export interface IBatchOperation {
  /**
   * 批量插入
   * @param table 表名
   * @param data 数据数组
   * @returns 插入结果
   */
  batchInsert<T>(table: string, data: T[]): Promise<BatchResult<T>>;

  /**
   * 批量更新
   * @param table 表名
   * @param data 数据数组，每项必须包含id或id{}
   * @returns 更新结果
   */
  batchUpdate<T>(table: string, data: T[]): Promise<BatchResult<T>>;

  /**
   * 批量删除
   * @param table 表名
   * @param ids ID数组
   * @returns 删除结果
   */
  batchDelete(table: string, ids: (string | number)[]): Promise<BatchResult>;

  /**
   * 批量执行SQL
   * @param sqls SQL语句数组
   * @returns 执行结果
   */
  batchExecute(sqls: string[]): Promise<BatchExecuteResult>;

  /**
   * 批量查询
   * @param queries 查询配置数组
   * @returns 查询结果数组
   */
  batchQuery<T>(queries: BatchQueryConfig[]): Promise<T[]>;
}

/**
 * 批量操作结果接口
 */
export interface BatchResult<T = any> {
  /** 成功数量 */
  successCount: number;
  /** 失败数量 */
  failureCount: number;
  /** 总数量 */
  totalCount: number;
  /** 成功的数据 */
  successData?: T[];
  /** 失败的数据及错误信息 */
  failures?: BatchFailure<T>[];
  /** 生成的ID列表 */
  generatedIds?: (string | number)[];
  /** 影响的行数 */
  affectedRows?: number;
}

/**
 * 批量操作失败信息
 */
export interface BatchFailure<T = any> {
  /** 失败的数据 */
  data: T;
  /** 错误信息 */
  error: Error;
  /** 索引 */
  index: number;
}

/**
 * 批量执行结果
 */
export interface BatchExecuteResult {
  /** 成功数量 */
  successCount: number;
  /** 失败数量 */
  failureCount: number;
  /** 总数量 */
  totalCount: number;
  /** 执行结果 */
  results?: BatchExecuteItem[];
}

/**
 * 批量执行项
 */
export interface BatchExecuteItem {
  /** SQL语句 */
  sql: string;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: Error;
  /** 影响的行数 */
  affectedRows?: number;
  /** 生成的ID */
  generatedId?: string | number;
}

/**
 * 批量查询配置
 */
export interface BatchQueryConfig {
  /** SQL语句 */
  sql: string;
  /** 参数 */
  params?: any[];
  /** 表名 */
  table?: string;
}

/**
 * 批量操作选项
 */
export interface BatchOptions {
  /** 批量大小，默认100 */
  batchSize?: number;
  /** 是否并行执行，默认false */
  parallel?: boolean;
  /** 并行数，默认5 */
  concurrency?: number;
  /** 遇到错误是否继续，默认true */
  continueOnError?: boolean;
  /** 是否使用事务，默认false */
  useTransaction?: boolean;
  /** 重试次数，默认0 */
  retryCount?: number;
  /** 重试延迟（毫秒），默认1000 */
  retryDelay?: number;
  /** 进度回调 */
  onProgress?: BatchProgressCallback;
}

/**
 * 批量操作进度
 */
export interface BatchProgress {
  /** 已处理数量 */
  processed: number;
  /** 总数量 */
  total: number;
  /** 成功数量 */
  success: number;
  /** 失败数量 */
  failure: number;
  /** 进度百分比 */
  percentage: number;
  /** 是否完成 */
  completed: boolean;
}

/**
 * 批量操作进度回调
 */
export type BatchProgressCallback = (progress: BatchProgress) => void;
