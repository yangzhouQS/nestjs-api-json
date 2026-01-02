/**
 * 请求方法枚举
 * 对应 APIJSON 的请求方法
 */
export enum RequestMethod {
  /** 查询单个对象 */
  GET = 'GET',
  /** 查询多个对象 */
  GETS = 'GETS',
  /** 查询总数 */
  HEAD = 'HEAD',
  /** 查询多个总数 */
  HEADS = 'HEADS',
  /** 新增数据 */
  POST = 'POST',
  /** 更新数据 */
  PUT = 'PUT',
  /** 删除数据 */
  DELETE = 'DELETE',
  /** 混合操作 */
  CRUD = 'CRUD',
}

/**
 * 请求方法配置接口
 */
export interface RequestMethodConfig {
  /** 请求方法 */
  method: RequestMethod;
  /** 是否需要验证 */
  requireAuth?: boolean;
  /** 支持的表操作 */
  operations: string[];
  /** 描述 */
  description: string;
}

/**
 * 请求方法配置映射
 */
export const REQUEST_METHOD_CONFIGS: Record<RequestMethod, RequestMethodConfig> = {
  [RequestMethod.GET]: {
    method: RequestMethod.GET,
    requireAuth: false,
    operations: ['SELECT'],
    description: '查询单个对象',
  },
  [RequestMethod.GETS]: {
    method: RequestMethod.GETS,
    requireAuth: false,
    operations: ['SELECT'],
    description: '查询多个对象',
  },
  [RequestMethod.HEAD]: {
    method: RequestMethod.HEAD,
    requireAuth: false,
    operations: ['SELECT', 'COUNT'],
    description: '查询总数',
  },
  [RequestMethod.HEADS]: {
    method: RequestMethod.HEADS,
    requireAuth: false,
    operations: ['SELECT', 'COUNT'],
    description: '查询多个总数',
  },
  [RequestMethod.POST]: {
    method: RequestMethod.POST,
    requireAuth: true,
    operations: ['INSERT'],
    description: '新增数据',
  },
  [RequestMethod.PUT]: {
    method: RequestMethod.PUT,
    requireAuth: true,
    operations: ['UPDATE'],
    description: '更新数据',
  },
  [RequestMethod.DELETE]: {
    method: RequestMethod.DELETE,
    requireAuth: true,
    operations: ['DELETE'],
    description: '删除数据',
  },
  [RequestMethod.CRUD]: {
    method: RequestMethod.CRUD,
    requireAuth: true,
    operations: ['INSERT', 'UPDATE', 'DELETE', 'SELECT'],
    description: '混合操作',
  },
};

/**
 * 表操作类型
 */
export enum TableOperation {
  /** 查询操作 */
  SELECT = 'SELECT',
  /** 插入操作 */
  INSERT = 'INSERT',
  /** 更新操作 */
  UPDATE = 'UPDATE',
  /** 删除操作 */
  DELETE = 'DELETE',
  /** 计数操作 */
  COUNT = 'COUNT',
}

/**
 * 查询类型枚举
 */
export enum QueryType {
  /** 只查数据 */
  DATA_ONLY = 0,
  /** 只查总数 */
  COUNT_ONLY = 1,
  /** 查数据和总数 */
  DATA_AND_COUNT = 2,
}

/**
 * JOIN 类型枚举
 */
export enum JoinType {
  /** 应用级 JOIN */
  APP = '@',
  /** INNER JOIN */
  INNER = '&',
  /** FULL JOIN */
  FULL = '|',
  /** LEFT JOIN */
  LEFT = '<',
  /** RIGHT JOIN */
  RIGHT = '>',
  /** OUTER JOIN */
  OUTER = '!',
  /** SIDE JOIN */
  SIDE = '^',
  /** ANTI JOIN */
  ANTI = '(',
  /** FOREIGN JOIN */
  FOREIGN = ')',
  /** ASOF JOIN */
  ASOF = '~',
}

/**
 * 角色类型枚举
 */
export enum Role {
  /** 未知用户 */
  UNKNOWN = 'UNKNOWN',
  /** 已登录用户 */
  LOGIN = 'LOGIN',
  /** 联系人 */
  CONTACT = 'CONTACT',
  /** 好友 */
  CIRCLE = 'CIRCLE',
  /** 所有者 */
  OWNER = 'OWNER',
  /** 管理员 */
  ADMIN = 'ADMIN',
}

/**
 * 排序方向枚举
 */
export enum SortDirection {
  /** 升序 */
  ASC = '+',
  /** 降序 */
  DESC = '-',
}
