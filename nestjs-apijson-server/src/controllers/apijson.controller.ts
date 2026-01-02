import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Head,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UsePipes,
  UseFilters,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { APIJSONRequest } from '@/interfaces/apijson-request.interface';
import { APIJSONRequestDTO } from '@/dto/apijson-request.dto';
import {
  APIJSONResponseDTO,
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
 * APIJSON 控制器
 * 提供符合 HTTP 规范的 APIJSON 接口
 * 
 * 两种请求方式：
 * 1. POST 方法：使用 body 传递复杂 JSON 查询（推荐，符合 APIJSON 设计）
 * 2. GET 方法：使用查询参数传递简单查询条件（符合 RESTful 规范）
 */
@ApiTags('APIJSON')
@ApiBearerAuth()
@Controller('apijson')
@UseGuards(APIJSONRateLimitGuard, APIJSONAuthGuard)
@UseInterceptors(LoggingInterceptor)
@UsePipes(APIJSONValidationPipe)
@UseFilters(APIJSONExceptionFilter)
export class APIJSONController {
  private readonly logger = new Logger(APIJSONController.name);
  
  constructor(
    private readonly coreParserService: CoreParserService,
    private readonly verifierService: VerifierService,
    private readonly mysqlBuilderService: MySQLBuilderService,
    private readonly mysqlExecutorService: MySQLExecutorService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * GET 方法 - 使用查询参数查询单个对象
   * 
   * 简单查询示例：
   * GET /apijson/get?table=User&id=1&column=id,name,age
   * 
   * 复杂查询建议使用 POST 方法
   */
  @Get('get')
  @ApiOperation({
    summary: '查询单个对象（GET）',
    description: '使用查询参数查询单个对象，适合简单查询。复杂查询建议使用 POST 方法',
  })
  @ApiQuery({
    name: 'table',
    required: true,
    description: '表名',
    example: 'user',
  })
  @ApiQuery({
    name: 'id',
    required: false,
    description: '主键 ID',
    example: 1,
  })
  @ApiQuery({
    name: 'column',
    required: false,
    description: '查询字段（逗号分隔）',
    example: 'id,name,age',
  })
  @ApiQuery({
    name: 'where',
    required: false,
    description: 'WHERE 条件（JSON 格式）',
    example: '{"age>":18}',
  })
  @ApiQuery({
    name: 'join',
    required: false,
    description: 'JOIN 条件',
    example: '@/user/id@',
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
  @HttpCode(HttpStatus.OK)
  async get(
    @Query('table') table: string,
    @Query('id') id?: string,
    @Query('column') column?: string,
    @Query('where') where?: string,
    @Query('join') join?: string,
  ): Promise<APIJSONResponseDTO> {
    // 将查询参数转换为 APIJSON 请求格式
    const request: APIJSONRequest = {};
    
    // 构建表查询
    const tableQuery: any = {};
    
    if (id) {
      tableQuery.id = parseInt(id, 10);
    }
    
    if (column) {
      tableQuery['@column'] = column;
    }
    
    if (where) {
      try {
        const whereObj = JSON.parse(where);
        Object.assign(tableQuery, whereObj);
      } catch (e) {
        this.logger.warn(`WHERE 条件 JSON 解析失败: ${where}`);
      }
    }
    
    if (join) {
      tableQuery['@join'] = join;
    }
    
    request[table] = tableQuery;
    
    return this.handleRequest(request, 'GET');
  }

  /**
   * POST 方法 - 使用 body 查询单个对象（推荐）
   * 
   * 请求示例：
   * POST /apijson/get
   * Body: {"user": {"id": 1, "@column": "id,name,age"}}
   */
  @Post('get')
  @ApiOperation({
    summary: '查询单个对象（POST，推荐）',
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
  async getPost(@Body() request: APIJSONRequest): Promise<APIJSONResponseDTO> {
    return this.handleRequest(request, 'GET');
  }

  /**
   * GET 方法 - 使用查询参数查询多个对象
   */
  @Get('gets')
  @ApiOperation({
    summary: '查询多个对象（GET）',
    description: '使用查询参数查询多个对象，适合简单查询',
  })
  @ApiQuery({
    name: 'table',
    required: true,
    description: '表名',
    example: 'User',
  })
  @ApiQuery({
    name: 'count',
    required: false,
    description: '每页数量',
    example: '10',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: '页码',
    example: '0',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    description: '排序',
    example: 'id-',
  })
  @ApiQuery({
    name: 'where',
    required: false,
    description: 'WHERE 条件（JSON 格式）',
    example: '{"age>":18}',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: APIJSONResponseDTO,
  })
  @HttpCode(HttpStatus.OK)
  async gets(
    @Query('table') table: string,
    @Query('count') count?: string,
    @Query('page') page?: string,
    @Query('order') order?: string,
    @Query('where') where?: string,
  ): Promise<APIJSONResponseDTO> {
    const request: APIJSONRequest = {};
    const tableQuery: any = {};
    
    if (count) {
      tableQuery['@count'] = parseInt(count, 10);
    }
    
    if (page) {
      tableQuery['@page'] = parseInt(page, 10);
    }
    
    if (order) {
      tableQuery['@order'] = order;
    }
    
    if (where) {
      try {
        const whereObj = JSON.parse(where);
        Object.assign(tableQuery, whereObj);
      } catch (e) {
        this.logger.warn(`WHERE 条件 JSON 解析失败: ${where}`);
      }
    }
    
    request[`${table}[]`] = tableQuery;
    
    return this.handleRequest(request, 'GET');
  }

  /**
   * POST 方法 - 使用 body 查询多个对象（推荐）
   */
  @Post('gets')
  @ApiOperation({
    summary: '查询多个对象（POST，推荐）',
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
    },
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: APIJSONResponseDTO,
  })
  @ApiConsumes('application/json')
  @HttpCode(HttpStatus.OK)
  async getsPost(@Body() request: APIJSONRequest): Promise<APIJSONResponseDTO> {
    return this.handleRequest(request, 'GET');
  }

  /**
   * POST 方法 - 查询总数
   */
  @Post('head')
  @ApiOperation({
    summary: '查询总数（POST）',
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
    },
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: APIJSONResponseDTO,
  })
  @ApiConsumes('application/json')
  @HttpCode(HttpStatus.OK)
  async head(@Body() request: APIJSONRequest): Promise<APIJSONResponseDTO> {
    return this.handleRequest(request, 'HEAD');
  }

  /**
   * POST 方法 - 查询多个总数
   */
  @Post('heads')
  @ApiOperation({
    summary: '查询多个总数（POST）',
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
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: APIJSONResponseDTO,
  })
  @ApiConsumes('application/json')
  @HttpCode(HttpStatus.OK)
  async heads(@Body() request: APIJSONRequest): Promise<APIJSONResponseDTO> {
    return this.handleRequest(request, 'HEAD');
  }

  /**
   * POST 方法 - 新增数据
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
   * POST 方法 - 更新数据
   */
  @Post('put')
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
   * POST 方法 - 删除数据
   */
  @Post('delete')
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
   * POST 方法 - 混合操作
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
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '操作成功',
    type: APIJSONResponseDTO,
  })
  @ApiConsumes('application/json')
  @HttpCode(HttpStatus.OK)
  async crud(@Body() request: APIJSONRequest): Promise<APIJSONResponseDTO> {
    return this.handleRequest(request, 'POST');
  }

  /**
   * 通用请求处理方法
   */
  private async handleRequest(
    request: APIJSONRequest,
    httpMethod: string
  ): Promise<APIJSONResponseDTO> {
    const startTime = Date.now();

    try {
      this.logger.log(`[APIJSON] 开始处理请求: ${httpMethod}, 请求体: ${JSON.stringify(request)}`);

      // 判断是否为查询操作（只对查询操作使用缓存）
      const isQueryOperation = this.isQueryOperation(httpMethod, request);
      this.logger.log(`[APIJSON] 是否为查询操作: ${isQueryOperation}`);

      // 只对查询操作检查和设置缓存
      let cacheKey: string | null = null;
      if (isQueryOperation) {
        cacheKey = this.generateCacheKey(request, httpMethod);
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
      }

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
          path: `/apijson/${httpMethod.toLowerCase()}`,
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
        path: `/apijson/${httpMethod.toLowerCase()}`,
        cached: false,
      };

      // 只对查询操作缓存响应
      if (isQueryOperation && this.isCacheableRequest(request)) {
        await this.cacheService.set(cacheKey!, response, 300000); // 5分钟
        this.logger.log(`[APIJSON] 响应已缓存`);
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
        path: `/apijson/${httpMethod.toLowerCase()}`,
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
   * 判断是否为查询操作
   * 只有 GET 和 HEAD 方法是查询操作，POST、PUT、DELETE 不是
   */
  private isQueryOperation(httpMethod: string, request: APIJSONRequest): boolean {
    const method = httpMethod.toUpperCase();
    
    // 只缓存 GET 和 HEAD 请求
    if (method !== 'GET' && method !== 'HEAD') {
      return false;
    }
    
    // 检查是否有 @method 指令（如果有，则不是纯查询操作）
    const hasMethodDirective = Object.keys(request).some(key => key === '@method');
    if (hasMethodDirective) {
      return false;
    }
    
    return true;
  }

  /**
   * 判断是否为可缓存的请求
   * 只有查询操作且不包含数组查询的请求才可缓存
   */
  private isCacheableRequest(request: APIJSONRequest): boolean {
    // 不缓存数组查询
    const hasArrayKey = Object.keys(request).some(key => key.endsWith('[]'));
    return !hasArrayKey;
  }
}
