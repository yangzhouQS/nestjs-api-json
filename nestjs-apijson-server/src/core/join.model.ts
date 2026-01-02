import { SQLConfig } from './sql-config.interface';

/**
 * Join模型
 * JOIN查询模型
 */
export class Join<
  T = any,
  M extends Record<string, any> = Record<string, any>,
  L extends any[] = any[]
> {
  /** APP JOIN */
  public static readonly TYPE_APP = 0;
  /** INNER JOIN */
  public static readonly TYPE_INNER = 1;
  /** FULL JOIN */
  public static readonly TYPE_FULL = 2;
  /** LEFT JOIN */
  public static readonly TYPE_LEFT = 3;
  /** RIGHT JOIN */
  public static readonly TYPE_RIGHT = 4;
  /** OUTER JOIN */
  public static readonly TYPE_OUTER = 5;
  /** SIDE JOIN */
  public static readonly TYPE_SIDE = 6;
  /** ANTI JOIN */
  public static readonly TYPE_ANTI = 7;
  /** FOREIGN JOIN */
  public static readonly TYPE_FOREIGN = 8;
  /** ASOF JOIN */
  public static readonly TYPE_ASOF = 9;

  /** 路径 */
  private path: string = '';

  /** 关联表 */
  private table: string = '';

  /** 别名 */
  private alias: string = '';

  /** 关联键 */
  private key: string = '';

  /** 外部键 */
  private outerKey: string = '';

  /** JOIN类型 */
  private type: number = Join.TYPE_INNER;

  /** ON条件 */
  private on: M = {} as M;

  /** ON条件列表 */
  private onList: M[] = [];

  /** SQL配置 */
  private config: SQLConfig<T, M, L> | null = null;

  constructor() {}

  /**
   * 获取路径
   */
  getPath(): string {
    return this.path;
  }

  /**
   * 设置路径
   */
  setPath(path: string): Join<T, M, L> {
    this.path = path;
    return this;
  }

  /**
   * 获取关联表
   */
  getTable(): string {
    return this.table;
  }

  /**
   * 设置关联表
   */
  setTable(table: string): Join<T, M, L> {
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
  setAlias(alias: string): Join<T, M, L> {
    this.alias = alias;
    return this;
  }

  /**
   * 获取关联键
   */
  getKey(): string {
    return this.key;
  }

  /**
   * 设置关联键
   */
  setKey(key: string): Join<T, M, L> {
    this.key = key;
    return this;
  }

  /**
   * 获取外部键
   */
  getOuterKey(): string {
    return this.outerKey;
  }

  /**
   * 设置外部键
   */
  setOuterKey(outerKey: string): Join<T, M, L> {
    this.outerKey = outerKey;
    return this;
  }

  /**
   * 获取JOIN类型
   */
  getType(): number {
    return this.type;
  }

  /**
   * 设置JOIN类型
   */
  setType(type: number): Join<T, M, L> {
    this.type = type;
    return this;
  }

  /**
   * 获取ON条件
   */
  getOn(): M {
    return this.on;
  }

  /**
   * 设置ON条件
   */
  setOn(on: M): Join<T, M, L> {
    this.on = on;
    return this;
  }

  /**
   * 获取ON条件列表
   */
  getOnList(): M[] {
    return this.onList;
  }

  /**
   * 设置ON条件列表
   */
  setOnList(onList: M[]): Join<T, M, L> {
    this.onList = onList;
    return this;
  }

  /**
   * 添加ON条件
   */
  addOn(on: M): Join<T, M, L> {
    this.onList.push(on);
    return this;
  }

  /**
   * 获取SQL配置
   */
  getConfig(): SQLConfig<T, M, L> | null {
    return this.config;
  }

  /**
   * 设置SQL配置
   */
  setConfig(config: SQLConfig<T, M, L>): Join<T, M, L> {
    this.config = config;
    return this;
  }

  /**
   * 获取JOIN类型名称
   */
  getTypeName(): string {
    switch (this.type) {
      case Join.TYPE_APP:
        return 'APP';
      case Join.TYPE_INNER:
        return 'INNER';
      case Join.TYPE_FULL:
        return 'FULL';
      case Join.TYPE_LEFT:
        return 'LEFT';
      case Join.TYPE_RIGHT:
        return 'RIGHT';
      case Join.TYPE_OUTER:
        return 'OUTER';
      case Join.TYPE_SIDE:
        return 'SIDE';
      case Join.TYPE_ANTI:
        return 'ANTI';
      case Join.TYPE_FOREIGN:
        return 'FOREIGN';
      case Join.TYPE_ASOF:
        return 'ASOF';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * 根据符号获取JOIN类型
   */
  static getTypeBySymbol(symbol: string): number {
    switch (symbol) {
      case '@':
        return Join.TYPE_APP;
      case '&':
        return Join.TYPE_INNER;
      case '|':
        return Join.TYPE_FULL;
      case '<':
        return Join.TYPE_LEFT;
      case '>':
        return Join.TYPE_RIGHT;
      case '!':
        return Join.TYPE_OUTER;
      case '^':
        return Join.TYPE_SIDE;
      case '(':
        return Join.TYPE_ANTI;
      case ')':
        return Join.TYPE_FOREIGN;
      case '~':
        return Join.TYPE_ASOF;
      default:
        return Join.TYPE_INNER;
    }
  }

  /**
   * 根据类型获取符号
   */
  static getSymbolByType(type: number): string {
    switch (type) {
      case Join.TYPE_APP:
        return '@';
      case Join.TYPE_INNER:
        return '&';
      case Join.TYPE_FULL:
        return '|';
      case Join.TYPE_LEFT:
        return '<';
      case Join.TYPE_RIGHT:
        return '>';
      case Join.TYPE_OUTER:
        return '!';
      case Join.TYPE_SIDE:
        return '^';
      case Join.TYPE_ANTI:
        return '(';
      case Join.TYPE_FOREIGN:
        return ')';
      case Join.TYPE_ASOF:
        return '~';
      default:
        return '&';
    }
  }
}
