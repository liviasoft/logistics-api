import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';

/**
 * Base class for HMAC-based webhook signature guards.
 *
 * Subclass this and implement getSecret() + getSignatureHeader() for each
 * provider you support (see StripeSignatureGuard for a concrete example).
 *
 * Requires rawBody: true in NestFactory.create() so req.rawBody is available.
 */
@Injectable()
export abstract class HmacSignatureGuard implements CanActivate {
  protected readonly logger = new Logger(this.constructor.name, { timestamp: true });

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { rawBody?: Buffer }>();
    const rawBody = request.rawBody;

    if (!rawBody || rawBody.length === 0) {
      throw new UnauthorizedException('Missing raw request body');
    }

    const signature = request.headers[this.getSignatureHeader().toLowerCase()] as string;
    if (!signature) {
      throw new UnauthorizedException(`Missing ${this.getSignatureHeader()} header`);
    }

    const secret = await this.getSecret(request);
    if (!secret) {
      this.logger.error('Webhook secret not configured');
      throw new UnauthorizedException('Webhook secret not configured');
    }

    const isValid = this.verify(rawBody, signature, secret);
    if (!isValid) {
      this.logger.warn(`Invalid webhook signature from ${request.ip}`);
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }

  /**
   * Return the secret used to verify this request.
   * Can be async — e.g., look up per-tenant secret from DB.
   */
  protected abstract getSecret(request: Request): Promise<string> | string;

  /**
   * Return the header name that carries the signature, e.g. 'x-hub-signature-256'.
   * Will be lowercased before lookup.
   */
  protected abstract getSignatureHeader(): string;

  /**
   * Perform the actual HMAC comparison.
   * Override for providers with non-standard formats (see StripeSignatureGuard).
   */
  protected verify(rawBody: Buffer, signature: string, secret: string): boolean {
    // Expect: 'sha256=<hex>'  or just '<hex>'
    const hex = signature.startsWith('sha256=') ? signature.slice(7) : signature;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

    try {
      return timingSafeEqual(Buffer.from(hex, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      return false;
    }
  }
}
