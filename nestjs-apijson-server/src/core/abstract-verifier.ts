import { Injectable, Logger } from '@nestjs/common';
import { RequestMethod } from '@/types/request-method.enum';
import { SQLConfig } from './sql-config.interface';
import { APIJSONConfig } from './apijson-config';
import { NotLoggedInException, ConditionErrorException, OutOfRangeException } from './exceptions';

/**
 * AbstractVerifier
 * 验证器抽象类
 * 负责登录验证、角色验证、访问控制、内容验证
 */
@Injectable()
export abstract class AbstractVerifier<
  T = any,
  M extends Record<string, any> = Record<string, any>,
  L extends any[] = any[]
> {
  protected readonly logger = new Logger(this.constructor.name);

  /** 当前用户ID */
  protected userId: number | string | null = null;

  /** 当前用户角色 */
  protected role: string = APIJSONConfig.DEFAULT_DATABASE;

  /** 是否启用角色验证 */
  protected enableVerifyRole: boolean = APIJSONConfig.ENABLE_VERIFY_ROLE;

  /** 是否启用内容验证 */
  protected enableVerifyContent: boolean = APIJSONConfig.ENABLE_VERIFY_CONTENT;

  /** 最大更新数量 */
  protected maxUpdateCount: number = APIJSONConfig.MAX_UPDATE_COUNT;

  /**
   * 验证登录
   */
  async verifyLogin(): Promise<void> {
    this.logger.debug('验证登录');

    if (!this.userId) {
      throw new NotLoggedInException('用户未登录');
    }

    this.logger.debug('登录验证通过');
  }

  /**
   * 验证访问权限
   */
  async verifyAccess(config: SQLConfig<T, M, L>): Promise<boolean> {
    this.logger.debug('验证访问权限');

    const table = config.getTable();
    const method = config.getMethod();

    // 检查是否需要登录
    if (this.isRequireLogin(method)) {
      this.verifyLogin();
    }

    // 检查角色权限
    if (this.enableVerifyRole) {
      const hasAccess = await this.checkAccess(table, method, this.role);
      if (!hasAccess) {
        this.logger.warn(`角色 ${this.role} 无权访问表 ${table}`);
        return false;
      }
    }

    return true;
  }

  /**
   * 验证请求
   */
  async verifyRequest(
    method: RequestMethod,
    name: string,
    target: M,
    request: M,
    maxUpdateCount: number,
    database: string,
    schema: string
  ): Promise<M> {
    this.logger.debug(`验证请求: ${name}, 方法: ${method}`);

    // 验证登录
    await this.verifyLogin();

    // 验证角色
    if (this.enableVerifyRole) {
      await this.checkAccess(name, method, this.role);
    }

    // 验证内容
    if (this.enableVerifyContent) {
      await this.verifyContent(method, name, target, request);
    }

    // 验证更新数量
    const updateCount = this.getUpdateCount(request);
    if (updateCount > maxUpdateCount) {
      throw new OutOfRangeException(`更新数量 ${updateCount} 超过最大值 ${maxUpdateCount}`);
    }

    return request;
  }

  /**
   * 验证角色
   */
  async verifyRole(config: SQLConfig<T, M, L>): Promise<void> {
    this.logger.debug('验证角色');

    const table = config.getTable();
    const method = config.getMethod();

    await this.checkAccess(table, method, this.role);
  }

  /**
   * 验证访问权限
   */
  async verifyTableAccess(table: string, method: RequestMethod, role: string): Promise<boolean> {
    this.logger.debug(`验证访问权限: 表=${table}, 方法=${method}, 角色=${role}`);

    // 子类实现具体的权限检查逻辑
    return await this.checkAccess(table, method, role);
  }

  /**
   * 验证内容
   */
  async verifyContent(method: RequestMethod, name: string, target: M, request: M): Promise<void> {
    this.logger.debug(`验证内容: ${name}`);

    // 子类实现具体的内容验证逻辑
    await this.checkContent(method, name, target, request);
  }

  /**
   * 检查是否需要登录
   */
  protected isRequireLogin(method: RequestMethod): boolean {
    // 查询方法通常不需要登录
    if (method === 'GET' || method === 'HEAD') {
      return false;
    }

    // 更新方法需要登录
    return true;
  }

  /**
   * 检查角色访问权限
   */
  protected abstract checkAccess(table: string, method: RequestMethod, role: string): Promise<boolean>;

  /**
   * 检查内容
   */
  protected abstract checkContent(method: RequestMethod, name: string, target: M, request: M): Promise<void>;

  /**
   * 获取更新数量
   */
  protected getUpdateCount(request: M): number {
    let count = 0;

    // 遍历请求对象，统计更新操作的数量
    for (const [key, value] of Object.entries(request)) {
      if (key === '@method') {
        if (value === 'PUT' || value === 'POST' || value === 'DELETE') {
          count++;
        }
      }
    }

    return count;
  }

  // ========== Getter/Setter 方法 ==========

  /**
   * 获取当前用户ID
   */
  getCurrentUserId(): number | string | null {
    return this.userId;
  }

  /**
   * 设置当前用户ID
   */
  setCurrentUserId(userId: number | string | null): AbstractVerifier<T, M, L> {
    this.userId = userId;
    return this;
  }

  /**
   * 获取当前用户角色
   */
  getCurrentRole(): string {
    return this.role;
  }

  /**
   * 设置当前用户角色
   */
  setCurrentRole(role: string): AbstractVerifier<T, M, L> {
    this.role = role;
    return this;
  }

  /**
   * 获取是否启用角色验证
   */
  isEnableVerifyRole(): boolean {
    return this.enableVerifyRole;
  }

  /**
   * 设置是否启用角色验证
   */
  setEnableVerifyRole(enableVerifyRole: boolean): AbstractVerifier<T, M, L> {
    this.enableVerifyRole = enableVerifyRole;
    return this;
  }

  /**
   * 获取是否启用内容验证
   */
  isEnableVerifyContent(): boolean {
    return this.enableVerifyContent;
  }

  /**
   * 设置是否启用内容验证
   */
  setEnableVerifyContent(enableVerifyContent: boolean): AbstractVerifier<T, M, L> {
    this.enableVerifyContent = enableVerifyContent;
    return this;
  }

  /**
   * 获取最大更新数量
   */
  getMaxUpdateCount(): number {
    return this.maxUpdateCount;
  }

  /**
   * 设置最大更新数量
   */
  setMaxUpdateCount(maxUpdateCount: number): AbstractVerifier<T, M, L> {
    this.maxUpdateCount = maxUpdateCount;
    return this;
  }
}
