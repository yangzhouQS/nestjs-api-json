import { registerAs } from '@nestjs/config';

/**
 * 应用配置
 */
export default registerAs('app', () => ({
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || '0.0.0.0',
  globalPrefix: process.env.GLOBAL_PREFIX || 'api',
  version: process.env.APP_VERSION || '1.0.0',
}));

/**
 * 数据库配置
 */
export const databaseConfig = registerAs('database', () => ({
  type: process.env.DB_TYPE || 'sqlite',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'apijson',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
  ssl: process.env.DB_SSL === 'true',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT, 10) || 60000,
  timeout: parseInt(process.env.DB_TIMEOUT, 10) || 60000,
}));

/**
 * JWT配置
 */
export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'default-secret',
  expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  issuer: process.env.JWT_ISSUER || 'apijson-server',
  audience: process.env.JWT_AUDIENCE || 'apijson-client',
}));

/**
 * 缓存配置
 */
export const cacheConfig = registerAs('cache', () => ({
  type: process.env.CACHE_TYPE || 'memory',
  host: process.env.CACHE_HOST || 'localhost',
  port: parseInt(process.env.CACHE_PORT, 10) || 6379,
  password: process.env.CACHE_PASSWORD || '',
  db: parseInt(process.env.CACHE_DB, 10) || 0,
  keyPrefix: process.env.CACHE_KEY_PREFIX || 'apijson:',
  defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL, 10) || 300000, // 5分钟
  maxSize: parseInt(process.env.CACHE_MAX_SIZE, 10) || 1000,
  checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD, 10) || 600000, // 10分钟
}));

/**
 * 日志配置
 */
export const loggingConfig = registerAs('logging', () => ({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.LOG_FORMAT || 'json',
  datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD',
  maxSize: process.env.LOG_MAX_SIZE || '20m',
  maxFiles: parseInt(process.env.LOG_MAX_FILES, 10) || 14,
  logBody: process.env.LOG_BODY === 'true',
  logHeaders: process.env.LOG_HEADERS === 'true',
  logResponse: process.env.LOG_RESPONSE === 'true',
  logQuery: process.env.LOG_QUERY === 'true',
  logError: process.env.LOG_ERROR === 'true',
}));

/**
 * 性能配置
 */
export const performanceConfig = registerAs('performance', () => ({
  enableProfiling: process.env.PERFORMANCE_ENABLE_PROFILING === 'true',
  slowQueryThreshold: parseInt(process.env.PERFORMANCE_SLOW_QUERY_THRESHOLD, 10) || 1000,
  logMemoryUsage: process.env.PERFORMANCE_LOG_MEMORY_USAGE === 'true',
  logCpuUsage: process.env.PERFORMANCE_LOG_CPU_USAGE === 'true',
  sampleRate: parseFloat(process.env.PERFORMANCE_SAMPLE_RATE) || 1.0,
}));

/**
 * 安全配置
 */
export const securityConfig = registerAs('security', () => ({
  enabled: process.env.SECURITY_ENABLED === 'true',
  roles: process.env.SECURITY_ROLES ? process.env.SECURITY_ROLES.split(',') : ['user', 'admin'],
  permissions: process.env.SECURITY_PERMISSIONS ? process.env.SECURITY_PERMISSIONS.split(',') : ['read', 'write'],
  passwordMinLength: parseInt(process.env.SECURITY_PASSWORD_MIN_LENGTH, 10) || 8,
  passwordRequireUppercase: process.env.SECURITY_PASSWORD_REQUIRE_UPPERCASE === 'true',
  passwordRequireLowercase: process.env.SECURITY_PASSWORD_REQUIRE_LOWERCASE === 'true',
  passwordRequireNumbers: process.env.SECURITY_PASSWORD_REQUIRE_NUMBERS === 'true',
  passwordRequireSpecialChars: process.env.SECURITY_PASSWORD_REQUIRE_SPECIAL_CHARS === 'true',
  sessionTimeout: parseInt(process.env.SECURITY_SESSION_TIMEOUT, 10) || 3600000, // 1小时
  maxLoginAttempts: parseInt(process.env.SECURITY_MAX_LOGIN_ATTEMPTS, 10) || 5,
  lockoutDuration: parseInt(process.env.SECURITY_LOCKOUT_DURATION, 10) || 900000, // 15分钟
}));

/**
 * 限流配置
 */
export const rateLimitConfig = registerAs('rateLimit', () => ({
  enabled: process.env.RATE_LIMIT_ENABLED === 'true',
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15分钟
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  message: process.env.RATE_LIMIT_MESSAGE || '请求过于频繁，请稍后再试',
  skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true',
  skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED_REQUESTS === 'true',
}));

/**
 * CORS配置
 */
export const corsConfig = registerAs('cors', () => ({
  origin: process.env.CORS_ORIGIN || '*',
  methods: process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: process.env.CORS_CREDENTIALS === 'true',
}));

/**
 * Swagger配置
 */
export const swaggerConfig = registerAs('swagger', () => ({
  enabled: process.env.SWAGGER_ENABLED === 'true',
  title: process.env.SWAGGER_TITLE || 'APIJSON Server API',
  description: process.env.SWAGGER_DESCRIPTION || '基于 NestJS 的 APIJSON 服务器实现',
  version: process.env.SWAGGER_VERSION || '1.0.0',
  path: process.env.SWAGGER_PATH || 'docs',
  customCss: process.env.SWAGGER_CUSTOM_CSS || '',
  customJs: process.env.SWAGGER_CUSTOM_JS || '',
}));
