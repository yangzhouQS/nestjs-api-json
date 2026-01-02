import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Head,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UsePipes,
  UseFilters,
  Req,
  Res,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { APIJSONRequest } from '@/interfaces/apijson-request.interface';
import {
  APIJSONRequestDTO,
  APIJSONGetRequestDTO,
  APIJSONGetsRequestDTO,
  APIJSONHeadRequestDTO,
  APIJSONHeadsRequestDTO,
  APIJSONPostRequestDTO,
  APIJSONPutRequestDTO,
  APIJSONDeleteRequestDTO,
  APIJSONCrudRequestDTO,
} from '@/dto/apijson-request.dto';
import {
  APIJSONResponseDTO,
  APIJSONInfoResponseDTO,
  APIJSONStatsResponseDTO,
  DatabaseHealthResponseDTO,
  CacheClearResponseDTO,
} from '@/dto/apijson-response.dto';
import { CoreParserService } from '@/modules/parser/core-parser.service';
import { VerifierService } from '@/modules/verifier/verifier.service';
import { MySQLBuilderService } from '@/modules/builder/mysql-builder.service';
import { MySQLExecutorService } from '@/modules/executor/mysql-executor.service';
import { CacheService } from '@/modules/cache/cache.service';
import { APIJSONAuthGuard } from '@/common/guards/apijson-auth.guard';
import { APIJSONRateLimitGuard } from '@/common/guards/apijson-rate-limit.guard';
import { LoggingInterceptor } from '@/common/interceptors/logging.interceptor';
import { APIJSONValidationPipe } from '@/common/pipes/apijson-validation.pipe';
import { APIJSONExceptionFilter } from '@/common/filters/apijson-exception.filter';

/**
 * APIJSON 请求控制器
 * 负责处理所有 APIJSON 请求方法（GET, GETS, HEAD, HEADS, POST, PUT, DELETE）
 */
@ApiTags('APIJSON')
@ApiBearerAuth()
@Controller('api')
@UseGuards(APIJSONRateLimitGuard, APIJSONAuthGuard)
@UseInterceptors(LoggingInterceptor)
@UsePipes(APIJSONValidationPipe)
@UseFilters(APIJSONExceptionFilter)
export class APIJSONRequestController {
  private readonly logger = new Logger(APIJSONRequestController.name);
  constructor(
    private readonly coreParserService: CoreParserService,
    private readonly verifierService: VerifierService,
    private readonly mysqlBuilderService: MySQLBuilderService,
    private readonly mysqlExecutorService: MySQLExecutorService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * GET 方法 - 查询单个对象
   * 请求示例: {"user": {"id": 1}}
   */
  @Get('get')
  @ApiOperation({
    summary: '查询单个对象',
    description: '使用 APIJSON 格式查询单个对象，支持复杂的查询条件和关联查询',
  })
  @ApiBody({
    type: APIJSONRequestDTO,
    description: 'APIJSON 查询请求',
    examples: {
      '简单查询': {
        summary: '根据 ID 查询用户',
        value: {
          user: {
            id: 1,
            '@column': 'id,name,age',
          },
        },
      },
      '条件查询': {
        summary: '根据条件查询',
        value: {
          user: {
            'age>': 18,
            '@column': 'id,name,age',
          },
        },
      },
      '关联查询': {
        summary: '关联查询用户的动态',
        value: {
          user: {
            id: 1,
            '@column': 'id,name',
            Moment: {
              '@column': 'id,content',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: APIJSONResponseDTO,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足',
  })
  @ApiConsumes('application/json')
  @HttpCode(HttpStatus.OK)
  async get(@Body() request: APIJSONRequest): Promise<APIJSONResponseDTO> {
    console.log(request);
    return this.handleRequest(request, 'GET');
  }

  /**
   * GETS 方法 - 查询多个对象
   * 请求示例: {"user[]": {"count": 10, "page": 0}}
   */
  @Get('gets')
  @ApiOperation({
    summary: '查询多个对象',
    description: '使用 APIJSON 格式查询多个对象，支持分页、排序、分组等功能',
  })
  @ApiBody({
    type: APIJSONRequestDTO,
    description: 'APIJSON 查询请求',
    examples: {
      '分页查询': {
        summary: '分页查询用户列表',
        value: {
          'user[]': {
            '@count': 10,
            '@page': 0,
            '@order': 'id-',
          },
        },
      },
      '条件查询': {
        summary: '根据条件查询用户列表',
        value: {
          'user[]': {
            'age>': 18,
            '@count': 10,
            '@page': 0,
          },
        },
      },
      '分组查询': {
        summary: '按年龄分组统计',
        value: {
          'user[]': {
            '@group': 'age',
            '@column': 'age,COUNT(*):count',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: APIJSONResponseDTO,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足',
  })
  @ApiConsumes('application/json')
  @HttpCode(HttpStatus.OK)
  async gets(@Body() request: APIJSONRequest): Promise<APIJSONResponseDTO> {
    return this.handleRequest(request, 'GET');
  }

  /**
   * HEAD 方法 - 查询总数
   * 请求示例: {"user": {"@column": "COUNT(*):count"}}
   */
  @Head('head')
  @ApiOperation({
    summary: '查询总数',
    description: '使用 APIJSON 格式查询数据总数，支持聚合函数',
  })
  @ApiBody({
    type: APIJSONRequestDTO,
    description: 'APIJSON 查询请求',
    examples: {
      '计数查询': {
        summary: '查询用户总数',
        value: {
          user: {
            '@column': 'COUNT(*):count',
          },
        },
      },
      '条件计数': {
        summary: '查询成年用户总数',
        value: {
          user: {
            'age>': 18,
            '@column': 'COUNT(*):count',
          },
        },
      },
      '聚合查询': {
        summary: '查询用户年龄统计',
        value: {
          user: {
            '@column': 'COUNT(*):count,AVG(age):avgAge,MAX(age):maxAge,MIN(age):minAge',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: APIJSONResponseDTO,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足',
  })
  @ApiConsumes('application/json')
  @HttpCode(HttpStatus.OK)
  async head(@Body() request: APIJSONRequest): Promise<APIJSONResponseDTO> {
    return this.handleRequest(request, 'HEAD');
  }

  /**
   * HEADS 方法 - 查询多个总数
   */
  @Head('heads')
  @ApiOperation({
    summary: '查询多个总数',
    description: '使用 APIJSON 格式同时查询多个表的数据总数',
  })
  @ApiBody({
    type: APIJSONRequestDTO,
    description: 'APIJSON 查询请求',
    examples: {
      '多表计数': {
        summary: '查询用户和动态的总数',
        value: {
          user: {
            '@column': 'COUNT(*):count',
          },
          Moment: {
            '@column': 'COUNT(*):count',
          },
          Comment: {
            '@column': 'COUNT(*):count',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: APIJSONResponseDTO,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足',
  })
  @ApiConsumes('application/json')
  @HttpCode(HttpStatus.OK)
  async heads(@Body() request: APIJSONRequest): Promise<APIJSONResponseDTO> {
    return this.handleRequest(request, 'HEAD');
  }

  /**
   * POST 方法 - 新增数据
   * 请求示例: {"user": {"name": "张三", "age": 25}}
   */
  @Post('post')
  @ApiOperation({
    summary: '新增数据',
    description: '使用 APIJSON 格式插入新数据，支持单条和批量插入',
  })
  @ApiBody({
    type: APIJSONRequestDTO,
    description: 'APIJSON 插入请求',
    examples: {
      '单条插入': {
        summary: '插入单个用户',
        value: {
          user: {
            name: '张三',
            age: 25,
          },
        },
      },
      '批量插入': {
        summary: '批量插入用户',
        value: {
          'user[]': [
            {
              name: '张三',
              age: 25,
            },
            {
              name: '李四',
              age: 26,
            },
          ],
        },
      },
      '关联插入': {
        summary: '插入用户和动态',
        value: {
          user: {
            name: '张三',
            age: 25,
            Moment: {
              content: '第一条动态',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '插入成功',
    type: APIJSONResponseDTO,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足',
  })
  @ApiConsumes('application/json')
  @HttpCode(HttpStatus.OK)
  async post(@Body() request: APIJSONRequest): Promise<APIJSONResponseDTO> {
    return this.handleRequest(request, 'POST');
  }

  /**
   * PUT 方法 - 更新数据
   * 请求示例: {"user": {"id": 1, "name": "李四"}}
   */
  @Put('put')
  @ApiOperation({
    summary: '更新数据',
    description: '使用 APIJSON 格式更新数据，支持单条和批量更新',
  })
  @ApiBody({
    type: APIJSONRequestDTO,
    description: 'APIJSON 更新请求',
    examples: {
      '单条更新': {
        summary: '更新单个用户',
        value: {
          user: {
            id: 1,
            name: '李四',
            age: 26,
          },
        },
      },
      '条件更新': {
        summary: '批量更新用户',
        value: {
          user: {
            'age>': 18,
            name: '成年用户',
          },
        },
      },
      '批量更新': {
        summary: '批量更新多个用户',
        value: {
          'user[]': [
            {
              id: 1,
              name: '张三',
            },
            {
              id: 2,
              name: '李四',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    type: APIJSONResponseDTO,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足',
  })
  @ApiConsumes('application/json')
  @HttpCode(HttpStatus.OK)
  async put(@Body() request: APIJSONRequest): Promise<APIJSONResponseDTO> {
    return this.handleRequest(request, 'PUT');
  }

  /**
   * DELETE 方法 - 删除数据
   * 请求示例: {"user": {"id": 1}}
   */
  @Delete('delete')
  @ApiOperation({
    summary: '删除数据',
    description: '使用 APIJSON 格式删除数据，支持单条和批量删除',
  })
  @ApiBody({
    type: APIJSONRequestDTO,
    description: 'APIJSON 删除请求',
    examples: {
      '单条删除': {
        summary: '删除单个用户',
        value: {
          user: {
            id: 1,
          },
        },
      },
      '条件删除': {
        summary: '批量删除用户',
        value: {
          user: {
            'age<': 18,
          },
        },
      },
      '批量删除': {
        summary: '批量删除多个用户',
        value: {
          'user[]': [
            {
              id: 1,
            },
            {
              id: 2,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    type: APIJSONResponseDTO,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足',
  })
  @ApiConsumes('application/json')
  @HttpCode(HttpStatus.OK)
  async delete(@Body() request: APIJSONRequest): Promise<APIJSONResponseDTO> {
    return this.handleRequest(request, 'DELETE');
  }

  /**
   * CRUD 方法 - 混合操作
   * 请求示例: {"user": {"@method": "POST", "name": "张三"}, "Moment": {"@method": "PUT", "id": 1}}
   */
  @Post('crud')
  @ApiOperation({
    summary: '混合操作',
    description: '在一个请求中执行多个不同的数据库操作（增删改查）',
  })
  @ApiBody({
    type: APIJSONRequestDTO,
    description: 'APIJSON 混合操作请求',
    examples: {
      '混合操作': {
        summary: '同时插入用户和更新动态',
        value: {
          user: {
            '@method': 'POST',
            name: '张三',
            age: 25,
          },
          Moment: {
            '@method': 'PUT',
            id: 1,
            content: '更新内容',
          },
          Comment: {
            '@method': 'DELETE',
            id: 1,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '操作成功',
    type: APIJSONResponseDTO,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足',
  })
  @ApiConsumes('application/json')
  @HttpCode(HttpStatus.OK)
  async crud(@Body() request: APIJSONRequest): Promise<APIJSONResponseDTO> {
    return this.handleRequest(request, 'POST');
  }

  /**
   * 通用请求处理方法
   * 处理所有类型的 APIJSON 请求
   */
  private async handleRequest(
    request: APIJSONRequest,
    httpMethod: string
  ): Promise<APIJSONResponseDTO> {
    const startTime = Date.now();

    try {
      this.logger.log(`[APIJSON] 开始处理请求: ${httpMethod}, 请求体: ${JSON.stringify(request)}`);

      // 生成缓存键
      const cacheKey = this.generateCacheKey(request, httpMethod);
      this.logger.log(`[APIJSON] 缓存键: ${cacheKey}`);

      // 检查缓存
      const cachedResponse = await this.cacheService.get(cacheKey);
      if (cachedResponse) {
        this.logger.log(`[APIJSON] 缓存命中，直接返回缓存数据`);
        return {
          ...cachedResponse,
          cached: true,
          processingTime: Date.now() - startTime,
        };
      }

      this.logger.log(`[APIJSON] 缓存未命中，开始解析请求`);

      // 解析请求
      const parseResult = await this.coreParserService.parse(request, httpMethod);
      this.logger.log(`[APIJSON] 解析结果: ${JSON.stringify(parseResult)}`);

      // 验证请求
      const verifyResult = await this.verifierService.verify(parseResult);
      this.logger.log(`[APIJSON] 验证结果: valid=${verifyResult.valid}, errors=${JSON.stringify(verifyResult.errors)}`);

      // 如果验证失败，返回错误
      if (!verifyResult.valid) {
        this.logger.error(`[APIJSON] 请求验证失败: ${JSON.stringify(verifyResult.errors)}`);
        return {
          status: 'error',
          code: 400,
          message: '请求验证失败',
          errors: verifyResult.errors,
          warnings: verifyResult.warnings,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          path: `/api/${httpMethod.toLowerCase()}`,
          cached: false,
        };
      }

      this.logger.log(`[APIJSON] 请求验证通过，开始构建 SQL`);

      // 构建 SQL 查询
      const buildResult = await this.mysqlBuilderService.build(parseResult);
      this.logger.log(`[APIJSON] 构建的 SQL: ${JSON.stringify(buildResult.queries.map(q => ({ sql: q.sql, params: q.params })))}`);

      this.logger.log(`[APIJSON] 开始执行 SQL 查询`);

      // 执行 SQL 查询
      const executeResult = await this.mysqlExecutorService.execute(buildResult);
      this.logger.log(`[APIJSON] 执行结果: ${JSON.stringify(executeResult)}`);

      // 构建响应
      const response: APIJSONResponseDTO = {
        status: 'success',
        code: 200,
        message: '请求成功',
        data: executeResult.data,
        warnings: verifyResult.warnings,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        path: `/api/${httpMethod.toLowerCase()}`,
        cached: false,
      };

      // 缓存响应（仅缓存查询操作）
      if (this.isCacheableRequest(request)) {
        await this.cacheService.set(cacheKey, response, 300000); // 5分钟
      }

      return response;
    } catch (error) {
      return {
        status: 'error',
        code: 500,
        message: error.message || '服务器内部错误',
        errors: [error.message],
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        path: `/api/${httpMethod.toLowerCase()}`,
        cached: false,
      };
    }
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(request: APIJSONRequest, httpMethod: string): string {
    const hash = Buffer.from(JSON.stringify(request)).toString('base64');
    return `apijson:${httpMethod.toLowerCase()}:${hash}`;
  }

  /**
   * 判断是否为可缓存的请求
   */
  private isCacheableRequest(request: APIJSONRequest): boolean {
    // 只缓存 GET 和 HEAD 请求
    const hasArrayKey = Object.keys(request).some(key => key.endsWith('[]'));
    const hasMethodDirective = Object.keys(request).some(key => key === '@method');
    
    return !hasArrayKey && !hasMethodDirective;
  }

  /**
   * 获取 APIJSON 信息
   */
  @Get('info')
  @ApiOperation({
    summary: '获取 APIJSON 信息',
    description: '获取 APIJSON 服务器的功能信息和支持的特性',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
  })
  @HttpCode(HttpStatus.OK)
  async getInfo(): Promise<APIJSONInfoResponseDTO> {
    return {
      name: 'APIJSON Server',
      version: '1.0.0',
      description: '基于 NestJS 的 APIJSON 服务器实现',
      features: [
        '完整的 APIJSON 语法支持',
        '支持所有请求方法（GET, GETS, HEAD, HEADS, POST, PUT, DELETE, CRUD）',
        '强大的查询解析和验证',
        '内置认证和授权',
        '详细的日志和性能监控',
        '灵活的缓存策略',
        '完整的 MySQL 支持',
        '事务管理',
        'JOIN 查询',
        '子查询',
        '聚合函数',
      ],
      supportedMethods: [
        'GET - 查询单个对象',
        'GETS - 查询多个对象',
        'HEAD - 查询总数',
        'HEADS - 查询多个总数',
        'POST - 新增数据',
        'PUT - 更新数据',
        'DELETE - 删除数据',
        'CRUD - 混合操作',
      ],
      supportedDirectives: [
        '@method - 指定请求方法',
        '@column - 指定查询字段',
        '@order - 指定排序',
        '@group - 指定分组',
        '@having - 指定分组过滤',
        '@cache - 指定缓存',
        '@total - 指定查询总数',
        '@count - 指定每页数量',
        '@page - 指定页码',
        '@limit - 指定限制',
        '@offset - 指定偏移',
        '@query - 指定查询类型',
        '@role - 指定角色',
        '@database - 指定数据库',
        '@schema - 指定模式',
        '@explain - 指定执行计划',
        '@join - 指定关联查询',
      ],
      supportedOperations: [
        'SELECT - 查询',
        'INSERT - 插入',
        'UPDATE - 更新',
        'DELETE - 删除',
        'COUNT - 计数',
      ],
      supportedJoinTypes: [
        '@ - APP JOIN（应用级 JOIN）',
        '& - INNER JOIN',
        '| - FULL JOIN',
        '< - LEFT JOIN',
        '> - RIGHT JOIN',
        '! - OUTER JOIN',
        '^ - SIDE JOIN',
        '( - ANTI JOIN',
        ') - FOREIGN JOIN',
        '~ - ASOF JOIN',
      ],
      supportedConditions: [
        '= - 等于',
        '!= - 不等于',
        '> - 大于',
        '< - 小于',
        '>= - 大于等于',
        '<= - 小于等于',
        '{} - IN',
        '!{} - NOT IN',
        '>< - BETWEEN',
        '!>< - NOT BETWEEN',
        '~ - 模糊匹配',
        '!~ - 不模糊匹配',
        '<> - 包含',
        '!<> - 不包含',
      ],
    };
  }

  /**
   * 获取 APIJSON 统计信息
   */
  @Get('stats')
  @ApiOperation({
    summary: '获取统计信息',
    description: '获取 APIJSON 服务器的统计信息',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
  })
  @HttpCode(HttpStatus.OK)
  async getStats(): Promise<APIJSONStatsResponseDTO> {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageProcessingTime: 0,
      lastRequestTime: null,
      cacheHitRate: 0,
    };
  }

  /**
   * 清空缓存
   */
  @Post('cache/clear')
  @ApiOperation({
    summary: '清空缓存',
    description: '清空 APIJSON 服务器的所有缓存',
  })
  @ApiResponse({
    status: 200,
    description: '清空成功',
  })
  @HttpCode(HttpStatus.OK)
  async clearCache(): Promise<CacheClearResponseDTO> {
    await this.cacheService.flush();

    return {
      status: 'success',
      code: 200,
      message: '缓存已清空',
      processingTime: 0,
      timestamp: new Date().toISOString(),
      path: '/api/cache/clear',
      cached: false,
    };
  }

  /**
   * 测试数据库连接
   */
  @Get('health/database')
  @ApiOperation({
    summary: '测试数据库连接',
    description: '测试数据库连接状态和获取数据库信息',
  })
  @ApiResponse({
    status: 200,
    description: '测试成功',
  })
  @HttpCode(HttpStatus.OK)
  async testDatabaseConnection(): Promise<DatabaseHealthResponseDTO> {
    const isConnected = await this.mysqlExecutorService.testConnection();
    const version = await this.mysqlExecutorService.getDatabaseVersion();
    const sizeInfo = await this.mysqlExecutorService.getDatabaseSize();

    return {
      status: isConnected ? 'healthy' : 'unhealthy',
      connected: isConnected,
      version,
      size: sizeInfo,
      timestamp: new Date().toISOString(),
    };
  }
}
