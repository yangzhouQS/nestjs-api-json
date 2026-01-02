import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  APIJSONLog,
  APIJSONPerformance,
  APIJSONCache,
  APIJSONTransform,
  APIJSONAuth,
} from '@/common/decorators/apijson.decorator';

/**
 * 健康检查控制器
 * 负责提供应用健康状态信息
 */
@Controller('health')
@APIJSONLog({ enabled: false, level: 'info' })
@APIJSONPerformance({ enabled: false })
@APIJSONCache({ enabled: false })
@APIJSONTransform({ enabled: false })
@APIJSONAuth({ enabled: false })
export class HealthController {
  /**
   * 基本健康检查
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getHealth(): Promise<any> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  /**
   * 详细健康检查
   */
  @Get('detailed')
  @HttpCode(HttpStatus.OK)
  async getDetailedHealth(): Promise<any> {
    // 这里应该实现详细健康检查逻辑
    // 简单实现：返回基本健康信息
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      services: {
        database: {
          status: 'ok',
          responseTime: 0,
        },
        cache: {
          status: 'ok',
          responseTime: 0,
        },
      },
    };
  }

  /**
   * 存活检查
   */
  @Get('alive')
  @HttpCode(HttpStatus.OK)
  async getAlive(): Promise<any> {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 就绪检查
   */
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async getReady(): Promise<any> {
    // 这里应该实现就绪检查逻辑
    // 简单实现：返回就绪状态
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }
}
