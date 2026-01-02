import { RequestMethod } from '@/types/request-method.enum';
import { SQLConfig } from './sql-config.interface';
import { Join } from './join.model';

/**
 * ObjectParser接口
 * 对象解析器接口，负责解析对象类型的请求
 */
export interface ObjectParser<
  T = any,
  M extends Record<string, any> = Record<string, any>,
  L extends any[] = any[]
> {
  /**
   * 解析方法
   * @param name 名称
   * @param isReuse 是否重用
   * @returns 对象解析器
   */
  parse(name: string, isReuse: boolean): Promise<ObjectParser<T, M, L>>;

  /**
   * 解析响应
   * @param method 请求方法
   * @param table 表名
   * @param alias 别名
   * @param request 请求对象
   * @param joinList JOIN列表
   * @param isProcedure 是否为存储过程
   * @returns 解析后的响应
   */
  parseResponse(
    method: RequestMethod,
    table: string,
    alias: string,
    request: M,
    joinList: Join<T, M, L>[],
    isProcedure: boolean
  ): Promise<M>;

  /**
   * 解析响应（使用SQLConfig）
   * @param config SQL配置
   * @param isProcedure 是否为存储过程
   * @returns 解析后的响应
   */
  parseResponse(config: SQLConfig<T, M, L>, isProcedure: boolean): Promise<M>;

  /**
   * 成员解析
   * @param key 键
   * @param value 值
   * @returns 是否继续解析
   */
  onParse(key: string, value: any): Promise<boolean>;

  /**
   * 子对象解析
   * @param index 索引
   * @param key 键
   * @param value 值
   * @param cache 缓存
   * @returns 解析结果
   */
  onChildParse(index: number, key: string, value: M, cache: any): Promise<any>;

  /**
   * 引用解析
   * @param path 路径
   * @returns 引用的值
   */
  onReferenceParse(path: string): any;

  /**
   * PUT数组解析
   * @param key 键
   * @param array 数组
   */
  onPUTArrayParse(key: string, array: L): Promise<void>;

  /**
   * 表数组解析
   * @param key 键
   * @param array 数组
   */
  onTableArrayParse(key: string, array: L): Promise<void>;

  /**
   * 设置SQL配置
   * @returns 对象解析器
   */
  setSQLConfig(): Promise<ObjectParser<T, M, L>>;

  /**
   * 设置SQL配置（带分页参数）
   * @param count 数量
   * @param page 页码
   * @param position 位置
   * @returns 对象解析器
   */
  setSQLConfig(count: number, page: number, position: number): Promise<ObjectParser<T, M, L>>;

  /**
   * 执行SQL
   * @returns 对象解析器
   */
  executeSQL(): Promise<ObjectParser<T, M, L>>;

  /**
   * SQL执行处理
   * @returns 执行结果
   */
  onSQLExecute(): Promise<M>;

  /**
   * 获取响应
   * @returns 响应对象
   */
  response(): Promise<M>;

  /**
   * 函数响应处理
   * @param type 函数类型
   */
  onFunctionResponse(type: string): Promise<void>;

  /**
   * 子对象响应处理
   */
  onChildResponse(): Promise<void>;

  /**
   * 创建SQL配置
   * @param isProcedure 是否为存储过程
   * @returns SQL配置
   */
  newSQLConfig(isProcedure: boolean): Promise<SQLConfig<T, M, L>>;

  /**
   * 创建SQL配置（完整参数）
   * @param method 请求方法
   * @param table 表名
   * @param alias 别名
   * @param request 请求对象
   * @param joinList JOIN列表
   * @param isProcedure 是否为存储过程
   * @returns SQL配置
   */
  newSQLConfig(
    method: RequestMethod,
    table: string,
    alias: string,
    request: M,
    joinList: Join<T, M, L>[],
    isProcedure: boolean
  ): Promise<SQLConfig<T, M, L>>;

  /**
   * 回收内存
   */
  recycle(): void;

  /**
   * 完成处理
   */
  onComplete(): void;

  /**
   * 获取表名
   * @returns 表名
   */
  getTable(): string;

  /**
   * 设置表名
   * @param table 表名
   * @returns 对象解析器
   */
  setTable(table: string): ObjectParser<T, M, L>;

  /**
   * 获取别名
   * @returns 别名
   */
  getAlias(): string;

  /**
   * 设置别名
   * @param alias 别名
   * @returns 对象解析器
   */
  setAlias(alias: string): ObjectParser<T, M, L>;

  /**
   * 获取请求方法
   * @returns 请求方法
   */
  getMethod(): RequestMethod;

  /**
   * 设置请求方法
   * @param method 请求方法
   * @returns 对象解析器
   */
  setMethod(method: RequestMethod): ObjectParser<T, M, L>;

  /**
   * 获取SQL配置
   * @returns SQL配置
   */
  getSQLConfig(): SQLConfig<T, M, L>;

  /**
   * 设置SQL配置
   * @param config SQL配置
   * @returns 对象解析器
   */
  setSQLConfigObj(config: SQLConfig<T, M, L>): ObjectParser<T, M, L>;

  /**
   * 获取请求对象
   * @returns 请求对象
   */
  getRequest(): M;

  /**
   * 设置请求对象
   * @param request 请求对象
   * @returns 对象解析器
   */
  setRequest(request: M): ObjectParser<T, M, L>;

  /**
   * 获取响应对象
   * @returns 响应对象
   */
  getResponse(): M;

  /**
   * 设置响应对象
   * @param response 响应对象
   * @returns 对象解析器
   */
  setResponse(response: M): ObjectParser<T, M, L>;

  /**
   * 获取路径
   * @returns 路径
   */
  getPath(): string;

  /**
   * 设置路径
   * @param path 路径
   * @returns 对象解析器
   */
  setPath(path: string): ObjectParser<T, M, L>;
}
