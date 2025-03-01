import { Module } from '@nestjs/common';
import { ClientAppService } from './client-app.service';
import { ClientAppController } from './client-app.controller';

@Module({
  controllers: [ClientAppController],
  providers: [ClientAppService],
})
export class ClientAppModule {}
