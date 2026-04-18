import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../datasources/prisma/prisma.service';
import { RedisService } from '../../../datasources/redis/redis.service';
import { QUEUE_NAMES } from '../../../common/queues/queues.constants';
import { InboundWebhookJobData } from '../../../common/queues/queues.types';

const IDEMPOTENCY_TTL = 60 * 60 * 24 * 7; // 7 days

/**
 * Processes inbound webhook events asynchronously.
 *
 * Flow:
 *  1. Check Redis for duplicate (fast path)
 *  2. Upsert InboundWebhookEvent in Postgres (idempotency + audit)
 *  3. Dispatch to your business logic based on provider + eventType
 *  4. Mark as processed
 *
 * Add cases to handleStripeEvent() and handleGenericEvent() for your
 * actual business logic. Each event type should be handled independently.
 */
@Processor(QUEUE_NAMES.WEBHOOK_INBOUND)
export class InboundWebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(InboundWebhookProcessor.name, {
    timestamp: true,
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    super();
  }

  async process(job: Job<InboundWebhookJobData>): Promise<unknown> {
    const { provider, eventId, eventType, payload } = job.data;
    const idempotencyKey = `webhook:inbound:${provider}:${eventId}`;

    // ── 1. Fast duplicate check via Redis ─────────────────────────────────
    const alreadyProcessed = await this.redis.exists(idempotencyKey);
    if (alreadyProcessed) {
      this.logger.debug(`Skipping duplicate: ${provider}:${eventId}`);
      return { skipped: true, reason: 'duplicate' };
    }

    // ── 2. Upsert audit record ────────────────────────────────────────────
    let record = await this.prisma.inboundWebhookEvent.upsert({
      where: { provider_eventId: { provider, eventId } },
      create: {
        provider,
        eventId,
        eventType,
        payload: payload as object,
        status: 'processing',
      },
      update: { status: 'processing' },
    });

    // ── 3. Dispatch to handler ────────────────────────────────────────────
    try {
      let result: unknown;

      switch (provider) {
        case 'stripe':
          result = await this.handleStripeEvent(eventType, payload);
          break;
        case 'generic':
          result = await this.handleGenericEvent(eventType, payload);
          break;
        default:
          this.logger.warn(`No handler for provider: ${provider}`);
          result = { handled: false };
      }

      // ── 4. Mark processed ─────────────────────────────────────────────
      await this.prisma.inboundWebhookEvent.update({
        where: { id: record.id },
        data: { status: 'processed', processedAt: new Date() },
      });

      // Cache idempotency key so Redis path is hit first next time
      await this.redis.set(idempotencyKey, '1', IDEMPOTENCY_TTL);

      this.logger.log(`Processed ${provider}:${eventType} (${eventId})`);
      return result;
    } catch (error: any) {
      await this.prisma.inboundWebhookEvent.update({
        where: { id: record.id },
        data: { status: 'failed', error: error.message },
      });
      throw error; // rethrow so BullMQ retries
    }
  }

  // ── Provider handlers ────────────────────────────────────────────────────
  // Add a case for each event type you want to handle.
  // Keep each handler small — delegate real work to domain services.

  private async handleStripeEvent(eventType: string, payload: unknown) {
    const event = payload as { data: { object: Record<string, unknown> } };

    switch (eventType) {
      case 'payment_intent.succeeded':
        this.logger.log(`Payment succeeded: ${event.data.object.id}`);
        // e.g., await this.ordersService.markPaid(event.data.object.metadata.orderId);
        return { handled: true };

      case 'customer.subscription.deleted':
        this.logger.log(`Subscription cancelled: ${event.data.object.id}`);
        // e.g., await this.subscriptionsService.cancel(event.data.object.id);
        return { handled: true };

      case 'checkout.session.completed':
        this.logger.log(`Checkout completed: ${event.data.object.id}`);
        return { handled: true };

      default:
        this.logger.debug(`Unhandled Stripe event: ${eventType}`);
        return { handled: false, eventType };
    }
  }

  private async handleGenericEvent(eventType: string, payload: unknown) {
    this.logger.log(`Generic event: ${eventType}`);
    // Add your cases here
    return { handled: true, eventType };
  }

  // ── Worker events ────────────────────────────────────────────────────────

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Inbound webhook job ${job.id} failed (attempt ${job.attemptsMade}): ${error.message}`,
    );
  }
}
