import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Param,
} from '@nestjs/common';
import { APIJSONRequest, ParseResult } from '@/interfaces/apijson-request.interface';
import { ParserService } from './parser.service';
import {
  APIJSONLog,
  APIJSONPerformance,
  APIJSONCache,
  APIJSONTransform,
  APIJSONAuth,
  APIJSONRateLimit
} from '@/common/decorators/apijson.decorator';

/**
 * 解析器控制器
 */
@Controller('parser')
@APIJSONLog({ enabled: true, level: 'debug' })
@APIJSONPerformance({ enabled: false })
@APIJSONCache({ enabled: false })
@APIJSONTransform({ enabled: false })
@APIJSONAuth({ enabled: true, roles: ['user', 'admin'], permissions: ['read'] })
@APIJSONRateLimit({ enabled: true, max: 50, windowMs: 15 * 60 * 1000 })
export class ParserController {
  constructor(private readonly parserService: ParserService) {}

  /**
   * 解析APIJSON请求
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async parse(@Body() request: APIJSONRequest): Promise<ParseResult> {
    return await this.parserService.parse(request);
  }

  /**
   * 获取解析器信息
   */
  @Get('info')
  @HttpCode(HttpStatus.OK)
  @APIJSONAuth({ enabled: false })
  async getInfo(): Promise<any> {
    return {
      name: 'APIJSON Parser',
      version: '1.0.0',
      description: 'APIJSON请求解析器',
      features: [
        '表查询解析',
        '指令解析',
        '条件解析',
        '连接解析',
        '分组解析',
        '排序解析',
        '分页解析',
      ],
      supportedDirectives: [
        '@method',
        '@page',
        '@limit',
        '@offset',
        '@order',
        '@search',
        '@group',
        '@cache',
        '@total',
        '@count',
      ],
    };
  }

  /**
   * 验证APIJSON请求
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validate(@Body() request: APIJSONRequest): Promise<any> {
    const parseResult = await this.parserService.parse(request);

    // 这里应该实现验证逻辑
    return {
      valid: true,
      errors: [],
      warnings: [],
      parseResult,
    };
  }

  /**
   * 格式化APIJSON请求
   */
  @Post('format')
  @HttpCode(HttpStatus.OK)
  async format(@Body() request: APIJSONRequest): Promise<any> {
    // 这里应该实现格式化逻辑
    return {
      formatted: JSON.stringify(request, null, 2),
      original: request,
    };
  }

  /**
   * 获取解析器统计信息
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @APIJSONAuth({ enabled: true, roles: ['admin'], permissions: ['read'] })
  async getStats(): Promise<any> {
    // 这里应该实现统计信息获取逻辑
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageProcessingTime: 0,
      lastRequestTime: null,
    };
  }
}
