import { RequestMethod } from '@/types/request-method.enum';
import { ObjectParser } from './object-parser.interface';
import { SQLConfig } from './sql-config.interface';
import { SQLExecutor } from './sql-executor.interface';
import { Verifier } from './verifier.interface';
import { FunctionParser } from './function-parser.interface';
import { Join } from './join.model';

/**
 * Parser接口
 * 核心解析器接口，负责解析APIJSON请求并协调各个组件
 */
export interface Parser<
  T = any,
  M extends Record<string, any> = Record<string, any>,
  L extends any[] = any[]
> {
  /**
   * 核心解析方法
   * @param request 请求对象
   * @returns 解析后的响应
   */
  parseResponse(request: M): Promise<M>;

  /**
   * 对象解析
   * @param request 请求对象
   * @param parentPath 父路径
   * @param name 对象名称
   * @param arrayConfig 数组配置
   * @param isSubquery 是否为子查询
   * @param cache 缓存
   * @returns 对象解析器
   */
  onObjectParse(
    request: M,
    parentPath: string,
    name: string,
    arrayConfig: SQLConfig<T, M, L>,
    isSubquery: boolean,
    cache: M
  ): Promise<ObjectParser<T, M, L>>;

  /**
   * 数组解析
   * @param request 请求对象
   * @param parentPath 父路径
   * @param name 名称
   * @param isSubquery 是否为子查询
   * @param cache 缓存
   * @returns 解析后的数组
   */
  onArrayParse(
    request: M,
    parentPath: string,
    name: string,
    isSubquery: boolean,
    cache: M
  ): Promise<L>;

  /**
   * JOIN解析
   * @param join JOIN对象
   * @param request 请求对象
   * @returns JOIN列表
   */
  onJoinParse(join: any, request: M): Promise<Join<T, M, L>[]>;

  /**
   * 根据路径获取值
   * @param path 路径
   * @returns 值
   */
  getValueByPath(path: string): any;

  /**
   * 保存查询结果到路径
   * @param path 路径
   * @param result 结果
   */
  putQueryResult(path: string, result: any): void;

  /**
   * 验证角色
   * @param config SQL配置
   */
  onVerifyRole(config: SQLConfig<T, M, L>): Promise<void>;

  /**
   * 创建SQL执行器
   * @returns SQL执行器
   */
  createSQLExecutor(): SQLExecutor<T, M, L>;

  /**
   * 创建验证器
   * @returns 验证器
   */
  createVerifier(): Verifier<T, M, L>;

  /**
   * 创建函数解析器
   * @returns 函数解析器
   */
  createFunctionParser(): FunctionParser<T, M, L>;

  /**
   * 创建SQL配置
   * @returns SQL配置
   */
  createSQLConfig(): SQLConfig<T, M, L>;

  /**
   * 获取请求方法
   * @param request 请求对象
   * @returns 请求方法
   */
  getMethod(request: M): RequestMethod;

  /**
   * 获取请求标签
   * @param request 请求对象
   * @returns 标签
   */
  getTag(request: M): string;

  /**
   * 获取请求版本
   * @param request 请求对象
   * @returns 版本
   */
  getVersion(request: M): number;

  /**
   * 获取用户角色
   * @param request 请求对象
   * @returns 角色
   */
  getRole(request: M): string;

  /**
   * 获取数据库名称
   * @param request 请求对象
   * @returns 数据库名称
   */
  getDatabase(request: M): string;

  /**
   * 获取Schema名称
   * @param request 请求对象
   * @returns Schema名称
   */
  getSchema(request: M): string;

  /**
   * 获取数据源名称
   * @param request 请求对象
   * @returns 数据源名称
   */
  getDatasource(request: M): string;

  /**
   * 获取格式化标志
   * @param request 请求对象
   * @returns 是否格式化
   */
  getFormat(request: M): boolean;

  /**
   * 设置请求方法
   * @param request 请求对象
   * @param method 请求方法
   */
  setMethod(request: M, method: RequestMethod): void;

  /**
   * 设置请求标签
   * @param request 请求对象
   * @param tag 标签
   */
  setTag(request: M, tag: string): void;

  /**
   * 设置请求版本
   * @param request 请求对象
   * @param version 版本
   */
  setVersion(request: M, version: number): void;

  /**
   * 设置用户角色
   * @param request 请求对象
   * @param role 角色
   */
  setRole(request: M, role: string): void;

  /**
   * 设置数据库名称
   * @param request 请求对象
   * @param database 数据库名称
   */
  setDatabase(request: M, database: string): void;

  /**
   * 设置Schema名称
   * @param request 请求对象
   * @param schema Schema名称
   */
  setSchema(request: M, schema: string): void;

  /**
   * 设置数据源名称
   * @param request 请求对象
   * @param datasource 数据源名称
   */
  setDatasource(request: M, datasource: string): void;

  /**
   * 设置格式化标志
   * @param request 请求对象
   * @param format 是否格式化
   */
  setFormat(request: M, format: boolean): void;
}
