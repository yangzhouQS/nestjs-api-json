import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { APIJSONResponse } from '@/interfaces/apijson-request.interface';

/**
 * APIJSON异常过滤器
 * 负责捕获和处理异常，返回标准化的APIJSON响应
 */
@Catch()
export class APIJSONExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(APIJSONExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 获取状态码
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // 获取异常信息
    const exceptionResponse = exception instanceof HttpException
      ? exception.getResponse()
      : exception;

    // 构建错误响应
    const errorResponse = this.buildErrorResponse(
      status,
      exceptionResponse,
      request
    );

    // 记录异常
    this.logException(exception, request);

    // 设置响应头
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('X-XSS-Protection', '1; mode=block');

    // 发送响应
    response.status(status).json(errorResponse);
  }

  /**
   * 构建错误响应
   */
  private buildErrorResponse(
    status: number,
    exceptionResponse: any,
    request: Request
  ): APIJSONResponse {
    // 获取错误消息
    let message = '服务器内部错误';
    let errors: string[] = [];

    // 处理HTTP异常
    if (exceptionResponse && typeof exceptionResponse === 'object') {
      // 如果已经是APIJSON格式的错误，直接使用
      if (exceptionResponse.status && exceptionResponse.errors) {
        return {
          ...exceptionResponse,
          processingTime: 0,
          timestamp: new Date().toISOString(),
          path: request.url,
          cached: false,
        };
      }

      // 处理NestJS验证错误
      if (exceptionResponse.message && Array.isArray(exceptionResponse.message)) {
        errors = exceptionResponse.message;
        message = '请求验证失败';
      }
      // 处理其他HTTP异常
      else if (exceptionResponse.message) {
        message = exceptionResponse.message;
      }
    }

    // 根据状态码设置默认消息
    if (!message || message === '服务器内部错误') {
      message = this.getDefaultMessage(status);
    }

    // 构建错误响应
    return {
      status: 'error',
      code: status,
      message,
      errors,
      processingTime: 0,
      timestamp: new Date().toISOString(),
      path: request.url,
      cached: false,
    };
  }

  /**
   * 获取默认错误消息
   */
  private getDefaultMessage(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return '请求参数错误';
      case HttpStatus.UNAUTHORIZED:
        return '未授权访问';
      case HttpStatus.FORBIDDEN:
        return '禁止访问';
      case HttpStatus.NOT_FOUND:
        return '资源不存在';
      case HttpStatus.METHOD_NOT_ALLOWED:
        return '请求方法不允许';
      case HttpStatus.NOT_ACCEPTABLE:
        return '请求格式不可接受';
      case HttpStatus.REQUEST_TIMEOUT:
        return '请求超时';
      case HttpStatus.CONFLICT:
        return '请求冲突';
      case HttpStatus.GONE:
        return '资源已删除';
      case HttpStatus.LENGTH_REQUIRED:
        return '需要内容长度';
      case HttpStatus.PRECONDITION_FAILED:
        return '请求前提条件失败';
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return '请求实体过大';
      case HttpStatus.URI_TOO_LONG:
        return '请求URI过长';
      case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
        return '不支持的媒体类型';
      case HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE:
        return '请求范围不满足';
      case HttpStatus.EXPECTATION_FAILED:
        return '期望失败';
      case HttpStatus.I_AM_A_TEAPOT:
        return '我是一个茶壶';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return '无法处理的实体';
      case HttpStatus.FAILED_DEPENDENCY:
        return '依赖失败';
      case HttpStatus.PRECONDITION_REQUIRED:
        return '需要前提条件';
      case HttpStatus.TOO_MANY_REQUESTS:
        return '请求过于频繁';
      case 431: // REQUEST_HEADER_FIELDS_TOO_LARGE
        return '请求头字段过大';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return '服务器内部错误';
      case HttpStatus.NOT_IMPLEMENTED:
        return '功能未实现';
      case HttpStatus.BAD_GATEWAY:
        return '网关错误';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return '服务不可用';
      case HttpStatus.GATEWAY_TIMEOUT:
        return '网关超时';
      case HttpStatus.HTTP_VERSION_NOT_SUPPORTED:
        return '不支持的HTTP版本';
      default:
        return '未知错误';
    }
  }

  /**
   * 记录异常
   */
  private logException(exception: unknown, request: Request): void {
    // 构建日志消息
    const message = `${request.method} ${request.url}`;
    const context = {
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body,
      query: request.query,
      params: request.params,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    };

    // 记录异常
    if (exception instanceof Error) {
      this.logger.error(message, exception.stack, context);
    } else {
      this.logger.error(message, exception, context);
    }
  }
}
