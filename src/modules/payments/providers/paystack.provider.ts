/**
 * Paystack Payment Provider
 *
 * No SDK needed — Paystack has a clean REST API.
 * Uses Node's built-in fetch (Node 18+).
 *
 * Required env vars:
 *   PAYSTACK_SECRET_KEY=sk_test_...
 *
 * Docs: https://paystack.com/docs/api
 *
 * Paystack payment flow:
 *   1. POST /transaction/initialize → returns authorization_url + reference
 *   2. Redirect user to authorization_url (or use Paystack Inline JS)
 *   3. User pays → Paystack redirects to your callback_url
 *   4. GET /transaction/verify/:reference → confirm payment status
 *   5. Optionally receive webhook for real-time notification
 *
 * Note on amounts:
 *   Paystack expects amounts in kobo (NGN), pesewa (GHS), cent (USD/ZAR), etc.
 *   Always pass the smallest unit — same convention as this template.
 */

import { Injectable, Logger, NotImplementedException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { IPaymentProvider } from '../interfaces/payment-provider.interface';
import {
  CapturePaymentParams,
  ConfirmPaymentParams,
  CreateCustomerParams,
  CreatePaymentParams,
  CustomerResult,
  NormalizedPaymentEvent,
  PaymentEventType,
  PaymentProviderName,
  PaymentResult,
  PaymentStatus,
  RefundParams,
  RefundResult,
} from '../payments.types';

const PAYSTACK_BASE = 'https://api.paystack.co';

@Injectable()
export class PaystackProvider implements IPaymentProvider {
  readonly name: PaymentProviderName = 'paystack';
  private readonly logger = new Logger(PaystackProvider.name, { timestamp: true });

  constructor(private readonly config: ConfigService) {}

  // ── Create ───────────────────────────────────────────────────────────────

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    // TODO:
    // const response = await this.request<PaystackInitResponse>('POST', '/transaction/initialize', {
    //   amount: params.amount,
    //   currency: params.currency.toUpperCase(),
    //   email: params.metadata?.email,      // required by Paystack
    //   metadata: params.metadata,
    //   callback_url: params.returnUrl,
    //   channels: ['card', 'bank', 'ussd', 'mobile_money'],
    // });
    //
    // return {
    //   id: '',
    //   providerPaymentId: response.data.reference,   // reference is Paystack's ID
    //   provider: this.name,
    //   status: 'pending',
    //   amount: params.amount,
    //   currency: params.currency,
    //   // Redirect user here to complete payment
    //   redirectUrl: response.data.authorization_url,
    //   raw: response,
    // };
    throw new NotImplementedException('Implement createPayment');
  }

  // ── Read / Verify ─────────────────────────────────────────────────────────

  async getPayment(reference: string): Promise<PaymentResult> {
    // Paystack uses the transaction reference, not a numeric ID.
    // Store the reference as providerPaymentId in your DB.
    //
    // TODO:
    // const response = await this.request<PaystackVerifyResponse>(
    //   'GET',
    //   `/transaction/verify/${encodeURIComponent(reference)}`,
    // );
    //
    // const tx = response.data;
    // return {
    //   id: '',
    //   providerPaymentId: tx.reference,
    //   provider: this.name,
    //   status: this.mapPaystackStatus(tx.status),
    //   amount: tx.amount,
    //   currency: tx.currency.toLowerCase(),
    //   metadata: tx.metadata,
    //   raw: tx,
    // };
    throw new NotImplementedException('Implement getPayment (verify)');
  }

  // ── Confirm ───────────────────────────────────────────────────────────────

  async confirmPayment(reference: string, _params?: ConfirmPaymentParams): Promise<PaymentResult> {
    // Paystack doesn't need a separate confirm step.
    // The redirect back to your callback_url IS the confirmation trigger.
    // Call getPayment (verify) to confirm status after redirect.
    return this.getPayment(reference);
  }

  // ── Capture ───────────────────────────────────────────────────────────────

  async capturePayment(
    _providerPaymentId: string,
    _params?: CapturePaymentParams,
  ): Promise<PaymentResult> {
    // Paystack doesn't have an authorize-then-capture flow for card payments.
    // Use partial debit for split charges: https://paystack.com/docs/payments/multi-split-payments
    throw new NotImplementedException(
      'Paystack does not support manual capture. Use automatic capture (createPayment).',
    );
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  async cancelPayment(_reference: string): Promise<PaymentResult> {
    // Paystack transactions cannot be cancelled once initialised.
    // Simply abandon the reference — it expires automatically.
    throw new NotImplementedException(
      'Paystack transactions cannot be cancelled. Abandon the reference instead.',
    );
  }

  // ── Refund ────────────────────────────────────────────────────────────────

  async refundPayment(reference: string, params: RefundParams): Promise<RefundResult> {
    // TODO:
    // const response = await this.request<PaystackRefundResponse>('POST', '/refund', {
    //   transaction: reference,
    //   amount: params.amount,          // partial refund — omit for full
    //   currency: 'NGN',                // or derive from stored payment
    //   customer_note: params.reason,
    //   merchant_note: params.reason,
    // });
    //
    // const refund = response.data;
    // return {
    //   id: '',
    //   providerRefundId: String(refund.id),
    //   provider: this.name,
    //   amount: refund.amount,
    //   currency: refund.currency.toLowerCase(),
    //   status: refund.status === 'processed' ? 'succeeded'
    //         : refund.status === 'failed'    ? 'failed'
    //         :                                'pending',
    //   raw: refund,
    // };
    throw new NotImplementedException('Implement refundPayment');
  }

  // ── Customer ──────────────────────────────────────────────────────────────

  async createCustomer(params: CreateCustomerParams): Promise<CustomerResult> {
    // TODO:
    // const response = await this.request<PaystackCustomerResponse>('POST', '/customer', {
    //   email: params.email,
    //   first_name: params.name?.split(' ')[0],
    //   last_name: params.name?.split(' ').slice(1).join(' '),
    //   phone: params.phone,
    //   metadata: params.metadata,
    // });
    //
    // const customer = response.data;
    // return {
    //   id: '',
    //   providerId: String(customer.id),
    //   provider: this.name,
    //   email: customer.email,
    //   raw: customer,
    // };
    throw new NotImplementedException('Implement createCustomer');
  }

  // ── Webhook ───────────────────────────────────────────────────────────────

  async constructWebhookEvent(
    rawBody: Buffer,
    signature: string,
  ): Promise<NormalizedPaymentEvent> {
    // Paystack signs with HMAC-SHA512 (not SHA256!).
    // Header: x-paystack-signature: <hex_digest>
    //
    // TODO:
    // const secret = this.config.getOrThrow('PAYSTACK_SECRET_KEY');
    // const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
    //
    // try {
    //   if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
    //     throw new Error('mismatch');
    //   }
    // } catch {
    //   throw new UnauthorizedException('Invalid Paystack webhook signature');
    // }
    //
    // const event = JSON.parse(rawBody.toString()) as PaystackWebhookEvent;
    // const tx = event.data;
    //
    // return {
    //   provider: this.name,
    //   eventId: tx.reference,
    //   type: this.mapPaystackEventType(event.event),
    //   providerPaymentId: tx.reference,
    //   status: this.mapPaystackStatus(tx.status),
    //   amount: tx.amount,
    //   currency: tx.currency?.toLowerCase(),
    //   raw: event,
    // };
    throw new NotImplementedException('Implement constructWebhookEvent');
  }

  // ── HTTP helper ───────────────────────────────────────────────────────────

  // TODO: uncomment and use in the methods above
  // private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
  //   const key = this.config.getOrThrow('PAYSTACK_SECRET_KEY');
  //   const response = await fetch(`${PAYSTACK_BASE}${path}`, {
  //     method,
  //     headers: {
  //       Authorization: `Bearer ${key}`,
  //       'Content-Type': 'application/json',
  //     },
  //     body: body ? JSON.stringify(body) : undefined,
  //   });
  //
  //   if (!response.ok) {
  //     const error = await response.json().catch(() => ({})) as any;
  //     throw new Error(`Paystack ${method} ${path} failed (${response.status}): ${error.message}`);
  //   }
  //
  //   return response.json() as Promise<T>;
  // }

  // ── Status maps ───────────────────────────────────────────────────────────

  private mapPaystackStatus(status: string): PaymentStatus {
    const map: Record<string, PaymentStatus> = {
      success:   'succeeded',
      failed:    'failed',
      abandoned: 'cancelled',
      pending:   'pending',
      processing:'processing',
      queued:    'processing',
      reversed:  'refunded',
    };
    return map[status] ?? 'pending';
  }

  private mapPaystackEventType(event: string): PaymentEventType {
    const map: Record<string, PaymentEventType> = {
      'charge.success':         'payment.succeeded',
      'charge.dispute.create':  'dispute.created',
      'charge.dispute.resolve': 'dispute.resolved',
      'refund.processed':       'refund.succeeded',
      'refund.failed':          'refund.failed',
    };
    return map[event] ?? 'unknown';
  }
}
