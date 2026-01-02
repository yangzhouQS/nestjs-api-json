import { CommonException, ErrorCode } from './common.exception';

/**
 * 不存在异常
 * 当数据不存在时抛出
 */
export class NotExistException extends CommonException {
  constructor(message: string = '数据不存在', details?: any) {
    super(message, ErrorCode.NOT_EXIST, details);
  }
}
