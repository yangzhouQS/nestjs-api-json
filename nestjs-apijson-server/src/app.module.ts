import { Module, Scope } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import configuration from './config/configuration';
import { databaseConfig, jwtConfig, cacheConfig } from './config/configuration';
import { DatabaseModule } from './modules/database/database.module';
import { CacheModule } from './modules/cache/cache.module';
import { ParserModule } from './modules/parser/parser.module';
import { VerifierModule } from './modules/verifier/verifier.module';
import { BuilderModule } from './modules/builder/builder.module';
import { ExecutorModule } from './modules/executor/executor.module';
import { PermissionModule } from './modules/permission/permission.module';
import { AdvancedModule } from './modules/advanced/advanced.module';
import { APIJSONController } from './controllers/apijson.controller';
import { HealthController } from './controllers/health.controller';
import { TestDatabaseController } from './controllers/test-database.controller';
import { APIJSONExceptionFilter } from './common/filters/apijson-exception.filter';

/**
 * 应用主模块
 * 导入所有功能模块
 */
@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        configuration,
        databaseConfig,
        jwtConfig,
        cacheConfig,
      ],
    }),

    // JWT模块
    JwtModule.registerAsync({
      useFactory: (config) => ({
        secret: config.secret,
        signOptions: {
          expiresIn: config.expiresIn,
          issuer: config.issuer,
          audience: config.audience,
        },
      }),
      inject: [jwtConfig.KEY],
      global: true,
    }),

    // 功能模块
    DatabaseModule,
    CacheModule,
    ParserModule,
    VerifierModule,
    BuilderModule,
    ExecutorModule,
    PermissionModule,
    AdvancedModule,
  ],
  controllers: [
    APIJSONController,
    HealthController,
    TestDatabaseController,
  ],
  providers: [
    // 全局异常过滤器
    {
      provide: 'APP_FILTER',
      useClass: APIJSONExceptionFilter,
      scope: Scope.REQUEST,
    },
  ],
})
export class AppModule {}
