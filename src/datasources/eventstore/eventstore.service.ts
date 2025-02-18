import {
  // END,
  EventStoreDBClient,
  FORWARDS,
  jsonEvent,
  ReadStreamOptions,
  SubscribeToAllOptions,
  SubscribeToStreamOptions,
} from '@eventstore/db-client';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EventstoreService implements OnModuleInit {
  private client: EventStoreDBClient;

  constructor(private configService: ConfigService) {
    this.client = EventStoreDBClient.connectionString(
      this.configService.get('ESDB_URL'),
    );
  }

  async onModuleInit() {}

  async appendEvent(streamName: string, eventType: string, data: any) {
    const event = jsonEvent({ type: eventType, data });
    return await this.client.appendToStream(streamName, event);
  }

  async readStream(
    streamName: string,
    options: ReadStreamOptions = { direction: FORWARDS, fromRevision: 'start' },
  ) {
    return this.client.readStream(streamName, options);
  }

  async subscribeToStream(
    streamName: string,
    options?: SubscribeToStreamOptions,
  ) {
    return this.client.subscribeToStream(streamName, options);
  }

  async subscribeToAll(options?: SubscribeToAllOptions) {
    return this.client.subscribeToAll(options);
  }
}
