import { CommonException, ErrorCode } from './common.exception';

/**
 * 不支持的数据类型异常
 * 当遇到不支持的数据类型时抛出
 */
export class UnsupportedDataTypeException extends CommonException {
  constructor(message: string = '不支持的数据类型', details?: any) {
    super(message, ErrorCode.UNSUPPORTED_DATA_TYPE, details);
  }
}
