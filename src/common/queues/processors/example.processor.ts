import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queues.constants';
import { ExampleJobData } from '../queues.types';

/**
 * Example queue processor.
 *
 * @Processor binds this class to the named queue.
 * WorkerHost provides the process() hook + event decorators.
 *
 * Rename / copy this file for each queue you add.
 */
@Processor(QUEUE_NAMES.EXAMPLE)
export class ExampleProcessor extends WorkerHost {
  private readonly logger = new Logger(ExampleProcessor.name, {
    timestamp: true,
  });

  async process(job: Job<ExampleJobData>): Promise<unknown> {
    this.logger.log(`Processing job ${job.id} [${job.name}]`);

    switch (job.name) {
      case 'send-welcome':
        return this.handleSendWelcome(job);

      case 'send-notification':
        return this.handleSendNotification(job);

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        return null;
    }
  }

  private async handleSendWelcome(job: Job<ExampleJobData>) {
    const { message, userId } = job.data;
    this.logger.log(`[send-welcome] userId=${userId} message="${message}"`);

    // Simulate async work (e.g., call email service)
    await new Promise((r) => setTimeout(r, 500));

    return { sent: true, userId };
  }

  private async handleSendNotification(job: Job<ExampleJobData>) {
    const { message, userId } = job.data;
    this.logger.log(`[send-notification] userId=${userId} message="${message}"`);

    await new Promise((r) => setTimeout(r, 200));

    return { notified: true, userId, message };
  }

  // ─── Worker lifecycle events ────────────────────────────────────────────

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.debug(`Job ${job.id} is active (attempt ${job.attemptsMade + 1})`);
  }
}
