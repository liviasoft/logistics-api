import { Global, Module } from '@nestjs/common';
import { EventstoreService } from './eventstore.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [EventstoreService],
  exports: [EventstoreService],
})
export class EventstoreModule {}
