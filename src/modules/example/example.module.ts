import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { QueuesModule } from '../../common/queues/queues.module';
import { GatewayModule } from '../gateway/gateway.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { ExampleService } from './example.service';
import { ExampleController } from './example.controller';
import { ExampleCron } from './example.cron';

@Module({
  imports: [
    QueuesModule,
    GatewayModule,
    NotificationsModule,
    StorageModule,
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [ExampleController],
  providers: [ExampleService, ExampleCron],
})
export class ExampleModule {}
