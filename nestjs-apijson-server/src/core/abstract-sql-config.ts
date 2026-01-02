import { Injectable, Logger } from '@nestjs/common';
import { RequestMethod } from '@/types/request-method.enum';
import { Parser } from './parser.interface';
import { ObjectParser } from './object-parser.interface';
import { Join } from './join.model';
import { APIJSONConfig } from './apijson-config';
import { OutOfRangeException, ConditionErrorException } from './exceptions';

/**
 * AbstractSQLConfig
 * SQL配置抽象类
 * 负责SQL语句生成和数据库适配
 */
@Injectable()
export abstract class AbstractSQLConfig<
  T = any,
  M extends Record<string, any> = Record<string, any>,
  L extends any[] = any[]
> {
  protected readonly logger = new Logger(this.constructor.name);

  /** 数据库类型 */
  protected database: string = APIJSONConfig.DEFAULT_DATABASE;

  /** 表名 */
  protected table: string = '';

  /** 别名 */
  protected alias: string = '';

  /** 请求方法 */
  protected method: RequestMethod = RequestMethod.GET;

  /** 查询字段 */
  protected column: string = '*';

  /** WHERE条件 */
  protected where: Record<string, any> = {};

  /** 分组字段 */
  protected group: string = '';

  /** HAVING条件 */
  protected having: Record<string, any> = {};

  /** 排序字段 */
  protected order: string = '';

  /** 每页数量 */
  protected count: number = APIJSONConfig.DEFAULT_QUERY_COUNT;

  /** 页码 */
  protected page: number = 0;

  /** 位置 */
  protected position: number = 0;

  /** JOIN列表 */
  protected joinList: Join<T, M, L>[] = [];

  /** 参数列表 */
  protected values: any[] = [];

  /** 缓存时间 */
  protected cache: number = 0;

  /** 是否解释SQL */
  protected explain: boolean = false;

  /** 是否为存储过程 */
  protected isProcedure: boolean = false;

  /** 是否为子查询 */
  protected isSubquery: boolean = false;

  /** 类型 */
  protected type: number = 0;

  /** 解析器引用 */
  protected parser: Parser<T, M, L> | null = null;

  /** 对象解析器引用 */
  protected objectParser: ObjectParser<T, M, L> | null = null;

  /** 数据库名称 */
  protected databaseName: string = APIJSONConfig.DEFAULT_DATABASE;

  /** Schema名称 */
  protected schema: string = APIJSONConfig.DEFAULT_SCHEMA;

  /** 数据源名称 */
  protected datasource: string = APIJSONConfig.DEFAULT_DATASOURCE;

  /** Catalog名称 */
  protected catalog: string = '';

  /** 命名空间 */
  protected namespace: string = '';

  /**
   * 获取SQL语句
   */
  async getSQL(prepared: boolean, withSQL: boolean = false): Promise<string> {
    this.logger.debug('生成SQL语句');

    let sql = '';

    // SELECT部分
    sql += await this.getSelectString();

    // FROM部分
    sql += await this.getFromString();

    // JOIN部分
    const joinString = await this.getJoinString(prepared);
    if (joinString) {
      sql += ' ' + joinString;
    }

    // WHERE部分
    const whereString = await this.getWhereString(prepared);
    if (whereString) {
      sql += ' WHERE ' + whereString;
    }

    // GROUP BY部分
    const groupString = await this.getGroupString();
    if (groupString) {
      sql += ' GROUP BY ' + groupString;
    }

    // HAVING部分
    const havingString = await this.getHavingString(prepared);
    if (havingString) {
      sql += ' HAVING ' + havingString;
    }

    // ORDER BY部分
    const orderString = await this.getOrderString();
    if (orderString) {
      sql += ' ORDER BY ' + orderString;
    }

    // LIMIT部分
    const limitString = await this.getLimitString();
    if (limitString) {
      sql += ' ' + limitString;
    }

    // 如果需要包含SQL语句
    if (withSQL) {
      sql = `{ "sql": "${sql.replace(/"/g, '\\"')}", "data": ${sql} }`;
    }

    return sql;
  }

  /**
   * 获取WHERE子句
   */
  async getWhereString(prepared: boolean): Promise<string> {
    this.logger.debug('生成WHERE子句');

    const conditions: string[] = [];

    // 遍历WHERE条件
    for (const [key, value] of Object.entries(this.where)) {
      // 跳过特殊字段
      if (key.startsWith('@')) {
        continue;
      }

      const condition = await this.buildCondition(key, value, prepared);
      if (condition) {
        conditions.push(condition);
      }
    }

    return conditions.length > 0 ? conditions.join(' AND ') : '';
  }

  /**
   * 获取JOIN子句
   */
  async getJoinString(prepared: boolean): Promise<string> {
    this.logger.debug('生成JOIN子句');

    if (this.joinList.length === 0) {
      return '';
    }

    const joins: string[] = [];

    for (const join of this.joinList) {
      const joinSql = await this.buildJoin(join, prepared);
      if (joinSql) {
        joins.push(joinSql);
      }
    }

    return joins.join(' ');
  }

  /**
   * 获取GROUP BY子句
   */
  async getGroupString(): Promise<string> {
    return this.group || '';
  }

  /**
   * 获取HAVING子句
   */
  async getHavingString(prepared: boolean): Promise<string> {
    this.logger.debug('生成HAVING子句');

    const conditions: string[] = [];

    // 遍历HAVING条件
    for (const [key, value] of Object.entries(this.having)) {
      const condition = await this.buildCondition(key, value, prepared);
      if (condition) {
        conditions.push(condition);
      }
    }

    return conditions.length > 0 ? conditions.join(' AND ') : '';
  }

  /**
   * 获取ORDER BY子句
   */
  async getOrderString(): Promise<string> {
    return this.order || '';
  }

  /**
   * 获取LIMIT子句
   */
  async getLimitString(): Promise<string> {
    this.logger.debug('生成LIMIT子句');

    // 验证分页参数
    if (this.count < 0 || this.count > APIJSONConfig.MAX_QUERY_COUNT) {
      throw new OutOfRangeException(`count超出范围: ${this.count}`);
    }

    if (this.page < 0 || this.page > APIJSONConfig.MAX_QUERY_PAGE) {
      throw new OutOfRangeException(`page超出范围: ${this.page}`);
    }

    return await this.buildLimitString();
  }

  /**
   * 构建条件
   */
  protected async buildCondition(key: string, value: any, prepared: boolean): Promise<string> {
    // 子类实现具体的条件构建逻辑
    return '';
  }

  /**
   * 构建JOIN语句
   */
  protected async buildJoin(join: Join<T, M, L>, prepared: boolean): Promise<string> {
    const joinType = join.getType();
    const table = join.getTable();
    const alias = join.getAlias();
    const key = join.getKey();
    const outerKey = join.getOuterKey();

    const joinKeyword = this.getJoinKeyword(joinType);

    let joinSql = '';

    if (joinType === Join.TYPE_APP) {
      // APP JOIN: 不生成SQL JOIN，在应用层处理
      return '';
    }

    if (alias) {
      joinSql = `${joinKeyword} ${alias} ON ${alias}.${key} = ${table}.${outerKey}`;
    } else {
      joinSql = `${joinKeyword} ${table} ON ${table}.${outerKey} = ${this.table}.${key}`;
    }

    // 添加额外的ON条件
    const onList = join.getOnList();
    if (onList && onList.length > 0) {
      for (const on of onList) {
        for (const [onKey, onValue] of Object.entries(on)) {
          const condition = await this.buildCondition(onKey, onValue, prepared);
          if (condition) {
            joinSql += ` AND ${condition}`;
          }
        }
      }
    }

    return joinSql;
  }

  /**
   * 获取JOIN关键字
   */
  protected getJoinKeyword(joinType: number): string {
    switch (joinType) {
      case Join.TYPE_INNER:
        return 'INNER JOIN';
      case Join.TYPE_FULL:
        return 'FULL JOIN';
      case Join.TYPE_LEFT:
        return 'LEFT JOIN';
      case Join.TYPE_RIGHT:
        return 'RIGHT JOIN';
      case Join.TYPE_OUTER:
        return 'LEFT OUTER JOIN';
      case Join.TYPE_SIDE:
        return 'LEFT JOIN';
      case Join.TYPE_ANTI:
        return 'LEFT JOIN';
      case Join.TYPE_FOREIGN:
        return 'INNER JOIN';
      case Join.TYPE_ASOF:
        return 'ASOF JOIN';
      default:
        return 'INNER JOIN';
    }
  }

  /**
   * 构建LIMIT语句
   */
  protected async buildLimitString(): Promise<string> {
    switch (this.database) {
      case APIJSONConfig.DatabaseType.MYSQL:
      case APIJSONConfig.DatabaseType.POSTGRESQL:
      case APIJSONConfig.DatabaseType.SQLITE:
      case APIJSONConfig.DatabaseType.CLICKHOUSE:
      case APIJSONConfig.DatabaseType.TIDB:
      case APIJSONConfig.DatabaseType.DM:
      case APIJSONConfig.DatabaseType.KINGBASE:
      case APIJSONConfig.DatabaseType.OSCAR:
        return `LIMIT ${this.count} OFFSET ${this.page * this.count}`;

      case APIJSONConfig.DatabaseType.ORACLE:
        return `AND ROWNUM <= ${this.page + this.count}`;

      case APIJSONConfig.DatabaseType.SQLSERVER:
        return `OFFSET ${this.page} ROWS FETCH NEXT ${this.count} ROWS ONLY`;

      case APIJSONConfig.DatabaseType.DB2:
        return `FETCH FIRST ${this.count} ROWS ONLY`;

      default:
        return `LIMIT ${this.count} OFFSET ${this.page * this.count}`;
    }
  }

  /**
   * 获取SELECT字符串
   */
  protected async getSelectString(): Promise<string> {
    let select = 'SELECT';

    // 如果需要解释SQL
    if (this.explain) {
      select = 'EXPLAIN ' + select;
    }

    // 添加查询字段
    if (this.column === '*') {
      select += ' *';
    } else {
      select += ' ' + this.column;
    }

    return select;
  }

  /**
   * 获取FROM字符串
   */
  protected async getFromString(): Promise<string> {
    let from = this.table;

    // 添加别名
    if (this.alias && this.alias !== this.table) {
      from += ` AS ${this.alias}`;
    }

    return 'FROM ' + from;
  }

  // ========== Getter/Setter 方法 ==========

  /**
   * 获取数据库类型
   */
  getDatabase(): string {
    return this.database;
  }

  /**
   * 设置数据库类型
   */
  setDatabase(database: string): AbstractSQLConfig<T, M, L> {
    this.database = database;
    return this;
  }

  /**
   * 获取表名
   */
  getTable(): string {
    return this.table;
  }

  /**
   * 设置表名
   */
  setTable(table: string): AbstractSQLConfig<T, M, L> {
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
  setAlias(alias: string): AbstractSQLConfig<T, M, L> {
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
  setMethod(method: RequestMethod): AbstractSQLConfig<T, M, L> {
    this.method = method;
    return this;
  }

  /**
   * 获取查询字段
   */
  getColumn(): string {
    return this.column;
  }

  /**
   * 设置查询字段
   */
  setColumn(column: string): AbstractSQLConfig<T, M, L> {
    this.column = column;
    return this;
  }

  /**
   * 获取WHERE条件
   */
  getWhere(): Record<string, any> {
    return this.where;
  }

  /**
   * 设置WHERE条件
   */
  setWhere(where: Record<string, any>): AbstractSQLConfig<T, M, L> {
    this.where = where;
    return this;
  }

  /**
   * 获取分组字段
   */
  getGroup(): string {
    return this.group;
  }

  /**
   * 设置分组字段
   */
  setGroup(group: string): AbstractSQLConfig<T, M, L> {
    this.group = group;
    return this;
  }

  /**
   * 获取HAVING条件
   */
  getHaving(): Record<string, any> {
    return this.having;
  }

  /**
   * 设置HAVING条件
   */
  setHaving(having: Record<string, any>): AbstractSQLConfig<T, M, L> {
    this.having = having;
    return this;
  }

  /**
   * 获取排序字段
   */
  getOrder(): string {
    return this.order;
  }

  /**
   * 设置排序字段
   */
  setOrder(order: string): AbstractSQLConfig<T, M, L> {
    this.order = order;
    return this;
  }

  /**
   * 获取每页数量
   */
  getCount(): number {
    return this.count;
  }

  /**
   * 设置每页数量
   */
  setCount(count: number): AbstractSQLConfig<T, M, L> {
    this.count = count;
    return this;
  }

  /**
   * 获取页码
   */
  getPage(): number {
    return this.page;
  }

  /**
   * 设置页码
   */
  setPage(page: number): AbstractSQLConfig<T, M, L> {
    this.page = page;
    return this;
  }

  /**
   * 获取位置
   */
  getPosition(): number {
    return this.position;
  }

  /**
   * 设置位置
   */
  setPosition(position: number): AbstractSQLConfig<T, M, L> {
    this.position = position;
    return this;
  }

  /**
   * 获取JOIN列表
   */
  getJoinList(): Join<T, M, L>[] {
    return this.joinList;
  }

  /**
   * 设置JOIN列表
   */
  setJoinList(joinList: Join<T, M, L>[]): AbstractSQLConfig<T, M, L> {
    this.joinList = joinList;
    return this;
  }

  /**
   * 获取参数列表
   */
  getValues(): any[] {
    return this.values;
  }

  /**
   * 设置参数列表
   */
  setValues(values: any[]): AbstractSQLConfig<T, M, L> {
    this.values = values;
    return this;
  }

  /**
   * 获取解析器
   */
  getParser(): Parser<T, M, L> {
    if (!this.parser) {
      throw new ConditionErrorException('解析器未初始化');
    }
    return this.parser;
  }

  /**
   * 设置解析器
   */
  setParser(parser: Parser<T, M, L>): AbstractSQLConfig<T, M, L> {
    this.parser = parser;
    return this;
  }

  /**
   * 获取对象解析器
   */
  getObjectParser(): ObjectParser<T, M, L> {
    if (!this.objectParser) {
      throw new ConditionErrorException('对象解析器未初始化');
    }
    return this.objectParser;
  }

  /**
   * 设置对象解析器
   */
  setObjectParser(objectParser: ObjectParser<T, M, L>): AbstractSQLConfig<T, M, L> {
    this.objectParser = objectParser;
    return this;
  }

  /**
   * 获取类型
   */
  getType(): number {
    return this.type;
  }

  /**
   * 设置类型
   */
  setType(type: number): AbstractSQLConfig<T, M, L> {
    this.type = type;
    return this;
  }

  /**
   * 获取数据源名称
   */
  getDatasource(): string {
    return this.datasource;
  }

  /**
   * 设置数据源名称
   */
  setDatasource(datasource: string): AbstractSQLConfig<T, M, L> {
    this.datasource = datasource;
    return this;
  }

  /**
   * 获取数据库名称
   */
  getDatabaseName(): string {
    return this.databaseName;
  }

  /**
   * 设置数据库名称
   */
  setDatabaseName(database: string): AbstractSQLConfig<T, M, L> {
    this.databaseName = database;
    return this;
  }

  /**
   * 获取Schema名称
   */
  getSchema(): string {
    return this.schema;
  }

  /**
   * 设置Schema名称
   */
  setSchema(schema: string): AbstractSQLConfig<T, M, L> {
    this.schema = schema;
    return this;
  }

  /**
   * 获取Catalog名称
   */
  getCatalog(): string {
    return this.catalog;
  }

  /**
   * 设置Catalog名称
   */
  setCatalog(catalog: string): AbstractSQLConfig<T, M, L> {
    this.catalog = catalog;
    return this;
  }

  /**
   * 获取命名空间
   */
  getNamespace(): string {
    return this.namespace;
  }

  /**
   * 设置命名空间
   */
  setNamespace(namespace: string): AbstractSQLConfig<T, M, L> {
    this.namespace = namespace;
    return this;
  }

  /**
   * 获取缓存时间
   */
  getCache(): number {
    return this.cache;
  }

  /**
   * 设置缓存时间
   */
  setCache(cache: number): AbstractSQLConfig<T, M, L> {
    this.cache = cache;
    return this;
  }

  /**
   * 获取是否解释SQL
   */
  getExplain(): boolean {
    return this.explain;
  }

  /**
   * 设置是否解释SQL
   */
  setExplain(explain: boolean): AbstractSQLConfig<T, M, L> {
    this.explain = explain;
    return this;
  }

  /**
   * 判断是否为存储过程
   */
  getIsProcedure(): boolean {
    return this.isProcedure;
  }

  /**
   * 设置是否为存储过程
   */
  setProcedure(procedure: boolean): AbstractSQLConfig<T, M, L> {
    this.isProcedure = procedure;
    return this;
  }

  /**
   * 判断是否为子查询
   */
  getIsSubquery(): boolean {
    return this.isSubquery;
  }

  /**
   * 设置是否为子查询
   */
  setSubquery(subquery: boolean): AbstractSQLConfig<T, M, L> {
    this.isSubquery = subquery;
    return this;
  }
}
