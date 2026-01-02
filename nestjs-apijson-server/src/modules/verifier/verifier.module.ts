import { Module } from '@nestjs/common';
import { VerifierService } from './verifier.service';
import { VerifierController } from './verifier.controller';

/**
 * 验证器模块
 */
@Module({
  controllers: [VerifierController],
  providers: [VerifierService],
  exports: [VerifierService],
})
export class VerifierModule {}
