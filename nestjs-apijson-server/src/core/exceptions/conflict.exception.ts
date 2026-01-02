import { CommonException, ErrorCode } from './common.exception';

/**
 * 冲突异常
 * 当数据冲突时抛出
 */
export class ConflictException extends CommonException {
  constructor(message: string = '数据冲突', details?: any) {
    super(message, ErrorCode.CONFLICT, details);
  }
}
