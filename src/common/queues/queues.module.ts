import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from './queues.constants';
import { ExampleQueue } from './example.queue';
import { ExampleProcessor } from './processors/example.processor';

@Module({
  imports: [
    // ── Global BullMQ connection ──────────────────────────────────────────
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
          db: config.get<number>('REDIS_QUEUE_DB', 1), // separate DB from cache
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      }),
      inject: [ConfigService],
    }),

    // ── Register queues ───────────────────────────────────────────────────
    BullModule.registerQueue(
      { name: QUEUE_NAMES.EXAMPLE },
      // Add more queues here as you scale:
      // { name: QUEUE_NAMES.EMAIL },
      // { name: QUEUE_NAMES.MEDIA },
    ),

    // ── Bull Board dashboard ──────────────────────────────────────────────
    // Mounted at /api/admin/queues (configured in main.ts via app.use)
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({ name: QUEUE_NAMES.EXAMPLE, adapter: BullMQAdapter }),
    // Add a BullBoardModule.forFeature for each queue you register above.
  ],
  providers: [
    ExampleQueue,
    ExampleProcessor,
    // Add processors here as you add queues:
    // EmailProcessor,
    // MediaProcessor,
  ],
  exports: [
    BullModule,
    ExampleQueue,
  ],
})
export class QueuesModule {}
