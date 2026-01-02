import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { Reflector } from '@nestjs/core';
import { APIJSONLog } from '@/common/decorators/apijson.decorator';

/**
 * 日志拦截器
 * 负责记录请求和响应日志
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private readonly reflector?: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const handler = context.getHandler();

    // 获取日志配置
    const logConfig = this.reflector.get(APIJSONLog, handler);

    // 如果未配置日志，直接处理请求
    if (!logConfig || !logConfig.enabled) {
      return next.handle();
    }

    // 记录请求开始时间
    const startTime = Date.now();
    const { method, url, ip, headers } = request;

    // 记录请求日志
    this.logRequest({
      method,
      url,
      ip,
      headers: this.sanitizeHeaders(headers),
      body: this.sanitizeBody(request.body),
      query: request.query,
      params: request.params,
      timestamp: new Date().toISOString(),
    }, logConfig.level);

    // 处理响应
    return next.handle().pipe(
      tap(() => {
        // 计算处理时间
        const processingTime = Date.now() - startTime;
        const { statusCode } = response;

        // 记录响应日志
        this.logResponse({
          method,
          url,
          ip,
          statusCode,
          processingTime,
          timestamp: new Date().toISOString(),
        }, logConfig.level);
      }),
    );
  }

  /**
   * 记录请求日志
   */
  private logRequest(data: any, level: string): void {
    const logMessage = `${data.method} ${data.url}`;

    switch (level.toLowerCase()) {
      case 'debug':
        this.logger.debug(logMessage, data);
        break;
      case 'info':
        this.logger.log(logMessage, data);
        break;
      case 'warn':
        this.logger.warn(logMessage, data);
        break;
      case 'error':
        this.logger.error(logMessage, data);
        break;
      default:
        this.logger.log(logMessage, data);
    }
  }

  /**
   * 记录响应日志
   */
  private logResponse(data: any, level: string): void {
    const logMessage = `${data.method} ${data.url} - ${data.statusCode} (${data.processingTime}ms)`;

    switch (level.toLowerCase()) {
      case 'debug':
        this.logger.debug(logMessage, data);
        break;
      case 'info':
        this.logger.log(logMessage, data);
        break;
      case 'warn':
        this.logger.warn(logMessage, data);
        break;
      case 'error':
        this.logger.error(logMessage, data);
        break;
      default:
        this.logger.log(logMessage, data);
    }
  }

  /**
   * 清理请求头
   */
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };

    // 移除敏感信息
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'set-cookie',
      'x-api-key',
      'x-auth-token',
    ];

    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * 清理请求体
   */
  private sanitizeBody(body: any): any {
    if (!body) {
      return body;
    }

    // 如果是简单类型，直接返回
    if (typeof body !== 'object' || Array.isArray(body)) {
      return body;
    }

    const sanitized = { ...body };

    // 移除敏感字段
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'auth',
      'authorization',
      'credential',
      'credentials',
    ];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
