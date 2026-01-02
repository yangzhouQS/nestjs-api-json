import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { PermissionService, TablePermission, UserPermission } from './permission.service';
import { APIJSONResponse } from '@/interfaces/apijson-request.interface';

/**
 * 权限管理控制器
 * 负责管理用户对数据库表的操作权限
 */
@Controller('permission')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  /**
   * 获取所有表权限
   */
  @Get('tables')
  async getAllTablePermissions(): Promise<APIJSONResponse> {
    const permissions = await this.permissionService.getAllTablePermissions();

    return {
      status: 'success',
      code: 200,
      message: '获取表权限成功',
      data: permissions,
      processingTime: 0,
      timestamp: new Date().toISOString(),
      path: '/permission/tables',
      cached: false,
    };
  }

  /**
   * 获取指定表的权限
   */
  @Get('tables/:tableName')
  async getTablePermission(
    @Param('tableName') tableName: string
  ): Promise<APIJSONResponse> {
    const permission = await this.permissionService.getTablePermission(tableName);

    return {
      status: 'success',
      code: 200,
      message: '获取表权限成功',
      data: permission,
      processingTime: 0,
      timestamp: new Date().toISOString(),
      path: `/permission/tables/${tableName}`,
      cached: false,
    };
  }

  /**
   * 设置表权限
   */
  @Post('tables/:tableName')
  @HttpCode(HttpStatus.OK)
  async setTablePermission(
    @Param('tableName') tableName: string,
    @Body() permission: TablePermission
  ): Promise<APIJSONResponse> {
    await this.permissionService.setTablePermission(tableName, permission);

    return {
      status: 'success',
      code: 200,
      message: '设置表权限成功',
      data: permission,
      processingTime: 0,
      timestamp: new Date().toISOString(),
      path: `/permission/tables/${tableName}`,
      cached: false,
    };
  }

  /**
   * 删除表权限
   */
  @Delete('tables/:tableName')
  @HttpCode(HttpStatus.OK)
  async deleteTablePermission(
    @Param('tableName') tableName: string
  ): Promise<APIJSONResponse> {
    await this.permissionService.deleteTablePermission(tableName);

    return {
      status: 'success',
      code: 200,
      message: '删除表权限成功',
      data: { tableName },
      processingTime: 0,
      timestamp: new Date().toISOString(),
      path: `/permission/tables/${tableName}`,
      cached: false,
    };
  }

  /**
   * 检查用户对表的操作权限
   */
  @Post('check')
  @HttpCode(HttpStatus.OK)
  async checkPermission(
    @Body() body: {
      userId: number;
      tableName: string;
      operation: string;
      columns?: string[];
    }
  ): Promise<APIJSONResponse> {
    const result = await this.permissionService.checkTablePermission(
      body.userId,
      body.tableName,
      body.operation,
      body.columns
    );

    return {
      status: 'success',
      code: 200,
      message: '权限检查完成',
      data: result,
      processingTime: 0,
      timestamp: new Date().toISOString(),
      path: '/permission/check',
      cached: false,
    };
  }

  /**
   * 批量检查用户对表的操作权限
   */
  @Post('check-batch')
  @HttpCode(HttpStatus.OK)
  async checkPermissions(
    @Body() body: {
      userId: number;
      tableOperations: Array<{
        tableName: string;
        operation: string;
        columns?: string[];
      }>;
    }
  ): Promise<APIJSONResponse> {
    const results = await this.permissionService.checkTablePermissions(
      body.userId,
      body.tableOperations
    );

    return {
      status: 'success',
      code: 200,
      message: '批量权限检查完成',
      data: Object.fromEntries(results),
      processingTime: 0,
      timestamp: new Date().toISOString(),
      path: '/permission/check-batch',
      cached: false,
    };
  }

  /**
   * 获取用户权限
   */
  @Get('users/:userId')
  async getUserPermission(
    @Param('userId') userId: number
  ): Promise<APIJSONResponse> {
    const permission = await this.permissionService.getUserPermission(userId);

    return {
      status: 'success',
      code: 200,
      message: '获取用户权限成功',
      data: permission,
      processingTime: 0,
      timestamp: new Date().toISOString(),
      path: `/permission/users/${userId}`,
      cached: false,
    };
  }

  /**
   * 设置用户权限
   */
  @Post('users/:userId')
  @HttpCode(HttpStatus.OK)
  async setUserPermission(
    @Param('userId') userId: number,
    @Body() permission: UserPermission
  ): Promise<APIJSONResponse> {
    await this.permissionService.setUserPermission(userId, permission);

    return {
      status: 'success',
      code: 200,
      message: '设置用户权限成功',
      data: permission,
      processingTime: 0,
      timestamp: new Date().toISOString(),
      path: `/permission/users/${userId}`,
      cached: false,
    };
  }

  /**
   * 添加用户角色
   */
  @Post('users/:userId/roles')
  @HttpCode(HttpStatus.OK)
  async addUserRole(
    @Param('userId') userId: number,
    @Body() body: { role: string }
  ): Promise<APIJSONResponse> {
    await this.permissionService.addUserRole(userId, body.role);

    return {
      status: 'success',
      code: 200,
      message: '添加用户角色成功',
      data: { userId, role: body.role },
      processingTime: 0,
      timestamp: new Date().toISOString(),
      path: `/permission/users/${userId}/roles`,
      cached: false,
    };
  }

  /**
   * 移除用户角色
   */
  @Delete('users/:userId/roles/:role')
  @HttpCode(HttpStatus.OK)
  async removeUserRole(
    @Param('userId') userId: number,
    @Param('role') role: string
  ): Promise<APIJSONResponse> {
    await this.permissionService.removeUserRole(userId, role);

    return {
      status: 'success',
      code: 200,
      message: '移除用户角色成功',
      data: { userId, role },
      processingTime: 0,
      timestamp: new Date().toISOString(),
      path: `/permission/users/${userId}/roles/${role}`,
      cached: false,
    };
  }

  /**
   * 添加用户权限
   */
  @Post('users/:userId/permissions')
  @HttpCode(HttpStatus.OK)
  async addUserPermission(
    @Param('userId') userId: number,
    @Body() body: { permission: string }
  ): Promise<APIJSONResponse> {
    await this.permissionService.addUserPermission(userId, body.permission);

    return {
      status: 'success',
      code: 200,
      message: '添加用户权限成功',
      data: { userId, permission: body.permission },
      processingTime: 0,
      timestamp: new Date().toISOString(),
      path: `/permission/users/${userId}/permissions`,
      cached: false,
    };
  }

  /**
   * 移除用户权限
   */
  @Delete('users/:userId/permissions/:permission')
  @HttpCode(HttpStatus.OK)
  async removeUserPermission(
    @Param('userId') userId: number,
    @Param('permission') permission: string
  ): Promise<APIJSONResponse> {
    await this.permissionService.removeUserPermission(userId, permission);

    return {
      status: 'success',
      code: 200,
      message: '移除用户权限成功',
      data: { userId, permission },
      processingTime: 0,
      timestamp: new Date().toISOString(),
      path: `/permission/users/${userId}/permissions/${permission}`,
      cached: false,
    };
  }

  /**
   * 清空权限缓存
   */
  @Post('cache/clear')
  @HttpCode(HttpStatus.OK)
  async clearCache(): Promise<APIJSONResponse> {
    await this.permissionService.clearCache();

    return {
      status: 'success',
      code: 200,
      message: '清空权限缓存成功',
      data: {},
      processingTime: 0,
      timestamp: new Date().toISOString(),
      path: '/permission/cache/clear',
      cached: false,
    };
  }

  /**
   * 重新加载权限配置
   */
  @Post('reload')
  @HttpCode(HttpStatus.OK)
  async reloadPermissions(): Promise<APIJSONResponse> {
    await this.permissionService.reloadPermissions();

    return {
      status: 'success',
      code: 200,
      message: '重新加载权限配置成功',
      data: {},
      processingTime: 0,
      timestamp: new Date().toISOString(),
      path: '/permission/reload',
      cached: false,
    };
  }
}
