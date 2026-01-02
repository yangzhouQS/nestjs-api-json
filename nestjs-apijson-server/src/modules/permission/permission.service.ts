import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

/**
 * 表操作权限接口
 */
export interface TablePermission {
  tableName: string;
  roles: string[];
  operations: string[];
  columns?: string[];
}

/**
 * 用户权限接口
 */
export interface UserPermission {
  userId: number;
  username: string;
  roles: string[];
  permissions: string[];
}

/**
 * 权限检查结果
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * 表操作权限管理服务
 * 负责管理用户对数据库表的操作权限
 */
@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  // 内存存储权限配置（生产环境应使用数据库）
  private tablePermissions: Map<string, TablePermission> = new Map();
  private userPermissions: Map<number, UserPermission> = new Map();

  constructor() {
    // 初始化默认权限配置
    this.initializeDefaultPermissions();
  }

  /**
   * 初始化默认权限配置
   */
  private initializeDefaultPermissions(): void {
    this.logger.log('初始化默认权限配置');

    // 默认表权限配置
    const defaultPermissions: TablePermission[] = [
      {
        tableName: 'User',
        roles: ['admin', 'owner'],
        operations: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
      },
      {
        tableName: 'Moment',
        roles: ['admin', 'owner', 'login'],
        operations: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
      },
      {
        tableName: 'Comment',
        roles: ['admin', 'owner', 'login', 'contact'],
        operations: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
      },
    ];

    for (const permission of defaultPermissions) {
      this.tablePermissions.set(permission.tableName, permission);
    }

    this.logger.log(`默认权限配置初始化完成，共 ${defaultPermissions.length} 个表`);
  }

  /**
   * 检查用户对表的操作权限
   * @param userId 用户ID
   * @param tableName 表名
   * @param operation 操作类型（SELECT, INSERT, UPDATE, DELETE）
   * @param columns 要访问的列（可选）
   * @returns 权限检查结果
   */
  async checkTablePermission(
    userId: number,
    tableName: string,
    operation: string,
    columns?: string[]
  ): Promise<PermissionCheckResult> {
    this.logger.debug(`检查用户 ${userId} 对表 ${tableName} 的 ${operation} 权限`);

    // 获取用户权限信息
    const userPermission = await this.getUserPermission(userId);
    if (!userPermission) {
      return {
        allowed: false,
        reason: '用户不存在或未配置权限',
      };
    }

    // 获取表权限配置
    const tablePermission = this.tablePermissions.get(tableName);
    if (!tablePermission) {
      // 如果表没有配置权限，默认允许登录用户访问
      return userPermission.roles.includes('login')
        ? { allowed: true }
        : {
            allowed: false,
            reason: '表未配置权限',
          };
    }

    // 检查角色权限
    const hasRole = tablePermission.roles.some(role =>
      userPermission.roles.includes(role)
    );

    if (!hasRole) {
      return {
        allowed: false,
        reason: `需要以下角色之一: ${tablePermission.roles.join(', ')}`,
      };
    }

    // 检查操作权限
    const hasOperation = tablePermission.operations.includes(operation);
    if (!hasOperation) {
      return {
        allowed: false,
        reason: `不允许执行 ${operation} 操作`,
      };
    }

    // 检查列权限（如果指定了列）
    if (columns && columns.length > 0 && tablePermission.columns) {
      const hasColumnAccess = columns.some(col =>
        tablePermission.columns?.includes(col)
      );

      if (!hasColumnAccess) {
        return {
          allowed: false,
          reason: `无权访问指定列: ${columns.join(', ')}`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * 批量检查表操作权限
   * @param userId 用户ID
   * @param tableOperations 表操作数组
   * @returns 权限检查结果映射
   */
  async checkTablePermissions(
    userId: number,
    tableOperations: Array<{
      tableName: string;
      operation: string;
      columns?: string[];
    }>
  ): Promise<Map<string, PermissionCheckResult>> {
    this.logger.debug(`批量检查用户 ${userId} 的表操作权限`);

    const results = new Map<string, PermissionCheckResult>();

    for (const tableOp of tableOperations) {
      const result = await this.checkTablePermission(
        userId,
        tableOp.tableName,
        tableOp.operation,
        tableOp.columns
      );
      results.set(`${tableOp.tableName}:${tableOp.operation}`, result);
    }

    return results;
  }

  /**
   * 获取用户权限信息
   * @param userId 用户ID
   * @returns 用户权限信息
   */
  async getUserPermission(userId: number): Promise<UserPermission | null> {
    // 先从内存缓存中获取
    const cached = this.userPermissions.get(userId);
    if (cached) {
      return cached;
    }

    // 如果缓存中没有，返回默认权限
    // 生产环境应该从数据库或 Redis 中获取
    const defaultPermission: UserPermission = {
      userId,
      username: `user_${userId}`,
      roles: ['login'], // 默认角色
      permissions: [],
    };

    // 缓存用户权限
    this.userPermissions.set(userId, defaultPermission);

    return defaultPermission;
  }

  /**
   * 设置用户权限
   * @param userId 用户ID
   * @param permission 用户权限信息
   */
  async setUserPermission(
    userId: number,
    permission: UserPermission
  ): Promise<void> {
    this.logger.log(`设置用户 ${userId} 的权限`);

    // 缓存用户权限
    this.userPermissions.set(userId, permission);

    // 生产环境应该将权限保存到数据库
  }

  /**
   * 设置表权限
   * @param tableName 表名
   * @param permission 表权限信息
   */
  async setTablePermission(
    tableName: string,
    permission: TablePermission
  ): Promise<void> {
    this.logger.log(`设置表 ${tableName} 的权限`);

    // 缓存表权限
    this.tablePermissions.set(tableName, permission);

    // 生产环境应该将权限保存到数据库
  }

  /**
   * 获取表权限
   * @param tableName 表名
   * @returns 表权限信息
   */
  async getTablePermission(tableName: string): Promise<TablePermission | null> {
    return this.tablePermissions.get(tableName) || null;
  }

  /**
   * 获取所有表权限
   * @returns 所有表权限信息
   */
  async getAllTablePermissions(): Promise<TablePermission[]> {
    return Array.from(this.tablePermissions.values());
  }

  /**
   * 删除表权限
   * @param tableName 表名
   */
  async deleteTablePermission(tableName: string): Promise<void> {
    this.logger.log(`删除表 ${tableName} 的权限`);

    this.tablePermissions.delete(tableName);

    // 生产环境应该从数据库中删除
  }

  /**
   * 检查用户是否有指定角色
   * @param userId 用户ID
   * @param role 角色
   * @returns 是否有该角色
   */
  async hasRole(userId: number, role: string): Promise<boolean> {
    const userPermission = await this.getUserPermission(userId);
    return userPermission ? userPermission.roles.includes(role) : false;
  }

  /**
   * 检查用户是否有指定权限
   * @param userId 用户ID
   * @param permission 权限
   * @returns 是否有该权限
   */
  async hasPermission(userId: number, permission: string): Promise<boolean> {
    const userPermission = await this.getUserPermission(userId);
    return userPermission ? userPermission.permissions.includes(permission) : false;
  }

  /**
   * 添加用户角色
   * @param userId 用户ID
   * @param role 角色
   */
  async addUserRole(userId: number, role: string): Promise<void> {
    const userPermission = await this.getUserPermission(userId);
    if (!userPermission) {
      throw new Error('用户不存在');
    }

    if (!userPermission.roles.includes(role)) {
      userPermission.roles.push(role);
      await this.setUserPermission(userId, userPermission);
    }
  }

  /**
   * 移除用户角色
   * @param userId 用户ID
   * @param role 角色
   */
  async removeUserRole(userId: number, role: string): Promise<void> {
    const userPermission = await this.getUserPermission(userId);
    if (!userPermission) {
      throw new Error('用户不存在');
    }

    const index = userPermission.roles.indexOf(role);
    if (index > -1) {
      userPermission.roles.splice(index, 1);
      await this.setUserPermission(userId, userPermission);
    }
  }

  /**
   * 添加用户权限
   * @param userId 用户ID
   * @param permission 权限
   */
  async addUserPermission(userId: number, permission: string): Promise<void> {
    const userPermission = await this.getUserPermission(userId);
    if (!userPermission) {
      throw new Error('用户不存在');
    }

    if (!userPermission.permissions.includes(permission)) {
      userPermission.permissions.push(permission);
      await this.setUserPermission(userId, userPermission);
    }
  }

  /**
   * 移除用户权限
   * @param userId 用户ID
   * @param permission 权限
   */
  async removeUserPermission(userId: number, permission: string): Promise<void> {
    const userPermission = await this.getUserPermission(userId);
    if (!userPermission) {
      throw new Error('用户不存在');
    }

    const index = userPermission.permissions.indexOf(permission);
    if (index > -1) {
      userPermission.permissions.splice(index, 1);
      await this.setUserPermission(userId, userPermission);
    }
  }

  /**
   * 清空权限缓存
   */
  async clearCache(): Promise<void> {
    this.logger.log('清空权限缓存');

    this.userPermissions.clear();
  }

  /**
   * 重新加载权限配置
   */
  async reloadPermissions(): Promise<void> {
    this.logger.log('重新加载权限配置');

    this.tablePermissions.clear();
    this.initializeDefaultPermissions();
  }
}
