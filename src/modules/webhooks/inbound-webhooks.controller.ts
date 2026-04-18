import {
  Controller,
  Post,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation /* ApiExcludeEndpoint */,
} from '@nestjs/swagger';
import { QUEUE_NAMES } from '../../common/queues/queues.constants';
import { InboundWebhookJobData } from '../../common/queues/queues.types';
import { StripeSignatureGuard } from './guards/stripe-signature.guard';
import { HmacSignatureGuard } from './guards/hmac-signature.guard';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

// ── Generic guard for custom senders ─────────────────────────────────────────

/**
 * Generic HMAC-SHA256 guard using WEBHOOK_SECRET env var.
 * Use this as a template for providers that don't have a bespoke guard.
 * Expected header: X-Webhook-Signature: sha256=<hex>
 */
@Injectable()
class GenericHmacGuard extends HmacSignatureGuard {
  constructor(private readonly config: ConfigService) {
    super();
  }
  protected getSecret() {
    return this.config.get<string>('WEBHOOK_SECRET', '');
  }
  protected getSignatureHeader() {
    return 'x-webhook-signature';
  }
}

// ── Controller ────────────────────────────────────────────────────────────────

@ApiTags('Webhooks — Inbound')
@Controller({ path: 'webhooks/inbound', version: '1' })
export class InboundWebhooksController {
  private readonly logger = new Logger(InboundWebhooksController.name, {
    timestamp: true,
  });

  constructor(
    @InjectQueue(QUEUE_NAMES.WEBHOOK_INBOUND)
    private readonly inboundQueue: Queue,
  ) {}

  /**
   * Stripe webhook endpoint.
   *
   * Register this URL in your Stripe dashboard:
   *   https://dashboard.stripe.com/webhooks → Add endpoint
   *   URL: https://your-api.com/api/v1/webhooks/inbound/stripe
   *
   * Set STRIPE_WEBHOOK_SECRET to the signing secret Stripe provides.
   */
  @Post('stripe')
  @UseGuards(StripeSignatureGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Stripe webhook events' })
  async stripeWebhook(@Req() req: Request & { rawBody?: Buffer }) {
    const body = req.body as Record<string, unknown>;
    const eventId = body.id as string;
    const eventType = body.type as string;

    this.logger.log(`Stripe webhook received: ${eventType} (${eventId})`);

    await this.enqueue('stripe', eventId, eventType, body, req.rawBody);
    return { received: true };
  }

  /**
   * Generic HMAC-SHA256 webhook endpoint.
   * Use as a template for any provider that signs with HMAC-SHA256.
   *
   * Expected headers:
   *   X-Webhook-Signature: sha256=<hex>
   *   X-Webhook-Event-Id: <unique-event-id>
   *   X-Webhook-Event-Type: <event-type>
   *
   * Set WEBHOOK_SECRET in your environment.
   */
  @Post('generic')
  @UseGuards(GenericHmacGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive generic HMAC-signed webhook events' })
  async genericWebhook(@Req() req: Request & { rawBody?: Buffer }) {
    const body = req.body as Record<string, unknown>;
    const eventId =
      (req.headers['x-webhook-event-id'] as string) ??
      `generic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const eventType =
      (req.headers['x-webhook-event-type'] as string) ?? 'unknown';

    this.logger.log(`Generic webhook received: ${eventType} (${eventId})`);

    await this.enqueue('generic', eventId, eventType, body, req.rawBody);
    return { received: true };
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private async enqueue(
    provider: string,
    eventId: string,
    eventType: string,
    payload: unknown,
    rawBody?: Buffer,
  ) {
    const data: InboundWebhookJobData = {
      provider,
      eventId,
      eventType,
      payload,
      receivedAt: new Date().toISOString(),
    };
    console.log(rawBody);
    // Use the provider+eventId as BullMQ jobId for deduplication:
    // if the provider retries before our worker processes it, we won't double-process.
    await this.inboundQueue.add(`${provider}:${eventType}`, data, {
      jobId: `${provider}:${eventId}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 500,
      removeOnFail: 200,
    });
  }
}
