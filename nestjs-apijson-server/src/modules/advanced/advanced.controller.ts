import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { AdvancedFeaturesService } from './advanced-features.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * 高级特性控制器
 * 提供子查询、聚合函数、事务等高级功能的 API 端点
 */
@ApiTags('高级特性')
@Controller('advanced')
export class AdvancedController {
  constructor(private readonly advancedService: AdvancedFeaturesService) {}

  /**
   * 执行子查询
   */
  @Post('subquery')
  @ApiOperation({ summary: '执行子查询' })
  @ApiResponse({ status: 200, description: '子查询执行成功' })
  async executeSubquery(@Body() body: {
    subqueries: Array<{
      alias: string;
      tableName: string;
      where: any;
    }>;
  }) {
    const subqueries = body.subqueries.map(sq => 
      this.advancedService.buildSubquery(sq.tableName, sq.where, sq.alias)
    );

    const results = await this.advancedService.executeSubqueries(subqueries);
    
    return {
      code: 200,
      message: '子查询执行成功',
      data: Object.fromEntries(results),
    };
  }

  /**
   * 执行聚合函数查询
   */
  @Post('aggregate')
  @ApiOperation({ summary: '执行聚合函数查询' })
  @ApiResponse({ status: 200, description: '聚合查询执行成功' })
  async executeAggregate(@Body() body: {
    tableName: string;
    aggregateFunction: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
    column: string;
    where?: any;
  }) {
    const result = await this.advancedService.executeAggregateQuery(
      body.tableName,
      body.aggregateFunction,
      body.column,
      body.where,
    );

    return {
      code: 200,
      message: '聚合查询执行成功',
      data: {
        [`${body.aggregateFunction}(${body.column})`]: result,
      },
    };
  }

  /**
   * 执行分组聚合查询
   */
  @Post('group-aggregate')
  @ApiOperation({ summary: '执行分组聚合查询' })
  @ApiResponse({ status: 200, description: '分组聚合查询执行成功' })
  async executeGroupAggregate(@Body() body: {
    tableName: string;
    groupBy: string[];
    aggregateFunctions: { [key: string]: string };
    where?: any;
  }) {
    const results = await this.advancedService.executeGroupAggregateQuery(
      body.tableName,
      body.groupBy,
      body.aggregateFunctions,
      body.where,
    );

    return {
      code: 200,
      message: '分组聚合查询执行成功',
      data: results,
    };
  }

  /**
   * 执行事务
   */
  @Post('transaction')
  @ApiOperation({ summary: '执行事务' })
  @ApiResponse({ status: 200, description: '事务执行成功' })
  async executeTransaction(@Body() body: {
    queries: Array<{
      tableName: string;
      operation: 'INSERT' | 'UPDATE' | 'DELETE';
      data: any;
      where?: any;
    }>;
  }) {
    const results = await this.advancedService.executeTransaction(body.queries);

    return {
      code: 200,
      message: '事务执行成功',
      data: results,
    };
  }

  /**
   * 构建子查询
   */
  @Post('build-subquery')
  @ApiOperation({ summary: '构建子查询 SQL' })
  @ApiResponse({ status: 200, description: '子查询构建成功' })
  buildSubquery(@Body() body: {
    tableName: string;
    where: any;
    alias: string;
  }) {
    const subquery = this.advancedService.buildSubquery(
      body.tableName,
      body.where,
      body.alias,
    );

    return {
      code: 200,
      message: '子查询构建成功',
      data: {
        alias: subquery.alias,
        sql: subquery.sql,
        params: subquery.params,
      },
    };
  }

  /**
   * 构建聚合函数查询
   */
  @Post('build-aggregate')
  @ApiOperation({ summary: '构建聚合函数查询 SQL' })
  @ApiResponse({ status: 200, description: '聚合查询构建成功' })
  buildAggregate(@Body() body: {
    tableName: string;
    aggregateFunction: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
    column: string;
    where?: any;
  }) {
    const query = this.advancedService.buildAggregateQuery(
      body.tableName,
      body.aggregateFunction,
      body.column,
      body.where,
    );

    return {
      code: 200,
      message: '聚合查询构建成功',
      data: {
        sql: query.sql,
        params: query.params,
      },
    };
  }

  /**
   * 构建分组聚合查询
   */
  @Post('build-group-aggregate')
  @ApiOperation({ summary: '构建分组聚合查询 SQL' })
  @ApiResponse({ status: 200, description: '分组聚合查询构建成功' })
  buildGroupAggregate(@Body() body: {
    tableName: string;
    groupBy: string[];
    aggregateFunctions: { [key: string]: string };
    where?: any;
  }) {
    const query = this.advancedService.buildGroupAggregateQuery(
      body.tableName,
      body.groupBy,
      body.aggregateFunctions,
      body.where,
    );

    return {
      code: 200,
      message: '分组聚合查询构建成功',
      data: {
        sql: query.sql,
        params: query.params,
      },
    };
  }

  /**
   * 构建事务查询
   */
  @Post('build-transaction')
  @ApiOperation({ summary: '构建事务查询 SQL' })
  @ApiResponse({ status: 200, description: '事务查询构建成功' })
  buildTransaction(@Body() body: {
    queries: Array<{
      tableName: string;
      operation: 'INSERT' | 'UPDATE' | 'DELETE';
      data: any;
      where?: any;
    }>;
  }) {
    const queries = this.advancedService.buildTransactionQueries(body.queries);

    return {
      code: 200,
      message: '事务查询构建成功',
      data: queries.map(q => ({
        sql: q.sql,
        params: q.params,
      })),
    };
  }
}
