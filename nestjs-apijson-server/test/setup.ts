import { NestFactory } from '@nestjs/core';
import { AppModule } from './../src/app.module';
import { ValidationPipe } from '@nestjs/common';

/**
 * 测试设置文件
 * 用于初始化测试环境
 */
export async function setupTestApp() {
  const app = await NestFactory.create(AppModule, { logger: false });
  
  // 启用全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  return app;
}

/**
 * 清理测试环境
 */
export async function teardownTestApp(app: any) {
  await app.close();
}
