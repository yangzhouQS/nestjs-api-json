import { RequestMethod } from '@/types/request-method.enum';
import { Parser } from './parser.interface';
import { ObjectParser } from './object-parser.interface';
import { Join } from './join.model';

/**
 * SQLConfig接口
 * SQL配置接口，负责SQL语句的生成和数据库适配
 */
export interface SQLConfig<
  T = any,
  M extends Record<string, any> = Record<string, any>,
  L extends any[] = any[]
> {
  /**
   * 获取数据库类型
   * @returns 数据库类型
   */
  getDatabase(): string;

  /**
   * 设置数据库类型
   * @param database 数据库类型
   * @returns SQL配置
   */
  setDatabase(database: string): SQLConfig<T, M, L>;

  /**
   * 获取表名
   * @returns 表名
   */
  getTable(): string;

  /**
   * 设置表名
   * @param table 表名
   * @returns SQL配置
   */
  setTable(table: string): SQLConfig<T, M, L>;

  /**
   * 获取别名
   * @returns 别名
   */
  getAlias(): string;

  /**
   * 设置别名
   * @param alias 别名
   * @returns SQL配置
   */
  setAlias(alias: string): SQLConfig<T, M, L>;

  /**
   * 获取请求方法
   * @returns 请求方法
   */
  getMethod(): RequestMethod;

  /**
   * 设置请求方法
   * @param method 请求方法
   * @returns SQL配置
   */
  setMethod(method: RequestMethod): SQLConfig<T, M, L>;

  /**
   * 获取SQL语句
   * @param prepared 是否使用预编译语句
   * @returns SQL语句
   */
  getSQL(prepared: boolean): Promise<string>;

  /**
   * 获取SQL语句
   * @param prepared 是否使用预编译语句
   * @param withSQL 是否包含SQL语句
   * @returns SQL语句
   */
  getSQL(prepared: boolean, withSQL: boolean): Promise<string>;

  /**
   * 获取WHERE子句
   * @param prepared 是否使用预编译语句
   * @returns WHERE子句
   */
  getWhereString(prepared: boolean): Promise<string>;

  /**
   * 获取JOIN子句
   * @param prepared 是否使用预编译语句
   * @returns JOIN子句
   */
  getJoinString(prepared: boolean): Promise<string>;

  /**
   * 获取GROUP BY子句
   * @returns GROUP BY子句
   */
  getGroupString(): Promise<string>;

  /**
   * 获取HAVING子句
   * @param prepared 是否使用预编译语句
   * @returns HAVING子句
   */
  getHavingString(prepared: boolean): Promise<string>;

  /**
   * 获取ORDER BY子句
   * @returns ORDER BY子句
   */
  getOrderString(): Promise<string>;

  /**
   * 获取LIMIT子句
   * @returns LIMIT子句
   */
  getLimitString(): Promise<string>;

  /**
   * 获取每页数量
   * @returns 每页数量
   */
  getCount(): number;

  /**
   * 设置每页数量
   * @param count 每页数量
   * @returns SQL配置
   */
  setCount(count: number): SQLConfig<T, M, L>;

  /**
   * 获取页码
   * @returns 页码
   */
  getPage(): number;

  /**
   * 设置页码
   * @param page 页码
   * @returns SQL配置
   */
  setPage(page: number): SQLConfig<T, M, L>;

  /**
   * 获取位置
   * @returns 位置
   */
  getPosition(): number;

  /**
   * 设置位置
   * @param position 位置
   * @returns SQL配置
   */
  setPosition(position: number): SQLConfig<T, M, L>;

  /**
   * 获取JOIN列表
   * @returns JOIN列表
   */
  getJoinList(): Join<T, M, L>[];

  /**
   * 设置JOIN列表
   * @param joinList JOIN列表
   * @returns SQL配置
   */
  setJoinList(joinList: Join<T, M, L>[]): SQLConfig<T, M, L>;

  /**
   * 获取解析器
   * @returns 解析器
   */
  getParser(): Parser<T, M, L>;

  /**
   * 设置解析器
   * @param parser 解析器
   * @returns SQL配置
   */
  setParser(parser: Parser<T, M, L>): SQLConfig<T, M, L>;

  /**
   * 获取对象解析器
   * @returns 对象解析器
   */
  getObjectParser(): ObjectParser<T, M, L>;

  /**
   * 设置对象解析器
   * @param objectParser 对象解析器
   * @returns SQL配置
   */
  setObjectParser(objectParser: ObjectParser<T, M, L>): SQLConfig<T, M, L>;

  /**
   * 获取类型
   * @returns 类型
   */
  getType(): number;

  /**
   * 设置类型
   * @param type 类型
   * @returns SQL配置
   */
  setType(type: number): SQLConfig<T, M, L>;

  /**
   * 获取数据源名称
   * @returns 数据源名称
   */
  getDatasource(): string;

  /**
   * 设置数据源名称
   * @param datasource 数据源名称
   * @returns SQL配置
   */
  setDatasource(datasource: string): SQLConfig<T, M, L>;

  /**
   * 获取数据库名称
   * @returns 数据库名称
   */
  getDatabaseName(): string;

  /**
   * 设置数据库名称
   * @param database 数据库名称
   * @returns SQL配置
   */
  setDatabaseName(database: string): SQLConfig<T, M, L>;

  /**
   * 获取Schema名称
   * @returns Schema名称
   */
  getSchema(): string;

  /**
   * 设置Schema名称
   * @param schema Schema名称
   * @returns SQL配置
   */
  setSchema(schema: string): SQLConfig<T, M, L>;

  /**
   * 获取Catalog名称
   * @returns Catalog名称
   */
  getCatalog(): string;

  /**
   * 设置Catalog名称
   * @param catalog Catalog名称
   * @returns SQL配置
   */
  setCatalog(catalog: string): SQLConfig<T, M, L>;

  /**
   * 获取命名空间
   * @returns 命名空间
   */
  getNamespace(): string;

  /**
   * 设置命名空间
   * @param namespace 命名空间
   * @returns SQL配置
   */
  setNamespace(namespace: string): SQLConfig<T, M, L>;

  /**
   * 获取查询字段
   * @returns 查询字段
   */
  getColumn(): string;

  /**
   * 设置查询字段
   * @param column 查询字段
   * @returns SQL配置
   */
  setColumn(column: string): SQLConfig<T, M, L>;

  /**
   * 获取WHERE条件
   * @returns WHERE条件
   */
  getWhere(): Record<string, any>;

  /**
   * 设置WHERE条件
   * @param where WHERE条件
   * @returns SQL配置
   */
  setWhere(where: Record<string, any>): SQLConfig<T, M, L>;

  /**
   * 获取分组字段
   * @returns 分组字段
   */
  getGroup(): string;

  /**
   * 设置分组字段
   * @param group 分组字段
   * @returns SQL配置
   */
  setGroup(group: string): SQLConfig<T, M, L>;

  /**
   * 获取HAVING条件
   * @returns HAVING条件
   */
  getHaving(): Record<string, any>;

  /**
   * 设置HAVING条件
   * @param having HAVING条件
   * @returns SQL配置
   */
  setHaving(having: Record<string, any>): SQLConfig<T, M, L>;

  /**
   * 获取排序字段
   * @returns 排序字段
   */
  getOrder(): string;

  /**
   * 设置排序字段
   * @param order 排序字段
   * @returns SQL配置
   */
  setOrder(order: string): SQLConfig<T, M, L>;

  /**
   * 获取参数列表
   * @returns 参数列表
   */
  getValues(): any[];

  /**
   * 设置参数列表
   * @param values 参数列表
   * @returns SQL配置
   */
  setValues(values: any[]): SQLConfig<T, M, L>;

  /**
   * 获取引用符
   * @returns 引用符
   */
  getQuote(): string;

  /**
   * 获取缓存时间
   * @returns 缓存时间（秒）
   */
  getCache(): number;

  /**
   * 设置缓存时间
   * @param cache 缓存时间（秒）
   * @returns SQL配置
   */
  setCache(cache: number): SQLConfig<T, M, L>;

  /**
   * 获取是否解释SQL
   * @returns 是否解释SQL
   */
  getExplain(): boolean;

  /**
   * 设置是否解释SQL
   * @param explain 是否解释SQL
   * @returns SQL配置
   */
  setExplain(explain: boolean): SQLConfig<T, M, L>;

  /**
   * 获取是否为存储过程
   * @returns 是否为存储过程
   */
  isProcedure(): boolean;

  /**
   * 设置是否为存储过程
   * @param procedure 是否为存储过程
   * @returns SQL配置
   */
  setProcedure(procedure: boolean): SQLConfig<T, M, L>;

  /**
   * 获取是否为子查询
   * @returns 是否为子查询
   */
  isSubquery(): boolean;

  /**
   * 设置是否为子查询
   * @param subquery 是否为子查询
   * @returns SQL配置
   */
  setSubquery(subquery: boolean): SQLConfig<T, M, L>;
}
