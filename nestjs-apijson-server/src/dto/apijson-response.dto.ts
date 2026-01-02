import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * APIJSON 响应 DTO
 */
export class APIJSONResponseDTO {
  @ApiProperty({
    description: '响应状态',
    enum: ['success', 'error'],
    example: 'success',
  })
  status: 'success' | 'error';

  @ApiProperty({
    description: '响应状态码',
    example: 200,
  })
  code: number;

  @ApiProperty({
    description: '响应消息',
    example: '请求成功',
  })
  message: string;

  @ApiPropertyOptional({
    description: '响应数据',
    example: {
      user: {
        id: 1,
        name: '张三',
        age: 25,
      },
    },
  })
  data?: any;

  @ApiPropertyOptional({
    description: '错误信息列表',
    type: [String],
    example: [],
  })
  errors?: string[];

  @ApiPropertyOptional({
    description: '警告信息列表',
    type: [String],
    example: [],
  })
  warnings?: string[];

  @ApiProperty({
    description: '处理时间（毫秒）',
    example: 150,
  })
  processingTime: number;

  @ApiProperty({
    description: '响应时间戳',
    example: '2024-01-01T00:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: '请求路径',
    example: '/api/get',
  })
  path: string;

  @ApiProperty({
    description: '是否来自缓存',
    example: false,
  })
  cached: boolean;
}

/**
 * APIJSON 信息响应 DTO
 */
export class APIJSONInfoResponseDTO {
  @ApiProperty({
    description: '服务器名称',
    example: 'APIJSON Server',
  })
  name: string;

  @ApiProperty({
    description: '服务器版本',
    example: '1.0.0',
  })
  version: string;

  @ApiProperty({
    description: '服务器描述',
    example: '基于 NestJS 的 APIJSON 服务器实现',
  })
  description: string;

  @ApiProperty({
    description: '支持的功能列表',
    type: [String],
    example: [
      '完整的 APIJSON 语法支持',
      '支持所有请求方法（GET, GETS, HEAD, HEADS, POST, PUT, DELETE, CRUD）',
    ],
  })
  features: string[];

  @ApiProperty({
    description: '支持的请求方法',
    type: [String],
    example: [
      'GET - 查询单个对象',
      'GETS - 查询多个对象',
    ],
  })
  supportedMethods: string[];

  @ApiProperty({
    description: '支持的指令',
    type: [String],
    example: [
      '@method - 指定请求方法',
      '@column - 指定查询字段',
    ],
  })
  supportedDirectives: string[];

  @ApiProperty({
    description: '支持的操作',
    type: [String],
    example: [
      'SELECT - 查询',
      'INSERT - 插入',
    ],
  })
  supportedOperations: string[];

  @ApiProperty({
    description: '支持的 JOIN 类型',
    type: [String],
    example: [
      '@ - APP JOIN（应用级 JOIN）',
      '& - INNER JOIN',
    ],
  })
  supportedJoinTypes: string[];

  @ApiProperty({
    description: '支持的条件操作符',
    type: [String],
    example: [
      '= - 等于',
      '!= - 不等于',
    ],
  })
  supportedConditions: string[];
}

/**
 * APIJSON 统计信息响应 DTO
 */
export class APIJSONStatsResponseDTO {
  @ApiProperty({
    description: '总请求数',
    example: 1000,
  })
  totalRequests: number;

  @ApiProperty({
    description: '成功请求数',
    example: 950,
  })
  successfulRequests: number;

  @ApiProperty({
    description: '失败请求数',
    example: 50,
  })
  failedRequests: number;

  @ApiProperty({
    description: '平均处理时间（毫秒）',
    example: 150,
  })
  averageProcessingTime: number;

  @ApiPropertyOptional({
    description: '最后请求时间',
    example: '2024-01-01T00:00:00.000Z',
  })
  lastRequestTime?: string;

  @ApiProperty({
    description: '缓存命中率',
    example: 0.8,
  })
  cacheHitRate: number;
}

/**
 * 数据库大小信息 DTO
 */
export class DatabaseSizeDTO {
  @ApiProperty({
    description: '数据库名称',
    example: 'apijson',
  })
  database: string;

  @ApiProperty({
    description: '数据库大小',
    example: 1024,
  })
  size: number;

  @ApiProperty({
    description: '单位',
    example: 'MB',
  })
  unit: string;
}

/**
 * 数据库健康检查响应 DTO
 */
export class DatabaseHealthResponseDTO {
  @ApiProperty({
    description: '数据库状态',
    enum: ['healthy', 'unhealthy'],
    example: 'healthy',
  })
  status: 'healthy' | 'unhealthy';

  @ApiProperty({
    description: '是否已连接',
    example: true,
  })
  connected: boolean;

  @ApiPropertyOptional({
    description: '数据库版本',
    example: '8.0.32',
  })
  version?: string;

  @ApiPropertyOptional({
    description: '数据库大小信息',
    type: DatabaseSizeDTO,
  })
  size?: DatabaseSizeDTO;

  @ApiProperty({
    description: '检查时间戳',
    example: '2024-01-01T00:00:00.000Z',
  })
  timestamp: string;
}

/**
 * 缓存清空响应 DTO
 */
export class CacheClearResponseDTO {
  @ApiProperty({
    description: '响应状态',
    enum: ['success', 'error'],
    example: 'success',
  })
  status: 'success' | 'error';

  @ApiProperty({
    description: '响应状态码',
    example: 200,
  })
  code: number;

  @ApiProperty({
    description: '响应消息',
    example: '缓存已清空',
  })
  message: string;

  @ApiProperty({
    description: '处理时间（毫秒）',
    example: 50,
  })
  processingTime: number;

  @ApiProperty({
    description: '响应时间戳',
    example: '2024-01-01T00:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: '请求路径',
    example: '/api/cache/clear',
  })
  path: string;

  @ApiProperty({
    description: '是否来自缓存',
    example: false,
  })
  cached: boolean;
}
