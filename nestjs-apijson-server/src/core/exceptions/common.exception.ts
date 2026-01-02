/**
 * 通用异常类
 * 所有APIJSON异常的基类
 */
export class CommonException extends Error {
  /** 错误码 */
  public readonly code: number;

  /** 错误详情 */
  public readonly details?: any;

  constructor(message: string, code: number = 500, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * 获取错误码
   */
  getCode(): number {
    return this.code;
  }

  /**
   * 获取错误详情
   */
  getDetails(): any {
    return this.details;
  }

  /**
   * 转换为JSON对象
   */
  toJSON(): any {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * 错误码常量
 */
export const ErrorCode = {
  /** 成功 */
  SUCCESS: 200,
  /** 参数错误 */
  BAD_REQUEST: 400,
  /** 未授权 */
  UNAUTHORIZED: 401,
  /** 禁止访问 */
  FORBIDDEN: 403,
  /** 未找到 */
  NOT_FOUND: 404,
  /** 方法不允许 */
  METHOD_NOT_ALLOWED: 405,
  /** 冲突 */
  CONFLICT: 409,
  /** 服务器错误 */
  INTERNAL_SERVER_ERROR: 500,
  /** 服务不可用 */
  SERVICE_UNAVAILABLE: 503,

  /** 条件错误 */
  CONDITION_ERROR: 1001,
  /** 不存在 */
  NOT_EXIST: 1002,
  /** 超出范围 */
  OUT_OF_RANGE: 1003,
  /** 不支持的数据类型 */
  UNSUPPORTED_DATA_TYPE: 1004,
  /** 未登录 */
  NOT_LOGGED_IN: 1005,
  /** 权限不足 */
  INSUFFICIENT_PERMISSION: 1006,
  /** 验证失败 */
  VALIDATION_FAILED: 1007,
  /** 解析错误 */
  PARSE_ERROR: 1008,
  /** 执行错误 */
  EXECUTE_ERROR: 1009,
} as const;
