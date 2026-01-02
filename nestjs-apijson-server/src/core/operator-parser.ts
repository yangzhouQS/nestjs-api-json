/**
 * 条件运算符解析器
 * 负责解析APIJSON中的各种条件运算符
 */

/**
 * 比较运算符
 */
export const ComparisonOperator = {
  /** 等于 */
  EQ: '=',
  /** 不等于 */
  NEQ: '!=',
  /** 大于 */
  GT: '>',
  /** 小于 */
  LT: '<',
  /** 大于等于 */
  GTE: '>=',
  /** 小于等于 */
  LTE: '<=',
  /** 不等于（SQL） */
  NEQ_SQL: '<>',
} as const;

/**
 * 逻辑运算符
 */
export const LogicalOperator = {
  /** AND */
  AND: '&',
  /** OR */
  OR: '|',
  /** NOT */
  NOT: '!',
} as const;

/**
 * 模糊匹配运算符
 */
export const FuzzyOperator = {
  /** 模糊匹配（LIKE） */
  LIKE: '$',
  /** 模糊匹配（LIKE） */
  LIKE_TILDE: '~',
  /** 不模糊匹配（NOT LIKE） */
  NOT_LIKE: '!~',
  /** 正则匹配 */
  REGEXP: '?',
} as const;

/**
 * 范围运算符
 */
export const RangeOperator = {
  /** IN */
  IN: '{}',
  /** NOT IN */
  NOT_IN: '!{}',
  /** BETWEEN */
  BETWEEN: '><',
  /** NOT BETWEEN */
  NOT_BETWEEN: '!><',
} as const;

/**
 * 数组运算符
 */
export const ArrayOperator = {
  /** JSON_CONTAINS */
  CONTAINS: '<>',
  /** NOT JSON_CONTAINS */
  NOT_CONTAINS: '!<>',
} as const;

/**
 * 运算符解析结果
 */
export interface OperatorParseResult {
  /** 字段名 */
  field: string;
  /** 运算符 */
  operator: string;
  /** 值 */
  value: any;
  /** 是否为引用 */
  isReference: boolean;
  /** 引用路径 */
  referencePath?: string;
}

/**
 * 条件运算符解析器类
 */
export class OperatorParser {
  /**
   * 解析键名
   * @param key 原始键名
   * @returns 解析结果
   */
  static parseKey(key: string): OperatorParseResult {
    const result: OperatorParseResult = {
      field: key,
      operator: '=',
      value: null,
      isReference: false,
    };

    // 检查是否为引用
    if (key.endsWith('@')) {
      result.isReference = true;
      result.field = key.substring(0, key.length - 1);
      result.referencePath = result.field;
      return result;
    }

    // 检查是否为数组引用
    if (key.endsWith('{}@')) {
      result.isReference = true;
      result.operator = '{}@';
      result.field = key.substring(0, key.length - 3);
      result.referencePath = result.field;
      return result;
    }

    // 检查运算符（从右到左匹配）
    const operators = [
      '!<>',
      '!><',
      '!{}',
      '><',
      '{}',
      '>=',
      '<=',
      '!=',
      '<>',
      '>',
      '<',
      '=',
      '!~',
      '~',
      '$',
      '?',
      '&{}',
      '|{}',
      '!{}',
      '&',
      '|',
      '!',
    ];

    for (const op of operators) {
      if (key.endsWith(op)) {
        result.operator = op;
        result.field = key.substring(0, key.length - op.length);
        break;
      }
    }

    return result;
  }

  /**
   * 判断是否为比较运算符
   * @param operator 运算符
   */
  static isComparisonOperator(operator: string): boolean {
    const operators: string[] = [
      ComparisonOperator.EQ,
      ComparisonOperator.NEQ,
      ComparisonOperator.GT,
      ComparisonOperator.LT,
      ComparisonOperator.GTE,
      ComparisonOperator.LTE,
      ComparisonOperator.NEQ_SQL,
    ];
    return operators.includes(operator);
  }

  /**
   * 判断是否为逻辑运算符
   * @param operator 运算符
   */
  static isLogicalOperator(operator: string): boolean {
    const operators: string[] = [
      LogicalOperator.AND,
      LogicalOperator.OR,
      LogicalOperator.NOT,
    ];
    return operators.includes(operator);
  }

  /**
   * 判断是否为模糊匹配运算符
   * @param operator 运算符
   */
  static isFuzzyOperator(operator: string): boolean {
    const operators: string[] = [
      FuzzyOperator.LIKE,
      FuzzyOperator.LIKE_TILDE,
      FuzzyOperator.NOT_LIKE,
      FuzzyOperator.REGEXP,
    ];
    return operators.includes(operator);
  }

  /**
   * 判断是否为范围运算符
   * @param operator 运算符
   */
  static isRangeOperator(operator: string): boolean {
    const operators: string[] = [
      RangeOperator.IN,
      RangeOperator.NOT_IN,
      RangeOperator.BETWEEN,
      RangeOperator.NOT_BETWEEN,
    ];
    return operators.includes(operator);
  }

  /**
   * 判断是否为数组运算符
   * @param operator 运算符
   */
  static isArrayOperator(operator: string): boolean {
    const operators: string[] = [
      ArrayOperator.CONTAINS,
      ArrayOperator.NOT_CONTAINS,
    ];
    return operators.includes(operator);
  }

  /**
   * 将运算符转换为SQL条件
   * @param field 字段名
   * @param operator 运算符
   * @param value 值
   * @param quote 引用符
   * @param params 参数列表
   * @returns SQL条件和参数
   */
  static toSQLCondition(
    field: string,
    operator: string,
    value: any,
    quote: string = '`',
    params: any[] = []
  ): { sql: string; params: any[] } {
    const quotedField = `${quote}${field}${quote}`;

    switch (operator) {
      case ComparisonOperator.EQ:
        return { sql: `${quotedField} = ?`, params: [...params, value] };

      case ComparisonOperator.NEQ:
      case ComparisonOperator.NEQ_SQL:
        return { sql: `${quotedField} != ?`, params: [...params, value] };

      case ComparisonOperator.GT:
        return { sql: `${quotedField} > ?`, params: [...params, value] };

      case ComparisonOperator.LT:
        return { sql: `${quotedField} < ?`, params: [...params, value] };

      case ComparisonOperator.GTE:
        return { sql: `${quotedField} >= ?`, params: [...params, value] };

      case ComparisonOperator.LTE:
        return { sql: `${quotedField} <= ?`, params: [...params, value] };

      case RangeOperator.IN:
        if (!Array.isArray(value)) {
          value = [value];
        }
        const placeholders = value.map(() => '?').join(', ');
        return { sql: `${quotedField} IN (${placeholders})`, params: [...params, ...value] };

      case RangeOperator.NOT_IN:
        if (!Array.isArray(value)) {
          value = [value];
        }
        const notInPlaceholders = value.map(() => '?').join(', ');
        return { sql: `${quotedField} NOT IN (${notInPlaceholders})`, params: [...params, ...value] };

      case RangeOperator.BETWEEN:
        if (!Array.isArray(value) || value.length !== 2) {
          throw new Error('BETWEEN运算符需要两个值的数组');
        }
        return { sql: `${quotedField} BETWEEN ? AND ?`, params: [...params, value[0], value[1]] };

      case RangeOperator.NOT_BETWEEN:
        if (!Array.isArray(value) || value.length !== 2) {
          throw new Error('NOT BETWEEN运算符需要两个值的数组');
        }
        return { sql: `${quotedField} NOT BETWEEN ? AND ?`, params: [...params, value[0], value[1]] };

      case FuzzyOperator.LIKE:
      case FuzzyOperator.LIKE_TILDE:
        return { sql: `${quotedField} LIKE ?`, params: [...params, value] };

      case FuzzyOperator.NOT_LIKE:
        return { sql: `${quotedField} NOT LIKE ?`, params: [...params, value] };

      case FuzzyOperator.REGEXP:
        return { sql: `${quotedField} REGEXP ?`, params: [...params, value] };

      case ArrayOperator.CONTAINS:
        return { sql: `JSON_CONTAINS(${quotedField}, ?)`, params: [...params, value] };

      case ArrayOperator.NOT_CONTAINS:
        return { sql: `NOT JSON_CONTAINS(${quotedField}, ?)`, params: [...params, value] };

      default:
        return { sql: `${quotedField} = ?`, params: [...params, value] };
    }
  }

  /**
   * 解析逻辑运算符
   * @param key 键名
   * @param value 值
   * @param quote 引用符
   * @param params 参数列表
   * @returns SQL条件和参数
   */
  static parseLogicalOperator(
    key: string,
    value: any,
    quote: string = '`',
    params: any[] = []
  ): { sql: string; params: any[] } {
    const parseResult = this.parseKey(key);
    const field = parseResult.field;
    const operator = parseResult.operator;

    if (operator === LogicalOperator.AND + '{}') {
      // AND 逻辑：key&{}: ">=10,<=20"
      if (typeof value === 'string') {
        const conditions = value.split(',');
        let sql = '';
        let newParams = [...params];

        conditions.forEach((cond, index) => {
          const [op, val] = cond.split(/(>=|<=|>|<|=|!=)/);
          if (op && val) {
            const condition = this.toSQLCondition(field, op, val.trim(), quote, []);
            if (index > 0) {
              sql += ' AND ';
            }
            sql += condition.sql;
            newParams = [...newParams, ...condition.params];
          }
        });

        return { sql, params: newParams };
      }
    } else if (operator === LogicalOperator.OR + '{}') {
      // OR 逻辑：key|{}: "<=10,>=20"
      if (typeof value === 'string') {
        const conditions = value.split(',');
        let sql = '';
        let newParams = [...params];

        conditions.forEach((cond, index) => {
          const [op, val] = cond.split(/(>=|<=|>|<|=|!=)/);
          if (op && val) {
            const condition = this.toSQLCondition(field, op, val.trim(), quote, []);
            if (index > 0) {
              sql += ' OR ';
            }
            sql += condition.sql;
            newParams = [...newParams, ...condition.params];
          }
        });

        return { sql: `(${sql})`, params: newParams };
      }
    } else if (operator === LogicalOperator.NOT + '{}') {
      // NOT 逻辑：key!{}: [1,2,3]
      if (Array.isArray(value)) {
        const condition = this.toSQLCondition(field, RangeOperator.NOT_IN, value, quote, []);
        return { sql: condition.sql, params: [...params, ...condition.params] };
      }
    }

    // 默认处理
    return this.toSQLCondition(field, operator, value, quote, params);
  }

  /**
   * 获取运算符描述
   * @param operator 运算符
   */
  static getOperatorDescription(operator: string): string {
    const descriptions: Record<string, string> = {
      '=': '等于',
      '!=': '不等于',
      'NEQ_SQL': '不等于',
      '>': '大于',
      '<': '小于',
      '>=': '大于等于',
      '<=': '小于等于',
      '{}': 'IN',
      '!{}': 'NOT IN',
      '><': 'BETWEEN',
      '!><': 'NOT BETWEEN',
      '$': 'LIKE',
      '~': 'LIKE',
      '!~': 'NOT LIKE',
      '?': 'REGEXP',
      'JSON_CONTAINS': 'JSON_CONTAINS',
      '!<>': 'NOT JSON_CONTAINS',
      '&': 'AND',
      '|': 'OR',
      '!': 'NOT',
    };

    return descriptions[operator] || '未知运算符';
  }
}
