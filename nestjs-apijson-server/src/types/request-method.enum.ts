/**
 * 请求方法枚举
 * 定义APIJSON支持的所有请求方法
 */
export enum RequestMethod {
  /** 查询单个对象 */
  GET = 'GET',
  /** 查询总数 */
  HEAD = 'HEAD',
  /** 查询多个对象 */
  GETS = 'GETS',
  /** 查询多个总数 */
  HEADS = 'HEADS',
  /** 新增数据 */
  POST = 'POST',
  /** 更新数据 */
  PUT = 'PUT',
  /** 删除数据 */
  DELETE = 'DELETE',
  /** 混合操作 */
  CRUD = 'CRUD',
}

/**
 * 请求方法工具类
 */
export class RequestMethodUtils {
  /**
   * 判断是否为查询方法
   */
  static isGetMethod(method: RequestMethod): boolean {
    return method === RequestMethod.GET;
  }

  /**
   * 判断是否为查询总数方法
   */
  static isHeadMethod(method: RequestMethod): boolean {
    return method === RequestMethod.HEAD;
  }

  /**
   * 判断是否为查询类型方法（GET, HEAD, GETS, HEADS）
   */
  static isQueryMethod(method: RequestMethod): boolean {
    return (
      method === RequestMethod.GET ||
      method === RequestMethod.HEAD ||
      method === RequestMethod.GETS ||
      method === RequestMethod.HEADS
    );
  }

  /**
   * 判断是否为更新类型方法（POST, PUT, DELETE）
   */
  static isUpdateMethod(method: RequestMethod): boolean {
    return (
      method === RequestMethod.POST ||
      method === RequestMethod.PUT ||
      method === RequestMethod.DELETE
    );
  }

  /**
   * 判断是否为公开方法（无需登录）
   */
  static isPublicMethod(method: RequestMethod): boolean {
    // 默认所有方法都需要登录，子类可以重写
    return false;
  }

  /**
   * 判断是否为私有方法（需要登录）
   */
  static isPrivateMethod(method: RequestMethod): boolean {
    return !this.isPublicMethod(method);
  }

  /**
   * 从字符串解析请求方法
   */
  static fromString(method: string): RequestMethod {
    const upperMethod = method.toUpperCase();
    switch (upperMethod) {
      case 'GET':
        return RequestMethod.GET;
      case 'HEAD':
        return RequestMethod.HEAD;
      case 'GETS':
        return RequestMethod.GETS;
      case 'HEADS':
        return RequestMethod.HEADS;
      case 'POST':
        return RequestMethod.POST;
      case 'PUT':
        return RequestMethod.PUT;
      case 'DELETE':
        return RequestMethod.DELETE;
      case 'CRUD':
        return RequestMethod.CRUD;
      default:
        throw new Error(`不支持的请求方法: ${method}`);
    }
  }
}
