import { Injectable, Logger } from '@nestjs/common';
import { 
  APIJSONRequest, 
  ParseResult, 
  TableQuery,
  Directive 
} from '@/interfaces/apijson-request.interface';
import { 
  RequestMethod, 
  TableOperation, 
  QueryType,
  JoinType,
  SortDirection 
} from '@/types/request-method.type';

/**
 * 核心解析器服务
 * 负责解析 APIJSON 请求，支持所有请求方法（GET, GETS, HEAD, HEADS, POST, PUT, DELETE, CRUD）
 */
@Injectable()
export class CoreParserService {
  private readonly logger = new Logger(CoreParserService.name);

  /**
   * 解析 APIJSON 请求
   * @param request APIJSON 请求对象
   * @param httpMethod HTTP 请求方法（GET, POST, PUT, DELETE 等）
   * @returns 解析结果
   */
  async parse(request: APIJSONRequest, httpMethod: string = 'POST'): Promise<ParseResult> {
    this.logger.log(`开始解析 APIJSON 请求，HTTP 方法: ${httpMethod}`);

    const tables: { [key: string]: TableQuery } = {};
    const directives: { [key: string]: Directive } = {};

    // 确定请求方法
    const requestMethod = this.determineRequestMethod(request, httpMethod);
    
    // 解析表查询
    for (const [key, value] of Object.entries(request)) {
      if (this.isTableKey(key)) {
        const tableName = this.extractTableName(key);
        const isArray = this.isArrayKey(key);
        const tableQuery = await this.parseTableQuery(
          tableName, 
          value, 
          requestMethod, 
          isArray
        );
        tables[tableName] = tableQuery;
      } else if (this.isDirectiveKey(key)) {
        const directiveName = key.substring(1);
        directives[key] = {
          name: directiveName,
          value: value,
        };
      }
    }

    // 处理 JOIN 配置
    if (request['join']) {
      this.parseJoinConfig(request['join'], tables);
    }

    const result: ParseResult = {
      tables,
      directives,
      original: request,
    };

    this.logger.log(`APIJSON 请求解析完成，表数量: ${Object.keys(tables).length}`);
    return result;
  }

  /**
   * 确定请求方法
   */
  private determineRequestMethod(request: APIJSONRequest, httpMethod: string): RequestMethod {
    // 检查是否有 @method 指令
    if (request['@method']) {
      const method = request['@method'].toUpperCase();
      if (Object.values(RequestMethod).includes(method as RequestMethod)) {
        return method as RequestMethod;
      }
    }

    // 根据 HTTP 方法和请求内容确定请求方法
    const hasArrayKey = Object.keys(request).some(key => this.isArrayKey(key));
    
    switch (httpMethod.toUpperCase()) {
      case 'GET':
        return hasArrayKey ? RequestMethod.GETS : RequestMethod.GET;
      case 'HEAD':
        return hasArrayKey ? RequestMethod.HEADS : RequestMethod.HEAD;
      case 'POST':
        return RequestMethod.POST;
      case 'PUT':
        return RequestMethod.PUT;
      case 'DELETE':
        return RequestMethod.DELETE;
      default:
        return RequestMethod.POST;
    }
  }

  /**
   * 解析表查询
   */
  private async parseTableQuery(
    tableName: string,
    tableData: any,
    method: RequestMethod,
    isArray: boolean
  ): Promise<TableQuery> {
    this.logger.debug(`解析表查询: ${tableName}, 方法: ${method}, 是否数组: ${isArray}`);

    // 确定表操作类型
    const operation = this.determineTableOperation(method, tableData);

    // 如果是数组，处理数组查询
    if (Array.isArray(tableData)) {
      return {
        name: tableName,
        operation,
        columns: ['*'],
        where: {},
        joins: [],
        group: [],
        having: {},
        order: [],
        limit: 10,
        offset: 0,
        isArray: true,
        data: tableData, // 用于批量操作
      };
    }

    // 如果是对象，处理对象查询
    if (typeof tableData === 'object' && tableData !== null) {
      // 解析 WHERE 条件和引用字段
      const whereResult = this.parseWhere(tableData);
      
      return {
        name: tableName,
        operation,
        columns: this.parseColumns(tableData['@column'] || tableData['columns']),
        where: whereResult.where,
        joins: this.parseJoins(tableData['@join'] || tableData['joins']),
        group: this.parseGroup(tableData['@group'] || tableData['group']),
        having: this.parseHaving(tableData['@having'] || tableData['having']),
        order: this.parseOrder(tableData['@order'] || tableData['order']),
        limit: this.parseLimit(tableData['@count'] || tableData['count'] || tableData['limit']),
        offset: this.parseOffset(tableData['@page'] || tableData['page']),
        isArray,
        query: this.parseQueryType(tableData['@query'] || tableData['query']),
        cache: this.parseCache(tableData['@cache'] || tableData['cache']),
        role: tableData['@role'] || tableData['role'],
        database: tableData['@database'] || tableData['database'],
        schema: tableData['@schema'] || tableData['schema'],
        explain: tableData['@explain'] || tableData['explain'],
        data: tableData, // 用于 INSERT/UPDATE 操作
        references: whereResult.references, // 添加引用字段映射
      };
    }

    // 默认查询
    return {
      name: tableName,
      operation: TableOperation.SELECT,
      columns: ['*'],
      where: {},
      joins: [],
      group: [],
      having: {},
      order: [],
      limit: 10,
      offset: 0,
      isArray: false,
    };
  }

  /**
   * 确定表操作类型
   */
  private determineTableOperation(method: RequestMethod, tableData: any): TableOperation {
    // 检查是否有 @method 指令
    if (tableData && tableData['@method']) {
      const tableMethod = tableData['@method'].toUpperCase();
      switch (tableMethod) {
        case 'POST':
          return TableOperation.INSERT;
        case 'PUT':
          return TableOperation.UPDATE;
        case 'DELETE':
          return TableOperation.DELETE;
        default:
          return TableOperation.SELECT;
      }
    }

    // 根据请求方法确定操作类型
    switch (method) {
      case RequestMethod.POST:
        return TableOperation.INSERT;
      case RequestMethod.PUT:
        return TableOperation.UPDATE;
      case RequestMethod.DELETE:
        return TableOperation.DELETE;
      case RequestMethod.HEAD:
      case RequestMethod.HEADS:
        return TableOperation.COUNT;
      default:
        return TableOperation.SELECT;
    }
  }

  /**
   * 解析列
   */
  private parseColumns(columns: any): string[] {
    if (!columns) {
      return ['*'];
    }

    if (typeof columns === 'string') {
      return columns.split(',').map(c => c.trim());
    }

    if (Array.isArray(columns)) {
      return columns;
    }

    return ['*'];
  }

  /**
   * 解析 WHERE 条件
   */
  private parseWhere(tableData: any): { where: any; references: { [key: string]: string } } {
    const where: any = {};
    const references: { [key: string]: string } = {};

    for (const [key, value] of Object.entries(tableData)) {
      // 跳过指令和特殊字段
      if (this.isDirectiveKey(key) || this.isSpecialField(key)) {
        continue;
      }

      // 解析条件
      if (key.endsWith('@')) {
        // 引用赋值，如 order_id@: "/receive/id"
        const fieldName = key.slice(0, -1);
        where[fieldName] = value; // 临时保存引用路径
        references[fieldName] = String(value); // 记录引用映射，确保类型为 string
      } else if (key.endsWith('[]')) {
        // IN 条件，如 id{}: [1, 2, 3]
        const fieldName = key.slice(0, -2);
        where[fieldName] = { $in: value };
      } else if (key.endsWith('{}')) {
        // NOT IN 条件
        const fieldName = key.slice(0, -2);
        where[fieldName] = { $nin: value };
      } else if (key.endsWith('<>')) {
        // 包含条件
        const fieldName = key.slice(0, -2);
        where[fieldName] = { $contains: value };
      } else if (key.endsWith('><')) {
        // BETWEEN 条件
        const fieldName = key.slice(0, -2);
        where[fieldName] = { $between: value };
      } else if (key.endsWith('>')) {
        // 大于条件
        const fieldName = key.slice(0, -1);
        where[fieldName] = { $gt: value };
      } else if (key.endsWith('<')) {
        // 小于条件
        const fieldName = key.slice(0, -1);
        where[fieldName] = { $lt: value };
      } else if (key.endsWith('>=')) {
        // 大于等于条件
        const fieldName = key.slice(0, -2);
        where[fieldName] = { $gte: value };
      } else if (key.endsWith('<=')) {
        // 小于等于条件
        const fieldName = key.slice(0, -2);
        where[fieldName] = { $lte: value };
      } else if (key.endsWith('!=')) {
        // 不等于条件
        const fieldName = key.slice(0, -2);
        where[fieldName] = { $ne: value };
      } else if (key.endsWith('~')) {
        // 模糊匹配条件
        const fieldName = key.slice(0, -1);
        where[fieldName] = { $like: `%${value}%` };
      } else if (key.endsWith('!~')) {
        // 不模糊匹配条件
        const fieldName = key.slice(0, -2);
        where[fieldName] = { $notLike: `%${value}%` };
      } else {
        // 等于条件
        where[key] = value;
      }
    }

    return { where, references };
  }

  /**
   * 解析 JOIN 配置
   */
  private parseJoins(joins: any): any[] {
    if (!joins) {
      return [];
    }

    if (typeof joins === 'string') {
      // 解析字符串格式的 JOIN，如 "@/User/id@,&/Comment/toId@"
      return this.parseJoinString(joins);
    }

    if (Array.isArray(joins)) {
      return joins;
    }

    return [];
  }

  /**
   * 解析 JOIN 字符串
   */
  private parseJoinString(joinString: string): any[] {
    const joins: any[] = [];
    const joinItems = joinString.split(',');

    for (const item of joinItems) {
      const match = item.match(/^([@&|<>!^])(~?)\/(\w+)\/(\w+)@$/);
      if (match) {
        const [, joinType, , joinTable, joinField] = match;
        joins.push({
          type: this.mapJoinType(joinType as JoinType),
          table: joinTable,
          on: joinField,
        });
      }
    }

    return joins;
  }

  /**
   * 映射 JOIN 类型
   */
  private mapJoinType(type: JoinType): string {
    switch (type) {
      case JoinType.APP:
        return 'APP';
      case JoinType.INNER:
        return 'INNER';
      case JoinType.FULL:
        return 'FULL';
      case JoinType.LEFT:
        return 'LEFT';
      case JoinType.RIGHT:
        return 'RIGHT';
      case JoinType.OUTER:
        return 'OUTER';
      case JoinType.SIDE:
        return 'SIDE';
      case JoinType.ANTI:
        return 'ANTI';
      case JoinType.FOREIGN:
        return 'FOREIGN';
      case JoinType.ASOF:
        return 'ASOF';
      default:
        return 'INNER';
    }
  }

  /**
   * 解析全局 JOIN 配置
   */
  private parseJoinConfig(joinConfig: any, tables: { [key: string]: TableQuery }): void {
    if (typeof joinConfig === 'string') {
      const joins = this.parseJoinString(joinConfig);
      // 将 JOIN 配置添加到主表
      const mainTable = Object.keys(tables)[0];
      if (mainTable && tables[mainTable]) {
        tables[mainTable].joins = [...(tables[mainTable].joins || []), ...joins];
      }
    }
  }

  /**
   * 解析 GROUP BY
   */
  private parseGroup(group: any): string[] {
    if (!group) {
      return [];
    }

    if (typeof group === 'string') {
      return group.split(',').map(g => g.trim());
    }

    if (Array.isArray(group)) {
      return group;
    }

    return [];
  }

  /**
   * 解析 HAVING
   */
  private parseHaving(having: any): any {
    if (!having || typeof having !== 'object') {
      return {};
    }

    return having;
  }

  /**
   * 解析 ORDER BY
   */
  private parseOrder(order: any): string[] {
    if (!order) {
      return [];
    }

    if (typeof order === 'string') {
      return order.split(',').map(o => o.trim());
    }

    if (Array.isArray(order)) {
      return order;
    }

    return [];
  }

  /**
   * 解析 LIMIT
   */
  private parseLimit(limit: any): number {
    if (!limit) {
      return 10;
    }

    const num = parseInt(limit, 10);
    return isNaN(num) ? 10 : num;
  }

  /**
   * 解析 OFFSET
   */
  private parseOffset(page: any): number {
    if (!page) {
      return 0;
    }

    const num = parseInt(page, 10);
    return isNaN(num) ? 0 : num;
  }

  /**
   * 解析查询类型
   */
  private parseQueryType(query: any): QueryType {
    if (!query) {
      return QueryType.DATA_ONLY;
    }

    const num = parseInt(query, 10);
    if (isNaN(num)) {
      return QueryType.DATA_ONLY;
    }

    return num as QueryType;
  }

  /**
   * 解析缓存配置
   */
  private parseCache(cache: any): any {
    if (!cache) {
      return null;
    }

    if (typeof cache === 'boolean') {
      return { enabled: cache };
    }

    if (typeof cache === 'number') {
      return { enabled: true, ttl: cache };
    }

    if (typeof cache === 'object') {
      return cache;
    }

    return null;
  }

  /**
   * 判断是否为表键
   */
  private isTableKey(key: string): boolean {
    return !key.startsWith('@');
  }

  /**
   * 判断是否为数组键
   */
  private isArrayKey(key: string): boolean {
    return key.endsWith('[]');
  }

  /**
   * 判断是否为指令键
   */
  private isDirectiveKey(key: string): boolean {
    return key.startsWith('@');
  }

  /**
   * 判断是否为特殊字段
   */
  private isSpecialField(key: string): boolean {
    const specialFields = [
      '@column', '@columns',
      '@where',
      '@join', '@joins',
      '@group',
      '@having',
      '@order',
      '@count', '@limit',
      '@page', '@offset',
      '@query',
      '@cache',
      '@role',
      '@database',
      '@schema',
      '@explain',
      '@method',
    ];
    return specialFields.includes(key);
  }

  /**
   * 提取表名
   */
  private extractTableName(key: string): string {
    if (this.isArrayKey(key)) {
      return key.slice(0, -2);
    }
    return key;
  }
}
