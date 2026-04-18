import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { QUEUE_NAMES } from '../../common/queues/queues.constants';
import { WebhookDeliveryJobData } from '../../common/queues/queues.types';
import { SubscriptionsService } from './subscriptions.service';

/**
 * WebhookDispatcherService
 *
 * Fan-out: takes one domain event and enqueues one delivery job per active
 * subscriber that has registered interest in that event name.
 *
 * Usage — call from any service when a domain event occurs:
 *
 *   await this.dispatcher.dispatch('user.created', {
 *     userId: user.id,
 *     email: user.email,
 *   });
 *
 * The delivery jobs run asynchronously with automatic retries.
 * On permanent failure, the subscription is suspended automatically.
 *
 * EventEmitter integration (optional — add to any service):
 *
 *   @OnEvent('user.created')
 *   async onUserCreated(payload: { userId: string; email: string }) {
 *     await this.dispatcher.dispatch('user.created', payload);
 *   }
 */
@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name, {
    timestamp: true,
  });

  constructor(
    @InjectQueue(QUEUE_NAMES.WEBHOOK_DELIVERY)
    private readonly deliveryQueue: Queue,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  /**
   * Dispatch an event to all matching subscribers.
   * Returns the number of delivery jobs enqueued.
   */
  async dispatch(
    event: string,
    payload: Record<string, unknown>,
  ): Promise<number> {
    const subscribers =
      await this.subscriptions.findActiveSubscriptionsForEvent(event);

    if (subscribers.length === 0) return 0;

    this.logger.log(
      `Dispatching '${event}' to ${subscribers.length} subscriber(s)`,
    );

    await Promise.all(
      subscribers.map((sub) => this.enqueueDelivery(sub.id, event, payload)),
    );

    return subscribers.length;
  }

  /**
   * Dispatch an event to a specific subscription only.
   * Useful for test-event endpoints and retrying specific subscribers.
   */
  async dispatchToSubscription(
    subscriptionId: string,
    event: string,
    payload: Record<string, unknown>,
  ) {
    return this.enqueueDelivery(subscriptionId, event, payload);
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private async enqueueDelivery(
    subscriptionId: string,
    event: string,
    payload: Record<string, unknown>,
  ) {
    const deliveryId = randomUUID();

    const data: WebhookDeliveryJobData = {
      subscriptionId,
      event,
      payload,
      deliveryId,
      attemptNumber: 1,
    };

    return this.deliveryQueue.add(`deliver:${event}`, data, {
      attempts: 6,
      backoff: {
        type: 'exponential',
        delay: 60_000, // 1 min, 2 min, 4 min, 8 min, 16 min, 32 min
      },
      removeOnComplete: 500,
      removeOnFail: 500,
    });
  }
}
