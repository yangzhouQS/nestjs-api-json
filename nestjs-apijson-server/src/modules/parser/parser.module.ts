import { Module } from '@nestjs/common';
import { ParserService } from './parser.service';
import { CoreParserService } from './core-parser.service';

/**
 * 解析器模块
 * 负责解析 APIJSON 请求
 */
@Module({
  providers: [
    ParserService,
    CoreParserService,
  ],
  exports: [
    ParserService,
    CoreParserService,
  ],
})
export class ParserModule {}
