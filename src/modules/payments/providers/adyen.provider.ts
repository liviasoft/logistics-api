/**
 * Adyen Payment Provider
 *
 * Install the SDK before using:
 *   npm install @adyen/api-library
 *
 * Required env vars:
 *   ADYEN_API_KEY=AQE...
 *   ADYEN_MERCHANT_ACCOUNT=YourMerchantAccount
 *   ADYEN_ENVIRONMENT=TEST   # or LIVE
 *   ADYEN_HMAC_KEY=...        # from Adyen Customer Area → Webhooks
 *   ADYEN_CLIENT_KEY=...      # for frontend Drop-in / Components
 *
 * Docs:
 *   API:      https://docs.adyen.com/api-explorer
 *   Webhooks: https://docs.adyen.com/development-resources/webhooks/verify-hmac-signatures
 *
 * Adyen flow (Sessions API — recommended):
 *   1. Server: POST /v71/sessions → returns sessionId + sessionData
 *   2. Frontend: render Adyen Drop-in with sessionId + sessionData
 *   3. Adyen sends webhook → AUTHORISED → capture (if manual)
 *
 * Adyen flow (Payments API — lower level):
 *   1. POST /v68/payments → returns resultCode
 *   2. If resultCode = RedirectShopper → redirect to action.url
 *   3. After redirect → POST /v68/payments/details
 */

import { Injectable, Logger, NotImplementedException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
// TODO: uncomment after `npm install @adyen/api-library`
// import { Client, CheckoutAPI, hmacValidator } from '@adyen/api-library';
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

@Injectable()
export class AdyenProvider implements IPaymentProvider {
  readonly name: PaymentProviderName = 'adyen';
  private readonly logger = new Logger(AdyenProvider.name, { timestamp: true });

  // TODO: private checkout: CheckoutAPI;

  constructor(private readonly config: ConfigService) {
    // TODO:
    // const client = new Client({
    //   apiKey: config.getOrThrow('ADYEN_API_KEY'),
    //   environment: config.get('ADYEN_ENVIRONMENT', 'TEST') as 'TEST' | 'LIVE',
    // });
    // this.checkout = new CheckoutAPI(client);
  }

  // ── Create (Sessions API) ────────────────────────────────────────────────

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    // TODO (Sessions API — recommended for web/mobile):
    //
    // const session = await this.checkout.PaymentsApi.sessions({
    //   amount: { currency: params.currency.toUpperCase(), value: params.amount },
    //   merchantAccount: this.config.getOrThrow('ADYEN_MERCHANT_ACCOUNT'),
    //   reference: `order-${Date.now()}`,
    //   returnUrl: params.returnUrl ?? 'https://your-app.com/payment/result',
    //   shopperEmail: params.metadata?.email,
    //   shopperReference: params.customerId,
    //   metadata: params.metadata,
    // });
    //
    // return {
    //   id: '',
    //   providerPaymentId: session.id,    // sessionId — used as reference
    //   provider: this.name,
    //   status: 'pending',
    //   amount: params.amount,
    //   currency: params.currency,
    //   // Pass sessionId + sessionData to the Adyen Drop-in on your frontend
    //   raw: session,
    // };
    //
    // ─── Alternative: Payments API (server-side card) ───────────────────────
    //
    // const payment = await this.checkout.PaymentsApi.payments({
    //   amount: { currency: params.currency.toUpperCase(), value: params.amount },
    //   merchantAccount: this.config.getOrThrow('ADYEN_MERCHANT_ACCOUNT'),
    //   reference: `order-${Date.now()}`,
    //   paymentMethod: { storedPaymentMethodId: params.paymentMethodId },
    //   shopperReference: params.customerId,
    //   shopperInteraction: 'ContAuth',
    //   recurringProcessingModel: 'Subscription',
    //   returnUrl: params.returnUrl ?? '',
    // });
    //
    // return this.normalise(payment, params.amount, params.currency);
    throw new NotImplementedException('Install @adyen/api-library and implement createPayment');
  }

  // ── Read ─────────────────────────────────────────────────────────────────

  async getPayment(providerPaymentId: string): Promise<PaymentResult> {
    // TODO:
    // const details = await this.checkout.PaymentsApi.paymentDetails({
    //   paymentData: providerPaymentId,
    //   details: {},
    // });
    // return this.normalise(details, 0, '');
    throw new NotImplementedException('Implement getPayment');
  }

  // ── Confirm (Payments API only) ──────────────────────────────────────────

  async confirmPayment(
    providerPaymentId: string,
    params?: ConfirmPaymentParams,
  ): Promise<PaymentResult> {
    // TODO (after 3DS redirect — Payments API):
    // const details = await this.checkout.PaymentsApi.paymentsDetails({
    //   paymentData: providerPaymentId,
    //   details: { redirectResult: params?.returnUrl },
    // });
    // return this.normalise(details, 0, '');
    throw new NotImplementedException('Implement confirmPayment');
  }

  // ── Capture (Modification API) ───────────────────────────────────────────

  async capturePayment(
    providerPaymentId: string,
    params?: CapturePaymentParams,
  ): Promise<PaymentResult> {
    // TODO:
    // const response = await this.checkout.ModificationsApi.captureAuthorisedPayment(
    //   providerPaymentId,
    //   {
    //     merchantAccount: this.config.getOrThrow('ADYEN_MERCHANT_ACCOUNT'),
    //     amount: params?.amountToCapture
    //       ? { currency: 'USD', value: params.amountToCapture }
    //       : undefined,
    //   },
    // );
    // return { ...this.normalise(response as any, 0, ''), status: 'processing' };
    throw new NotImplementedException('Implement capturePayment');
  }

  // ── Cancel ───────────────────────────────────────────────────────────────

  async cancelPayment(providerPaymentId: string): Promise<PaymentResult> {
    // TODO:
    // await this.checkout.ModificationsApi.cancelAuthorisedPaymentByPspReference(
    //   providerPaymentId,
    //   { merchantAccount: this.config.getOrThrow('ADYEN_MERCHANT_ACCOUNT') },
    // );
    // return { ...this.normalise({} as any, 0, ''), status: 'cancelled', providerPaymentId };
    throw new NotImplementedException('Implement cancelPayment');
  }

  // ── Refund ───────────────────────────────────────────────────────────────

  async refundPayment(
    providerPaymentId: string,
    params: RefundParams,
  ): Promise<RefundResult> {
    // TODO:
    // const refund = await this.checkout.ModificationsApi.refundCapturedPayment(
    //   providerPaymentId,
    //   {
    //     merchantAccount: this.config.getOrThrow('ADYEN_MERCHANT_ACCOUNT'),
    //     amount: { currency: 'USD', value: params.amount ?? 0 },
    //     reference: `refund-${Date.now()}`,
    //   },
    // );
    //
    // return {
    //   id: '',
    //   providerRefundId: refund.pspReference,
    //   provider: this.name,
    //   amount: params.amount ?? 0,
    //   currency: '',
    //   status: 'pending',   // Adyen refunds are async — confirmed via webhook
    //   raw: refund,
    // };
    throw new NotImplementedException('Implement refundPayment');
  }

  // ── Webhook ──────────────────────────────────────────────────────────────

  async constructWebhookEvent(
    rawBody: Buffer,
    signature: string,
  ): Promise<NormalizedPaymentEvent> {
    // Adyen sends JSON notifications, not a raw signature header.
    // The signature is inside the notification item itself (hmacSignature field).
    //
    // TODO:
    // const notification = JSON.parse(rawBody.toString()) as AdyenNotification;
    // const item = notification.notificationItems[0].NotificationRequestItem;
    //
    // Verify HMAC:
    // const hmacKey = this.config.getOrThrow('ADYEN_HMAC_KEY');
    // const isValid = hmacValidator.validateHMAC(item, hmacKey);
    // if (!isValid) throw new UnauthorizedException('Invalid Adyen HMAC signature');
    //
    // return {
    //   provider: this.name,
    //   eventId: item.pspReference,
    //   type: this.mapAdyenEventCode(item.eventCode),
    //   providerPaymentId: item.pspReference,
    //   status: this.mapAdyenStatus(item.eventCode, item.success),
    //   amount: item.amount?.value,
    //   currency: item.amount?.currency,
    //   raw: item,
    // };
    throw new NotImplementedException('Implement constructWebhookEvent');
  }

  // ── Customer (use shopperReference instead) ───────────────────────────────

  async createCustomer(_params: CreateCustomerParams): Promise<CustomerResult> {
    // Adyen doesn't have explicit customer objects.
    // Pass shopperReference + shopperEmail in payment requests instead.
    // Store the mapping in your own DB (userId → shopperReference).
    throw new NotImplementedException(
      'Adyen uses shopperReference. Pass customerId as shopperReference in createPayment.',
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  // private normalise(response: any, amount: number, currency: string): PaymentResult {
  //   return {
  //     id: '',
  //     providerPaymentId: response.pspReference ?? response.id ?? '',
  //     provider: this.name,
  //     status: this.mapAdyenStatus(response.resultCode, 'true'),
  //     amount,
  //     currency,
  //     redirectUrl: response.action?.url,
  //     raw: response,
  //   };
  // }

  private mapAdyenStatus(eventCode: string, success: string): PaymentStatus {
    if (success !== 'true') return 'failed';
    const map: Record<string, PaymentStatus> = {
      AUTHORISATION:    'requires_capture',
      CAPTURE:          'succeeded',
      CANCELLATION:     'cancelled',
      REFUND:           'refunded',
      PENDING:          'processing',
      RedirectShopper:  'requires_action',
      IdentifyShopper:  'requires_action',
      ChallengeShopper: 'requires_action',
      Authorised:       'requires_capture',
      Refused:          'failed',
      Error:            'failed',
    };
    return map[eventCode] ?? 'pending';
  }

  private mapAdyenEventCode(eventCode: string): PaymentEventType {
    const map: Record<string, PaymentEventType> = {
      AUTHORISATION:   'payment.succeeded',
      CAPTURE:         'payment.succeeded',
      CANCELLATION:    'payment.cancelled',
      REFUND:          'refund.succeeded',
      REFUND_FAILED:   'refund.failed',
      CHARGEBACK:      'dispute.created',
    };
    return map[eventCode] ?? 'unknown';
  }
}
