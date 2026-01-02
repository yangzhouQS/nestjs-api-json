import { Module } from '@nestjs/common';
import { BuilderService } from './builder.service';
import { MySQLBuilderService } from './mysql-builder.service';

/**
 * 构建器模块
 * 负责将解析结果转换为 SQL 查询
 */
@Module({
  providers: [
    BuilderService,
    MySQLBuilderService,
  ],
  exports: [
    BuilderService,
    MySQLBuilderService,
  ],
})
export class BuilderModule {}
