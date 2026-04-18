import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { HmacSignatureGuard } from './hmac-signature.guard';

const TOLERANCE_SECONDS = 300; // reject events older than 5 minutes

/**
 * Verifies Stripe webhook signatures.
 *
 * Stripe signs with:  HMAC-SHA256(secret, "${timestamp}.${rawBody}")
 * Header format:      stripe-signature: t=<unix>,v1=<hex>[,v0=<hex>]
 *
 * Set STRIPE_WEBHOOK_SECRET in your environment.
 * Get the value from: Stripe Dashboard → Webhooks → your endpoint → Signing secret.
 */
@Injectable()
export class StripeSignatureGuard extends HmacSignatureGuard {
  constructor(private readonly config: ConfigService) {
    super();
  }

  protected getSecret(): string {
    return this.config.get<string>('STRIPE_WEBHOOK_SECRET', '');
  }

  protected getSignatureHeader(): string {
    return 'stripe-signature';
  }

  protected verify(rawBody: Buffer, header: string, secret: string): boolean {
    // Parse: t=1234567890,v1=abc123,v0=...
    const parts = header.split(',').reduce<Record<string, string[]>>((acc, part) => {
      const [key, value] = part.trim().split('=');
      if (!acc[key]) acc[key] = [];
      acc[key].push(value);
      return acc;
    }, {});

    const timestamp = parts['t']?.[0];
    const signatures = parts['v1'] ?? [];

    if (!timestamp || signatures.length === 0) return false;

    // Replay-attack protection
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts) || Date.now() / 1000 - ts > TOLERANCE_SECONDS) {
      throw new UnauthorizedException(
        `Webhook timestamp too old (>${TOLERANCE_SECONDS}s). Check your server clock.`,
      );
    }

    // Stripe's signed payload is: "<timestamp>.<rawBody>"
    const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
    const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');

    return signatures.some((sig) => {
      try {
        return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
      } catch {
        return false;
      }
    });
  }
}
