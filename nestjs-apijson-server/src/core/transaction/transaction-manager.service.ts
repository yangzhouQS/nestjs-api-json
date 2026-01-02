import { Injectable, Logger, Scope } from '@nestjs/common';
import {
  ITransaction,
  ITransactionManager,
  TransactionStatus,
  TransactionIsolationLevel,
  TransactionOptions,
  TransactionError,
} from './transaction.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Transaction
 * 事务实现类
 */
@Injectable({ scope: Scope.DEFAULT })
export class Transaction implements ITransaction {
  private readonly logger = new Logger(Transaction.name);
  private status: TransactionStatus = TransactionStatus.NOT_STARTED;
  private savepoints: string[] = [];
  private startTime: number = 0;
  private endTime: number = 0;

  constructor(
    private readonly id: string,
    private readonly isolationLevel: TransactionIsolationLevel,
    private readonly readOnly: boolean,
    private readonly timeout: number,
    private readonly onBegin?: () => Promise<void>,
    private readonly onCommit?: () => Promise<void>,
    private readonly onRollback?: () => Promise<void>,
  ) {}

  /**
   * 开始事务
   */
  async begin(): Promise<void> {
    if (this.status !== TransactionStatus.NOT_STARTED) {
      throw new Error(`事务 ${this.id} 已经开始或已结束`);
    }

    this.logger.debug(`开始事务: ${this.id}`);
    this.status = TransactionStatus.ACTIVE;
    this.startTime = Date.now();

    if (this.onBegin) {
      await this.onBegin();
    }
  }

  /**
   * 提交事务
   */
  async commit(): Promise<void> {
    if (this.status !== TransactionStatus.ACTIVE) {
      throw new Error(`事务 ${this.id} 不在活动状态，无法提交`);
    }

    this.logger.debug(`提交事务: ${this.id}`);
    this.status = TransactionStatus.COMMITTED;
    this.endTime = Date.now();

    if (this.onCommit) {
      await this.onCommit();
    }
  }

  /**
   * 回滚事务
   */
  async rollback(): Promise<void> {
    if (this.status !== TransactionStatus.ACTIVE) {
      throw new Error(`事务 ${this.id} 不在活动状态，无法回滚`);
    }

    this.logger.debug(`回滚事务: ${this.id}`);
    this.status = TransactionStatus.ROLLED_BACK;
    this.endTime = Date.now();

    if (this.onRollback) {
      await this.onRollback();
    }
  }

  /**
   * 创建保存点
   * @param name 保存点名称
   */
  async savepoint(name: string): Promise<void> {
    if (this.status !== TransactionStatus.ACTIVE) {
      throw new Error(`事务 ${this.id} 不在活动状态，无法创建保存点`);
    }

    if (this.savepoints.includes(name)) {
      throw new Error(`保存点 ${name} 已存在`);
    }

    this.logger.debug(`创建保存点: ${name} in ${this.id}`);
    this.savepoints.push(name);
  }

  /**
   * 释放保存点
   * @param name 保存点名称
   */
  async releaseSavepoint(name: string): Promise<void> {
    if (this.status !== TransactionStatus.ACTIVE) {
      throw new Error(`事务 ${this.id} 不在活动状态，无法释放保存点`);
    }

    const index = this.savepoints.indexOf(name);
    if (index === -1) {
      throw new Error(`保存点 ${name} 不存在`);
    }

    this.logger.debug(`释放保存点: ${name} in ${this.id}`);
    this.savepoints.splice(index, 1);
  }

  /**
   * 回滚到保存点
   * @param name 保存点名称
   */
  async rollbackToSavepoint(name: string): Promise<void> {
    if (this.status !== TransactionStatus.ACTIVE) {
      throw new Error(`事务 ${this.id} 不在活动状态，无法回滚到保存点`);
    }

    const index = this.savepoints.indexOf(name);
    if (index === -1) {
      throw new Error(`保存点 ${name} 不存在`);
    }

    this.logger.debug(`回滚到保存点: ${name} in ${this.id}`);
    // 释放该保存点之后的所有保存点
    this.savepoints = this.savepoints.slice(0, index + 1);
  }

  /**
   * 检查是否在事务中
   * @returns 是否在事务中
   */
  isInTransaction(): boolean {
    return this.status === TransactionStatus.ACTIVE;
  }

  /**
   * 获取事务ID
   * @returns 事务ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * 获取事务状态
   * @returns 事务状态
   */
  getStatus(): TransactionStatus {
    return this.status;
  }

  /**
   * 获取事务隔离级别
   * @returns 隔离级别
   */
  getIsolationLevel(): TransactionIsolationLevel {
    return this.isolationLevel;
  }

  /**
   * 获取保存点列表
   * @returns 保存点名称数组
   */
  getSavepoints(): string[] {
    return [...this.savepoints];
  }

  /**
   * 获取事务持续时间（毫秒）
   * @returns 持续时间
   */
  getDuration(): number {
    if (this.endTime > 0) {
      return this.endTime - this.startTime;
    }
    return Date.now() - this.startTime;
  }

  /**
   * 检查是否超时
   * @returns 是否超时
   */
  isTimeout(): boolean {
    if (this.timeout <= 0) {
      return false;
    }
    return this.getDuration() > this.timeout * 1000;
  }
}

/**
 * TransactionManagerService
 * 事务管理器服务
 * 负责管理事务的生命周期
 */
@Injectable()
export class TransactionManagerService implements ITransactionManager {
  private readonly logger = new Logger(TransactionManagerService.name);
  private readonly transactions = new Map<string, ITransaction>();
  private readonly asyncLocalStorage = new AsyncLocalStorage<ITransaction>();

  /**
   * 开始新事务
   * @param options 事务选项
   * @returns 事务实例
   */
  async beginTransaction(options?: TransactionOptions): Promise<ITransaction> {
    const id = uuidv4();
    const isolationLevel = options?.isolationLevel || TransactionIsolationLevel.READ_COMMITTED;
    const readOnly = options?.readOnly || false;
    const timeout = options?.timeout || 0;

    this.logger.debug(`开始新事务: ${id}, 隔离级别: ${isolationLevel}`);

    const transaction = new Transaction(
      id,
      isolationLevel,
      readOnly,
      timeout,
      async () => {
        // 开始事务的回调
        this.logger.debug(`事务 ${id} 开始`);
      },
      async () => {
        // 提交事务的回调
        this.logger.debug(`事务 ${id} 提交`);
        this.transactions.delete(id);
      },
      async () => {
        // 回滚事务的回调
        this.logger.debug(`事务 ${id} 回滚`);
        this.transactions.delete(id);
      },
    );

    await transaction.begin();
    this.transactions.set(id, transaction);

    return transaction;
  }

  /**
   * 获取当前事务
   * @returns 当前事务实例
   */
  getCurrentTransaction(): ITransaction | null {
    return this.asyncLocalStorage.getStore() || null;
  }

  /**
   * 提交当前事务
   */
  async commitCurrentTransaction(): Promise<void> {
    const transaction = this.getCurrentTransaction();
    if (!transaction) {
      throw new Error('没有活动的事务');
    }

    await transaction.commit();
  }

  /**
   * 回滚当前事务
   */
  async rollbackCurrentTransaction(): Promise<void> {
    const transaction = this.getCurrentTransaction();
    if (!transaction) {
      throw new Error('没有活动的事务');
    }

    await transaction.rollback();
  }

  /**
   * 在事务中执行操作
   * @param callback 回调函数
   * @param options 事务选项
   * @returns 回调函数的返回值
   */
  async runInTransaction<T>(
    callback: (transaction: ITransaction) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    const transaction = await this.beginTransaction(options);

    return this.asyncLocalStorage.run(transaction, async () => {
      try {
        const result = await callback(transaction);
        await transaction.commit();
        return result;
      } catch (error) {
        this.logger.error(`事务执行失败: ${transaction.getId()}`, error);
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          this.logger.error(`事务回滚失败: ${transaction.getId()}`, rollbackError);
        }
        throw error;
      }
    });
  }

  /**
   * 检查是否有活动事务
   * @returns 是否有活动事务
   */
  hasActiveTransaction(): boolean {
    return this.getCurrentTransaction() !== null;
  }

  /**
   * 获取所有活动事务
   * @returns 活动事务数组
   */
  getActiveTransactions(): ITransaction[] {
    return Array.from(this.transactions.values()).filter((t) => t.getStatus() === TransactionStatus.ACTIVE);
  }

  /**
   * 获取事务统计信息
   * @returns 事务统计信息
   */
  getStats(): TransactionStats {
    const transactions = Array.from(this.transactions.values());
    const active = transactions.filter((t) => t.getStatus() === TransactionStatus.ACTIVE).length;
    const committed = transactions.filter((t) => t.getStatus() === TransactionStatus.COMMITTED).length;
    const rolledBack = transactions.filter((t) => t.getStatus() === TransactionStatus.ROLLED_BACK).length;

    return {
      total: transactions.length,
      active,
      committed,
      rolledBack,
    };
  }

  /**
   * 清理已完成的事务
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, transaction] of this.transactions.entries()) {
      const status = transaction.getStatus();
      if (
        status === TransactionStatus.COMMITTED ||
        status === TransactionStatus.ROLLED_BACK ||
        status === TransactionStatus.FAILED
      ) {
        this.transactions.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`清理了 ${cleaned} 个已完成的事务`);
    }
  }
}

/**
 * 事务统计信息
 */
export interface TransactionStats {
  /** 总事务数 */
  total: number;
  /** 活动事务数 */
  active: number;
  /** 已提交事务数 */
  committed: number;
  /** 已回滚事务数 */
  rolledBack: number;
}

/**
 * AsyncLocalStorage polyfill for Node.js
 */
class AsyncLocalStorage<T> {
  private store: T | null = null;

  run<R>(store: T, callback: () => Promise<R>): Promise<R> {
    const previousStore = this.store;
    this.store = store;
    return callback().finally(() => {
      this.store = previousStore;
    });
  }

  getStore(): T | null {
    return this.store;
  }
}
