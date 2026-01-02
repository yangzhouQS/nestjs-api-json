import { Injectable, Logger } from '@nestjs/common';
import { ConditionErrorException } from '../exceptions';
import { Join } from '../join.model';

/**
 * JoinParser
 * JOIN查询解析器
 * 负责解析 join 字段，支持10种JOIN类型
 */
@Injectable()
export class JoinParser {
  private readonly logger = new Logger(JoinParser.name);

  /**
   * 解析 join 字段
   * @param joinValue join 字段的值
   * @returns 解析后的JOIN配置
   */
  parse(joinValue: string | string[]): JoinConfig {
    this.logger.debug(`解析 join: ${JSON.stringify(joinValue)}`);

    const config: JoinConfig = [];

    if (typeof joinValue === 'string') {
      // 字符串格式："&/User/id@,</Comment/momentId@"
      this.parseString(joinValue, config);
    } else if (Array.isArray(joinValue)) {
      // 数组格式：["&/User/id@", "</Comment/momentId@"]
      this.parseArray(joinValue, config);
    }

    return config;
  }

  /**
   * 解析字符串格式的JOIN配置
   * @param value 字符串值
   * @param config JOIN配置数组
   */
  private parseString(value: string, config: JoinConfig): void {
    const joins = value.split(',').map(j => j.trim());

    for (const join of joins) {
      const item = this.parseJoinItem(join);
      config.push(item);
    }
  }

  /**
   * 解析数组格式的JOIN配置
   * @param value 数组值
   * @param config JOIN配置数组
   */
  private parseArray(value: string[], config: JoinConfig): void {
    for (const join of value) {
      const item = this.parseJoinItem(join.trim());
      config.push(item);
    }
  }

  /**
   * 解析单个JOIN项
   * @param item JOIN项字符串
   * @returns JOIN项配置
   */
  private parseJoinItem(item: string): JoinItem {
    // 格式：&/User/id@ 或 </Comment/momentId@
    // 第一位是JOIN类型符号
    if (item.length === 0) {
      throw new ConditionErrorException('JOIN项不能为空');
    }

    // 提取JOIN类型符号
    const typeSymbol = item[0];
    const joinType = Join.getTypeBySymbol(typeSymbol);

    // 提取表名和关联键
    const rest = item.substring(1).trim();
    const parts = rest.split('/');

    if (parts.length < 3) {
      throw new ConditionErrorException(`JOIN项格式错误: ${item}`);
    }

    const table = parts[1];
    const key = parts[2].replace('@', '');

    if (!table) {
      throw new ConditionErrorException(`JOIN项表名不能为空: ${item}`);
    }

    if (!key) {
      throw new ConditionErrorException(`JOIN项关联键不能为空: ${item}`);
    }

    return {
      type: joinType,
      table,
      key,
      symbol: typeSymbol,
    };
  }

  /**
   * 生成 JOIN 子句
   * @param config JOIN配置
   * @param quote 引用符
   * @returns JOIN 子句
   */
  toJoinClause(config: JoinConfig, quote: string = '`'): string {
    if (config.length === 0) {
      return '';
    }

    const joins = config.map(join => {
      const { type, table, key } = join;

      // 获取JOIN类型名称
      let joinType = '';
      switch (type) {
        case Join.TYPE_APP:
          // APP JOIN 是应用层JOIN，不生成SQL
          return '';
        case Join.TYPE_INNER:
          joinType = 'INNER JOIN';
          break;
        case Join.TYPE_FULL:
          joinType = 'FULL JOIN';
          break;
        case Join.TYPE_LEFT:
          joinType = 'LEFT JOIN';
          break;
        case Join.TYPE_RIGHT:
          joinType = 'RIGHT JOIN';
          break;
        case Join.TYPE_OUTER:
          joinType = 'OUTER JOIN';
          break;
        case Join.TYPE_SIDE:
          joinType = 'SIDE JOIN';
          break;
        case Join.TYPE_ANTI:
          joinType = 'ANTI JOIN';
          break;
        case Join.TYPE_FOREIGN:
          joinType = 'FOREIGN JOIN';
          break;
        case Join.TYPE_ASOF:
          joinType = 'ASOF JOIN';
          break;
        default:
          joinType = 'INNER JOIN';
      }

      // 生成 ON 条件
      const onCondition = this.generateOnCondition(key, quote);

      return `${joinType} ${quote}${table}${quote} ON ${onCondition}`;
    });

    return joins.filter(j => j).join(' ');
  }

  /**
   * 生成 ON 条件
   * @param key 关联键
   * @param quote 引用符
   * @returns ON 条件
   */
  private generateOnCondition(key: string, quote: string): string {
    // 简单实现：假设key格式为 "table1.field1=table2.field2"
    // 实际应用中需要根据引用路径解析
    return `${quote}${key}${quote} = ${quote}${key}${quote}`;
  }

  /**
   * 验证JOIN配置
   * @param config JOIN配置
   * @param availableTables 可用的表名
   * @throws ConditionErrorException 当表名不存在时抛出异常
   */
  validate(config: JoinConfig, availableTables: string[]): void {
    for (const join of config) {
      if (!availableTables.includes(join.table)) {
        throw new ConditionErrorException(`JOIN表 ${join.table} 不存在`);
      }
    }
  }

  /**
   * 获取APP JOIN配置
   * APP JOIN需要在应用层处理，不生成SQL
   * @param config JOIN配置
   * @returns APP JOIN配置数组
   */
  getAppJoins(config: JoinConfig): JoinItem[] {
    return config.filter(join => join.type === Join.TYPE_APP);
  }

  /**
   * 获取SQL JOIN配置
   * @param config JOIN配置
   * @returns SQL JOIN配置数组
   */
  getSqlJoins(config: JoinConfig): JoinItem[] {
    return config.filter(join => join.type !== Join.TYPE_APP);
  }
}

/**
 * JOIN配置接口
 */
export interface JoinConfig extends Array<JoinItem> {}

/**
 * JOIN项接口
 */
export interface JoinItem {
  /** JOIN类型 */
  type: number;
  /** 关联表 */
  table: string;
  /** 关联键 */
  key: string;
  /** JOIN类型符号 */
  symbol: string;
}
