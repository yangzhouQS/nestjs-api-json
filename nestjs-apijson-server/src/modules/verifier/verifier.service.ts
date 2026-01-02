import { Injectable, Logger } from '@nestjs/common';
import { ParseResult, VerifyResult, TableVerifyResult, DirectiveVerifyResult } from '@/interfaces/apijson-request.interface';

/**
 * 验证器服务
 */
@Injectable()
export class VerifierService {
  private readonly logger = new Logger(VerifierService.name);

  /**
   * 验证解析结果
   */
  async verify(parseResult: ParseResult): Promise<VerifyResult> {
    this.logger.log('开始验证解析结果');

    const errors: string[] = [];
    const warnings: string[] = [];
    const tables: { [key: string]: TableVerifyResult } = {};
    const directives: { [key: string]: DirectiveVerifyResult } = {};

    let valid = true;

    // 验证表查询
    for (const [tableName, tableQuery] of Object.entries(parseResult.tables)) {
      const tableResult = await this.verifyTableQuery(tableName, tableQuery);
      tables[tableName] = tableResult;

      if (!tableResult.valid) {
        valid = false;
        errors.push(...tableResult.errors);
      }

      warnings.push(...tableResult.warnings);
    }

    // 验证指令
    for (const [directiveName, directive] of Object.entries(parseResult.directives)) {
      const directiveResult = await this.verifyDirective(directiveName, directive);
      directives[directiveName] = directiveResult;

      if (!directiveResult.valid) {
        valid = false;
        errors.push(...directiveResult.errors);
      }

      warnings.push(...directiveResult.warnings);
    }

    const result: VerifyResult = {
      valid,
      errors,
      warnings,
      tables,
      directives,
      original: parseResult,
    };

    this.logger.log('解析结果验证完成');
    return result;
  }

  /**
   * 验证表查询
   */
  private async verifyTableQuery(tableName: string, tableQuery: any): Promise<TableVerifyResult> {
    this.logger.debug(`验证表查询: ${tableName}`);

    const errors: string[] = [];
    const warnings: string[] = [];
    let valid = true;

    // 验证表名
    if (!this.isValidTableName(tableName)) {
      errors.push(`表名 "${tableName}" 无效`);
      valid = false;
    }

	   // 验证列
    if (tableQuery.columns !== undefined) {
      const columnErrors = await this.verifyColumns(tableQuery.columns);
      errors.push(...columnErrors);
    }

    // 验证条件
    if (tableQuery.where !== undefined) {
      const whereErrors = await this.verifyWhere(tableQuery.where);
      errors.push(...whereErrors);
    }

    // 验证连接
    if (tableQuery.joins !== undefined) {
      const joinErrors = await this.verifyJoins(tableQuery.joins);
      errors.push(...joinErrors);
    }

    // 验证分组
    if (tableQuery.group !== undefined) {
      const groupErrors = await this.verifyGroup(tableQuery.group);
      errors.push(...groupErrors);
    }

    // 验证分组条件
    if (tableQuery.having !== undefined) {
      const havingErrors = await this.verifyHaving(tableQuery.having);
      errors.push(...havingErrors);
    }

    // 验证排序
    if (tableQuery.order !== undefined) {
      const orderErrors = await this.verifyOrder(tableQuery.order);
      errors.push(...orderErrors);
    }

    // 验证限制
    if (tableQuery.limit !== undefined) {
      const limitErrors = await this.verifyLimit(tableQuery.limit);
      errors.push(...limitErrors);
    }

    // 验证偏移
    if (tableQuery.offset !== undefined) {
      const offsetErrors = await this.verifyOffset(tableQuery.offset);
      errors.push(...offsetErrors);
    }

    // 检查是否有错误
    if (errors.length > 0) {
      valid = false;
    }

    return {
      valid,
      errors,
      warnings,
      table: tableName,
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

  /**
   * 验证指令
   */
  private async verifyDirective(directiveName: string, directive: any): Promise<DirectiveVerifyResult> {
    this.logger.debug(`验证指令: ${directiveName}`);

    const errors: string[] = [];
    const warnings: string[] = [];
    let valid = true;

    // 验证指令名
    if (!this.isValidDirectiveName(directiveName)) {
      errors.push(`指令名 "${directiveName}" 无效`);
      valid = false;
    }

    // 验证指令值
    const directiveErrors = await this.verifyDirectiveValue(directiveName, directive.value);
    errors.push(...directiveErrors);

    // 检查是否有错误
    if (errors.length > 0) {
      valid = false;
    }

    return {
      valid,
      errors,
      warnings,
      name: directiveName,
      value: directive.value,
    };
  }

  /**
   * 验证表名
   */
  private isValidTableName(tableName: string): boolean {
    // 检查是否为字符串
    if (typeof tableName !== 'string') {
      return false;
    }

    // 检查是否以@开头
    if (tableName.startsWith('@')) {
      return false;
    }

    // 检查是否包含非法字符
    const invalidChars = /[<>:"\\|?*\x00-\x1f]/;
    if (invalidChars.test(tableName)) {
      return false;
    }

    // 检查长度
    if (tableName.length > 64) {
      return false;
    }

    return true;
  }

  /**
   * 验证列
   */
  private async verifyColumns(columns: any): Promise<string[]> {
    const errors: string[] = [];

    // 检查是否为数组或字符串
    if (!Array.isArray(columns) && typeof columns !== 'string') {
      errors.push('列必须为数组或字符串');
      return errors;
    }

    // 如果是字符串，转换为数组
    if (typeof columns === 'string') {
      columns = columns.split(',');
    }

    // 验证每个列
    for (const column of columns) {
      if (typeof column !== 'string') {
        errors.push(`列 "${column}" 必须为字符串`);
        continue;
      }

      // * 是 SQL 通配符，表示所有列，应该被允许
      if (column === '*') {
        continue;
      }

      // 检查是否是聚合函数表达式（如 COUNT(*):count、SUM(amount):total 等）
      // 这些表达式包含 (、)、: 等字符，但在 SQL 中是合法的
      if (this.isAggregateFunctionExpression(column)) {
        continue;
      }

      // 检查是否包含非法字符（排除 *，因为它是 SQL 通配符）
      // 排除 (、)、:、空格，因为它们在 SQL 表达式中是合法的
      const invalidChars = /[<>"\\|?\x00-\x1f]/;
      if (invalidChars.test(column)) {
        errors.push(`列 "${column}" 包含非法字符`);
      }
    }

    return errors;
  }

  /**
   * 检查是否是聚合函数表达式
   * 例如：COUNT(*):count、SUM(amount):total、AVG(price):avg 等
   */
  private isAggregateFunctionExpression(column: string): boolean {
    // 检查是否包含函数调用括号和别名分隔符
    // 格式：FUNCTION_NAME(args):alias
    const functionPattern = /^[A-Za-z_][A-Za-z0-9_]*\(.*\):[A-Za-z_][A-Za-z0-9_]*$/;
    
    // 检查是否匹配聚合函数模式
    if (functionPattern.test(column)) {
      return true;
    }

    // 检查是否包含函数调用（括号）
    if (column.includes('(') && column.includes(')')) {
      return true;
    }

    return false;
  }

  /**
   * 验证条件
   */
  private async verifyWhere(where: any): Promise<string[]> {
    const errors: string[] = [];

    // 检查是否为对象
    if (typeof where !== 'object' || where === null) {
      errors.push('条件必须为对象');
      return errors;
    }

    // 验证每个条件
    for (const [key, value] of Object.entries(where)) {
      // 检查键是否有效
      if (!this.isValidConditionKey(key)) {
        errors.push(`条件键 "${key}" 无效`);
        continue;
      }

      // 检查值是否有效
      if (!this.isValidConditionValue(value)) {
        errors.push(`条件值 "${value}" 无效`);
      }
    }

    return errors;
  }

  /**
   * 验证连接
   */
  private async verifyJoins(joins: any): Promise<string[]> {
    const errors: string[] = [];

    // 检查是否为数组
    if (!Array.isArray(joins)) {
      errors.push('连接必须为数组');
      return errors;
    }

    // 验证每个连接
    for (const join of joins) {
      // 检查是否为对象
      if (typeof join !== 'object' || join === null) {
        errors.push('连接必须为对象');
        continue;
      }

      // 检查是否有表名
      if (!join.table) {
        errors.push('连接缺少表名');
        continue;
      }

      // 检查表名是否有效
      if (!this.isValidTableName(join.table)) {
        errors.push(`连接表名 "${join.table}" 无效`);
      }

      // 检查是否有连接类型
      if (join.type && !this.isValidJoinType(join.type)) {
        errors.push(`连接类型 "${join.type}" 无效`);
      }

      // 检查是否有连接条件
      if (join.on && !this.isValidJoinOn(join.on)) {
        errors.push(`连接条件 "${join.on}" 无效`);
      }
    }

    return errors;
  }

  /**
   * 验证分组
   */
  private async verifyGroup(group: any): Promise<string[]> {
    const errors: string[] = [];

    // 检查是否为数组或字符串
    if (!Array.isArray(group) && typeof group !== 'string') {
      errors.push('分组必须为数组或字符串');
      return errors;
    }

    // 如果是字符串，转换为数组
    if (typeof group === 'string') {
      group = group.split(',');
    }

    // 验证每个分组
    for (const column of group) {
      if (typeof column !== 'string') {
        errors.push(`分组 "${column}" 必须为字符串`);
        continue;
      }

      // 检查是否是聚合函数表达式
      if (this.isAggregateFunctionExpression(column)) {
        continue;
      }

      // 检查是否包含非法字符（排除 *，因为它是 SQL 通配符）
      // 排除 (、)、:、空格，因为它们在 SQL 表达式中是合法的
      const invalidChars = /[<>"\\|?\x00-\x1f]/;
      if (invalidChars.test(column)) {
        errors.push(`分组 "${column}" 包含非法字符`);
      }
    }

    return errors;
  }

  /**
   * 验证分组条件
   */
  private async verifyHaving(having: any): Promise<string[]> {
    const errors: string[] = [];

    // 检查是否为对象
    if (typeof having !== 'object' || having === null) {
      errors.push('分组条件必须为对象');
      return errors;
    }

    // 验证每个条件
    for (const [key, value] of Object.entries(having)) {
      // 检查键是否有效
      if (!this.isValidConditionKey(key)) {
        errors.push(`分组条件键 "${key}" 无效`);
        continue;
      }

      // 检查值是否有效
      if (!this.isValidConditionValue(value)) {
        errors.push(`分组条件值 "${value}" 无效`);
      }
    }

    return errors;
  }

  /**
   * 验证排序
   */
  private async verifyOrder(order: any): Promise<string[]> {
    const errors: string[] = [];

    // 检查是否为数组或字符串
    if (!Array.isArray(order) && typeof order !== 'string') {
      errors.push('排序必须为数组或字符串');
      return errors;
    }

    // 如果是字符串，转换为数组
    if (typeof order === 'string') {
      order = order.split(',');
    }

    // 验证每个排序
    for (const column of order) {
      if (typeof column !== 'string') {
        errors.push(`排序 "${column}" 必须为字符串`);
        continue;
      }

      // 提取列名（去除排序方向标记）
      let columnName = column;
      if (column.endsWith('+') || column.endsWith('-')) {
        columnName = column.slice(0, -1);
        if (!columnName) {
          errors.push(`排序 "${column}" 缺少列名`);
          continue;
        }
      }

      // 检查是否是聚合函数表达式
      if (this.isAggregateFunctionExpression(columnName)) {
        continue;
      }

      // 检查是否包含非法字符（排除 *，因为它是 SQL 通配符）
      // 排除 (、)、:、空格，因为它们在 SQL 表达式中是合法的
      const invalidChars = /[<>"\\|?\x00-\x1f]/;
      if (invalidChars.test(columnName)) {
        errors.push(`排序 "${column}" 包含非法字符`);
      }
    }

    return errors;
  }

  /**
   * 验证限制
   */
  private async verifyLimit(limit: any): Promise<string[]> {
    const errors: string[] = [];

    // 检查是否为数字
    if (typeof limit !== 'number') {
      errors.push('限制必须为数字');
      return errors;
    }

    // 检查是否为正数
    if (limit <= 0) {
      errors.push('限制必须为正数');
    }

    // 检查是否超过最大值
    if (limit > 1000) {
      errors.push('限制不能超过1000');
    }

    return errors;
  }

  /**
   * 验证偏移
   */
  private async verifyOffset(offset: any): Promise<string[]> {
    const errors: string[] = [];

    // 检查是否为数字
    if (typeof offset !== 'number') {
      errors.push('偏移必须为数字');
      return errors;
    }

    // 检查是否为非负数
    if (offset < 0) {
      errors.push('偏移必须为非负数');
    }

    return errors;
  }

  /**
   * 验证指令名
   */
  private isValidDirectiveName(directiveName: string): boolean {
    // 检查是否以@开头
    if (!directiveName.startsWith('@')) {
      return false;
    }

    // 检查是否为有效指令
    const validDirectives = [
      '@method', '@tag', '@total', '@count', '@page', '@limit', '@offset',
      '@search', '@order', '@group', '@cache', '@log', '@performance',
      '@transform', '@auth', '@rateLimit',
    ];

    return validDirectives.includes(directiveName);
  }

  /**
   * 验证指令值
   */
  private async verifyDirectiveValue(directiveName: string, directiveValue: any): Promise<string[]> {
    const errors: string[] = [];

    // 根据指令名验证值
    switch (directiveName) {
      case '@method':
        if (!this.isValidMethod(directiveValue)) {
          errors.push(`指令 "${directiveName}" 的值 "${directiveValue}" 无效`);
        }
        break;

      case '@page':
      case '@limit':
      case '@offset':
        if (!this.isValidNumber(directiveValue)) {
          errors.push(`指令 "${directiveName}" 的值 "${directiveValue}" 必须为数字`);
        }
        break;

      case '@cache':
        if (!this.isValidCache(directiveValue)) {
          errors.push(`指令 "${directiveName}" 的值 "${directiveValue}" 无效`);
        }
        break;

      case '@order':
        if (!this.isValidOrder(directiveValue)) {
          errors.push(`指令 "${directiveName}" 的值 "${directiveValue}" 无效`);
        }
        break;

      case '@group':
        if (!this.isValidGroup(directiveValue)) {
          errors.push(`指令 "${directiveName}" 的值 "${directiveValue}" 无效`);
        }
        break;
    }

    return errors;
  }

  /**
   * 验证条件键
   */
  private isValidConditionKey(key: string): boolean {
    // 检查是否为字符串
    if (typeof key !== 'string') {
      return false;
    }

    // 检查是否包含非法字符
    const invalidChars = /[<>:"\\|?*\x00-\x1f]/;
    if (invalidChars.test(key)) {
      return false;
    }

    return true;
  }

  /**
   * 验证条件值
   */
  private isValidConditionValue(value: any): boolean {
    // 任何值都是有效的
    return true;
  }

  /**
   * 验证连接类型
   */
  private isValidJoinType(type: string): boolean {
    const validTypes = ['INNER', 'LEFT', 'RIGHT', 'FULL'];
    return validTypes.includes(type.toUpperCase());
  }

  /**
   * 验证连接条件
   */
  private isValidJoinOn(on: any): boolean {
    // 检查是否为对象或字符串
    return typeof on === 'object' || typeof on === 'string';
  }

  /**
   * 验证方法
   */
  private isValidMethod(method: string): boolean {
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    return validMethods.includes(method.toUpperCase());
  }

  /**
   * 验证数字
   */
  private isValidNumber(value: any): boolean {
    return typeof value === 'number' && !isNaN(value);
  }

  /**
   * 验证缓存
   */
  private isValidCache(cache: any): boolean {
    // 检查是否为布尔值或对象
    return typeof cache === 'boolean' || typeof cache === 'object';
  }

  /**
   * 验证排序
   */
  private isValidOrder(order: any): boolean {
    // 检查是否为数组或字符串
    return Array.isArray(order) || typeof order === 'string';
  }

  /**
   * 验证分组
   */
  private isValidGroup(group: any): boolean {
    // 检查是否为数组或字符串
    return Array.isArray(group) || typeof group === 'string';
  }
}
