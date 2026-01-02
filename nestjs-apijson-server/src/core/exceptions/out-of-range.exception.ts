import { CommonException, ErrorCode } from './common.exception';

/**
 * 超出范围异常
 * 当数据超出范围时抛出
 */
export class OutOfRangeException extends CommonException {
  constructor(message: string = '超出范围', details?: any) {
    super(message, ErrorCode.OUT_OF_RANGE, details);
  }
}
