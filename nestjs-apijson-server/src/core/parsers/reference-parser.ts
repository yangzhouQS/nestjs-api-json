import { Injectable, Logger } from '@nestjs/common';
import { ConditionErrorException } from '../exceptions';

/**
 * ReferenceParser
 * 引用解析器
 * 负责解析引用赋值，支持key@和key{}@语法
 */
@Injectable()
export class ReferenceParser {
  private readonly logger = new Logger(ReferenceParser.name);

  /**
   * 解析引用
   * @param key 键名（如：id@, id{}@）
   * @param value 键值
   * @returns 解析后的引用配置
   */
  parse(key: string, value: string): ReferenceConfig {
    this.logger.debug(`解析引用: ${key} = ${value}`);

    const config: ReferenceConfig = {
      type: 'SINGLE',
      key: '',
      path: '',
      isArray: false,
    };

    // 判断引用类型
    if (key.endsWith('{}@')) {
      // 数组引用：id{}@
      config.type = 'ARRAY';
      config.isArray = true;
      config.key = key.substring(0, key.length - 3);
    } else if (key.endsWith('@')) {
      // 单值引用：id@
      config.type = 'SINGLE';
      config.isArray = false;
      config.key = key.substring(0, key.length - 1);
    } else {
      throw new ConditionErrorException(`引用格式错误: ${key}`);
    }

    // 解析路径
    config.path = value.trim();

    return config;
  }

  /**
   * 解析路径
   * @param path 路径字符串
   * @returns 路径数组
   */
  parsePath(path: string): string[] {
    // 移除首尾空格
    const trimmed = path.trim();

    // 空路径
    if (!trimmed) {
      return [];
    }

    // 分割路径
    const parts = trimmed.split('/').filter(p => p);

    return parts;
  }

  /**
   * 解析路径字符串
   * @param path 路径字符串
   * @returns 解析后的路径信息
   */
  parsePathString(path: string): PathInfo {
    const trimmed = path.trim();

    const info: PathInfo = {
      original: trimmed,
      isAbsolute: false,
      parts: [],
    };

    // 判断是否为绝对路径
    info.isAbsolute = trimmed.startsWith('/');

    // 分割路径
    info.parts = trimmed.split('/').filter(p => p);

    return info;
  }

  /**
   * 根据路径获取值
   * @param path 路径数组
   * @param context 上下文对象
   * @returns 路径对应的值
   */
  getValueByPath(path: string[], context: any): any {
    if (!context) {
      return null;
    }

    let current = context;

    for (const part of path) {
      if (current === null || current === undefined) {
        return null;
      }

      if (typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }

    return current;
  }

  /**
   * 根据路径字符串获取值
   * @param path 路径字符串
   * @param context 上下文对象
   * @param currentPath 当前路径（用于相对路径解析）
   * @returns 路径对应的值
   */
  resolveReference(path: string, context: any, currentPath?: string[]): any {
    const pathInfo = this.parsePathString(path);

    // 解析路径
    let resolvedPath: string[];

    if (pathInfo.isAbsolute) {
      // 绝对路径：从根开始
      resolvedPath = pathInfo.parts;
    } else {
      // 相对路径：从当前路径开始
      if (currentPath && currentPath.length > 0) {
        resolvedPath = [...currentPath, ...pathInfo.parts];
      } else {
        resolvedPath = pathInfo.parts;
      }
    }

    // 获取值
    return this.getValueByPath(resolvedPath, context);
  }

  /**
   * 解析数组引用
   * @param key 键名（如：id{}@）
   * @param value 键值
   * @returns 解析后的数组引用配置
   */
  parseArrayReference(key: string, value: string): ArrayReferenceConfig {
    this.logger.debug(`解析数组引用: ${key} = ${value}`);

    const config: ArrayReferenceConfig = {
      key: '',
      path: '',
      values: [],
    };

    // 提取键名
    if (key.endsWith('{}@')) {
      config.key = key.substring(0, key.length - 3);
    } else {
      throw new ConditionErrorException(`数组引用格式错误: ${key}`);
    }

    // 解析路径
    config.path = value.trim();

    return config;
  }

  /**
   * 解析数组引用并获取值
   * @param config 数组引用配置
   * @param context 上下文对象
   * @param currentPath 当前路径
   * @returns 数组值
   */
  resolveArrayReference(config: ArrayReferenceConfig, context: any, currentPath?: string[]): any[] {
    const value = this.resolveReference(config.path, context, currentPath);

    // 如果值是数组，直接返回
    if (Array.isArray(value)) {
      return value;
    }

    // 如果值不是数组，包装成数组
    if (value !== null && value !== undefined) {
      return [value];
    }

    return [];
  }

  /**
   * 生成引用替换SQL
   * @param config 引用配置
   * @param quote 引用符
   * @returns 引用替换SQL
   */
  toReferenceSQL(config: ReferenceConfig, quote: string = '`'): string {
    if (config.type === 'ARRAY') {
      // 数组引用：IN (...)
      return `${quote}${config.key}${quote} IN (...)`;
    } else {
      // 单值引用：= ...
      return `${quote}${config.key}${quote} = ...`;
    }
  }

  /**
   * 验证引用配置
   * @param config 引用配置
   * @param availableKeys 可用的键名
   * @throws ConditionErrorException 当键名不存在时抛出异常
   */
  validate(config: ReferenceConfig, availableKeys: string[]): void {
    if (!availableKeys.includes(config.key)) {
      throw new ConditionErrorException(`引用键 ${config.key} 不存在`);
    }
  }

  /**
   * 检查是否为引用
   * @param key 键名
   * @returns 是否为引用
   */
  isReference(key: string): boolean {
    return key.endsWith('@') || key.endsWith('{}@');
  }

  /**
   * 检查是否为数组引用
   * @param key 键名
   * @returns 是否为数组引用
   */
  isArrayReference(key: string): boolean {
    return key.endsWith('{}@');
  }

  /**
   * 检查是否为单值引用
   * @param key 键名
   * @returns 是否为单值引用
   */
  isSingleReference(key: string): boolean {
    return key.endsWith('@') && !key.endsWith('{}@');
  }
}

/**
 * 引用配置接口
 */
export interface ReferenceConfig {
  /** 引用类型：SINGLE(单值), ARRAY(数组) */
  type: 'SINGLE' | 'ARRAY';
  /** 键名 */
  key: string;
  /** 路径 */
  path: string;
  /** 是否为数组 */
  isArray: boolean;
}

/**
 * 数组引用配置接口
 */
export interface ArrayReferenceConfig {
  /** 键名 */
  key: string;
  /** 路径 */
  path: string;
  /** 值数组 */
  values: any[];
}

/**
 * 路径信息接口
 */
export interface PathInfo {
  /** 原始路径 */
  original: string;
  /** 是否为绝对路径 */
  isAbsolute: boolean;
  /** 路径部分 */
  parts: string[];
}
