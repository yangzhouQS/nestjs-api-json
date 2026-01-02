import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { APIJSONResponse } from '@/interfaces/apijson-request.interface';
import { Reflector } from '@nestjs/core';
import {
  APIJSONLog,
  APIJSONPerformance,
  APIJSONCache,
  APIJSONTransform,
} from '@/common/decorators/apijson.decorator';

/**
 * APIJSON拦截器
 * 负责处理请求和响应，添加日志、性能监控、缓存和转换功能
 */
@Injectable()
export class APIJSONInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const handler = context.getHandler();

    // 获取装饰器配置
    const logConfig = this.reflector.get(APIJSONLog, handler);
    const performanceConfig = this.reflector.get(APIJSONPerformance, handler);
    const cacheConfig = this.reflector.get(APIJSONCache, handler);
    const transformConfig = this.reflector.get(APIJSONTransform, handler);

    // 记录请求日志
    if (logConfig && logConfig.enabled) {
      this.logRequest(request, logConfig.level);
    }

    // 检查缓存
    if (cacheConfig && cacheConfig.enabled) {
      const cachedResponse = this.checkCache(request);
      if (cachedResponse) {
        response.setHeader('X-Cache', 'HIT');
        return new Observable(subscriber => {
          subscriber.next(cachedResponse);
          subscriber.complete();
        });
      }
      response.setHeader('X-Cache', 'MISS');
    } else {
      response.setHeader('X-Cache', 'DISABLED');
    }

    // 处理响应
    return next.handle().pipe(
      map(data => {
        // 计算处理时间
        const processingTime = Date.now() - startTime;

        // 记录性能数据
        if (performanceConfig && performanceConfig.enabled) {
          this.logPerformance(request, processingTime);
        }

        // 缓存响应
        if (cacheConfig && cacheConfig.enabled) {
          this.setCache(request, data);
        }

        // 转换响应
        if (transformConfig && transformConfig.enabled) {
          return this.transformResponse(data, request, processingTime, true);
        }

        return data;
      }),
      catchError(error => {
        // 计算处理时间
        const processingTime = Date.now() - startTime;

        // 记录性能数据
        if (performanceConfig && performanceConfig.enabled) {
          this.logPerformance(request, processingTime);
        }

        // 记录错误日志
        if (logConfig && logConfig.enabled) {
          this.logError(request, error, logConfig.level);
        }

        // 转换错误响应
        if (transformConfig && transformConfig.enabled) {
          const errorResponse = this.transformErrorResponse(error, request, processingTime);
          throw new HttpException(errorResponse, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }

        throw error;
      }),
    );
  }

  /**
   * 记录请求日志
   */
  private logRequest(request: Request, level: string): void {
    const logData = {
      method: request.method,
      url: request.url,
      headers: request.headers,
      query: request.query,
      body: request.body,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      timestamp: new Date().toISOString(),
    };

    // 这里应该实现日志记录逻辑
    // 简单实现：控制台输出
    console.log(`[${level.toUpperCase()}] Request:`, logData);
  }

  /**
   * 记录性能数据
   */
  private logPerformance(request: Request, processingTime: number): void {
    const performanceData = {
      method: request.method,
      url: request.url,
      processingTime,
      timestamp: new Date().toISOString(),
    };

    // 这里应该实现性能数据记录逻辑
    // 简单实现：控制台输出
    console.log('Performance:', performanceData);
  }

  /**
   * 记录错误日志
   */
  private logError(request: Request, error: any, level: string): void {
    const errorData = {
      method: request.method,
      url: request.url,
      error: error.message || error,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };

    // 这里应该实现错误日志记录逻辑
    // 简单实现：控制台输出
    console.error(`[${level.toUpperCase()}] Error:`, errorData);
  }

  /**
   * 检查缓存
   */
  private checkCache(request: Request): any {
    // 这里应该实现缓存检查逻辑
    // 简单实现：返回null
    return null;
  }

  /**
   * 设置缓存
   */
  private setCache(request: Request, data: any): void {
    // 这里应该实现缓存设置逻辑
    // 简单实现：不做任何操作
  }

  /**
   * 转换响应
   */
  private transformResponse(
    data: any,
    request: Request,
    processingTime: number,
    cached: boolean
  ): APIJSONResponse {
    // 如果已经是APIJSON格式的响应，直接返回
    if (data && typeof data === 'object' &&
        data.status && data.code && data.message) {
      return {
        ...data,
        processingTime,
        timestamp: new Date().toISOString(),
        path: request.url,
        cached,
      };
    }

    // 转换为APIJSON格式
    return {
      status: 'success',
      code: 200,
      message: '请求成功',
      data,
      processingTime,
      timestamp: new Date().toISOString(),
      path: request.url,
      cached,
    };
  }

  /**
   * 转换错误响应
   */
  private transformErrorResponse(
    error: any,
    request: Request,
    processingTime: number
  ): APIJSONResponse {
    // 如果已经是APIJSON格式的错误响应，直接返回
    if (error && error.response && typeof error.response === 'object' &&
        error.response.status && error.response.code && error.response.message) {
      return {
        ...error.response,
        processingTime,
        timestamp: new Date().toISOString(),
        path: request.url,
        cached: false,
      };
    }

    // 获取错误信息
    let status: 'success' | 'error' = 'error';
    let code = 500;
    let message = '服务器内部错误';
    let errors: string[] = [];

    if (error.status) {
      code = error.status;
    }

    if (error.response && error.response.message) {
      message = error.response.message;
    } else if (error.message) {
      message = error.message;
    }

    if (error.response && error.response.errors) {
      errors = error.response.errors;
    }

    // 转换为APIJSON格式
    return {
      status,
      code,
      message,
      errors,
      processingTime,
      timestamp: new Date().toISOString(),
      path: request.url,
      cached: false,
    };
  }
}
