import {Module} from '@nestjs/common';
import {ExecutorService} from './executor.service';
import {MySQLExecutorService} from './mysql-executor.service';
import {DatabaseModule} from "@/modules/database/database.module";

/**
 * 执行器模块
 * 负责执行 SQL 查询并处理结果
 */
@Module({
    imports: [
        DatabaseModule
    ],
    providers: [
        ExecutorService,
        MySQLExecutorService
    ],
    exports: [
        ExecutorService,
        MySQLExecutorService,
    ],
})
export class ExecutorModule {
}
