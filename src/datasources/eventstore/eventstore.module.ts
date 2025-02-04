import { Module } from '@nestjs/common';
import { EventstoreService } from './eventstore.service';

@Module({
  providers: [EventstoreService],
})
export class EventstoreModule {}
