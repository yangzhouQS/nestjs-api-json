/**
 * APIJSON配置类
 * 管理所有APIJSON相关的配置选项
 */

export class APIJSONConfig {
  // ========== Parser 配置 ==========
  /** 是否从1开始分页 */
  public static IS_START_FROM_1: boolean = false;

  /** 最大查询页数 */
  public static MAX_QUERY_PAGE: number = 100;

  /** 默认查询数量 */
  public static DEFAULT_QUERY_COUNT: number = 10;

  /** 最大查询数量 */
  public static MAX_QUERY_COUNT: number = 100;

  /** 最大SQL数量 */
  public static MAX_SQL_COUNT: number = 200;

  /** 最大对象数量 */
  public static MAX_OBJECT_COUNT: number = 5;

  /** 最大数组数量 */
  public static MAX_ARRAY_COUNT: number = 5;

  /** 最大查询深度 */
  public static MAX_QUERY_DEPTH: number = 5;

  /** 是否打印请求字符串日志 */
  public static IS_PRINT_REQUEST_STRING_LOG: boolean = false;

  /** 是否打印大日志 */
  public static IS_PRINT_BIG_LOG: boolean = false;

  /** 是否打印请求结束时间日志 */
  public static IS_PRINT_REQUEST_ENDTIME_LOG: boolean = false;

  /** 是否返回堆栈跟踪 */
  public static IS_RETURN_STACK_TRACE: boolean = true;

  // ========== SQLConfig 配置 ==========
  /** 默认数据库 */
  public static DEFAULT_DATABASE: string = 'sys';

  /** 默认Schema */
  public static DEFAULT_SCHEMA: string = 'public';

  /** 默认数据源 */
  public static DEFAULT_DATASOURCE: string = 'DEFAULT';

  /** 是否启用缓存 */
  public static ENABLE_CACHE: boolean = true;

  /** 缓存过期时间（秒） */
  public static CACHE_EXPIRE_TIME: number = 60;

  /** 最大缓存大小 */
  public static MAX_CACHE_SIZE: number = 1000;

  // ========== Verifier 配置 ==========
  /** 是否启用角色验证 */
  public static ENABLE_VERIFY_ROLE: boolean = true;

  /** 是否启用内容验证 */
  public static ENABLE_VERIFY_CONTENT: boolean = true;

  /** 最大更新数量 */
  public static MAX_UPDATE_COUNT: number = 10;

  // ========== FunctionParser 配置 ==========
  /** 是否启用远程函数 */
  public static ENABLE_REMOTE_FUNCTION: boolean = true;

  /** 是否启用脚本函数 */
  public static ENABLE_SCRIPT_FUNCTION: boolean = true;

  // ========== 数据库配置 ==========
  /** 支持的数据库类型 */
  public static readonly DATABASE_TYPES = [
    'MySQL',
    'PostgreSQL',
    'Oracle',
    'SQLServer',
    'MongoDB',
    'ClickHouse',
    'TiDB',
    'DB2',
    'Sybase',
    'DM',
    'Kingbase',
    'Oscar',
    'SQLite',
  ] as const;

  /** 数据库类型常量 */
  public static readonly DatabaseType = {
    MYSQL: 'MySQL',
    POSTGRESQL: 'PostgreSQL',
    ORACLE: 'Oracle',
    SQLSERVER: 'SQLServer',
    MONGODB: 'MongoDB',
    CLICKHOUSE: 'ClickHouse',
    TIDB: 'TiDB',
    DB2: 'DB2',
    SYBASE: 'Sybase',
    DM: 'DM',
    KINGBASE: 'Kingbase',
    OSCAR: 'Oscar',
    SQLITE: 'SQLite',
  } as const;

  /**
   * 获取配置值
   */
  static get(key: string): any {
    return (this as any)[key];
  }

  /**
   * 设置配置值
   */
  static set(key: string, value: any): void {
    (this as any)[key] = value;
  }

  /**
   * 重置所有配置为默认值
   */
  static reset(): void {
    this.IS_START_FROM_1 = false;
    this.MAX_QUERY_PAGE = 100;
    this.DEFAULT_QUERY_COUNT = 10;
    this.MAX_QUERY_COUNT = 100;
    this.MAX_SQL_COUNT = 200;
    this.MAX_OBJECT_COUNT = 5;
    this.MAX_ARRAY_COUNT = 5;
    this.MAX_QUERY_DEPTH = 5;
    this.IS_PRINT_REQUEST_STRING_LOG = false;
    this.IS_PRINT_BIG_LOG = false;
    this.IS_PRINT_REQUEST_ENDTIME_LOG = false;
    this.IS_RETURN_STACK_TRACE = true;

    this.DEFAULT_DATABASE = 'sys';
    this.DEFAULT_SCHEMA = 'public';
    this.DEFAULT_DATASOURCE = 'DEFAULT';
    this.ENABLE_CACHE = true;
    this.CACHE_EXPIRE_TIME = 60;
    this.MAX_CACHE_SIZE = 1000;

    this.ENABLE_VERIFY_ROLE = true;
    this.ENABLE_VERIFY_CONTENT = true;
    this.MAX_UPDATE_COUNT = 10;

    this.ENABLE_REMOTE_FUNCTION = true;
    this.ENABLE_SCRIPT_FUNCTION = true;
  }

  /**
   * 从环境变量加载配置
   */
  static loadFromEnv(): void {
    if (process.env.APIJSON_IS_START_FROM_1 !== undefined) {
      this.IS_START_FROM_1 = process.env.APIJSON_IS_START_FROM_1 === 'true';
    }
    if (process.env.APIJSON_MAX_QUERY_PAGE) {
      this.MAX_QUERY_PAGE = parseInt(process.env.APIJSON_MAX_QUERY_PAGE, 10);
    }
    if (process.env.APIJSON_DEFAULT_QUERY_COUNT) {
      this.DEFAULT_QUERY_COUNT = parseInt(process.env.APIJSON_DEFAULT_QUERY_COUNT, 10);
    }
    if (process.env.APIJSON_MAX_QUERY_COUNT) {
      this.MAX_QUERY_COUNT = parseInt(process.env.APIJSON_MAX_QUERY_COUNT, 10);
    }
    if (process.env.APIJSON_MAX_SQL_COUNT) {
      this.MAX_SQL_COUNT = parseInt(process.env.APIJSON_MAX_SQL_COUNT, 10);
    }
    if (process.env.APIJSON_MAX_OBJECT_COUNT) {
      this.MAX_OBJECT_COUNT = parseInt(process.env.APIJSON_MAX_OBJECT_COUNT, 10);
    }
    if (process.env.APIJSON_MAX_ARRAY_COUNT) {
      this.MAX_ARRAY_COUNT = parseInt(process.env.APIJSON_MAX_ARRAY_COUNT, 10);
    }
    if (process.env.APIJSON_MAX_QUERY_DEPTH) {
      this.MAX_QUERY_DEPTH = parseInt(process.env.APIJSON_MAX_QUERY_DEPTH, 10);
    }
    if (process.env.APIJSON_ENABLE_CACHE !== undefined) {
      this.ENABLE_CACHE = process.env.APIJSON_ENABLE_CACHE === 'true';
    }
    if (process.env.APIJSON_CACHE_EXPIRE_TIME) {
      this.CACHE_EXPIRE_TIME = parseInt(process.env.APIJSON_CACHE_EXPIRE_TIME, 10);
    }
    if (process.env.APIJSON_MAX_CACHE_SIZE) {
      this.MAX_CACHE_SIZE = parseInt(process.env.APIJSON_MAX_CACHE_SIZE, 10);
    }
    if (process.env.APIJSON_ENABLE_VERIFY_ROLE !== undefined) {
      this.ENABLE_VERIFY_ROLE = process.env.APIJSON_ENABLE_VERIFY_ROLE === 'true';
    }
    if (process.env.APIJSON_ENABLE_VERIFY_CONTENT !== undefined) {
      this.ENABLE_VERIFY_CONTENT = process.env.APIJSON_ENABLE_VERIFY_CONTENT === 'true';
    }
    if (process.env.APIJSON_ENABLE_REMOTE_FUNCTION !== undefined) {
      this.ENABLE_REMOTE_FUNCTION = process.env.APIJSON_ENABLE_REMOTE_FUNCTION === 'true';
    }
    if (process.env.APIJSON_ENABLE_SCRIPT_FUNCTION !== undefined) {
      this.ENABLE_SCRIPT_FUNCTION = process.env.APIJSON_ENABLE_SCRIPT_FUNCTION === 'true';
    }
  }

  /**
   * 获取所有配置
   */
  static getAll(): Record<string, any> {
    return {
      IS_START_FROM_1: this.IS_START_FROM_1,
      MAX_QUERY_PAGE: this.MAX_QUERY_PAGE,
      DEFAULT_QUERY_COUNT: this.DEFAULT_QUERY_COUNT,
      MAX_QUERY_COUNT: this.MAX_QUERY_COUNT,
      MAX_SQL_COUNT: this.MAX_SQL_COUNT,
      MAX_OBJECT_COUNT: this.MAX_OBJECT_COUNT,
      MAX_ARRAY_COUNT: this.MAX_ARRAY_COUNT,
      MAX_QUERY_DEPTH: this.MAX_QUERY_DEPTH,
      IS_PRINT_REQUEST_STRING_LOG: this.IS_PRINT_REQUEST_STRING_LOG,
      IS_PRINT_BIG_LOG: this.IS_PRINT_BIG_LOG,
      IS_PRINT_REQUEST_ENDTIME_LOG: this.IS_PRINT_REQUEST_ENDTIME_LOG,
      IS_RETURN_STACK_TRACE: this.IS_RETURN_STACK_TRACE,
      DEFAULT_DATABASE: this.DEFAULT_DATABASE,
      DEFAULT_SCHEMA: this.DEFAULT_SCHEMA,
      DEFAULT_DATASOURCE: this.DEFAULT_DATASOURCE,
      ENABLE_CACHE: this.ENABLE_CACHE,
      CACHE_EXPIRE_TIME: this.CACHE_EXPIRE_TIME,
      MAX_CACHE_SIZE: this.MAX_CACHE_SIZE,
      ENABLE_VERIFY_ROLE: this.ENABLE_VERIFY_ROLE,
      ENABLE_VERIFY_CONTENT: this.ENABLE_VERIFY_CONTENT,
      MAX_UPDATE_COUNT: this.MAX_UPDATE_COUNT,
      ENABLE_REMOTE_FUNCTION: this.ENABLE_REMOTE_FUNCTION,
      ENABLE_SCRIPT_FUNCTION: this.ENABLE_SCRIPT_FUNCTION,
    };
  }
}
