import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../datasources/prisma/prisma.module';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

/**
 * Global module — SettingsService is available for injection in every other module
 * without needing to import SettingsModule explicitly.
 */
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
