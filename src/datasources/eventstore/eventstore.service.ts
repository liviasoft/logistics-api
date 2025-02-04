import {
  EventStoreDBClient,
  FORWARDS,
  jsonEvent,
  START,
} from '@eventstore/db-client';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EventstoreService implements OnModuleInit {
  private client: EventStoreDBClient;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.client = EventStoreDBClient.connectionString(
      this.configService.get('ESDB_URL'),
    );
  }

  async appendEvent(streamName: string, eventType: string, data: any) {
    const event = jsonEvent({ type: eventType, data });
    await this.client.appendToStream(streamName, event);
  }

  async readStream(streamName: string) {
    return this.client.readStream(streamName, {
      fromRevision: START,
      direction: FORWARDS,
    });
  }

  async subscribeToStream(streamName: string, callback: (event: any) => void) {
    const subscription = this.client.readStream(streamName, {
      fromRevision: START,
      direction: FORWARDS,
    });

    for await (const resolvedEvent of subscription) {
      if (resolvedEvent.event) {
        callback(resolvedEvent.event);
      }
    }
  }
}
