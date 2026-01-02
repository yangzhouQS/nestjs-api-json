import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { APIJSONExceptionFilter } from './common/filters/apijson-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import process from "node:process";

/**
 * 应用启动函数
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const reflector = app.get(Reflector);

  // 启用 CORS
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  // 启用压缩
  app.use(compression());

  // 启用安全头
  app.use(helmet());

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 全局异常过滤器
  app.useGlobalFilters(new APIJSONExceptionFilter());

  // 全局拦截器
  app.useGlobalInterceptors(new LoggingInterceptor(reflector));

  // 设置全局前缀
  app.setGlobalPrefix('api');

  // Swagger 配置
  const config = new DocumentBuilder()
    .setTitle('APIJSON Server API')
    .setDescription('基于 NestJS 的 APIJSON 服务器实现')
    .setVersion('1.0.0')
    .addTag('apijson', 'APIJSON 接口')
    .addBearerAuth()
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);

  const port = process.env.PORT || 3000;
  await app.listen(port,()=>{
    console.log(`http://127.0.0.1:${process.env.PORT}`);
  });

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API documentation: http://localhost:${port}/docs`);
}

bootstrap();
