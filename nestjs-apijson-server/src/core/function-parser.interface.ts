/**
 * FunctionParser接口
 * 函数解析器接口，负责函数调用的解析和执行
 */
export interface FunctionParser<
  T = any,
  M extends Record<string, any> = Record<string, any>,
  L extends any[] = any[]
> {
  /**
   * 调用函数
   * @param funcName 函数名称和参数
   * @param current 当前对象
   * @returns 函数执行结果
   */
  invoke(funcName: string, current: M): Promise<any>;
 
  /**
   * 解析函数
   * @param funcName 函数字符串
   * @param request 请求对象
   * @param isSQLFunction 是否为SQL函数
   * @returns 函数Bean对象
   */
  parseFunction(funcName: string, request: M, isSQLFunction: boolean): Promise<FunctionBean>;
 
  /**
   * 注册自定义函数
   * @param name 函数名称
   * @param handler 函数处理器
   */
  registerFunction(name: string, handler: FunctionHandler): void;
 
  /**
   * 注销自定义函数
   * @param name 函数名称
   */
  unregisterFunction(name: string): void;
 
  /**
   * 获取函数处理器
   * @param name 函数名称
   * @returns 函数处理器
   */
  getFunctionHandler(name: string): FunctionHandler | null;
 
  /**
   * 获取所有已注册的函数名称
   * @returns 函数名称列表
   */
  getFunctionNames(): string[];
 
  /**
   * 判断是否为远程函数
   * @param funcName 函数名称
   * @returns 是否为远程函数
   */
  isRemoteFunction(funcName: string): boolean;
 
  /**
   * 判断是否为SQL函数
   * @param funcName 函数名称
   * @returns 是否为SQL函数
   */
  isSQLFunction(funcName: string): boolean;
 
  /**
   * 判断是否为脚本函数
   * @param funcName 函数名称
   * @returns 是否为脚本函数
   */
  isScriptFunction(funcName: string): boolean;

  /**
   * 获取是否启用远程函数
   * @returns 是否启用远程函数
   */
  isEnableRemoteFunction(): boolean;

  /**
   * 设置是否启用远程函数
   * @param enableRemoteFunction 是否启用远程函数
   */
  setEnableRemoteFunction(enableRemoteFunction: boolean): void;

  /**
   * 获取是否启用脚本函数
   * @returns 是否启用脚本函数
   */
  isEnableScriptFunction(): boolean;

  /**
   * 设置是否启用脚本函数
   * @param enableScriptFunction 是否启用脚本函数
   */
  setEnableScriptFunction(enableScriptFunction: boolean): void;
}

/**
 * 函数Bean
 */
export interface FunctionBean {
  /** 函数名称 */
  name: string;
  /** 函数参数 */
  args: any[];
  /** 是否为SQL函数 */
  isSQLFunction: boolean;
  /** 是否为脚本函数 */
  isScriptFunction: boolean;
  /** 脚本类型 */
  scriptType?: string;
  /** 脚本内容 */
  scriptContent?: string;
}

/**
 * 函数处理器
 */
export interface FunctionHandler {
  /**
   * 执行函数
   * @param args 参数列表
   * @param context 上下文
   * @returns 执行结果
   */
  execute(args: any[], context: FunctionContext): any;
}

/**
 * 函数上下文
 */
export interface FunctionContext<
  M extends Record<string, any> = Record<string, any>
> {
  /** 请求对象 */
  request: M;
  /** 当前对象 */
  current: M;
  /** 日志记录器 */
  logger?: any;
  /** 解析器 */
  parser?: any;
  /** 数据库连接 */
  connection?: any;
  /** 缓存 */
  cache?: any;
  /** 配置 */
  config?: any;
  /** 用户ID */
  userId?: number | string;
  /** 用户角色 */
  role?: string;
}

/**
 * 脚本类型常量
 */
export const ScriptTypeConstants = {
  /** JavaScript */
  JAVASCRIPT: 'javascript',
  /** Lua */
  LUA: 'lua',
  /** Python */
  PYTHON: 'python',
  /** Groovy */
  GROOVY: 'groovy',
} as const;

/**
 * 脚本类型
 */
export type ScriptType = typeof ScriptTypeConstants[keyof typeof ScriptTypeConstants];
