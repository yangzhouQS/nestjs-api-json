import { SetMetadata } from '@nestjs/common';

/**
 * APIJSON日志装饰器
 */
export const APIJSONLog = (options: { enabled: boolean; level: string }) =>
  SetMetadata('apijsonLog', options);

/**
 * APIJSON性能监控装饰器
 */
export const APIJSONPerformance = (options: { enabled: boolean }) =>
  SetMetadata('apijsonPerformance', options);

/**
 * APIJSON缓存装饰器
 */
export const APIJSONCache = (options: { enabled: boolean }) =>
  SetMetadata('apijsonCache', options);

/**
 * APIJSON转换装饰器
 */
export const APIJSONTransform = (options: { enabled: boolean }) =>
  SetMetadata('apijsonTransform', options);

/**
 * APIJSON认证装饰器
 */
export const APIJSONAuth = (options: {
  enabled: boolean;
  roles?: string[];
  permissions?: string[];
  skip?: boolean;
}) => SetMetadata('apijsonAuth', options);

/**
 * APIJSON限流装饰器
 */
export const APIJSONRateLimit = (options: {
  enabled: boolean;
  max?: number;
  windowMs?: number;
  message?: string;
}) => SetMetadata('apijsonRateLimit', options);
