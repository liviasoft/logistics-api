// =============================================================================
// Normalised payment types — shared across all providers
// =============================================================================

/** Supported payment providers */
export type PaymentProviderName = 'stripe' | 'adyen' | 'paystack';

/**
 * Normalised payment status.
 *
 * Every provider uses different terminology — this enum unifies them:
 *   Stripe:   requires_action → requires_action
 *   Adyen:    Authorised      → requires_capture (if manual) or succeeded
 *   Paystack: success         → succeeded
 */
export type PaymentStatus =
  | 'pending'           // created, not yet processed
  | 'requires_action'   // 3DS challenge, redirect flow, etc.
  | 'requires_capture'  // authorised but not captured (manual capture)
  | 'processing'        // provider is processing
  | 'succeeded'         // payment complete
  | 'failed'            // terminal failure
  | 'cancelled'         // voided / cancelled before capture
  | 'refunded'          // fully refunded
  | 'partially_refunded';

// ─── Input params ─────────────────────────────────────────────────────────────

export interface CreatePaymentParams {
  /** Amount in smallest currency unit (cents, pence, kobo, etc.) */
  amount: number;
  /** ISO 4217: 'usd', 'gbp', 'ngn', etc. */
  currency: string;
  /** Provider customer ID (if you have one) */
  customerId?: string;
  /** Provider payment method / token ID */
  paymentMethodId?: string;
  /** 'automatic' = charge immediately; 'manual' = authorise then capture separately */
  captureMethod?: 'automatic' | 'manual';
  description?: string;
  /** URL to redirect to after 3DS / Paystack checkout */
  returnUrl?: string;
  /** Free-form key/value stored alongside the payment */
  metadata?: Record<string, string>;
}

export interface ConfirmPaymentParams {
  paymentMethodId?: string;
  returnUrl?: string;
}

export interface CapturePaymentParams {
  /** Partial capture amount (smallest unit). Defaults to full amount if omitted. */
  amountToCapture?: number;
}

export interface RefundParams {
  /** Amount to refund in smallest unit. Defaults to full payment amount. */
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer' | string;
  metadata?: Record<string, string>;
}

export interface CreateCustomerParams {
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}

// ─── Result types ─────────────────────────────────────────────────────────────

export interface PaymentResult {
  /** Your internal payment ID (cuid from Postgres) */
  id: string;
  /** Provider's own ID */
  providerPaymentId: string;
  provider: PaymentProviderName;
  status: PaymentStatus;
  amount: number;
  currency: string;
  /** Stripe only: pass to frontend SDK to complete payment */
  clientSecret?: string;
  /** Paystack / Adyen redirect flows: redirect user here */
  redirectUrl?: string;
  metadata?: Record<string, string>;
  /** Full raw provider response — useful for debugging */
  raw: unknown;
}

export interface RefundResult {
  id: string;
  providerRefundId: string;
  provider: PaymentProviderName;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed';
  raw: unknown;
}

export interface CustomerResult {
  id: string;           // your internal ID
  providerId: string;   // provider's customer ID
  provider: PaymentProviderName;
  email: string;
  raw: unknown;
}

// ─── Normalised webhook event ─────────────────────────────────────────────────

export interface NormalizedPaymentEvent {
  provider: PaymentProviderName;
  /** Provider's event/notification ID */
  eventId: string;
  /** Normalised event type */
  type: PaymentEventType;
  providerPaymentId: string;
  status: PaymentStatus;
  amount?: number;
  currency?: string;
  /** Full raw provider event */
  raw: unknown;
}

export type PaymentEventType =
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.requires_action'
  | 'payment.cancelled'
  | 'refund.succeeded'
  | 'refund.failed'
  | 'dispute.created'
  | 'dispute.resolved'
  | 'unknown';
