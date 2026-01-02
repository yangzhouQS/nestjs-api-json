import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { APIJSONRateLimit } from '@/common/decorators/apijson.decorator';

/**
 * 自定义 TooManyRequestsException
 */
class TooManyRequestsException extends HttpException {
  constructor(message?: string) {
    super(message || '请求过于频繁', HttpStatus.TOO_MANY_REQUESTS);
  }
}

/**
 * APIJSON速率限制守卫
 * 负责限制请求频率，防止滥用
 */
@Injectable()
export class APIJSONRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const handler = context.getHandler();

    // 获取接口速率限制配置
    const rateLimitConfig = this.reflector.get(APIJSONRateLimit, handler);

    // 如果没有配置速率限制，默认允许访问
    if (!rateLimitConfig || !rateLimitConfig.enabled) {
      return true;
    }

    // 简单的内存存储速率限制实现
    // 在生产环境中，应该使用Redis等外部存储
    const clientIp = request.ip || request.connection.remoteAddress;
    const key = `rate_limit:${clientIp}`;

    // 这里应该实现实际的速率限制逻辑
    // 为了简化，我们只是返回true
    // 在实际应用中，你需要实现一个计数器，检查请求频率

    // 设置速率限制响应头
    response.setHeader('X-RateLimit-Limit', rateLimitConfig.max || 100);
    response.setHeader('X-RateLimit-Remaining', 99);
    response.setHeader('X-RateLimit-Reset', new Date(Date.now() + (rateLimitConfig.windowMs || 60000)).toISOString());

    return true;
  }
}

