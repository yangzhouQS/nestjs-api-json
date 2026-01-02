import {Module} from '@nestjs/common';
import {ExecutorService} from './executor.service';
import {MySQLExecutorService} from './mysql-executor.service';
import {DatabaseService} from "@/modules/database/database.service";

/**
 * 执行器模块
 * 负责执行 SQL 查询并处理结果
 */
@Module({
    providers: [
        ExecutorService,
        MySQLExecutorService,
        DatabaseService
    ],
    exports: [
        ExecutorService,
        MySQLExecutorService,
    ],
})
export class ExecutorModule {
}
