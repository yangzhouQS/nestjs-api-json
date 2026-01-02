import { Module } from '@nestjs/common';
import { PermissionService } from './permission.service';

/**
 * 权限模块
 * 负责管理用户对数据库表的操作权限
 */
@Module({
  providers: [PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}
