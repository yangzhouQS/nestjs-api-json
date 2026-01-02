import { SQLConfig } from './sql-config.interface';

/**
 * Subquery模型
 * 子查询模型
 */
export class Subquery<
  T = any,
  M extends Record<string, any> = Record<string, any>,
  L extends any[] = any[]
> {
  /** ALL范围 */
  public static readonly RANGE_ALL = 'ALL';
  /** ANY范围 */
  public static readonly RANGE_ANY = 'ANY';

  /** 路径 */
  private path: string = '';

  /** 原始键 */
  private originKey: string = '';

  /** 原始值 */
  private originValue: M = {} as M;

  /** FROM表 */
  private from: string = '';

  /** 范围 (ALL/ANY) */
  private range: string = '';

  /** 替换键 */
  private key: string = '';

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
  setPath(path: string): Subquery<T, M, L> {
    this.path = path;
    return this;
  }

  /**
   * 获取原始键
   */
  getOriginKey(): string {
    return this.originKey;
  }

  /**
   * 设置原始键
   */
  setOriginKey(originKey: string): Subquery<T, M, L> {
    this.originKey = originKey;
    return this;
  }

  /**
   * 获取原始值
   */
  getOriginValue(): M {
    return this.originValue;
  }

  /**
   * 设置原始值
   */
  setOriginValue(originValue: M): Subquery<T, M, L> {
    this.originValue = originValue;
    return this;
  }

  /**
   * 获取FROM表
   */
  getFrom(): string {
    return this.from;
  }

  /**
   * 设置FROM表
   */
  setFrom(from: string): Subquery<T, M, L> {
    this.from = from;
    return this;
  }

  /**
   * 获取范围
   */
  getRange(): string {
    return this.range;
  }

  /**
   * 设置范围
   */
  setRange(range: string): Subquery<T, M, L> {
    this.range = range;
    return this;
  }

  /**
   * 获取替换键
   */
  getKey(): string {
    return this.key;
  }

  /**
   * 设置替换键
   */
  setKey(key: string): Subquery<T, M, L> {
    this.key = key;
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
  setConfig(config: SQLConfig<T, M, L>): Subquery<T, M, L> {
    this.config = config;
    return this;
  }

  /**
   * 判断是否为ALL范围
   */
  isAll(): boolean {
    return this.range === Subquery.RANGE_ALL;
  }

  /**
   * 判断是否为ANY范围
   */
  isAny(): boolean {
    return this.range === Subquery.RANGE_ANY;
  }

  /**
   * 获取范围名称
   */
  getRangeName(): string {
    switch (this.range) {
      case Subquery.RANGE_ALL:
        return 'ALL';
      case Subquery.RANGE_ANY:
        return 'ANY';
      default:
        return '';
    }
  }
}
