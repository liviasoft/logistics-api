import {
  CapturePaymentParams,
  ConfirmPaymentParams,
  CreateCustomerParams,
  CreatePaymentParams,
  CustomerResult,
  NormalizedPaymentEvent,
  PaymentProviderName,
  PaymentResult,
  RefundParams,
  RefundResult,
} from '../payments.types';

/**
 * IPaymentProvider
 *
 * Every provider (Stripe, Adyen, Paystack) implements this interface.
 * PaymentsService depends only on this interface — swap providers by
 * changing PAYMENT_PROVIDER in your environment.
 *
 * Implement only the methods relevant to your provider.
 * Mark unsupported operations with a clear UnsupportedOperationException.
 */
export interface IPaymentProvider {
  readonly name: PaymentProviderName;

  // ── Core payment flow ─────────────────────────────────────────────────

  /**
   * Initiate a payment.
   *
   * Stripe:   creates a PaymentIntent → returns clientSecret for frontend SDK
   * Adyen:    creates a Sessions object → returns redirectUrl
   * Paystack: initialises a transaction → returns redirectUrl (authorization_url)
   */
  createPayment(params: CreatePaymentParams): Promise<PaymentResult>;

  /**
   * Retrieve the current state of a payment.
   *
   * Stripe:   paymentIntents.retrieve(id)
   * Adyen:    payment details / status endpoint
   * Paystack: transaction verify endpoint
   */
  getPayment(providerPaymentId: string): Promise<PaymentResult>;

  /**
   * Confirm a payment that requires action (e.g., after 3DS).
   * Not all providers use this step (Paystack handles server-side).
   *
   * Stripe:   paymentIntents.confirm(id)
   * Adyen:    /payments/details
   */
  confirmPayment(
    providerPaymentId: string,
    params?: ConfirmPaymentParams,
  ): Promise<PaymentResult>;

  /**
   * Capture an authorised payment (manual capture flow only).
   *
   * Stripe:   paymentIntents.capture(id)
   * Adyen:    /payments/{pspReference}/captures
   * Paystack: not applicable — use partial debit instead
   */
  capturePayment(
    providerPaymentId: string,
    params?: CapturePaymentParams,
  ): Promise<PaymentResult>;

  /**
   * Cancel / void a payment before capture.
   *
   * Stripe:   paymentIntents.cancel(id)
   * Adyen:    /payments/{pspReference}/cancels
   * Paystack: not directly supported after init — abandon the transaction
   */
  cancelPayment(providerPaymentId: string): Promise<PaymentResult>;

  /**
   * Refund a completed payment (full or partial).
   *
   * Stripe:   refunds.create({ payment_intent: id, amount })
   * Adyen:    /payments/{pspReference}/refunds
   * Paystack: /refund
   */
  refundPayment(
    providerPaymentId: string,
    params: RefundParams,
  ): Promise<RefundResult>;

  // ── Customer management (optional) ───────────────────────────────────

  /**
   * Create a customer record on the provider for saved payment methods.
   * Implement only if you need recurring billing or saved cards.
   *
   * Stripe:   customers.create(...)
   * Adyen:    use shopperReference in payment requests (no explicit create)
   * Paystack: customers.create(...)
   */
  createCustomer?(params: CreateCustomerParams): Promise<CustomerResult>;

  // ── Webhook handling ──────────────────────────────────────────────────

  /**
   * Verify the webhook signature and normalise the event.
   *
   * Called from InboundWebhookProcessor (or directly from a dedicated route).
   * Throw UnauthorizedException if signature is invalid.
   *
   * Stripe:   stripe.webhooks.constructEvent(rawBody, sig, secret)
   * Adyen:    HMAC validation of notification items
   * Paystack: HMAC-SHA512(secret, rawBody)
   */
  constructWebhookEvent(
    rawBody: Buffer,
    signature: string,
  ): Promise<NormalizedPaymentEvent>;
}
