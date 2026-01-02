import { Injectable, Logger } from '@nestjs/common';

/**
 * ExplainParser
 * 解释计划解析器
 * 负责解析 @explain 字段，支持SQL执行计划分析
 */
@Injectable()
export class ExplainParser {
  private readonly logger = new Logger(ExplainParser.name);

  /**
   * 解析 @explain 字段
   * @param explainValue @explain 字段的值
   * @returns 解析后的解释配置
   */
  parse(explainValue: boolean | string | number): ExplainConfig {
    this.logger.debug(`解析 @explain: ${JSON.stringify(explainValue)}`);

    const config: ExplainConfig = {
      enabled: false,
      format: 'TEXT',
      analyze: false,
    };

    if (explainValue === undefined || explainValue === null) {
      return config;
    }

    // 布尔值
    if (typeof explainValue === 'boolean') {
      config.enabled = explainValue;
      return config;
    }

    // 数字
    if (typeof explainValue === 'number') {
      config.enabled = explainValue > 0;
      config.analyze = explainValue > 1;
      return config;
    }

    // 字符串
    if (typeof explainValue === 'string') {
      const trimmed = explainValue.trim().toUpperCase();

      if (trimmed === 'TRUE' || trimmed === '1') {
        config.enabled = true;
      } else if (trimmed === 'FALSE' || trimmed === '0') {
        config.enabled = false;
      } else if (trimmed === 'ANALYZE') {
        config.enabled = true;
        config.analyze = true;
      } else if (['TEXT', 'JSON', 'YAML', 'XML'].includes(trimmed)) {
        config.enabled = true;
        config.format = trimmed as ExplainFormat;
      } else if (trimmed.startsWith('ANALYZE:')) {
        config.enabled = true;
        config.analyze = true;
        const format = trimmed.substring(9).trim();
        if (['TEXT', 'JSON', 'YAML', 'XML'].includes(format)) {
          config.format = format as ExplainFormat;
        }
      }

      return config;
    }

    return config;
  }

  /**
   * 生成 EXPLAIN 前缀
   * @param config 解释配置
   * @returns EXPLAIN 前缀
   */
  toExplainPrefix(config: ExplainConfig): string {
    if (!config.enabled) {
      return '';
    }

    let prefix = 'EXPLAIN';

    if (config.analyze) {
      prefix += ' ANALYZE';
    }

    if (config.format !== 'TEXT') {
      prefix += ` FORMAT ${config.format}`;
    }

    return prefix;
  }
}

/**
 * 解释配置接口
 */
export interface ExplainConfig {
  /** 是否启用解释 */
  enabled: boolean;
  /** 输出格式 */
  format: ExplainFormat;
  /** 是否执行分析 */
  analyze: boolean;
}

/**
 * 解释格式枚举
 */
export type ExplainFormat = 'TEXT' | 'JSON' | 'YAML' | 'XML';
