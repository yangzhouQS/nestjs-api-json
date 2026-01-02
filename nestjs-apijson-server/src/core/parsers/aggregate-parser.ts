import { Injectable, Logger } from '@nestjs/common';
import { ConditionErrorException } from '../exceptions';

/**
 * AggregateParser
 * 聚合函数解析器
 * 负责解析聚合函数，支持COUNT, SUM, AVG, MIN, MAX
 */
@Injectable()
export class AggregateParser {
  private readonly logger = new Logger(AggregateParser.name);

  /** 支持的聚合函数 */
  private readonly SUPPORTED_FUNCTIONS = [
    'COUNT',
    'SUM',
    'AVG',
    'MIN',
    'MAX',
  ];

  /**
   * 解析聚合函数
   * @param expression 聚合函数表达式
   * @returns 解析后的聚合函数配置
   */
  parse(expression: string): AggregateFunction {
    this.logger.debug(`解析聚合函数: ${expression}`);

    // 格式：COUNT(*), COUNT(id), COUNT(id):countId
    const config: AggregateFunction = {
      function: '',
      field: '',
      alias: '',
    };

    // 提取函数名和参数
    const match = expression.match(/^(\w+)\(([^)]*)\)(?::(\w+))?$/);
    if (!match) {
      throw new ConditionErrorException(`聚合函数格式错误: ${expression}`);
    }

    const [, funcName, field, alias] = match;

    // 验证函数名
    const upperFuncName = funcName.toUpperCase();
    if (!this.SUPPORTED_FUNCTIONS.includes(upperFuncName)) {
      throw new ConditionErrorException(`不支持的聚合函数: ${funcName}`);
    }

    config.function = upperFuncName;
    config.field = field.trim();
    config.alias = alias || '';

    return config;
  }

  /**
   * 解析多个聚合函数
   * @param expressions 聚合函数表达式数组
   * @returns 解析后的聚合函数配置数组
   */
  parseMultiple(expressions: string[]): AggregateFunction[] {
    const functions: AggregateFunction[] = [];

    for (const expr of expressions) {
      const func = this.parse(expr);
      functions.push(func);
    }

    return functions;
  }

  /**
   * 解析分号分隔的聚合函数
   * @param expression 聚合函数表达式（分号分隔）
   * @returns 解析后的聚合函数配置数组
   */
  parseSemicolonSeparated(expression: string): AggregateFunction[] {
    const parts = expression.split(';').map(p => p.trim()).filter(p => p);
    return this.parseMultiple(parts);
  }

  /**
   * 生成聚合函数SQL
   * @param config 聚合函数配置
   * @param quote 引用符
   * @returns 聚合函数SQL
   */
  toSQL(config: AggregateFunction, quote: string = '`'): string {
    let sql = `${config.function}(`;

    // 处理字段
    if (config.field === '*') {
      sql += '*';
    } else {
      sql += `${quote}${config.field}${quote}`;
    }

    sql += ')';

    // 添加别名
    if (config.alias) {
      sql += ` AS ${quote}${config.alias}${quote}`;
    }

    return sql;
  }

  /**
   * 生成多个聚合函数SQL
   * @param configs 聚合函数配置数组
   * @param quote 引用符
   * @returns 聚合函数SQL（逗号分隔）
   */
  toSQLMultiple(configs: AggregateFunction[], quote: string = '`'): string {
    const sqls = configs.map(config => this.toSQL(config, quote));
    return sqls.join(', ');
  }

  /**
   * 验证聚合函数配置
   * @param config 聚合函数配置
   * @param availableFields 可用的字段名
   * @throws ConditionErrorException 当字段名不存在时抛出异常
   */
  validate(config: AggregateFunction, availableFields: string[]): void {
    // COUNT(*) 不需要验证字段
    if (config.field === '*') {
      return;
    }

    // 检查字段是否存在
    if (!availableFields.includes(config.field)) {
      throw new ConditionErrorException(`聚合函数字段 ${config.field} 不存在`);
    }
  }

  /**
   * 检查是否为聚合函数
   * @param expression 表达式
   * @returns 是否为聚合函数
   */
  isAggregateFunction(expression: string): boolean {
    const match = expression.match(/^(\w+)\(/);
    if (!match) {
      return false;
    }

    const funcName = match[1].toUpperCase();
    return this.SUPPORTED_FUNCTIONS.includes(funcName);
  }

  /**
   * 提取聚合函数名
   * @param expression 表达式
   * @returns 聚合函数名
   */
  extractFunctionName(expression: string): string | null {
    const match = expression.match(/^(\w+)\(/);
    if (!match) {
      return null;
    }

    return match[1].toUpperCase();
  }

  /**
   * 提取聚合函数字段
   * @param expression 表达式
   * @returns 聚合函数字段
   */
  extractField(expression: string): string | null {
    const match = expression.match(/^\w+\(([^)]*)\)/);
    if (!match) {
      return null;
    }

    return match[1].trim();
  }

  /**
   * 提取聚合函数别名
   * @param expression 表达式
   * @returns 聚合函数别名
   */
  extractAlias(expression: string): string | null {
    const match = expression.match(/^\w+\([^)]*\)::(\w+)$/);
    if (!match) {
      return null;
    }

    return match[1];
  }

  /**
   * 获取支持的聚合函数列表
   * @returns 支持的聚合函数列表
   */
  getSupportedFunctions(): string[] {
    return [...this.SUPPORTED_FUNCTIONS];
  }

  /**
   * 检查函数是否支持
   * @param functionName 函数名
   * @returns 是否支持
   */
  isSupportedFunction(functionName: string): boolean {
    return this.SUPPORTED_FUNCTIONS.includes(functionName.toUpperCase());
  }
}

/**
 * 聚合函数配置接口
 */
export interface AggregateFunction {
  /** 聚合函数名：COUNT, SUM, AVG, MIN, MAX */
  function: string;
  /** 字段名 */
  field: string;
  /** 别名 */
  alias: string;
}
