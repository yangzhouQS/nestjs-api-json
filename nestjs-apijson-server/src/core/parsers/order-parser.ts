import { Injectable, Logger } from '@nestjs/common';
import { ConditionErrorException } from '../exceptions';

/**
 * OrderParser
 * 排序解析器
 * 负责解析 @order 字段，支持升序、降序、多字段排序
 */
@Injectable()
export class OrderParser {
  private readonly logger = new Logger(OrderParser.name);

  /**
   * 解析 @order 字段
   * @param orderValue @order 字段的值
   * @returns 解析后的排序配置
   */
  parse(orderValue: string | string[] | Record<string, 'ASC' | 'DESC'>): OrderConfig {
    this.logger.debug(`解析 @order: ${JSON.stringify(orderValue)}`);

    const config: OrderConfig = [];

    if (typeof orderValue === 'string') {
      // 字符串格式："id+,name-,age ASC" 或 "id ASC, name DESC"
      this.parseString(orderValue, config);
    } else if (Array.isArray(orderValue)) {
      // 数组格式：["id+", "name-", "age ASC"]
      this.parseArray(orderValue, config);
    } else if (typeof orderValue === 'object' && orderValue !== null) {
      // 对象格式：{"id": "ASC", "name": "DESC"}
      this.parseObject(orderValue, config);
    }

    return config;
  }

  /**
   * 解析字符串格式的排序配置
   * @param value 字符串值
   * @param config 排序配置数组
   */
  private parseString(value: string, config: OrderConfig): void {
    const orders = value.split(',').map(o => o.trim());

    for (const order of orders) {
      if (order.endsWith('+')) {
        // 升序：id+
        const column = order.substring(0, order.length - 1);
        config.push({ column, direction: 'ASC' });
      } else if (order.endsWith('-')) {
        // 降序：name-
        const column = order.substring(0, order.length - 1);
        config.push({ column, direction: 'DESC' });
      } else if (order.toUpperCase().endsWith(' ASC')) {
        // 升序：age ASC
        const column = order.substring(0, order.length - 4).trim();
        config.push({ column, direction: 'ASC' });
      } else if (order.toUpperCase().endsWith(' DESC')) {
        // 降序：age DESC
        const column = order.substring(0, order.length - 5).trim();
        config.push({ column, direction: 'DESC' });
      } else {
        // 默认升序
        config.push({ column: order, direction: 'ASC' });
      }
    }
  }

  /**
   * 解析数组格式的排序配置
   * @param value 数组值
   * @param config 排序配置数组
   */
  private parseArray(value: string[], config: OrderConfig): void {
    for (const order of value) {
      const trimmed = order.trim();

      if (trimmed.endsWith('+')) {
        // 升序
        const column = trimmed.substring(0, trimmed.length - 1);
        config.push({ column, direction: 'ASC' });
      } else if (trimmed.endsWith('-')) {
        // 降序
        const column = trimmed.substring(0, trimmed.length - 1);
        config.push({ column, direction: 'DESC' });
      } else if (trimmed.toUpperCase().endsWith(' ASC')) {
        // 升序
        const column = trimmed.substring(0, trimmed.length - 4).trim();
        config.push({ column, direction: 'ASC' });
      } else if (trimmed.toUpperCase().endsWith(' DESC')) {
        // 降序
        const column = trimmed.substring(0, trimmed.length - 5).trim();
        config.push({ column, direction: 'DESC' });
      } else {
        // 默认升序
        config.push({ column: trimmed, direction: 'ASC' });
      }
    }
  }

  /**
   * 解析对象格式的排序配置
   * @param value 对象值
   * @param config 排序配置数组
   */
  private parseObject(value: Record<string, 'ASC' | 'DESC'>, config: OrderConfig): void {
    for (const [column, direction] of Object.entries(value)) {
      config.push({ column, direction: direction.toUpperCase() as 'ASC' | 'DESC' });
    }
  }

  /**
   * 生成 ORDER BY 子句
   * @param config 排序配置
   * @param quote 引用符
   * @returns ORDER BY 子句
   */
  toOrderByClause(config: OrderConfig, quote: string = '`'): string {
    if (config.length === 0) {
      return '';
    }

    const orders = config.map(order => {
      return `${quote}${order.column}${quote} ${order.direction}`;
    });

    return `ORDER BY ${orders.join(', ')}`;
  }

  /**
   * 验证排序配置
   * @param config 排序配置
   * @param availableColumns 可用的列名
   * @throws ConditionErrorException 当列名不存在时抛出异常
   */
  validate(config: OrderConfig, availableColumns: string[]): void {
    for (const order of config) {
      if (!availableColumns.includes(order.column)) {
        throw new ConditionErrorException(`排序字段 ${order.column} 不存在`);
      }
    }
  }
}

/**
 * 排序配置接口
 */
export interface OrderConfig extends Array<OrderItem> {}

/**
 * 排序项接口
 */
export interface OrderItem {
  /** 列名 */
  column: string;
  /** 排序方向：ASC 或 DESC */
  direction: 'ASC' | 'DESC';
}
