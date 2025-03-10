import { Module } from '@nestjs/common';
import { ClientAppService } from './client-app.service';
import { ClientAppController } from './client-app.controller';
import { AsyncStorageModule } from 'src/common/async-storage/async-storage.module';
import { AuthModule } from '../auth/auth.module';
import { OrganizationModule } from '../organizations/organization.module';

@Module({
  imports: [AsyncStorageModule, AuthModule, OrganizationModule],
  controllers: [ClientAppController],
  providers: [ClientAppService],
})
export class ClientAppModule {}
