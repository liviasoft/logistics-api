import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from './queues.constants';
import { ExampleJobData } from './queues.types';

/**
 * ExampleQueue — service for adding jobs to the example queue.
 *
 * Inject this wherever you need to enqueue work:
 *   constructor(private readonly exampleQueue: ExampleQueue) {}
 *
 * Copy this pattern for each new queue you create.
 */
@Injectable()
export class ExampleQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.EXAMPLE) private readonly queue: Queue,
  ) {}

  /** Fire a welcome job — runs immediately, no delay. */
  async sendWelcome(userId: string, message: string) {
    return this.queue.add('send-welcome', { userId, message } satisfies ExampleJobData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100, // keep last 100 completed jobs
      removeOnFail: 200,
    });
  }

  /** Fire a notification job with an optional delay. */
  async sendNotification(userId: string, message: string, delayMs = 0) {
    return this.queue.add(
      'send-notification',
      { userId, message, timestamp: Date.now() } satisfies ExampleJobData,
      {
        delay: delayMs,
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
  }

  /** Schedule a repeating job via a cron expression. */
  async scheduleRecurring(expression: string) {
    return this.queue.add(
      'send-notification',
      { message: 'Scheduled ping', timestamp: Date.now() },
      {
        repeat: { pattern: expression },
        removeOnComplete: 10,
      },
    );
  }

  /** Return queue metrics for health checks or dashboards. */
  async getMetrics() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
  }
}
