/**
 * 全局测试类型定义
 */

declare global {
  namespace NodeJS {
    interface Global {
      /**
       * 测试数据库辅助类实例
       */
      testDbHelper: any;
      
      /**
       * 是否使用真实数据库进行测试
       */
      useRealDatabase: boolean;
    }
  }
}

export {};
