import { Injectable, Logger } from '@nestjs/common';
import { RequestMethod } from '@/types/request-method.enum';
import { SQLConfig } from './sql-config.interface';
import { OperatorParser } from './operator-parser';
import { Subquery } from './subquery.model';
import { APIJSONConfig } from './apijson-config';
import { NotExistException, ConditionErrorException } from './exceptions';

/**
 * AbstractObjectParser
 * 对象解析器抽象类
 * 负责对象解析、字段提取、条件解析、引用解析、函数解析
 */
@Injectable()
export abstract class AbstractObjectParser<
  T = any,
  M extends Record<string, any> = Record<string, any>,
  L extends any[] = any[]
> {
  protected readonly logger = new Logger(this.constructor.name);

  /** 请求对象 */
  protected request: M = {} as M;

  /** 响应对象 */
  protected responseValue: M = {} as M;

  /** SQL配置 */
  protected sqlConfig: SQLConfig<T, M, L> | null = null;

  /** 表名 */
  protected table: string = '';

  /** 别名 */
  protected alias: string = '';

  /** 请求方法 */
  protected method: RequestMethod = RequestMethod.GET;

  /** 路径 */
  protected path: string = '';

  /** 是否为存储过程 */
  protected isProcedure: boolean = false;

  /** WHERE条件 */
  protected where: Record<string, any> = {};

  /** 查询字段 */
  protected column: string = '*';

  /** 分组字段 */
  protected group: string = '';

  /** 排序字段 */
  protected order: string = '';

  /** 分页数量 */
  protected count: number = APIJSONConfig.DEFAULT_QUERY_COUNT;

  /** 页码 */
  protected page: number = 0;

  /** 位置 */
  protected position: number = 0;

  /** JOIN列表 */
  protected joinList: any[] = [];

  /** HAVING条件 */
  protected having: Record<string, any> = {};

  /** 缓存时间 */
  protected cache: number = 0;

  /** 是否解释SQL */
  protected explain: boolean = false;

  /** 参数列表 */
  protected values: any[] = [];

  /** 子查询列表 */
  protected subqueryList: Subquery<T, M, L>[] = [];

  /** 函数列表 */
  protected functionList: any[] = [];

  /** 引用列表 */
  protected referenceList: any[] = [];

  /**
   * 解析方法
   */
  async parse(name: string, isReuse: boolean): Promise<AbstractObjectParser<T, M, L>> {
    this.logger.debug(`开始解析对象: ${name}, 重用: ${isReuse}`);

    this.table = name;
    this.alias = name;

    // 解析请求对象
    await this.parseRequest();

    // 设置SQL配置
    await this.setSQLConfig();

    // 执行SQL
    await this.executeSQL();

    // 处理函数响应
    await this.onFunctionResponse('after');

    // 处理子对象响应
    await this.onChildResponse();

    return this;
  }

  /**
   * 解析响应
   */
  async parseResponse(
    methodOrConfig: RequestMethod | SQLConfig<T, M, L>,
    tableOrIsProcedure: string | boolean,
    alias?: string,
    request?: M,
    joinList?: any[],
    isProcedure?: boolean
  ): Promise<M> {
    // 判断是使用哪种重载
    if (methodOrConfig instanceof Object) {
      // 使用 SQLConfig 的重载
      const config = methodOrConfig as SQLConfig<T, M, L>;
      const proc = tableOrIsProcedure as boolean;
      this.logger.debug(`解析响应（使用SQLConfig）`);

      this.sqlConfig = config;
      this.method = config.getMethod();
      this.table = config.getTable();
      this.alias = config.getAlias();
      this.isProcedure = proc;

      // 执行SQL
      await this.executeSQL();

      // 处理函数响应
      await this.onFunctionResponse('after');

      // 处理子对象响应
      await this.onChildResponse();

      return this.responseValue;
    } else {
      // 使用参数的重载
      const method = methodOrConfig as RequestMethod;
      const table = tableOrIsProcedure as string;
      const al = alias as string;
      const req = request as M;
      const list = joinList as any[];
      const proc = isProcedure as boolean;
      this.logger.debug(`解析响应: ${table}, 方法: ${method}`);

      this.method = method;
      this.table = table;
      this.alias = al;
      this.request = req;
      this.joinList = list;
      this.isProcedure = proc;

      // 解析请求
      await this.parseRequest();

      // 设置SQL配置
      await this.setSQLConfig();

      // 执行SQL
      await this.executeSQL();

      // 处理函数响应
      await this.onFunctionResponse('after');

      // 处理子对象响应
      await this.onChildResponse();

      return this.responseValue;
    }
  }

  /**
   * 成员解析
   */
  async onParse(key: string, value: any): Promise<boolean> {
    this.logger.debug(`成员解析: ${key} = ${value}`);

    // 处理特殊字段
    if (key.startsWith('@')) {
      return await this.parseDirective(key, value);
    }

    // 处理引用
    if (key.endsWith('@')) {
      return await this.parseReference(key, value);
    }

    // 处理函数
    if (typeof value === 'string' && value.includes('(') && value.includes(')')) {
      return await this.parseFunction(key, value);
    }

    // 处理子查询
    if (typeof value === 'object' && Object.keys(value).length > 0) {
      return await this.parseSubquery(key, value);
    }

    // 处理普通条件
    return await this.parseCondition(key, value);
  }

  /**
   * 子对象解析
   */
  async onChildParse(index: number, key: string, value: M, cache: any): Promise<any> {
    this.logger.debug(`子对象解析: ${key}, 索引: ${index}`);

    // 递归解析子对象
    const childParser = this.createObjectParser();
    childParser.setRequest(value);
    childParser.setPath(`${this.path}/${key}`);

    await childParser.parse(key, false);
    const childResponse = await childParser.getResponse();

    return childResponse;
  }

  /**
   * 引用解析
   */
  onReferenceParse(path: string): any {
    this.logger.debug(`引用解析: ${path}`);

    // 从路径获取值
    const value = this.getValueByPath(path);

    if (value === null) {
      throw new NotExistException(`引用路径不存在: ${path}`);
    }

    return value;
  }

  /**
   * PUT数组解析
   */
  async onPUTArrayParse(key: string, array: L): Promise<void> {
    this.logger.debug(`PUT数组解析: ${key}, 长度: ${array.length}`);

    this.method = RequestMethod.PUT;

    // 解析每个数组元素
    for (const item of array) {
      if (typeof item === 'object') {
        await this.parseRequestObject(item);
      }
    }
  }

  /**
   * 表数组解析
   */
  async onTableArrayParse(key: string, array: L): Promise<void> {
    this.logger.debug(`表数组解析: ${key}, 长度: ${array.length}`);

    this.method = RequestMethod.POST;

    // 解析每个数组元素
    for (const item of array) {
      if (typeof item === 'object') {
        await this.parseRequestObject(item);
      }
    }
  }

  /**
   * 设置SQL配置
   */
  async setSQLConfig(
    count?: number,
    page?: number,
    position?: number
  ): Promise<AbstractObjectParser<T, M, L>> {
    // 如果提供了分页参数
    if (count !== undefined && page !== undefined && position !== undefined) {
      this.logger.debug(`设置SQL配置（分页）: count=${count}, page=${page}, position=${position}`);
      this.count = count;
      this.page = page;
      this.position = position;
    } else {
      this.logger.debug('设置SQL配置');
    }

    const config = this.createSQLConfig();
    config.setParser(this.getParser());
    config.setObjectParser(this);
    config.setMethod(this.method);
    config.setTable(this.table);
    config.setAlias(this.alias);
    config.setDatabase(this.getDatabase());
    config.setSchema(this.getSchema());
    config.setDatasource(this.getDatasource());
    config.setColumn(this.column);
    config.setWhere(this.where);
    config.setGroup(this.group);
    config.setOrder(this.order);
    config.setCount(this.count);
    config.setPage(this.page);
    config.setPosition(this.position);
    config.setJoinList(this.joinList as any);
    config.setHaving(this.having);
    config.setCache(this.cache);
    config.setExplain(this.explain);
    config.setValues(this.values);
    config.setProcedure(this.isProcedure);

    this.sqlConfig = config;

    return this;
  }

  /**
   * 执行SQL
   */
  async executeSQL(): Promise<AbstractObjectParser<T, M, L>> {
    this.logger.debug('执行SQL');

    if (!this.sqlConfig) {
      throw new ConditionErrorException('SQL配置未初始化');
    }

    const executor = this.createSQLExecutor();
    const result = await executor.execute(this.sqlConfig, false);

    // 处理结果
    this.responseValue = result;

    return this;
  }

  /**
   * SQL执行处理
   */
  async onSQLExecute(): Promise<M> {
    this.logger.debug('SQL执行处理');

    return this.responseValue;
  }

  /**
   * 获取响应
   */
  async response(): Promise<M> {
    this.logger.debug('获取响应');

    return this.responseValue;
  }

  /**
   * 函数响应处理
   */
  async onFunctionResponse(type: string): Promise<void> {
    this.logger.debug(`函数响应处理: ${type}`);

    // 子类实现具体的函数响应处理逻辑
  }

  /**
   * 子对象响应处理
   */
  async onChildResponse(): Promise<void> {
    this.logger.debug('子对象响应处理');

    // 子类实现具体的子对象响应处理逻辑
  }

  /**
   * 创建SQL配置
   */
  async newSQLConfig(
    isProcedureOrMethod: boolean | RequestMethod,
    table?: string,
    alias?: string,
    request?: M,
    joinList?: any[],
    isProcedure?: boolean
  ): Promise<SQLConfig<T, M, L>> {
    // 判断是使用哪种重载
    if (typeof isProcedureOrMethod === 'boolean') {
      // 使用 isProcedure 参数的重载
      const proc = isProcedureOrMethod as boolean;
      this.logger.debug(`创建SQL配置: isProcedure=${proc}`);

      const config = this.createSQLConfig();
      config.setParser(this.getParser());
      config.setObjectParser(this);
      config.setMethod(this.method);
      config.setTable(this.table);
      config.setAlias(this.alias);
      config.setDatabase(this.getDatabase());
      config.setSchema(this.getSchema());
      config.setProcedure(proc);

      return config;
    } else {
      // 使用完整参数的重载
      const method = isProcedureOrMethod as RequestMethod;
      const tbl = table as string;
      const al = alias as string;
      const req = request as M;
      const list = joinList as any[];
      const proc = isProcedure as boolean;
      this.logger.debug(`创建SQL配置（完整参数）`);

      const config = this.createSQLConfig();
      config.setParser(this.getParser());
      config.setObjectParser(this);
      config.setMethod(method);
      config.setTable(tbl);
      config.setAlias(al);
      config.setDatabase(this.getDatabase());
      config.setSchema(this.getSchema());
      config.setProcedure(proc);

      return config;
    }
  }

  /**
   * 回收内存
   */
  recycle(): void {
    this.logger.debug('回收内存');

    this.request = {} as M;
    this.responseValue = {} as M;
    this.where = {};
    this.values = [];
    this.subqueryList = [];
    this.functionList = [];
    this.referenceList = [];
  }

  /**
   * 完成处理
   */
  onComplete(): void {
    this.logger.debug('完成处理');

    // 子类可以重写此方法进行额外的清理工作
  }

  // ========== 受保护方法 ==========

  /**
   * 解析请求对象
   */
  protected async parseRequest(): Promise<void> {
    this.logger.debug('解析请求对象');

    // 遍历请求对象的每个键值对
    for (const [key, value] of Object.entries(this.request)) {
      await this.onParse(key, value);
    }
  }

  /**
   * 解析请求对象（用于数组元素）
   */
  protected async parseRequestObject(obj: M): Promise<void> {
    this.logger.debug('解析请求对象');

    // 遍历对象的每个键值对
    for (const [key, value] of Object.entries(obj)) {
      await this.onParse(key, value);
    }
  }

  /**
   * 解析指令
   */
  protected async parseDirective(key: string, value: any): Promise<boolean> {
    this.logger.debug(`解析指令: ${key}`);

    switch (key) {
      case '@column':
        this.column = value as string;
        break;
      case '@order':
        this.order = value as string;
        break;
      case '@group':
        this.group = value as string;
        break;
      case '@having':
        this.having = value as Record<string, any>;
        break;
      case '@cache':
        this.cache = parseInt(value as string, 10);
        break;
      case '@explain':
        this.explain = value === true;
        break;
      default:
        this.logger.warn(`未知指令: ${key}`);
    }

    return true;
  }

  /**
   * 解析引用
   */
  protected async parseReference(key: string, value: any): Promise<boolean> {
    this.logger.debug(`解析引用: ${key}`);

    const reference = {
      key: key.substring(0, key.length - 1),
      path: value as string,
    };

    this.referenceList.push(reference);

    return true;
  }

  /**
   * 解析函数
   */
  protected async parseFunction(key: string, value: string): Promise<boolean> {
    this.logger.debug(`解析函数: ${key}`);

    const functionInfo = {
      key,
      value,
    };

    this.functionList.push(functionInfo);

    return true;
  }

  /**
   * 解析子查询
   */
  protected async parseSubquery(key: string, value: M): Promise<boolean> {
    this.logger.debug(`解析子查询: ${key}`);

    const subquery = new Subquery<T, M, L>();
    subquery.setOriginKey(key);
    subquery.setOriginValue(value);

    this.subqueryList.push(subquery);

    return true;
  }

  /**
   * 解析条件
   */
  protected async parseCondition(key: string, value: any): Promise<boolean> {
    this.logger.debug(`解析条件: ${key} = ${value}`);

    const parseResult = OperatorParser.parseKey(key);

    // 将条件添加到where
    if (parseResult.isReference) {
      // 引用条件，稍后解析
      this.where[parseResult.field] = value;
    } else {
      // 普通条件
      this.where[parseResult.field] = value;
    }

    return true;
  }

  /**
   * 根据路径获取值
   */
  protected getValueByPath(path: string): any {
    this.logger.debug(`获取路径值: ${path}`);

    // 子类实现具体的路径解析逻辑
    return null;
  }

  // ========== 抽象方法，子类必须实现 ==========

  /**
   * 获取解析器
   */
  abstract getParser(): any;

  /**
   * 创建SQL执行器
   */
  abstract createSQLExecutor(): any;

  /**
   * 创建SQL配置
   */
  abstract createSQLConfig(): SQLConfig<T, M, L>;

  /**
   * 创建对象解析器
   */
  abstract createObjectParser(): AbstractObjectParser<T, M, L>;

  // ========== Getter/Setter 方法 ==========

  /**
   * 获取表名
   */
  getTable(): string {
    return this.table;
  }

  /**
   * 设置表名
   */
  setTable(table: string): AbstractObjectParser<T, M, L> {
    this.table = table;
    return this;
  }

  /**
   * 获取别名
   */
  getAlias(): string {
    return this.alias;
  }

  /**
   * 设置别名
   */
  setAlias(alias: string): AbstractObjectParser<T, M, L> {
    this.alias = alias;
    return this;
  }

  /**
   * 获取请求方法
   */
  getMethod(): RequestMethod {
    return this.method;
  }

  /**
   * 设置请求方法
   */
  setMethod(method: RequestMethod): AbstractObjectParser<T, M, L> {
    this.method = method;
    return this;
  }

  /**
   * 获取SQL配置
   */
  getSQLConfig(): SQLConfig<T, M, L> | null {
    return this.sqlConfig;
  }

  /**
   * 设置SQL配置
   */
  setSQLConfigObj(config: SQLConfig<T, M, L>): AbstractObjectParser<T, M, L> {
    this.sqlConfig = config;
    return this;
  }

  /**
   * 获取请求对象
   */
  getRequest(): M {
    return this.request;
  }

  /**
   * 设置请求对象
   */
  setRequest(request: M): AbstractObjectParser<T, M, L> {
    this.request = request;
    return this;
  }

  /**
   * 获取响应对象
   */
  getResponse(): M {
    return this.responseValue;
  }

  /**
   * 设置响应对象
   */
  setResponse(response: M): AbstractObjectParser<T, M, L> {
    this.responseValue = response;
    return this;
  }

  /**
   * 获取路径
   */
  getPath(): string {
    return this.path;
  }

  /**
   * 设置路径
   */
  setPath(path: string): AbstractObjectParser<T, M, L> {
    this.path = path;
    return this;
  }

  /**
   * 获取数据库名称
   */
  getDatabase(): string {
    return this.getParser().getDatabase(this.request);
  }

  /**
   * 获取Schema名称
   */
  getSchema(): string {
    return this.getParser().getSchema(this.request);
  }

  /**
   * 获取数据源名称
   */
  getDatasource(): string {
    return this.getParser().getDatasource(this.request);
  }
}
