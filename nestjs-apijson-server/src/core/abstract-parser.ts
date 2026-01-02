import { Injectable, Logger } from '@nestjs/common';
import { RequestMethod, RequestMethodUtils } from '@/types/request-method.enum';
import { ObjectParser } from './object-parser.interface';
import { SQLConfig } from './sql-config.interface';
import { SQLExecutor } from './sql-executor.interface';
import { Verifier } from './verifier.interface';
import { FunctionParser } from './function-parser.interface';
import { Join } from './join.model';
import { APIJSONConfig } from './apijson-config';

/**
 * AbstractParser
 * 核心解析器抽象类
 * 负责请求解析、验证、SQL生成协调、SQL执行协调、结果封装
 */
@Injectable()
export abstract class AbstractParser<
  T = any,
  M extends Record<string, any> = Record<string, any>,
  L extends any[] = any[]
> {
  protected readonly logger = new Logger(this.constructor.name);
  
  /** 请求对象 */
  protected request: M = {} as M;
  
  /** 响应对象 */
  protected response: M = {} as M;
  
  /** 查询结果缓存 */
  protected queryResultCache: Map<string, any> = new Map();
  
  /** 当前用户ID */
  protected userId: number | string | null = null;
  
  /** 当前用户角色 */
  protected role: string = APIJSONConfig.DEFAULT_DATABASE;
  
  /** 数据库类型 */
  protected database: string = APIJSONConfig.DEFAULT_DATABASE;
  
  /** Schema名称 */
  protected schema: string = APIJSONConfig.DEFAULT_SCHEMA;
  
  /** 数据源名称 */
  protected datasource: string = APIJSONConfig.DEFAULT_DATASOURCE;
  
  /** 格式化标志 */
  protected format: boolean = false;

  /**
   * 核心解析方法
   */
  async parseResponse(request: M): Promise<M> {
    this.logger.log('开始解析APIJSON请求');
    
    if (APIJSONConfig.IS_PRINT_REQUEST_STRING_LOG) {
      this.logger.debug(`请求字符串: ${JSON.stringify(request)}`);
    }

    this.request = request;
    
    // 提取全局参数
    this.extractGlobalParams(request);
    
    // 解析请求
    await this.parseRequest(request);
    
    // 验证请求
    await this.verifyRequest();
    
    // 生成响应
    const response = this.buildResponse();
    
    if (APIJSONConfig.IS_PRINT_REQUEST_ENDTIME_LOG) {
      this.logger.log('请求解析完成');
    }
    
    return response;
  }

  /**
   * 对象解析
   */
  async onObjectParse(
    request: M,
    parentPath: string,
    name: string,
    arrayConfig: SQLConfig<T, M, L> | null,
    isSubquery: boolean,
    cache: M
  ): Promise<ObjectParser<T, M, L>> {
    this.logger.debug(`对象解析: ${name}, 父路径: ${parentPath}`);
    
    const objectParser = this.createObjectParser();
    objectParser.setRequest(request);
    objectParser.setPath(`${parentPath}/${name}`);
    
    if (arrayConfig) {
      objectParser.setSQLConfigObj(arrayConfig);
    }
    
    return objectParser;
  }

  /**
   * 数组解析
   */
  async onArrayParse(
    request: M,
    parentPath: string,
    name: string,
    isSubquery: boolean,
    cache: M
  ): Promise<L> {
    this.logger.debug(`数组解析: ${name}, 父路径: ${parentPath}`);
    
    const result: L = [] as L;
    
    // 解析数组查询
    const arrayConfig = this.createSQLConfig();
    arrayConfig.setMethod(RequestMethod.GETS);
    
    // 提取分页参数
    const count = request['count'] as number || APIJSONConfig.DEFAULT_QUERY_COUNT;
    const page = request['page'] as number || 0;
    
    arrayConfig.setCount(Math.min(count, APIJSONConfig.MAX_QUERY_COUNT));
    arrayConfig.setPage(page);
    
    // 解析表查询
    const tableQuery = request[name];
    if (tableQuery) {
      const objectParser = await this.onObjectParse(
        request,
        parentPath,
        name,
        arrayConfig,
        isSubquery,
        cache
      );
      
      await objectParser.parse(name, false);
      const data = await objectParser.response();
      
      if (Array.isArray(data)) {
        result.push(...data);
      }
    }
    
    return result;
  }

  /**
   * JOIN解析
   */
  async onJoinParse(join: any, request: M): Promise<Join<T, M, L>[]> {
    this.logger.debug(`JOIN解析: ${join}`);
    
    const joinList: Join<T, M, L>[] = [];
    
    if (typeof join === 'string') {
      // 解析JOIN字符串，如 "&/User/id@" 或 "@/User/id@"
      const joinType = Join.getTypeBySymbol(join[0]);
      const joinPath = join.substring(1);
      
      const joinObj = new Join<T, M, L>();
      joinObj.setType(joinType);
      joinObj.setPath(joinPath);
      
      joinList.push(joinObj);
    } else if (Array.isArray(join)) {
      // 解析JOIN数组
      for (const j of join) {
        if (typeof j === 'string') {
          const joinType = Join.getTypeBySymbol(j[0]);
          const joinPath = j.substring(1);
          
          const joinObj = new Join<T, M, L>();
          joinObj.setType(joinType);
          joinObj.setPath(joinPath);
          
          joinList.push(joinObj);
        }
      }
    }
    
    return joinList;
  }

  /**
   * 根据路径获取值
   */
  getValueByPath(path: string): any {
    this.logger.debug(`获取路径值: ${path}`);
    
    // 从缓存中查找
    const cachedValue = this.queryResultCache.get(path);
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    // 解析路径
    const parts = path.split('/').filter(p => p.length > 0);
    let current: any = this.response;
    
    for (const part of parts) {
      if (part === '[]') {
        // 数组引用
        if (Array.isArray(current)) {
          current = current;
        } else {
          current = null;
        }
      } else if (current && typeof current === 'object') {
        current = current[part];
      } else {
        current = null;
      }
      
      if (current === null) {
        return null;
      }
    }
    
    return current;
  }

  /**
   * 保存查询结果到路径
   */
  putQueryResult(path: string, result: any): void {
    this.logger.debug(`保存查询结果: ${path}`);
    this.queryResultCache.set(path, result);
  }

  /**
   * 验证角色
   */
  async onVerifyRole(config: SQLConfig<T, M, L>): Promise<void> {
    this.logger.debug('验证角色');
    
    const verifier = this.createVerifier();
    verifier.setCurrentUserId(this.userId);
    verifier.setCurrentRole(this.role);
    
    await verifier.verifyRole(config);
  }

  /**
   * 提取全局参数
   */
  protected extractGlobalParams(request: M): void {
    // 提取tag
    if (request['tag']) {
      // tag用于请求标识，不参与解析
    }
    
    // 提取version
    if (request['version']) {
      // version用于版本控制
    }
    
    // 提取format
    if (request['format'] !== undefined) {
      this.format = request['format'] === true;
    }
    
    // 提取role
    if (request['role']) {
      this.role = request['role'];
    }
    
    // 提取database
    if (request['database']) {
      this.database = request['database'];
    }
    
    // 提取schema
    if (request['schema']) {
      this.schema = request['schema'];
    }
    
    // 提取datasource
    if (request['datasource']) {
      this.datasource = request['datasource'];
    }
  }

  /**
   * 解析请求
   */
  protected async parseRequest(request: M): Promise<void> {
    // 子类实现具体的解析逻辑
  }

  /**
   * 验证请求
   */
  protected async verifyRequest(): Promise<void> {
    // 子类实现具体的验证逻辑
  }

  /**
   * 构建响应
   */
  protected buildResponse(): M {
    const response: any = {};
    
    // 添加状态码
    response['code'] = 200;
    response['msg'] = 'success';
    
    // 添加数据
    response['data'] = this.response;
    
    // 如果需要格式化
    if (this.format) {
      // 添加格式化信息
      response['format'] = true;
    }
    
    return response as M;
  }

  // ========== 抽象方法，子类必须实现 ==========

  /**
   * 创建SQL执行器
   */
  abstract createSQLExecutor(): SQLExecutor<T, M, L>;

  /**
   * 创建验证器
   */
  abstract createVerifier(): Verifier<T, M, L>;

  /**
   * 创建函数解析器
   */
  abstract createFunctionParser(): FunctionParser<T, M, L>;

  /**
   * 创建SQL配置
   */
  abstract createSQLConfig(): SQLConfig<T, M, L>;

  /**
   * 创建对象解析器
   */
  abstract createObjectParser(): ObjectParser<T, M, L>;

  // ========== Getter/Setter 方法 ==========

  /**
   * 获取请求方法
   */
  getMethod(request: M): RequestMethod {
    const method = request['@method'] as string;
    if (method) {
      return RequestMethodUtils.fromString(method);
    }
    
    // 根据请求内容推断方法
    return this.inferMethod(request);
  }

  /**
   * 推断请求方法
   */
  protected inferMethod(request: M): RequestMethod {
    // 检查是否有id字段（GET/HEAD）
    for (const key of Object.keys(request)) {
      if (!key.startsWith('@')) {
        const value = request[key];
        if (value && typeof value === 'object' && 'id' in value) {
          return RequestMethod.GET;
        }
      }
    }
    
    // 默认为POST
    return RequestMethod.POST;
  }

  /**
   * 获取请求标签
   */
  getTag(request: M): string {
    return request['tag'] as string || '';
  }

  /**
   * 获取请求版本
   */
  getVersion(request: M): number {
    return request['version'] as number || 1;
  }

  /**
   * 获取用户角色
   */
  getRole(request: M): string {
    return request['role'] as string || this.role;
  }

  /**
   * 获取数据库名称
   */
  getDatabase(request: M): string {
    return request['database'] as string || this.database;
  }

  /**
   * 获取Schema名称
   */
  getSchema(request: M): string {
    return request['schema'] as string || this.schema;
  }

  /**
   * 获取数据源名称
   */
  getDatasource(request: M): string {
    return request['datasource'] as string || this.datasource;
  }

  /**
   * 获取格式化标志
   */
  getFormat(request: M): boolean {
    return request['format'] === true || this.format;
  }

  /**
   * 设置请求方法
   */
  setMethod(request: M, method: RequestMethod): void {
    (request as any)['@method'] = method;
  }

  /**
   * 设置请求标签
   */
  setTag(request: M, tag: string): void {
    (request as any)['tag'] = tag;
  }

  /**
   * 设置请求版本
   */
  setVersion(request: M, version: number): void {
    (request as any)['version'] = version;
  }

  /**
   * 设置用户角色
   */
  setRole(request: M, role: string): void {
    (request as any)['role'] = role;
    this.role = role;
  }

  /**
   * 设置数据库名称
   */
  setDatabase(request: M, database: string): void {
    (request as any)['database'] = database;
    this.database = database;
  }

  /**
   * 设置Schema名称
   */
  setSchema(request: M, schema: string): void {
    (request as any)['schema'] = schema;
    this.schema = schema;
  }

  /**
   * 设置数据源名称
   */
  setDatasource(request: M, datasource: string): void {
    (request as any)['datasource'] = datasource;
    this.datasource = datasource;
  }

  /**
   * 设置格式化标志
   */
  setFormat(request: M, format: boolean): void {
    (request as any)['format'] = format;
    this.format = format;
  }

  /**
   * 获取当前用户ID
   */
  getCurrentUserId(): number | string | null {
    return this.userId;
  }

  /**
   * 设置当前用户ID
   */
  setCurrentUserId(userId: number | string | null): void {
    this.userId = userId;
  }
}
