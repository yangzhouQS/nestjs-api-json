import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { APIJSONAuth } from '@/common/decorators/apijson.decorator';

// 扩展Express Request类型以包含user属性
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * APIJSON认证守卫
 * 负责验证用户身份和权限
 */
@Injectable()
export class APIJSONAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const handler = context.getHandler();

    // 获取接口认证配置
    const authConfig = this.reflector.get(APIJSONAuth, handler);

    // 如果没有配置认证，默认允许访问
    if (!authConfig || !authConfig.enabled) {
      return true;
    }

    // 检查是否跳过认证
    if (authConfig.skip) {
      return true;
    }

    // 获取令牌
    const token = this.extractToken(request);

    // 如果没有令牌，抛出未授权异常
    if (!token) {
      throw new UnauthorizedException({
        status: 'error',
        code: 401,
        message: '未提供认证令牌',
        errors: ['缺少Authorization头或Bearer令牌'],
      });
    }

    // 验证令牌
    let payload;
    try {
      payload = this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException({
        status: 'error',
        code: 401,
        message: '认证令牌无效',
        errors: [error.message],
      });
    }

    // 将用户信息添加到请求对象
    request.user = payload;

    // 检查角色
    if (authConfig.roles && authConfig.roles.length > 0) {
      const userRoles = payload.roles || [];
      const hasRole = authConfig.roles.some(role => userRoles.includes(role));

      if (!hasRole) {
        throw new ForbiddenException({
          status: 'error',
          code: 403,
          message: '权限不足',
          errors: [`需要以下角色之一: ${authConfig.roles.join(', ')}`],
        });
      }
    }

    // 检查权限
    if (authConfig.permissions && authConfig.permissions.length > 0) {
      const userPermissions = payload.permissions || [];
      const hasPermission = authConfig.permissions.some(permission =>
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        throw new ForbiddenException({
          status: 'error',
          code: 403,
          message: '权限不足',
          errors: [`需要以下权限之一: ${authConfig.permissions.join(', ')}`],
        });
      }
    }

    // 设置认证响应头
    response.setHeader('X-Authenticated', 'true');
    response.setHeader('X-User-ID', payload.sub || payload.id);

    return true;
  }

  /**
   * 从请求中提取令牌
   */
  private extractToken(request: Request): string | null {
    // 从Authorization头中提取
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 从查询参数中提取
    const tokenFromQuery = request.query.token as string;
    if (tokenFromQuery) {
      return tokenFromQuery;
    }

    // 从Cookie中提取
    const tokenFromCookie = request.cookies?.token;
    if (tokenFromCookie) {
      return tokenFromCookie;
    }

    return null;
  }
}
