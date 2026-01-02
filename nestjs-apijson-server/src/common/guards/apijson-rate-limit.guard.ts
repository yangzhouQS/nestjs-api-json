import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

/**
 * APIJSON限流守卫
 */
@Injectable()
export class APIJSONRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 获取限流配置
    const rateLimit = this.reflector.get('apijsonRateLimit', context.getHandler()) ||
                     this.reflector.get('apijsonRateLimit', context.getClass());

    // 如果未配置限流，则允许通过
    if (!rateLimit || !rateLimit.enabled) {
      return true;
    }

    // 获取请求信息
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const ip = request.ip || request.connection.remoteAddress ||
               request.headers['x-forwarded-for'] ||
               request.headers['x-real-ip'];

    // 获取限流键
    const key = this.generateKey(request, rateLimit);

    // 获取当前计数
    const current = await this.getCurrentCount(key, rateLimit);

    // 检查是否超过限制
    if (current >= rateLimit.max) {
      // 设置响应头
      response.setHeader('X-RateLimit-Limit', rateLimit.max);
      response.setHeader('X-RateLimit-Remaining', 0);
      response.setHeader('X-RateLimit-Reset', this.getResetTime(rateLimit));

      // 抛出异常
      throw new HttpException(
        rateLimit.message || '请求过于频繁，请稍后再试',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 增加计数
    await this.incrementCount(key, rateLimit);

    // 设置响应头
    response.setHeader('X-RateLimit-Limit', rateLimit.max);
    response.setHeader('X-RateLimit-Remaining', rateLimit.max - current - 1);
    response.setHeader('X-RateLimit-Reset', this.getResetTime(rateLimit));

    return true;
  }

  /**
   * 生成限流键
   */
  private generateKey(request: any, rateLimit: any): string {
    // 根据配置生成键
    if (rateLimit.keyGenerator) {
      return rateLimit.keyGenerator(request);
    }

    // 默认键生成策略
    const ip = request.ip || request.connection.remoteAddress ||
               request.headers['x-forwarded-for'] ||
               request.headers['x-real-ip'];

    const path = request.route?.path || request.url;
    const method = request.method;

    return `apijson:rate-limit:${method}:${path}:${ip}`;
  }

  /**
   * 获取当前计数
   */
  private async getCurrentCount(key: string, rateLimit: any): Promise<number> {
    // 这里应该实现从缓存或数据库获取当前计数的逻辑
    // 简单实现：返回0
    return 0;
  }

  /**
   * 增加计数
   */
  private async incrementCount(key: string, rateLimit: any): Promise<void> {
    // 这里应该实现增加计数的逻辑
    // 简单实现：不做任何操作
  }

  /**
   * 获取重置时间
   */
  private getResetTime(rateLimit: any): number {
    const now = Date.now();
    return Math.ceil(now / 1000) + Math.ceil(rateLimit.windowMs / 1000);
  }
}
