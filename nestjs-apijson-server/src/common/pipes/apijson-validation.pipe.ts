import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { APIJSONRequest } from '@/interfaces/apijson-request.interface';

/**
 * APIJSON验证管道
 * 负责验证请求体是否符合APIJSON规范
 */
@Injectable()
export class APIJSONValidationPipe implements PipeTransform {
  async transform(value: any): Promise<APIJSONRequest> {
    // 如果值为空，返回空对象
    if (!value) {
      return {};
    }

    // 如果值不是对象，抛出异常
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException({
        status: 'error',
        code: 400,
        message: '请求体必须是对象',
        errors: ['请求体格式不正确，必须是JSON对象'],
      });
    }

    // 验证APIJSON请求
    const errors = await this.validateAPIJSONRequest(value);

    // 如果有错误，抛出异常
    if (errors.length > 0) {
      throw new BadRequestException({
        status: 'error',
        code: 400,
        message: 'APIJSON请求验证失败',
        errors,
      });
    }

    return value;
  }

  /**
   * 验证APIJSON请求
   */
  private async validateAPIJSONRequest(request: any): Promise<string[]> {
    const errors: string[] = [];

    // 验证表名
    for (const key in request) {
      // 跳过指令
      if (key.startsWith('@')) {
        continue;
      }

      // 验证表名
      if (!this.isValidTableName(key)) {
        errors.push(`表名 "${key}" 不符合规范`);
      }

      // 验证表查询
      const tableQuery = request[key];
      if (typeof tableQuery === 'object' && tableQuery !== null) {
        const tableErrors = await this.validateTableQuery(tableQuery, key);
        errors.push(...tableErrors);
      }
    }

    // 验证指令
    const directiveErrors = await this.validateDirectives(request);
    errors.push(...directiveErrors);

    return errors;
  }

  /**
   * 验证表名
   */
  private isValidTableName(tableName: string): boolean {
    // 表名不能以@开头
    if (tableName.startsWith('@')) {
      return false;
    }

    // 表名不能包含非法字符
    const invalidChars = /[<>:"/\\|?*\s]/;
    if (invalidChars.test(tableName)) {
      return false;
    }

    // 表名长度限制
    if (tableName.length > 64) {
      return false;
    }

    return true;
  }

  /**
   * 验证表查询
   */
  private async validateTableQuery(tableQuery: any, tableName: string): Promise<string[]> {
    const errors: string[] = [];

    // 验证列
    if (tableQuery.columns && !this.isValidColumns(tableQuery.columns)) {
      errors.push(`表 "${tableName}" 的列配置不正确`);
    }

    // 验证条件
    if (tableQuery.where && !this.isValidConditions(tableQuery.where)) {
      errors.push(`表 "${tableName}" 的条件配置不正确`);
    }

    // 验证连接
    if (tableQuery.joins && !this.isValidJoins(tableQuery.joins)) {
      errors.push(`表 "${tableName}" 的连接配置不正确`);
    }

    // 验证分组
    if (tableQuery.group && !this.isValidGroup(tableQuery.group)) {
      errors.push(`表 "${tableName}" 的分组配置不正确`);
    }

    // 验证排序
    if (tableQuery.order && !this.isValidOrder(tableQuery.order)) {
      errors.push(`表 "${tableName}" 的排序配置不正确`);
    }

    // 验证分页
    if (tableQuery.limit && !this.isValidPagination(tableQuery.limit, tableQuery.offset)) {
      errors.push(`表 "${tableName}" 的分页配置不正确`);
    }

    return errors;
  }

  /**
   * 验证列
   */
  private isValidColumns(columns: any): boolean {
    // 列必须是数组或字符串
    if (typeof columns === 'string') {
      return true;
    }

    if (Array.isArray(columns)) {
      // 检查每个列名
      for (const column of columns) {
        if (typeof column !== 'string') {
          return false;
        }

        // 列名不能包含非法字符
        const invalidChars = /[<>:"/\\|?*]/;
        if (invalidChars.test(column)) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  /**
   * 验证条件
   */
  private isValidConditions(conditions: any): boolean {
    // 条件必须是对象
    if (typeof conditions !== 'object' || conditions === null) {
      return false;
    }

    // 这里应该实现更复杂的条件验证逻辑
    // 简单实现：返回true
    return true;
  }

  /**
   * 验证连接
   */
  private isValidJoins(joins: any): boolean {
    // 连接必须是数组
    if (!Array.isArray(joins)) {
      return false;
    }

    // 检查每个连接
    for (const join of joins) {
      if (typeof join !== 'object' || join === null) {
        return false;
      }

      // 连接必须有表名
      if (!join.table || typeof join.table !== 'string') {
        return false;
      }

      // 连接必须有类型
      if (!join.type || typeof join.type !== 'string') {
        return false;
      }

      // 连接类型必须是有效的
      const validTypes = ['INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS'];
      if (!validTypes.includes(join.type.toUpperCase())) {
        return false;
      }
    }

    return true;
  }

  /**
   * 验证分组
   */
  private isValidGroup(group: any): boolean {
    // 分组必须是数组或字符串
    if (typeof group === 'string') {
      return true;
    }

    if (Array.isArray(group)) {
      // 检查每个分组字段
      for (const field of group) {
        if (typeof field !== 'string') {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  /**
   * 验证排序
   */
  private isValidOrder(order: any): boolean {
    // 排序必须是数组或对象
    if (typeof order === 'object' && order !== null && !Array.isArray(order)) {
      // 检查每个排序字段
      for (const field in order) {
        const direction = order[field];

        // 排序方向必须是有效的
        if (direction !== 'asc' && direction !== 'desc' &&
            direction !== 'ASC' && direction !== 'DESC') {
          return false;
        }
      }

      return true;
    }

    if (Array.isArray(order)) {
      // 检查每个排序字段
      for (const item of order) {
        if (typeof item !== 'object' || item === null) {
          return false;
        }

        // 排序必须有字段
        if (!item.field || typeof item.field !== 'string') {
          return false;
        }

        // 排序必须有方向
        if (!item.direction || typeof item.direction !== 'string') {
          return false;
        }

        // 排序方向必须是有效的
        const validDirections = ['asc', 'desc', 'ASC', 'DESC'];
        if (!validDirections.includes(item.direction)) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  /**
   * 验证分页
   */
  private isValidPagination(limit: any, offset: any): boolean {
    // 限制必须是数字
    if (typeof limit !== 'number' || limit <= 0) {
      return false;
    }

    // 偏移必须是数字或未定义
    if (offset !== undefined && (typeof offset !== 'number' || offset < 0)) {
      return false;
    }

    // 限制不能太大
    if (limit > 1000) {
      return false;
    }

    return true;
  }

  /**
   * 验证指令
   */
  private async validateDirectives(request: any): Promise<string[]> {
    const errors: string[] = [];
    const directives = [
      '@method', '@page', '@limit', '@offset', '@order', '@search',
      '@group', '@cache', '@total', '@count', '@schema',
    ];

    // 检查每个指令
    for (const key in request) {
      if (key.startsWith('@')) {
        const directiveName = key.substring(1);

        // 检查指令是否有效
        if (!directives.includes(key)) {
          errors.push(`未知指令: ${key}`);
          continue;
        }

        // 验证指令值
        const directiveValue = request[key];
        const directiveErrors = await this.validateDirective(
          directiveName,
          directiveValue
        );
        errors.push(...directiveErrors);
      }
    }

    return errors;
  }

  /**
   * 验证指令
   */
  private async validateDirective(
    name: string,
    value: any
  ): Promise<string[]> {
    const errors: string[] = [];

    switch (name) {
      case 'method':
        if (typeof value !== 'string') {
          errors.push('@method 必须是字符串');
        } else {
          const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'];
          if (!validMethods.includes(value.toUpperCase())) {
            errors.push(`@method 必须是有效的HTTP方法: ${validMethods.join(', ')}`);
          }
        }
        break;

      case 'page':
        if (typeof value !== 'number' || value <= 0) {
          errors.push('@page 必须是正整数');
        }
        break;

      case 'limit':
        if (typeof value !== 'number' || value <= 0) {
          errors.push('@limit 必须是正整数');
        } else if (value > 1000) {
          errors.push('@limit 不能超过1000');
        }
        break;

      case 'offset':
        if (typeof value !== 'number' || value < 0) {
          errors.push('@offset 必须是非负整数');
        }
        break;

      case 'cache':
        if (typeof value !== 'boolean' && typeof value !== 'number') {
          errors.push('@cache 必须是布尔值或数字（毫秒）');
        }
        break;

      case 'total':
      case 'count':
        if (typeof value !== 'boolean') {
          errors.push(`@${name} 必须是布尔值`);
        }
        break;

      case 'search':
        if (typeof value !== 'string') {
          errors.push('@search 必须是字符串');
        }
        break;

      case 'schema':
        if (typeof value !== 'boolean') {
          errors.push('@schema 必须是布尔值');
        }
        break;
    }

    return errors;
  }
}
