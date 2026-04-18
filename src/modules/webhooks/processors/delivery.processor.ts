import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { createHmac } from 'crypto';
import { PrismaService } from '../../../datasources/prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions.service';
import { QUEUE_NAMES } from '../../../common/queues/queues.constants';
import { WebhookDeliveryJobData } from '../../../common/queues/queues.types';
import { WebhookEnvelope, DeliveryResult } from '../webhooks.types';

const DELIVERY_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BODY = 1_000;
const MAX_FAILURES_BEFORE_SUSPEND = 6;
const API_VERSION = '2024-01-01';

/**
 * DeliveryProcessor — executes outbound webhook HTTP POSTs.
 *
 * Each job attempt:
 *  1. Loads the subscription (secret + URL)
 *  2. Signs the envelope
 *  3. HTTP POST with 10s timeout
 *  4. Logs the result
 *  5. On final failure: suspends the subscription
 */
@Processor(QUEUE_NAMES.WEBHOOK_DELIVERY)
export class DeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(DeliveryProcessor.name, {
    timestamp: true,
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
  ) {
    super();
  }

  async process(job: Job<WebhookDeliveryJobData>): Promise<DeliveryResult> {
    const { subscriptionId, event, payload, deliveryId } = job.data;

    // ── Load subscription ────────────────────────────────────────────────
    const subscription = await this.prisma.webhookSubscription.findUnique({
      where: { id: subscriptionId },
      select: { id: true, url: true, secret: true, active: true, suspended: true },
    });

    if (!subscription) {
      this.logger.warn(`Subscription ${subscriptionId} not found — skipping`);
      return { success: false, durationMs: 0, error: 'Subscription not found' };
    }

    if (!subscription.active || subscription.suspended) {
      this.logger.warn(`Subscription ${subscriptionId} inactive/suspended — skipping`);
      return { success: false, durationMs: 0, error: 'Subscription inactive' };
    }

    // ── Build envelope ───────────────────────────────────────────────────
    const envelope: WebhookEnvelope = {
      id: deliveryId,
      event,
      timestamp: new Date().toISOString(),
      apiVersion: API_VERSION,
      data: payload,
    };

    const body = JSON.stringify(envelope);

    // ── Sign ─────────────────────────────────────────────────────────────
    const signature = createHmac('sha256', subscription.secret)
      .update(body)
      .digest('hex');

    // ── Deliver ──────────────────────────────────────────────────────────
    const result = await this.post(subscription.url, body, signature, deliveryId);

    // ── Log attempt ──────────────────────────────────────────────────────
    await this.prisma.webhookDeliveryLog.create({
      data: {
        subscriptionId,
        event,
        payload: envelope as object,
        status: result.success ? 'success' : 'failed',
        statusCode: result.statusCode,
        responseBody: result.responseBody,
        durationMs: result.durationMs,
        attemptNumber: job.attemptsMade + 1,
        error: result.error,
        deliveredAt: result.success ? new Date() : undefined,
      },
    });

    if (!result.success) {
      this.logger.warn(
        `Delivery failed for ${subscriptionId} (attempt ${job.attemptsMade + 1}): ` +
          `${result.statusCode ?? result.error}`,
      );
      // Rethrow to trigger BullMQ retry
      throw new Error(result.error ?? `HTTP ${result.statusCode}`);
    }

    this.logger.log(
      `Delivered '${event}' to ${subscription.url} — ${result.statusCode} in ${result.durationMs}ms`,
    );
    return result;
  }

  // ── HTTP POST ─────────────────────────────────────────────────────────────

  private async post(
    url: string,
    body: string,
    signature: string,
    deliveryId: string,
  ): Promise<DeliveryResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
    const start = Date.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Delivery': deliveryId,
          'User-Agent': 'NestJS-Webhook/1.0',
        },
        body,
        signal: controller.signal,
      });

      const durationMs = Date.now() - start;
      const responseText = await response.text().catch(() => '');
      const responseBody = responseText.slice(0, MAX_RESPONSE_BODY);
      const success = response.status >= 200 && response.status < 300;

      return { success, statusCode: response.status, responseBody, durationMs };
    } catch (error: any) {
      const durationMs = Date.now() - start;
      const isTimeout = error.name === 'AbortError';
      return {
        success: false,
        durationMs,
        error: isTimeout ? `Timeout after ${DELIVERY_TIMEOUT_MS}ms` : error.message,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  // ── Worker events ─────────────────────────────────────────────────────────

  @OnWorkerEvent('failed')
  async onFailed(job: Job<WebhookDeliveryJobData>, error: Error) {
    const isFinal = job.attemptsMade >= (job.opts.attempts ?? MAX_FAILURES_BEFORE_SUSPEND);

    if (isFinal) {
      const { subscriptionId, event } = job.data;
      this.logger.error(
        `Subscription ${subscriptionId} exhausted retries for '${event}' — suspending`,
      );
      await this.subscriptions
        .suspendSubscription(
          subscriptionId,
          `Delivery of '${event}' failed after ${job.attemptsMade} attempts: ${error.message}`,
        )
        .catch((e) =>
          this.logger.error(`Failed to suspend subscription: ${e.message}`),
        );
    }
  }
}
