import { CommonException, ErrorCode } from './common.exception';

/**
 * 条件错误异常
 * 当查询条件不满足时抛出
 */
export class ConditionErrorException extends CommonException {
  constructor(message: string = '条件错误', details?: any) {
    super(message, ErrorCode.CONDITION_ERROR, details);
  }
}
