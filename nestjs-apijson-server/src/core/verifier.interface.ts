import { RequestMethod } from '@/types/request-method.enum';
import { SQLConfig } from './sql-config.interface';

/**
 * Verifier接口
 * 验证器接口，负责权限验证和内容验证
 */
export interface Verifier<
  T = any,
  M extends Record<string, any> = Record<string, any>,
  L extends any[] = any[]
> {
  /**
   * 验证登录
   * @throws NotLoggedInException 未登录时抛出异常
   */
  verifyLogin(): Promise<void>;

  /**
   * 验证访问权限
   * @param config SQL配置
   * @returns 是否有访问权限
   */
  verifyAccess(config: SQLConfig<T, M, L>): Promise<boolean>;

  /**
   * 验证请求
   * @param method 请求方法
   * @param name 名称
   * @param target 目标对象
   * @param request 请求对象
   * @param maxUpdateCount 最大更新数量
   * @param database 数据库名称
   * @param schema Schema名称
   * @returns 验证后的请求
   */
  verifyRequest(
    method: RequestMethod,
    name: string,
    target: M,
    request: M,
    maxUpdateCount: number,
    database: string,
    schema: string
  ): Promise<M>;

  /**
   * 验证角色
   * @param config SQL配置
   */
  verifyRole(config: SQLConfig<T, M, L>): Promise<void>;

  /**
   * 验证访问权限
   * @param table 表名
   * @param method 请求方法
   * @param role 角色
   * @returns 是否有访问权限
   */
  verifyAccess(table: string, method: RequestMethod, role: string): Promise<boolean>;

  /**
   * 验证内容
   * @param method 请求方法
   * @param table 表名
   * @param content 内容
   */
  verifyContent(method: RequestMethod, table: string, content: M): Promise<void>;

  /**
   * 获取当前用户ID
   * @returns 用户ID
   */
  getCurrentUserId(): number | string;

  /**
   * 设置当前用户ID
   * @param userId 用户ID
   */
  setCurrentUserId(userId: number | string): void;

  /**
   * 获取当前用户角色
   * @returns 用户角色
   */
  getCurrentRole(): string;

  /**
   * 设置当前用户角色
   * @param role 用户角色
   */
  setCurrentRole(role: string): void;

  /**
   * 获取是否启用角色验证
   * @returns 是否启用角色验证
   */
  isEnableVerifyRole(): boolean;

  /**
   * 设置是否启用角色验证
   * @param enableVerifyRole 是否启用角色验证
   */
  setEnableVerifyRole(enableVerifyRole: boolean): void;

  /**
   * 获取是否启用内容验证
   * @returns 是否启用内容验证
   */
  isEnableVerifyContent(): boolean;

  /**
   * 设置是否启用内容验证
   * @param enableVerifyContent 是否启用内容验证
   */
  setEnableVerifyContent(enableVerifyContent: boolean): void;

  /**
   * 获取最大更新数量
   * @returns 最大更新数量
   */
  getMaxUpdateCount(): number;

  /**
   * 设置最大更新数量
   * @param maxUpdateCount 最大更新数量
   */
  setMaxUpdateCount(maxUpdateCount: number): void;
}

/**
 * 角色常量
 */
export const RoleConstants = {
  /** 未知角色 */
  UNKNOWN: 'UNKNOWN',
  /** 已登录用户 */
  LOGIN: 'LOGIN',
  /** 联系人 */
  CONTACT: 'CONTACT',
  /** 圈子 */
  CIRCLE: 'CIRCLE',
  /** 所有者 */
  OWNER: 'OWNER',
  /** 管理员 */
  ADMIN: 'ADMIN',
} as const;

/**
 * 角色类型
 */
export type Role = typeof RoleConstants[keyof typeof RoleConstants];
