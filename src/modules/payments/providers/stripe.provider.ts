/**
 * Stripe Payment Provider
 *
 * Install the SDK before using:
 *   npm install stripe
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY=sk_test_...
 *   STRIPE_WEBHOOK_SECRET=whsec_...   (already used by StripeSignatureGuard)
 *
 * Docs: https://stripe.com/docs/api
 */

import { Injectable, Logger, NotImplementedException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// TODO: uncomment after `npm install stripe`
// import Stripe from 'stripe';
import { IPaymentProvider } from '../interfaces/payment-provider.interface';
import {
  CapturePaymentParams,
  ConfirmPaymentParams,
  CreateCustomerParams,
  CreatePaymentParams,
  CustomerResult,
  NormalizedPaymentEvent,
  PaymentProviderName,
  PaymentResult,
  PaymentStatus,
  RefundParams,
  RefundResult,
} from '../payments.types';

@Injectable()
export class StripeProvider implements IPaymentProvider {
  readonly name: PaymentProviderName = 'stripe';
  private readonly logger = new Logger(StripeProvider.name, { timestamp: true });

  // TODO: private readonly stripe: Stripe;

  constructor(private readonly config: ConfigService) {
    // TODO: uncomment after installing stripe
    // this.stripe = new Stripe(config.getOrThrow('STRIPE_SECRET_KEY'), {
    //   apiVersion: '2024-06-20',
    // });
  }

  // ── Create ───────────────────────────────────────────────────────────────

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    // TODO:
    // const intent = await this.stripe.paymentIntents.create({
    //   amount: params.amount,
    //   currency: params.currency,
    //   customer: params.customerId,
    //   payment_method: params.paymentMethodId,
    //   capture_method: params.captureMethod === 'manual' ? 'manual' : 'automatic',
    //   description: params.description,
    //   metadata: params.metadata,
    //   // For automatic confirmation with saved payment method:
    //   confirm: !!params.paymentMethodId,
    //   return_url: params.returnUrl,
    // });
    //
    // return this.normalise(intent);
    throw new NotImplementedException('Install stripe SDK and implement createPayment');
  }

  // ── Read ─────────────────────────────────────────────────────────────────

  async getPayment(providerPaymentId: string): Promise<PaymentResult> {
    // TODO:
    // const intent = await this.stripe.paymentIntents.retrieve(providerPaymentId);
    // return this.normalise(intent);
    throw new NotImplementedException('Implement getPayment');
  }

  // ── Confirm ──────────────────────────────────────────────────────────────

  async confirmPayment(
    providerPaymentId: string,
    params?: ConfirmPaymentParams,
  ): Promise<PaymentResult> {
    // TODO:
    // const intent = await this.stripe.paymentIntents.confirm(providerPaymentId, {
    //   payment_method: params?.paymentMethodId,
    //   return_url: params?.returnUrl,
    // });
    // return this.normalise(intent);
    throw new NotImplementedException('Implement confirmPayment');
  }

  // ── Capture ──────────────────────────────────────────────────────────────

  async capturePayment(
    providerPaymentId: string,
    params?: CapturePaymentParams,
  ): Promise<PaymentResult> {
    // TODO:
    // const intent = await this.stripe.paymentIntents.capture(providerPaymentId, {
    //   amount_to_capture: params?.amountToCapture,
    // });
    // return this.normalise(intent);
    throw new NotImplementedException('Implement capturePayment');
  }

  // ── Cancel ───────────────────────────────────────────────────────────────

  async cancelPayment(providerPaymentId: string): Promise<PaymentResult> {
    // TODO:
    // const intent = await this.stripe.paymentIntents.cancel(providerPaymentId);
    // return this.normalise(intent);
    throw new NotImplementedException('Implement cancelPayment');
  }

  // ── Refund ───────────────────────────────────────────────────────────────

  async refundPayment(
    providerPaymentId: string,
    params: RefundParams,
  ): Promise<RefundResult> {
    // TODO:
    // const refund = await this.stripe.refunds.create({
    //   payment_intent: providerPaymentId,
    //   amount: params.amount,
    //   reason: params.reason as Stripe.RefundCreateParams.Reason,
    //   metadata: params.metadata,
    // });
    //
    // return {
    //   id: '',           // filled in by PaymentsService after DB write
    //   providerRefundId: refund.id,
    //   provider: this.name,
    //   amount: refund.amount,
    //   currency: refund.currency,
    //   status: refund.status === 'succeeded' ? 'succeeded'
    //         : refund.status === 'failed'    ? 'failed'
    //         :                                'pending',
    //   raw: refund,
    // };
    throw new NotImplementedException('Implement refundPayment');
  }

  // ── Customer ─────────────────────────────────────────────────────────────

  async createCustomer(params: CreateCustomerParams): Promise<CustomerResult> {
    // TODO:
    // const customer = await this.stripe.customers.create({
    //   email: params.email,
    //   name: params.name,
    //   phone: params.phone,
    //   metadata: params.metadata,
    // });
    //
    // return {
    //   id: '',            // filled in by PaymentsService after DB write
    //   providerId: customer.id,
    //   provider: this.name,
    //   email: customer.email!,
    //   raw: customer,
    // };
    throw new NotImplementedException('Implement createCustomer');
  }

  // ── Webhook ──────────────────────────────────────────────────────────────

  async constructWebhookEvent(
    rawBody: Buffer,
    signature: string,
  ): Promise<NormalizedPaymentEvent> {
    // TODO:
    // const secret = this.config.getOrThrow('STRIPE_WEBHOOK_SECRET');
    // let event: Stripe.Event;
    // try {
    //   event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    // } catch (err: any) {
    //   throw new UnauthorizedException(`Invalid Stripe signature: ${err.message}`);
    // }
    //
    // const obj = event.data.object as any;
    // return {
    //   provider: this.name,
    //   eventId: event.id,
    //   type: this.mapStripeEventType(event.type),
    //   providerPaymentId: obj.id ?? obj.payment_intent ?? '',
    //   status: this.mapStripeStatus(obj.status),
    //   amount: obj.amount,
    //   currency: obj.currency,
    //   raw: event,
    // };
    throw new NotImplementedException('Implement constructWebhookEvent');
  }

  // ── Normalisation helpers ─────────────────────────────────────────────────

  // TODO: uncomment after installing Stripe SDK
  // private normalise(intent: Stripe.PaymentIntent): PaymentResult {
  //   return {
  //     id: '',    // filled in by PaymentsService after writing to DB
  //     providerPaymentId: intent.id,
  //     provider: this.name,
  //     status: this.mapStripeStatus(intent.status),
  //     amount: intent.amount,
  //     currency: intent.currency,
  //     clientSecret: intent.client_secret ?? undefined,
  //     metadata: intent.metadata as Record<string, string>,
  //     raw: intent,
  //   };
  // }

  private mapStripeStatus(status: string): PaymentStatus {
    const map: Record<string, PaymentStatus> = {
      requires_payment_method: 'pending',
      requires_confirmation:   'pending',
      requires_action:         'requires_action',
      processing:              'processing',
      requires_capture:        'requires_capture',
      canceled:                'cancelled',
      succeeded:               'succeeded',
    };
    return map[status] ?? 'pending';
  }

  // private mapStripeEventType(type: string): import('../payments.types').PaymentEventType {
  //   const map: Record<string, import('../payments.types').PaymentEventType> = {
  //     'payment_intent.succeeded':               'payment.succeeded',
  //     'payment_intent.payment_failed':          'payment.failed',
  //     'payment_intent.requires_action':         'payment.requires_action',
  //     'payment_intent.canceled':                'payment.cancelled',
  //     'charge.refunded':                        'refund.succeeded',
  //     'charge.dispute.created':                 'dispute.created',
  //     'charge.dispute.closed':                  'dispute.resolved',
  //   };
  //   return map[type] ?? 'unknown';
  // }
}
