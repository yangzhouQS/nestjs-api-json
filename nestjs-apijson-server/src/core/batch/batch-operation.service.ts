import { Injectable, Logger } from '@nestjs/common';
import {
  IBatchOperation,
  BatchResult,
  BatchFailure,
  BatchExecuteResult,
  BatchExecuteItem,
  BatchQueryConfig,
  BatchOptions,
  BatchProgress,
  BatchProgressCallback,
} from './batch-operation.interface';
import { ITransactionManager, TransactionIsolationLevel } from '../transaction/transaction.interface';
import { SQLExecutor } from '../sql-executor.interface';

/**
 * BatchOperationService
 * 批量操作服务
 * 负责批量插入、更新、删除等操作
 */
@Injectable()
export class BatchOperationService implements IBatchOperation {
  private readonly logger = new Logger(BatchOperationService.name);

  constructor(
    private readonly sqlExecutor: SQLExecutor,
    private readonly transactionManager: ITransactionManager,
  ) {}

  /**
   * 批量插入
   * @param table 表名
   * @param data 数据数组
   * @param options 批量操作选项
   * @returns 插入结果
   */
  async batchInsert<T>(
    table: string,
    data: T[],
    options?: BatchOptions,
  ): Promise<BatchResult<T>> {
    this.logger.debug(`批量插入: ${table}, 数量: ${data.length}`);

    const opts = this.normalizeOptions(options);
    const result: BatchResult<T> = {
      successCount: 0,
      failureCount: 0,
      totalCount: data.length,
      successData: [],
      failures: [],
      generatedIds: [],
    };

    // 分批处理
    const batches = this.splitIntoBatches(data, opts.batchSize!);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.logger.debug(`处理批次 ${i + 1}/${batches.length}, 数量: ${batch.length}`);

      if (opts.useTransaction) {
        await this.processBatchInTransaction(table, batch, result, opts);
      } else {
        await this.processBatch(table, batch, result, opts);
      }

      // 报告进度
      if (opts.onProgress) {
        opts.onProgress(this.calculateProgress(result.successCount + result.failureCount, data.length));
      }
    }

    return result;
  }

  /**
   * 批量更新
   * @param table 表名
   * @param data 数据数组，每项必须包含id或id{}
   * @param options 批量操作选项
   * @returns 更新结果
   */
  async batchUpdate<T>(
    table: string,
    data: T[],
    options?: BatchOptions,
  ): Promise<BatchResult<T>> {
    this.logger.debug(`批量更新: ${table}, 数量: ${data.length}`);

    const opts = this.normalizeOptions(options);
    const result: BatchResult<T> = {
      successCount: 0,
      failureCount: 0,
      totalCount: data.length,
      successData: [],
      failures: [],
    };

    // 分批处理
    const batches = this.splitIntoBatches(data, opts.batchSize!);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.logger.debug(`处理批次 ${i + 1}/${batches.length}, 数量: ${batch.length}`);

      if (opts.useTransaction) {
        await this.processUpdateBatchInTransaction(table, batch, result, opts);
      } else {
        await this.processUpdateBatch(table, batch, result, opts);
      }

      // 报告进度
      if (opts.onProgress) {
        opts.onProgress(this.calculateProgress(result.successCount + result.failureCount, data.length));
      }
    }

    return result;
  }

  /**
   * 批量删除
   * @param table 表名
   * @param ids ID数组
   * @param options 批量操作选项
   * @returns 删除结果
   */
  async batchDelete(
    table: string,
    ids: (string | number)[],
    options?: BatchOptions,
  ): Promise<BatchResult> {
    this.logger.debug(`批量删除: ${table}, 数量: ${ids.length}`);

    const opts = this.normalizeOptions(options);
    const result: BatchResult = {
      successCount: 0,
      failureCount: 0,
      totalCount: ids.length,
    };

    // 分批处理
    const batches = this.splitIntoBatches(ids, opts.batchSize!);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.logger.debug(`处理批次 ${i + 1}/${batches.length}, 数量: ${batch.length}`);

      if (opts.useTransaction) {
        await this.processDeleteBatchInTransaction(table, batch, result, opts);
      } else {
        await this.processDeleteBatch(table, batch, result, opts);
      }

      // 报告进度
      if (opts.onProgress) {
        opts.onProgress(this.calculateProgress(result.successCount + result.failureCount, ids.length));
      }
    }

    return result;
  }

  /**
   * 批量执行SQL
   * @param sqls SQL语句数组
   * @param options 批量操作选项
   * @returns 执行结果
   */
  async batchExecute(sqls: string[], options?: BatchOptions): Promise<BatchExecuteResult> {
    this.logger.debug(`批量执行SQL, 数量: ${sqls.length}`);

    const opts = this.normalizeOptions(options);
    const result: BatchExecuteResult = {
      successCount: 0,
      failureCount: 0,
      totalCount: sqls.length,
      results: [],
    };

    // 分批处理
    const batches = this.splitIntoBatches(sqls, opts.batchSize!);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.logger.debug(`处理批次 ${i + 1}/${batches.length}, 数量: ${batch.length}`);

      if (opts.useTransaction) {
        await this.processExecuteBatchInTransaction(batch, result, opts);
      } else {
        await this.processExecuteBatch(batch, result, opts);
      }

      // 报告进度
      if (opts.onProgress) {
        opts.onProgress(this.calculateProgress(result.successCount + result.failureCount, sqls.length));
      }
    }

    return result;
  }

  /**
   * 批量查询
   * @param queries 查询配置数组
   * @param options 批量操作选项
   * @returns 查询结果数组
   */
  async batchQuery<T>(queries: BatchQueryConfig[], options?: BatchOptions): Promise<T[]> {
    this.logger.debug(`批量查询, 数量: ${queries.length}`);

    const opts = this.normalizeOptions(options);
    const results: T[] = [];

    // 分批处理
    const batches = this.splitIntoBatches(queries, opts.batchSize!);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.logger.debug(`处理批次 ${i + 1}/${batches.length}, 数量: ${batch.length}`);

      if (opts.parallel) {
        const batchResults = await this.processQueryBatchParallel(batch, opts);
        results.push(...(batchResults as T[]));
      } else {
        const batchResults = await this.processQueryBatchSequential(batch, opts);
        results.push(...(batchResults as T[]));
      }

      // 报告进度
      if (opts.onProgress) {
        opts.onProgress(this.calculateProgress(results.length, queries.length));
      }
    }

    return results;
  }

  /**
   * 处理插入批次
   */
  private async processBatch<T>(
    table: string,
    batch: T[],
    result: BatchResult<T>,
    options: BatchOptions,
  ): Promise<void> {
    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      try {
        const insertResult = await this.executeWithRetry(
          () => this.sqlExecutor.executeTable(table, item),
          options.retryCount!,
          options.retryDelay!,
        );
        result.successCount++;
        result.successData!.push(item);
        if (insertResult?.id) {
          result.generatedIds!.push(insertResult.id);
        }
      } catch (error) {
        result.failureCount++;
        result.failures!.push({
          data: item,
          error: error as Error,
          index: i,
        });
        this.logger.error(`批量插入失败`, error);

        if (!options.continueOnError) {
          throw error;
        }
      }
    }
  }

  /**
   * 在事务中处理插入批次
   */
  private async processBatchInTransaction<T>(
    table: string,
    batch: T[],
    result: BatchResult<T>,
    options: BatchOptions,
  ): Promise<void> {
    try {
      await this.transactionManager.runInTransaction(async (transaction) => {
        for (let i = 0; i < batch.length; i++) {
          const item = batch[i];
          try {
            const insertResult = await this.executeWithRetry(
              () => this.sqlExecutor.executeTable(table, item),
              options.retryCount!,
              options.retryDelay!,
            );
            result.successCount++;
            result.successData!.push(item);
            if (insertResult?.id) {
              result.generatedIds!.push(insertResult.id);
            }
          } catch (error) {
            result.failureCount++;
            result.failures!.push({
              data: item,
              error: error as Error,
              index: i,
            });
            this.logger.error(`批量插入失败`, error);

            if (!options.continueOnError) {
              throw error;
            }
          }
        }
      });
    } catch (error) {
      this.logger.error('事务执行失败', error);
      throw error;
    }
  }

  /**
   * 处理更新批次
   */
  private async processUpdateBatch<T>(
    table: string,
    batch: T[],
    result: BatchResult<T>,
    options: BatchOptions,
  ): Promise<void> {
    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      try {
        await this.executeWithRetry(
          () => this.sqlExecutor.executeTable(table, item),
          options.retryCount!,
          options.retryDelay!,
        );
        result.successCount++;
        result.successData!.push(item);
      } catch (error) {
        result.failureCount++;
        result.failures!.push({
          data: item,
          error: error as Error,
          index: i,
        });
        this.logger.error(`批量更新失败`, error);

        if (!options.continueOnError) {
          throw error;
        }
      }
    }
  }

  /**
   * 在事务中处理更新批次
   */
  private async processUpdateBatchInTransaction<T>(
    table: string,
    batch: T[],
    result: BatchResult<T>,
    options: BatchOptions,
  ): Promise<void> {
    try {
      await this.transactionManager.runInTransaction(async (transaction) => {
        for (let i = 0; i < batch.length; i++) {
          const item = batch[i];
          try {
            await this.executeWithRetry(
              () => this.sqlExecutor.executeTable(table, item),
              options.retryCount!,
              options.retryDelay!,
            );
            result.successCount++;
            result.successData!.push(item);
          } catch (error) {
            result.failureCount++;
            result.failures!.push({
              data: item,
              error: error as Error,
              index: i,
            });
            this.logger.error(`批量更新失败`, error);

            if (!options.continueOnError) {
              throw error;
            }
          }
        }
      });
    } catch (error) {
      this.logger.error('事务执行失败', error);
      throw error;
    }
  }

  /**
   * 处理删除批次
   */
  private async processDeleteBatch(
    table: string,
    batch: (string | number)[],
    result: BatchResult,
    options: BatchOptions,
  ): Promise<void> {
    for (const id of batch) {
      try {
        await this.executeWithRetry(
          () => this.sqlExecutor.executeTable(table, { id }),
          options.retryCount!,
          options.retryDelay!,
        );
        result.successCount++;
      } catch (error) {
        result.failureCount++;
        this.logger.error(`批量删除失败: id=${id}`, error);

        if (!options.continueOnError) {
          throw error;
        }
      }
    }
  }

  /**
   * 在事务中处理删除批次
   */
  private async processDeleteBatchInTransaction(
    table: string,
    batch: (string | number)[],
    result: BatchResult,
    options: BatchOptions,
  ): Promise<void> {
    try {
      await this.transactionManager.runInTransaction(async (transaction) => {
        for (const id of batch) {
          try {
            await this.executeWithRetry(
              () => this.sqlExecutor.executeTable(table, { id }),
              options.retryCount!,
              options.retryDelay!,
            );
            result.successCount++;
          } catch (error) {
            result.failureCount++;
            this.logger.error(`批量删除失败: id=${id}`, error);

            if (!options.continueOnError) {
              throw error;
            }
          }
        }
      });
    } catch (error) {
      this.logger.error('事务执行失败', error);
      throw error;
    }
  }

  /**
   * 处理执行批次
   */
  private async processExecuteBatch(
    batch: string[],
    result: BatchExecuteResult,
    options: BatchOptions,
  ): Promise<void> {
    for (let i = 0; i < batch.length; i++) {
      const sql = batch[i];
      try {
        const executeResult = await this.executeWithRetry(
          () => this.sqlExecutor.executeSQL(sql),
          options.retryCount!,
          options.retryDelay!,
        );
        result.successCount++;
        const resultItem: any = executeResult || {};
        result.results!.push({
          sql,
          success: true,
          affectedRows: resultItem.affectedRows,
          generatedId: resultItem.generatedId,
        });
      } catch (error) {
        result.failureCount++;
        result.results!.push({
          sql,
          success: false,
          error: error as Error,
        });
        this.logger.error(`批量执行SQL失败`, error);

        if (!options.continueOnError) {
          throw error;
        }
      }
    }
  }

  /**
   * 在事务中处理执行批次
   */
  private async processExecuteBatchInTransaction(
    batch: string[],
    result: BatchExecuteResult,
    options: BatchOptions,
  ): Promise<void> {
    try {
      await this.transactionManager.runInTransaction(async (transaction) => {
        for (let i = 0; i < batch.length; i++) {
          const sql = batch[i];
          try {
            const executeResult = await this.executeWithRetry(
              () => this.sqlExecutor.executeSQL(sql),
              options.retryCount!,
              options.retryDelay!,
            );
            result.successCount++;
            const resultItem: any = executeResult || {};
            result.results!.push({
              sql,
              success: true,
              affectedRows: resultItem.affectedRows,
              generatedId: resultItem.generatedId,
            });
          } catch (error) {
            result.failureCount++;
            result.results!.push({
              sql,
              success: false,
              error: error as Error,
            });
            this.logger.error(`批量执行SQL失败`, error);

            if (!options.continueOnError) {
              throw error;
            }
          }
        }
      });
    } catch (error) {
      this.logger.error('事务执行失败', error);
      throw error;
    }
  }

  /**
   * 顺序处理查询批次
   */
  private async processQueryBatchSequential<T>(
    batch: BatchQueryConfig[],
    options: BatchOptions,
  ): Promise<T[]> {
    const results: T[] = [];

    for (const query of batch) {
      try {
        const result = await this.executeWithRetry(
          () => this.sqlExecutor.executeQuery(query.sql, query.params || []),
          options.retryCount!,
          options.retryDelay!,
        );
        results.push(result as T);
      } catch (error) {
        this.logger.error(`批量查询失败`, error);
        if (!options.continueOnError) {
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * 并行处理查询批次
   */
  private async processQueryBatchParallel<T>(
    batch: BatchQueryConfig[],
    options: BatchOptions,
  ): Promise<T[]> {
    const concurrency = options.concurrency || 5;
    const results: T[] = [];

    for (let i = 0; i < batch.length; i += concurrency) {
      const chunk = batch.slice(i, i + concurrency);
      const promises = chunk.map((query) =>
        this.executeWithRetry(
          () => this.sqlExecutor.executeQuery(query.sql, query.params || []),
          options.retryCount!,
          options.retryDelay!,
        ),
      );

      try {
        const chunkResults = await Promise.all(promises);
        results.push(...(chunkResults as T[]));
      } catch (error) {
        this.logger.error(`批量查询失败`, error);
        if (!options.continueOnError) {
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * 带重试的执行
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    retryCount: number,
    retryDelay: number,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i <= retryCount; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < retryCount) {
          this.logger.debug(`重试 ${i + 1}/${retryCount}, 延迟 ${retryDelay}ms`);
          await this.sleep(retryDelay);
        }
      }
    }

    throw lastError;
  }

  /**
   * 分割为批次
   */
  private splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * 规范化选项
   */
  private normalizeOptions(options?: BatchOptions): Required<BatchOptions> {
    return {
      batchSize: options?.batchSize || 100,
      parallel: options?.parallel || false,
      concurrency: options?.concurrency || 5,
      continueOnError: options?.continueOnError !== false,
      useTransaction: options?.useTransaction || false,
      retryCount: options?.retryCount || 0,
      retryDelay: options?.retryDelay || 1000,
      onProgress: options?.onProgress,
    };
  }

  /**
   * 计算进度
   */
  private calculateProgress(processed: number, total: number): BatchProgress {
    const percentage = total > 0 ? (processed / total) * 100 : 0;

    return {
      processed,
      total,
      success: 0, // 需要从外部传入
      failure: 0, // 需要从外部传入
      percentage,
      completed: processed >= total,
    };
  }

  /**
   * 睡眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
