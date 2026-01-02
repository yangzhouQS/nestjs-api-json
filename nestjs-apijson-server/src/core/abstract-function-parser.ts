import { Injectable, Logger } from '@nestjs/common';
import { APIJSONConfig } from './apijson-config';
import { FunctionBean, FunctionHandler, FunctionContext, ScriptType } from './function-parser.interface';
import { NotExistException, ConditionErrorException } from './exceptions';

/**
 * AbstractFunctionParser
 * 函数解析器抽象类
 * 负责函数调用解析和执行
 */
@Injectable()
export abstract class AbstractFunctionParser<
  T = any,
  M extends Record<string, any> = Record<string, any>,
  L extends any[] = any[]
> {
  protected readonly logger = new Logger(this.constructor.name);

  /** 是否启用远程函数 */
  protected enableRemoteFunction: boolean = APIJSONConfig.ENABLE_REMOTE_FUNCTION;

  /** 是否启用脚本函数 */
  protected enableScriptFunction: boolean = APIJSONConfig.ENABLE_SCRIPT_FUNCTION;

  /** 自定义函数注册表 */
  protected functionHandlers: Map<string, FunctionHandler> = new Map();

  /** 脚本执行器注册表 */
  protected scriptExecutors: Map<string, any> = new Map();

  /**
   * 调用函数
   */
  async invoke(funcName: string, current: M): Promise<any> {
    this.logger.debug(`调用函数: ${funcName}`);

    // 解析函数
    const functionBean = await this.parseFunction(funcName, current, false);

    // 执行函数
    const result = await this.executeFunction(functionBean, current);

    return result;
  }

  /**
   * 解析函数
   */
  async parseFunction(funcName: string, request: M, isSQLFunction: boolean): Promise<FunctionBean> {
    this.logger.debug(`解析函数: ${funcName}, 是否SQL函数: ${isSQLFunction}`);

    // 去除前后空格
    funcName = funcName.trim();

    // 提取函数名和参数
    const match = funcName.match(/^(\w+)\s*\((.*)\)\s*$/);
    if (!match) {
      throw new ConditionErrorException(`无效的函数格式: ${funcName}`);
    }

    const name = match[1];
    const argsString = match[2];
    const args: any[] = [];

    if (argsString) {
      // 解析参数
      const argMatches = argsString.match(/(\w+)\s*=\s*([^,)]+)/g);
      if (argMatches) {
        for (const argMatch of argMatches) {
          const argName = argMatch[1].trim();
          let argValue: any = argMatch[2].trim();

          // 去除引号
          if ((argValue.startsWith('"') && argValue.endsWith('"')) ||
              (argValue.startsWith("'") && argValue.endsWith("'"))) {
            argValue = argValue.substring(1, argValue.length - 1);
          }

          // 尝试转换为数字
          if (!isNaN(Number(argValue))) {
            argValue = Number(argValue);
          }

          args.push(argValue);
        }
      }
    }

    const functionBean: FunctionBean = {
      name,
      args,
      isSQLFunction,
      isScriptFunction: false,
    };

    // 判断是否为脚本函数
    if (name.startsWith('script:')) {
      const scriptType = name.substring(7);
      functionBean.isScriptFunction = true;
      functionBean.scriptType = scriptType as ScriptType;
      functionBean.scriptContent = argsString || '';
    }

    return functionBean;
  }

  /**
   * 执行函数
   */
  protected async executeFunction(functionBean: FunctionBean, current: M): Promise<any> {
    this.logger.debug(`执行函数: ${functionBean.name}, 参数数量: ${functionBean.args.length}`);

    // 脚本函数
    if (functionBean.isScriptFunction) {
      return await this.executeScriptFunction(functionBean, current);
    }

    // SQL函数
    if (functionBean.isSQLFunction) {
      return await this.executeSQLFunction(functionBean, current);
    }

    // 远程函数
    return await this.executeRemoteFunction(functionBean, current);
  }

  /**
   * 执行脚本函数
   */
  protected async executeScriptFunction(functionBean: FunctionBean, current: M): Promise<any> {
    this.logger.debug(`执行脚本函数: 类型=${functionBean.scriptType}`);

    const scriptExecutor = this.scriptExecutors.get(functionBean.scriptType);
    if (!scriptExecutor) {
      throw new NotExistException(`不支持的脚本类型: ${functionBean.scriptType}`);
    }

    const context: FunctionContext<M> = {
      request: current,
      current,
      logger: this.logger,
    };

    return await scriptExecutor.execute(functionBean.scriptContent, functionBean.args, context);
  }

  /**
   * 执行SQL函数
   */
  protected async executeSQLFunction(functionBean: FunctionBean, current: M): Promise<any> {
    this.logger.debug(`执行SQL函数: ${functionBean.name}`);

    // SQL函数在SQL生成时处理，这里返回函数调用信息
    const functionCall = `${functionBean.name}(${functionBean.args.join(', ')})`;

    return functionCall;
  }

  /**
   * 执行远程函数
   */
  protected async executeRemoteFunction(functionBean: FunctionBean, current: M): Promise<any> {
    this.logger.debug(`执行远程函数: ${functionBean.name}`);

    const handler = this.functionHandlers.get(functionBean.name);
    if (!handler) {
      throw new NotExistException(`未注册的函数: ${functionBean.name}`);
    }

    const context: FunctionContext<M> = {
      request: current,
      current,
      logger: this.logger,
    };

    return await handler.execute(functionBean.args, context);
  }

  /**
   * 注册自定义函数
   */
  registerFunction(name: string, handler: FunctionHandler): void {
    this.logger.debug(`注册自定义函数: ${name}`);

    this.functionHandlers.set(name, handler);
  }

  /**
   * 注销自定义函数
   */
  unregisterFunction(name: string): void {
    this.logger.debug(`注销自定义函数: ${name}`);

    this.functionHandlers.delete(name);
  }

  /**
   * 获取函数处理器
   */
  getFunctionHandler(name: string): FunctionHandler | null {
    return this.functionHandlers.get(name) || null;
  }

  /**
   * 获取所有已注册的函数名称
   */
  getFunctionNames(): string[] {
    return Array.from(this.functionHandlers.keys());
  }

  /**
   * 判断是否为远程函数
   */
  isRemoteFunction(funcName: string): boolean {
    // 不以script:开头的都是远程函数
    return !funcName.startsWith('script:');
  }

  /**
   * 判断是否为SQL函数
   */
  isSQLFunction(funcName: string): boolean {
    // SQL函数列表
    const sqlFunctions = [
      'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
      'ABS', 'ROUND', 'CEIL', 'FLOOR',
      'CONCAT', 'SUBSTRING', 'LENGTH',
      'DATE', 'NOW', 'YEAR', 'MONTH', 'DAY',
      'IF', 'CASE', 'WHEN', 'THEN', 'ELSE',
      'COALESCE', 'NULLIF', 'IFNULL',
    ];

    return sqlFunctions.includes(funcName.toUpperCase());
  }

  /**
   * 判断是否为脚本函数
   */
  isScriptFunction(funcName: string): boolean {
    return funcName.startsWith('script:');
  }

  // ========== Getter/Setter 方法 ==========

  /**
   * 获取是否启用远程函数
   */
  isEnableRemoteFunction(): boolean {
    return this.enableRemoteFunction;
  }

  /**
   * 设置是否启用远程函数
   */
  setEnableRemoteFunction(enableRemoteFunction: boolean): AbstractFunctionParser<T, M, L> {
    this.enableRemoteFunction = enableRemoteFunction;
    return this;
  }

  /**
   * 获取是否启用脚本函数
   */
  isEnableScriptFunction(): boolean {
    return this.enableScriptFunction;
  }

  /**
   * 设置是否启用脚本函数
   */
  setEnableScriptFunction(enableScriptFunction: boolean): AbstractFunctionParser<T, M, L> {
    this.enableScriptFunction = enableScriptFunction;
    return this;
  }

  /**
   * 注册脚本执行器
   */
  registerScriptExecutor(scriptType: string, executor: any): void {
    this.logger.debug(`注册脚本执行器: ${scriptType}`);

    this.scriptExecutors.set(scriptType, executor);
  }

  /**
   * 注销脚本执行器
   */
  unregisterScriptExecutor(scriptType: string): void {
    this.logger.debug(`注销脚本执行器: ${scriptType}`);

    this.scriptExecutors.delete(scriptType);
  }
}
