import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { CacheService } from './cache.service';
import {
  APIJSONLog,
  APIJSONPerformance,
  APIJSONCache,
  APIJSONTransform,
  APIJSONAuth,
  APIJSONRateLimit
} from '@/common/decorators/apijson.decorator';

/**
 * 缓存控制器
 */
@Controller('cache')
@APIJSONLog({ enabled: true, level: 'debug' })
@APIJSONPerformance({ enabled: false })
@APIJSONCache({ enabled: false })
@APIJSONTransform({ enabled: false })
@APIJSONAuth({ enabled: true, roles: ['user', 'admin'], permissions: ['read', 'write'] })
@APIJSONRateLimit({ enabled: true, max: 50, windowMs: 15 * 60 * 1000 })
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}

  /**
   * 获取缓存值
   */
  @Get(':key')
  @HttpCode(HttpStatus.OK)
  async get(@Param('key') key: string): Promise<any> {
    return {
      key,
      value: await this.cacheService.get(key),
    };
  }

  /**
   * 设置缓存值
   */
  @Post(':key')
  @HttpCode(HttpStatus.OK)
  async set(
    @Param('key') key: string,
    @Body() data: { value: any; ttl?: number },
  ): Promise<any> {
    const { value, ttl } = data;
    await this.cacheService.set(key, value, ttl);

    return {
      key,
      value,
      ttl,
      success: true,
    };
  }

  /**
   * 删除缓存值
   */
  @Delete(':key')
  @HttpCode(HttpStatus.OK)
  async del(@Param('key') key: string): Promise<any> {
    await this.cacheService.del(key);

    return {
      key,
      success: true,
    };
  }

  /**
   * 检查缓存值是否存在
   */
  @Get(':key/exists')
  @HttpCode(HttpStatus.OK)
  async exists(@Param('key') key: string): Promise<any> {
    return {
      key,
      exists: await this.cacheService.exists(key),
    };
  }

  /**
   * 设置缓存值（仅当键不存在时）
   */
  @Post(':key/setnx')
  @HttpCode(HttpStatus.OK)
  async setnx(
    @Param('key') key: string,
    @Body() data: { value: any; ttl?: number },
  ): Promise<any> {
    const { value, ttl } = data;
    const success = await this.cacheService.setnx(key, value, ttl);

    return {
      key,
      value,
      ttl,
      success,
    };
  }

  /**
   * 获取并设置缓存值
   */
  @Post(':key/getset')
  @HttpCode(HttpStatus.OK)
  async getset(
    @Param('key') key: string,
    @Body() data: { value: any; ttl?: number },
  ): Promise<any> {
    const { value, ttl } = data;
    const oldValue = await this.cacheService.getset(key, value, ttl);

    return {
      key,
      value,
      ttl,
      oldValue,
    };
  }

  /**
   * 增加缓存值
   */
  @Post(':key/incr')
  @HttpCode(HttpStatus.OK)
  async incr(
    @Param('key') key: string,
    @Body() data: { increment?: number },
  ): Promise<any> {
    const { increment = 1 } = data;
    const newValue = await this.cacheService.incr(key, increment);

    return {
      key,
      increment,
      newValue,
    };
  }

  /**
   * 减少缓存值
   */
  @Post(':key/decr')
  @HttpCode(HttpStatus.OK)
  async decr(
    @Param('key') key: string,
    @Body() data: { decrement?: number },
  ): Promise<any> {
    const { decrement = 1 } = data;
    const newValue = await this.cacheService.decr(key, decrement);

    return {
      key,
      decrement,
      newValue,
    };
  }

  /**
   * 获取缓存统计信息
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @APIJSONAuth({ enabled: true, roles: ['admin'], permissions: ['read'] })
  async getStats(): Promise<any> {
    return await this.cacheService.getStats();
  }

  /**
   * 清理过期缓存
   */
  @Post('clear-expired')
  @HttpCode(HttpStatus.OK)
  @APIJSONAuth({ enabled: true, roles: ['admin'], permissions: ['write'] })
  async clearExpired(): Promise<any> {
    const count = await this.cacheService.clearExpired();

    return {
      success: true,
      count,
      message: `已清理 ${count} 个过期缓存`,
    };
  }

  /**
   * 清空所有缓存
   */
  @Delete('flush')
  @HttpCode(HttpStatus.OK)
  @APIJSONAuth({ enabled: true, roles: ['admin'], permissions: ['write'] })
  async flush(): Promise<any> {
    await this.cacheService.flush();

    return {
      success: true,
      message: '已清空所有缓存',
    };
  }

  /**
   * 获取所有键
   */
  @Get('keys')
  @HttpCode(HttpStatus.OK)
  @APIJSONAuth({ enabled: true, roles: ['admin'], permissions: ['read'] })
  async getKeys(): Promise<any> {
    const keys = await this.cacheService.keys();

    return {
      keys,
      count: keys.length,
    };
  }

  /**
   * 批量获取缓存值
   */
  @Post('mget')
  @HttpCode(HttpStatus.OK)
  async mget(@Body() data: { keys: string[] }): Promise<any> {
    const { keys } = data;
    const values = await this.cacheService.mget(keys);

    return {
      keys,
      values,
    };
  }

  /**
   * 批量设置缓存值
   */
  @Post('mset')
  @HttpCode(HttpStatus.OK)
  async mset(@Body() data: { keyValues: { [key: string]: any }; ttl?: number }): Promise<any> {
    const { keyValues, ttl } = data;
    await this.cacheService.mset(keyValues, ttl);

    return {
      keyValues,
      ttl,
      success: true,
    };
  }

  /**
   * 批量删除缓存值
   */
  @Delete('mdel')
  @HttpCode(HttpStatus.OK)
  async mdel(@Body() data: { keys: string[] }): Promise<any> {
    const { keys } = data;
    await this.cacheService.mdel(keys);

    return {
      keys,
      success: true,
    };
  }
}
