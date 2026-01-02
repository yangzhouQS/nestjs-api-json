import { CommonException, ErrorCode } from './common.exception';

/**
 * 未登录异常
 * 当用户未登录时抛出
 */
export class NotLoggedInException extends CommonException {
  constructor(message: string = '未登录', details?: any) {
    super(message, ErrorCode.NOT_LOGGED_IN, details);
  }
}
