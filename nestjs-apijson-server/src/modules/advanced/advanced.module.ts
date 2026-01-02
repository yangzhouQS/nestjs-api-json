import {Module} from '@nestjs/common';
import {AdvancedFeaturesService} from './advanced-features.service';
import {AdvancedController} from './advanced.controller';
import {DatabaseModule} from '../database/database.module';
import {DatabaseService} from "@/modules/database/database.service";

/**
 * 高级特性模块
 * 提供子查询、聚合函数、事务等高级功能
 */
@Module({
    imports: [DatabaseModule],
    controllers: [AdvancedController],
    providers: [AdvancedFeaturesService, DatabaseService],
    exports: [AdvancedFeaturesService],
})
export class AdvancedModule {
}
