import { Global, Module } from '@nestjs/common';
import { HooksService } from './hooks.service';

/**
 * Global module — HooksService is available for injection in every other
 * module without needing to import HooksModule explicitly.
 */
@Global()
@Module({
  providers: [HooksService],
  exports:   [HooksService],
})
export class HooksModule {}
