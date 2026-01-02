import { Injectable, Logger } from '@nestjs/common';
import { BuildResult, ExecuteResult, Query, QueryExecuteResult } from '@/interfaces/apijson-request.interface';
import { DatabaseService } from '@/modules/database/database.service';
import {
  DirectiveExecutor,
  DirectiveContext,
  DirectiveRegistry,
  DirectiveRegistryImpl,
  DefaultMethodDirectiveExecutor,
  DefaultPageDirectiveExecutor,
  DefaultLimitDirectiveExecutor,
  DefaultOrderDirectiveExecutor,
  DefaultCacheDirectiveExecutor,
  DefaultTotalDirectiveExecutor,
  DefaultCountDirectiveExecutor,
  DefaultOffsetDirectiveExecutor,
  DefaultSearchDirectiveExecutor,
  DefaultGroupDirectiveExecutor,
  DefaultTableDirectiveExecutor,
  DefaultColumnsDirectiveExecutor,
  DefaultWhereDirectiveExecutor,
  DefaultJoinsDirectiveExecutor,
  DefaultHavingDirectiveExecutor,
  DefaultQueryDirectiveExecutor,
  DefaultParamsDirectiveExecutor,
  DefaultResultDirectiveExecutor,
  DefaultErrorsDirectiveExecutor,
  DefaultWarningsDirectiveExecutor,
  DefaultProcessingTimeDirectiveExecutor,
  DefaultTimestampDirectiveExecutor,
  DefaultPathDirectiveExecutor,
  DefaultCachedDirectiveExecutor,
  DefaultStatusDirectiveExecutor,
  DefaultCodeDirectiveExecutor,
  DefaultMessageDirectiveExecutor,
  DefaultDataDirectiveExecutor,
} from '@/types/apijson-directives.type';

/**
 * 执行器服务
 */
@Injectable()
export class ExecutorService {
  private readonly logger = new Logger(ExecutorService.name);
  private readonly directiveRegistry: DirectiveRegistry;

  constructor(
    private readonly databaseService: DatabaseService,
  ) {
    this.directiveRegistry = new DirectiveRegistryImpl();
    this.registerDefaultDirectives();
  }

  /**
   * 执行SQL查询
   */
  async execute(buildResult: BuildResult): Promise<ExecuteResult> {
    this.logger.log('开始执行SQL查询');

    const data: { [key: string]: any } = {};

    // 执行表查询
    for (const query of buildResult.queries) {
      const result = await this.executeQuery(query);
      data[query.table] = result;
    }

    // 执行指令
    await this.executeDirectives(buildResult.directives, data);

    const result: ExecuteResult = {
      data,
      directives: buildResult.directives,
      original: buildResult,
    };

    this.logger.log('SQL查询执行完成');
    return result;
  }

  /**
   * 执行查询
   */
  private async executeQuery(query: Query): Promise<QueryExecuteResult> {
    this.logger.debug(`执行查询: ${query.sql}, params: ${query.params}`);

    try {
      // 执行SQL查询
      const result = await this.databaseService.query(query.sql, query.params);

      // 处理查询结果
      let data: any[];
      let total: number;
      let count: number;

      if (Array.isArray(result)) {
        data = result;
        total = result.length;
        count = result.length;
      } else if (result && typeof result === 'object') {
        data = result.rows || [];
        total = result.rowCount || result.count || data.length;
        count = data.length;
      } else {
        data = [];
        total = 0;
        count = 0;
      }

      return {
        data,
        total,
        count,
      };
    } catch (error) {
      this.logger.error(`查询执行失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 执行指令
   */
  private async executeDirectives(directives: { [key: string]: any }, data: { [key: string]: any }): Promise<void> {
    this.logger.debug('执行指令');

    // 创建指令上下文
    const context: DirectiveContext = {
      request: {},
      response: { data },
      connection: null,
      cache: null,
      config: null,
      logger: this.logger,
    };

    // 执行每个指令
    for (const [directiveName, directive] of Object.entries(directives)) {
      const executor = this.directiveRegistry.getExecutor(directiveName.substring(1));

      if (executor) {
        try {
          await executor.execute(directive, context);
        } catch (error) {
          this.logger.error(`指令执行失败: ${directiveName}`, error.stack);
        }
      } else {
        this.logger.warn(`未知指令执行器: ${directiveName}`);
      }
    }
  }

  /**
   * 注册默认指令
   */
  private registerDefaultDirectives(): void {
    // 注册指令执行器
    this.directiveRegistry.register('method', null, new DefaultMethodDirectiveExecutor());
    this.directiveRegistry.register('page', null, new DefaultPageDirectiveExecutor());
    this.directiveRegistry.register('limit', null, new DefaultLimitDirectiveExecutor());
    this.directiveRegistry.register('order', null, new DefaultOrderDirectiveExecutor());
    this.directiveRegistry.register('cache', null, new DefaultCacheDirectiveExecutor());
    this.directiveRegistry.register('total', null, new DefaultTotalDirectiveExecutor());
    this.directiveRegistry.register('count', null, new DefaultCountDirectiveExecutor());
    this.directiveRegistry.register('offset', null, new DefaultOffsetDirectiveExecutor());
    this.directiveRegistry.register('search', null, new DefaultSearchDirectiveExecutor());
    this.directiveRegistry.register('group', null, new DefaultGroupDirectiveExecutor());
    this.directiveRegistry.register('table', null, new DefaultTableDirectiveExecutor());
    this.directiveRegistry.register('columns', null, new DefaultColumnsDirectiveExecutor());
    this.directiveRegistry.register('where', null, new DefaultWhereDirectiveExecutor());
    this.directiveRegistry.register('joins', null, new DefaultJoinsDirectiveExecutor());
    this.directiveRegistry.register('having', null, new DefaultHavingDirectiveExecutor());
    this.directiveRegistry.register('query', null, new DefaultQueryDirectiveExecutor());
    this.directiveRegistry.register('params', null, new DefaultParamsDirectiveExecutor());
    this.directiveRegistry.register('result', null, new DefaultResultDirectiveExecutor());
    this.directiveRegistry.register('errors', null, new DefaultErrorsDirectiveExecutor());
    this.directiveRegistry.register('warnings', null, new DefaultWarningsDirectiveExecutor());
    this.directiveRegistry.register('processingTime', null, new DefaultProcessingTimeDirectiveExecutor());
    this.directiveRegistry.register('timestamp', null, new DefaultTimestampDirectiveExecutor());
    this.directiveRegistry.register('path', null, new DefaultPathDirectiveExecutor());
    this.directiveRegistry.register('cached', null, new DefaultCachedDirectiveExecutor());
    this.directiveRegistry.register('status', null, new DefaultStatusDirectiveExecutor());
    this.directiveRegistry.register('code', null, new DefaultCodeDirectiveExecutor());
    this.directiveRegistry.register('message', null, new DefaultMessageDirectiveExecutor());
    this.directiveRegistry.register('data', null, new DefaultDataDirectiveExecutor());
  }
}
