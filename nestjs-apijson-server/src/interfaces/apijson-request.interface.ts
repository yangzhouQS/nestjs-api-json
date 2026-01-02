/**
 * APIJSON请求接口
 */
export interface APIJSONRequest {
  [key: string]: any;
}

/**
 * APIJSON响应接口
 */
export interface APIJSONResponse {
  status: 'success' | 'error';
  code: number;
  message: string;
  data?: any;
  errors?: string[];
  warnings?: string[];
  processingTime: number;
  timestamp: string;
  path: string;
  cached: boolean;
}

/**
 * 解析结果接口
 */
export interface ParseResult {
  tables: { [key: string]: TableQuery };
  directives: { [key: string]: Directive };
  original: APIJSONRequest;
}

/**
 * 验证结果接口
 */
export interface VerifyResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  tables: { [key: string]: TableVerifyResult };
  directives: { [key: string]: DirectiveVerifyResult };
  original: ParseResult;
}

/**
 * 构建结果接口
 */
export interface BuildResult {
  queries: Query[];
  directives: { [key: string]: Directive };
  original: ParseResult;
}

/**
 * 执行结果接口
 */
export interface ExecuteResult {
  data: { [key: string]: any };
  directives: { [key: string]: Directive };
  original: BuildResult;
}

/**
 * 表查询接口
 */
export interface TableQuery {
  name: string;
  operation?: string;
  columns: any[];
  where: any;
  joins: any[];
  group: any[];
  having: any;
  order: any[];
  limit: number;
  offset: number;
  isArray?: boolean;
  data?: any;
  query?: any;
  cache?: any;
  role?: string;
  database?: string;
  schema?: string;
  explain?: boolean;
  references?: { [key: string]: string }; // 引用字段映射，如 { "order_id": "/receive/id" }
}

/**
 * 指令接口
 */
export interface Directive {
  name: string;
  value: any;
}

/**
 * 查询接口
 */
export interface Query {
  table: string;
  operation?: string;
  type: string;
  columns: any[];
  where: any;
  joins: any[];
  group: any[];
  having: any;
  order: any[];
  limit: number;
  offset: number;
  sql: string;
  params: any[];
  query?: any;
  data?: any;
  references?: { [key: string]: string }; // 引用字段映射
}

/**
 * 表验证结果接口
 */
export interface TableVerifyResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  table: string;
  columns: any[];
  where: any;
  joins: any[];
  group: any[];
  having: any;
  order: any[];
  limit: number;
  offset: number;
}

/**
 * 指令验证结果接口
 */
export interface DirectiveVerifyResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  name: string;
  value: any;
}

/**
 * 查询执行结果接口
 */
export interface QueryExecuteResult {
  data: any[];
  total: number;
  count: number;
}

/**
 * 数据库配置接口
 */
export interface DatabaseConfig {
  type: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
  ssl: boolean;
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
}

/**
 * 缓存配置接口
 */
export interface CacheConfig {
  type: string;
  host: string;
  port: number;
  password: string;
  db: number;
  keyPrefix: string;
  defaultTTL: number;
  maxSize: number;
  checkPeriod: number;
}

/**
 * 日志配置接口
 */
export interface LogConfig {
  level: string;
  format: string;
  datePattern: string;
  maxSize: string;
  maxFiles: number;
  logBody: boolean;
  logHeaders: boolean;
  logResponse: boolean;
  logQuery: boolean;
  logError: boolean;
}

/**
 * 性能配置接口
 */
export interface PerformanceConfig {
  enableProfiling: boolean;
  slowQueryThreshold: number;
  logMemoryUsage: boolean;
  logCpuUsage: boolean;
  sampleRate: number;
}

/**
 * 安全配置接口
 */
export interface SecurityConfig {
  enabled: boolean;
  roles: string[];
  permissions: string[];
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecialChars: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
}

/**
 * 限流配置接口
 */
export interface RateLimitConfig {
  enabled: boolean;
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
}

/**
 * CORS配置接口
 */
export interface CorsConfig {
  origin: string;
  methods: string;
  credentials: boolean;
}

/**
 * Swagger配置接口
 */
export interface SwaggerConfig {
  enabled: boolean;
  title: string;
  description: string;
  version: string;
  path: string;
  customCss: string;
  customJs: string;
}
