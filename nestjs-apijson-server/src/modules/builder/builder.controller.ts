import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Param,
} from '@nestjs/common';
import { ParseResult, BuildResult } from '@/interfaces/apijson-request.interface';
import { BuilderService } from './builder.service';
import {
  APIJSONLog,
  APIJSONPerformance,
  APIJSONCache,
  APIJSONTransform,
  APIJSONAuth,
  APIJSONRateLimit
} from '@/common/decorators/apijson.decorator';

/**
 * 构建器控制器
 */
@Controller('builder')
@APIJSONLog({ enabled: true, level: 'debug' })
@APIJSONPerformance({ enabled: false })
@APIJSONCache({ enabled: false })
@APIJSONTransform({ enabled: false })
@APIJSONAuth({ enabled: true, roles: ['user', 'admin'], permissions: ['read'] })
@APIJSONRateLimit({ enabled: true, max: 50, windowMs: 15 * 60 * 1000 })
export class BuilderController {
  constructor(private readonly builderService: BuilderService) {}

  /**
   * 构建SQL查询
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async build(@Body() parseResult: ParseResult): Promise<BuildResult> {
    return await this.builderService.build(parseResult);
  }

  /**
   * 获取构建器信息
   */
  @Get('info')
  @HttpCode(HttpStatus.OK)
  @APIJSONAuth({ enabled: false })
  async getInfo(): Promise<any> {
    return {
      name: 'APIJSON Builder',
      version: '1.0.0',
      description: 'APIJSON SQL查询构建器',
      features: [
        'SELECT查询构建',
        'INSERT查询构建',
        'UPDATE查询构建',
        'DELETE查询构建',
        'JOIN查询构建',
        '子查询构建',
        '聚合查询构建',
      ],
      supportedDatabases: [
        'MySQL',
        'PostgreSQL',
        'SQLite',
        'SQL Server',
        'Oracle',
      ],
    };
  }

  /**
   * 验证SQL查询
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validate(@Body() parseResult: ParseResult): Promise<any> {
    const buildResult = await this.builderService.build(parseResult);

    // 这里应该实现SQL验证逻辑
    return {
      valid: true,
      errors: [],
      warnings: [],
      buildResult,
    };
  }

  /**
   * 格式化SQL查询
   */
  @Post('format')
  @HttpCode(HttpStatus.OK)
  async format(@Body() parseResult: ParseResult): Promise<any> {
    const buildResult = await this.builderService.build(parseResult);

    // 这里应该实现SQL格式化逻辑
    return {
      formatted: buildResult.queries.map(query => query.sql).join('\n\n'),
      original: buildResult,
    };
  }

  /**
   * 获取构建器统计信息
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @APIJSONAuth({ enabled: true, roles: ['admin'], permissions: ['read'] })
  async getStats(): Promise<any> {
    // 这里应该实现统计信息获取逻辑
    return {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageQueryTime: 0,
      lastQueryTime: null,
    };
  }

  /**
   * 获取SQL语法高亮
   */
  @Post('highlight')
  @HttpCode(HttpStatus.OK)
  async highlight(@Body() parseResult: ParseResult): Promise<any> {
    const buildResult = await this.builderService.build(parseResult);

    // 这里应该实现SQL语法高亮逻辑
    return {
      highlighted: buildResult.queries.map(query => ({
        sql: query.sql,
        html: `<pre><code>${query.sql}</code></pre>`,
      })),
      original: buildResult,
    };
  }

  /**
   * 获取查询执行计划
   */
  @Post('explain')
  @HttpCode(HttpStatus.OK)
  async explain(@Body() parseResult: ParseResult): Promise<any> {
    const buildResult = await this.builderService.build(parseResult);

    // 这里应该实现查询执行计划获取逻辑
    return {
      plans: buildResult.queries.map(query => ({
        sql: query.sql,
        plan: {
          id: 1,
          select_type: 'SIMPLE',
          table: query.table,
          type: 'ALL',
          possible_keys: null,
          key: null,
          key_len: null,
          ref: null,
          rows: 1000,
          filtered: 100,
          Extra: null,
        },
      })),
      original: buildResult,
    };
  }
}
