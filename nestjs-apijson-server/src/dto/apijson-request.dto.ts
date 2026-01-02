import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

/**
 * APIJSON 查询条件 DTO
 */
export class APIJSONQueryCondition {
  @ApiPropertyOptional({
    description: '等于',
    example: 1,
  })
  id?: number;

  @ApiPropertyOptional({
    description: '不等于',
    example: 1,
  })
  'id!'?: number;

  @ApiPropertyOptional({
    description: '大于',
    example: 10,
  })
  'id>'?: number;

  @ApiPropertyOptional({
    description: '小于',
    example: 100,
  })
  'id<'?: number;

  @ApiPropertyOptional({
    description: '大于等于',
    example: 10,
  })
  'id>='?: number;

  @ApiPropertyOptional({
    description: '小于等于',
    example: 100,
  })
  'id<='?: number;

  @ApiPropertyOptional({
    description: 'IN 查询',
    example: [1, 2, 3],
  })
  'id{}'?: number[];

  @ApiPropertyOptional({
    description: 'NOT IN 查询',
    example: [1, 2, 3],
  })
  'id!{}'?: number[];

  @ApiPropertyOptional({
    description: 'BETWEEN 查询',
    example: [1, 100],
  })
  'id><'?: [number, number];

  @ApiPropertyOptional({
    description: 'NOT BETWEEN 查询',
    example: [1, 100],
  })
  'id!><'?: [number, number];

  @ApiPropertyOptional({
    description: 'LIKE 查询',
    example: '张%',
  })
  'name~'?: string;

  @ApiPropertyOptional({
    description: 'NOT LIKE 查询',
    example: '张%',
  })
  'name!~'?: string;

  @ApiPropertyOptional({
    description: '包含查询',
    example: '关键词',
  })
  'content<>'?: string;

  @ApiPropertyOptional({
    description: '不包含查询',
    example: '关键词',
  })
  'content!<>'?: string;
}

/**
 * APIJSON JOIN 配置 DTO
 */
export class APIJSONJoinConfig {
  @ApiProperty({
    description: '关联表名',
    example: 'Comment',
  })
  table: string;

  @ApiProperty({
    description: 'JOIN 类型',
    enum: ['@', '&', '|', '<', '>', '!', '^', '(', ')', '~'],
    example: '&',
  })
  type: string;

  @ApiProperty({
    description: '关联条件',
    example: 'userId',
  })
  on: string;

  @ApiPropertyOptional({
    description: '别名',
    example: 'c',
  })
  alias?: string;
}

/**
 * APIJSON 表查询 DTO
 */
export class APIJSONTableQuery {
  @ApiPropertyOptional({
    description: '查询字段',
    example: 'id,name,age',
  })
  '@column'?: string;

  @ApiPropertyOptional({
    description: '排序',
    example: 'id-',
  })
  '@order'?: string;

  @ApiPropertyOptional({
    description: '分组',
    example: 'userId',
  })
  '@group'?: string;

  @ApiPropertyOptional({
    description: '分组过滤',
    example: 'COUNT(*)>0',
  })
  '@having'?: string;

  @ApiPropertyOptional({
    description: '缓存时间（毫秒）',
    example: 60000,
  })
  '@cache'?: number;

  @ApiPropertyOptional({
    description: '是否返回总数',
    example: true,
  })
  '@total'?: boolean;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 10,
  })
  '@count'?: number;

  @ApiPropertyOptional({
    description: '页码',
    example: 0,
  })
  '@page'?: number;

  @ApiPropertyOptional({
    description: '限制数量',
    example: 100,
  })
  '@limit'?: number;

  @ApiPropertyOptional({
    description: '偏移量',
    example: 0,
  })
  '@offset'?: number;

  @ApiPropertyOptional({
    description: '查询类型',
    enum: ['0', '1', '2'],
    example: '0',
  })
  '@query'?: string;

  @ApiPropertyOptional({
    description: '角色',
    enum: ['UNKNOWN', 'LOGIN', 'CONTACT', 'CIRCLE', 'OWNER', 'ADMIN'],
    example: 'LOGIN',
  })
  '@role'?: string;

  @ApiPropertyOptional({
    description: '数据库',
    example: 'apijson',
  })
  '@database'?: string;

  @ApiPropertyOptional({
    description: '模式',
    example: 'public',
  })
  '@schema'?: string;

  @ApiPropertyOptional({
    description: '是否显示执行计划',
    example: false,
  })
  '@explain'?: boolean;

  @ApiProperty({
    description: 'JOIN 配置',
    type: [APIJSONJoinConfig],
    required: false,
  })
  '@join'?: APIJSONJoinConfig[];

  // 查询条件（动态属性，不支持装饰器）
  // @ts-ignore
  [key: string]: any;
}

/**
 * APIJSON 请求 DTO
 */
export class APIJSONRequestDTO {
  @ApiPropertyOptional({
    description: 'User 表查询',
    type: APIJSONTableQuery,
    example: {
      id: 1,
      '@column': 'id,name,age',
    },
  })
  User?: APIJSONTableQuery;

  @ApiPropertyOptional({
    description: 'User 数组查询',
    type: APIJSONTableQuery,
    example: {
      '@count': 10,
      '@page': 0,
      '@order': 'id-',
    },
  })
  'User[]'?: APIJSONTableQuery;

  @ApiPropertyOptional({
    description: 'Moment 表查询',
    type: APIJSONTableQuery,
    example: {
      userId: 1,
      '@column': 'id,content,userId',
    },
  })
  Moment?: APIJSONTableQuery;

  @ApiPropertyOptional({
    description: 'Comment 表查询',
    type: APIJSONTableQuery,
    example: {
      momentId: 1,
      '@column': 'id,content,userId',
    },
  })
  Comment?: APIJSONTableQuery;

  // 自定义表查询（动态属性，不支持装饰器）
  // @ts-ignore
  [key: string]: any;
}

/**
 * GET 请求 DTO
 */
export class APIJSONGetRequestDTO {
  @ApiProperty({
    description: 'APIJSON 查询请求',
    type: APIJSONRequestDTO,
    example: {
      User: {
        id: 1,
        '@column': 'id,name,age',
      },
    },
  })
  @IsObject()
  request: APIJSONRequestDTO;
}

/**
 * GETS 请求 DTO
 */
export class APIJSONGetsRequestDTO {
  @ApiProperty({
    description: 'APIJSON 查询请求',
    type: APIJSONRequestDTO,
    example: {
      'User[]': {
        '@count': 10,
        '@page': 0,
        '@order': 'id-',
      },
    },
  })
  @IsObject()
  request: APIJSONRequestDTO;
}

/**
 * HEAD 请求 DTO
 */
export class APIJSONHeadRequestDTO {
  @ApiProperty({
    description: 'APIJSON 查询请求',
    type: APIJSONRequestDTO,
    example: {
      User: {
        '@column': 'COUNT(*):count',
      },
    },
  })
  @IsObject()
  request: APIJSONRequestDTO;
}

/**
 * HEADS 请求 DTO
 */
export class APIJSONHeadsRequestDTO {
  @ApiProperty({
    description: 'APIJSON 查询请求',
    type: APIJSONRequestDTO,
    example: {
      User: {
        '@column': 'COUNT(*):count',
      },
      Moment: {
        '@column': 'COUNT(*):count',
      },
    },
  })
  @IsObject()
  request: APIJSONRequestDTO;
}

/**
 * POST 请求 DTO
 */
export class APIJSONPostRequestDTO {
  @ApiProperty({
    description: 'APIJSON 插入请求',
    type: APIJSONRequestDTO,
    example: {
      User: {
        name: '张三',
        age: 25,
      },
    },
  })
  @IsObject()
  request: APIJSONRequestDTO;
}

/**
 * PUT 请求 DTO
 */
export class APIJSONPutRequestDTO {
  @ApiProperty({
    description: 'APIJSON 更新请求',
    type: APIJSONRequestDTO,
    example: {
      User: {
        id: 1,
        name: '李四',
        age: 26,
      },
    },
  })
  @IsObject()
  request: APIJSONRequestDTO;
}

/**
 * DELETE 请求 DTO
 */
export class APIJSONDeleteRequestDTO {
  @ApiProperty({
    description: 'APIJSON 删除请求',
    type: APIJSONRequestDTO,
    example: {
      User: {
        id: 1,
      },
    },
  })
  @IsObject()
  request: APIJSONRequestDTO;
}

/**
 * CRUD 请求 DTO
 */
export class APIJSONCrudRequestDTO {
  @ApiProperty({
    description: 'APIJSON 混合操作请求',
    type: APIJSONRequestDTO,
    example: {
      User: {
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
  })
  @IsObject()
  request: APIJSONRequestDTO;
}
