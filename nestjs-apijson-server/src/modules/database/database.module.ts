import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';

/**
 * 数据库模块
 */
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
