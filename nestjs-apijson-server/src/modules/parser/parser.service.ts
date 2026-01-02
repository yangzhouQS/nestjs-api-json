
import { Injectable, Logger } from '@nestjs/common';
import { APIJSONRequest, ParseResult, TableQuery, Directive } from '@/interfaces/apijson-request.interface';
import {
  DirectiveParser,
  DirectiveRegistry,
  DirectiveRegistryImpl,
  DefaultMethodDirectiveParser,
  DefaultPageDirectiveParser,
  DefaultLimitDirectiveParser,
  DefaultOrderDirectiveParser,
  DefaultCacheDirectiveParser,
  DefaultTotalDirectiveParser,
  DefaultCountDirectiveParser,
  DefaultOffsetDirectiveParser,
  DefaultSearchDirectiveParser,
  DefaultGroupDirectiveParser,
  DefaultTableDirectiveParser,
  DefaultColumnsDirectiveParser,
  DefaultWhereDirectiveParser,
  DefaultJoinsDirectiveParser,
  DefaultHavingDirectiveParser,
  DefaultQueryDirectiveParser,
  DefaultParamsDirectiveParser,
  DefaultResultDirectiveParser,
  DefaultErrorsDirectiveParser,
  DefaultWarningsDirectiveParser,
  DefaultProcessingTimeDirectiveParser,
  DefaultTimestampDirectiveParser,
  DefaultPathDirectiveParser,
  DefaultCachedDirectiveParser,
  DefaultStatusDirectiveParser,
  DefaultCodeDirectiveParser,
  DefaultMessageDirectiveParser,
  DefaultDataDirectiveParser, DirectiveExecutor,
} from '@/types/apijson-directives.type';

/**
 * 解析器服务
 */
@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);
  private readonly directiveRegistry: DirectiveRegistry;

  constructor() {
    this.directiveRegistry = new DirectiveRegistryImpl();
    this.registerDefaultDirectives();
  }

  /**
   * 解析APIJSON请求
   */
  async parse(request: APIJSONRequest): Promise<ParseResult> {
    this.logger.log('开始解析APIJSON请求');

    const tables: { [key: string]: TableQuery } = {};
    const directives: { [key: string]: Directive } = {};

    // 解析表查询
    for (const [key, value] of Object.entries(request)) {
      if (!key.startsWith('@')) {
        tables[key] = await this.parseTableQuery(key, value);
      }
    }

    // 解析指令
    for (const [key, value] of Object.entries(request)) {
      if (key.startsWith('@')) {
        const directiveName = key.substring(1);
        const parser = this.directiveRegistry.getParser(directiveName);

        if (parser) {
          directives[key] = parser.parse(value);
        } else {
          this.logger.warn(`未知指令: ${key}`);
        }
      }
    }

    const result: ParseResult = {
      tables,
      directives,
      original: request,
    };

    this.logger.log('APIJSON请求解析完成');
    return result;
  }

  /**
   * 解析表查询
   */
  private async parseTableQuery(tableName: string, tableQuery: any): Promise<TableQuery> {
    this.logger.debug(`解析表查询: ${tableName}`);

    // 如果是数组，处理数组查询
    if (Array.isArray(tableQuery)) {
      return {
        name: tableName,
        columns: ['*'],
        where: {},
        joins: [],
        group: [],
        having: {},
        order: [],
        limit: 10,
        offset: 0,
      };
    }

    // 如果是对象，处理对象查询
    if (typeof tableQuery === 'object' && tableQuery !== null) {
      return {
        name: tableName,
        columns: tableQuery.columns || ['*'],
        where: tableQuery.where || {},
        joins: tableQuery.joins || [],
        group: tableQuery.group || [],
        having: tableQuery.having || {},
        order: tableQuery.order || [],
        limit: tableQuery.limit || 10,
        offset: tableQuery.offset || 0,
      };
    }

    // 默认查询
    return {
      name: tableName,
      columns: ['*'],
      where: {},
      joins: [],
      group: [],
      having: {},
      order: [],
      limit: 10,
      offset: 0,
    };
  }

  /**
   * 注册默认指令
   */
  private registerDefaultDirectives(): void {
    // 注册指令解析器
    this.directiveRegistry.register('method', new DefaultMethodDirectiveParser(), null);
    this.directiveRegistry.register('page', new DefaultPageDirectiveParser(), null);
    this.directiveRegistry.register('limit', new DefaultLimitDirectiveParser(), null);
    this.directiveRegistry.register('order', new DefaultOrderDirectiveParser(), null);
    this.directiveRegistry.register('cache', new DefaultCacheDirectiveParser(), null);
    this.directiveRegistry.register('total', new DefaultTotalDirectiveParser(), null);
    this.directiveRegistry.register('count', new DefaultCountDirectiveParser(), null);
    this.directiveRegistry.register('offset', new DefaultOffsetDirectiveParser(), null);
    this.directiveRegistry.register('search', new DefaultSearchDirectiveParser(), null);
    this.directiveRegistry.register('group', new DefaultGroupDirectiveParser(), null);
    this.directiveRegistry.register('table', new DefaultTableDirectiveParser(), null);
    this.directiveRegistry.register('columns', new DefaultColumnsDirectiveParser(), null);
    this.directiveRegistry.register('where', new DefaultWhereDirectiveParser(), null);
    this.directiveRegistry.register('joins', new DefaultJoinsDirectiveParser(), null);
    this.directiveRegistry.register('having', new DefaultHavingDirectiveParser(), null);
    this.directiveRegistry.register('query', new DefaultQueryDirectiveParser(), null);
    this.directiveRegistry.register('params', new DefaultParamsDirectiveParser(), null);
    this.directiveRegistry.register('result', new DefaultResultDirectiveParser(), null);
    this.directiveRegistry.register('errors', new DefaultErrorsDirectiveParser(), null);
    this.directiveRegistry.register('warnings', new DefaultWarningsDirectiveParser(), null);
    this.directiveRegistry.register('processingTime', new DefaultProcessingTimeDirectiveParser(), null);
    this.directiveRegistry.register('timestamp', new DefaultTimestampDirectiveParser(), null);
    this.directiveRegistry.register('path', new DefaultPathDirectiveParser(), null);
    this.directiveRegistry.register('cached', new DefaultCachedDirectiveParser(), null);
    this.directiveRegistry.register('status', new DefaultStatusDirectiveParser(), null);
    this.directiveRegistry.register('code', new DefaultCodeDirectiveParser(), null);
    this.directiveRegistry.register('message', new DefaultMessageDirectiveParser(), null);
    this.directiveRegistry.register('data', new DefaultDataDirectiveParser(), null);
  }
}

/**
 * 指令注册表实现
 */
class DirectiveRegistryImpl2 implements DirectiveRegistry {
  private readonly parsers = new Map<string, any>();
  private readonly executors = new Map<string, any>();

  register(name: string, parser: any, executor: any): void {
    if (parser) {
      this.parsers.set(name, parser);
    }

    if (executor) {
      this.executors.set(name, executor);
    }
  }

  getParser(name: string): any | null {
    return this.parsers.get(name) || null;
  }

  getExecutor(name: string): any | null {
    return this.executors.get(name) || null;
  }

  getAllNames(): string[] {
    return Array.from(this.parsers.keys());
  }
}

