/**
 * Event Payload Interfaces
 *
 * One interface per AppEvent constant.
 * Import these in subscribers to get full type safety on the payload.
 */

// ── Auth / Users ──────────────────────────────────────────────────────────────

export interface UserRegisteredEvent {
  userId: string;
  email: string;
  name: string;
  timestamp: Date;
}

export interface UserLoggedInEvent {
  userId: string;
  email: string;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface UserPasswordChangedEvent {
  userId: string;
  timestamp: Date;
}

export interface UserDeactivatedEvent {
  userId: string;
  timestamp: Date;
}

// ── Payments ──────────────────────────────────────────────────────────────────

export interface PaymentCreatedEvent {
  paymentId: string;
  userId?: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  timestamp: Date;
}

export interface PaymentSucceededEvent {
  paymentId: string;
  userId?: string;
  provider: string;
  amount: number;
  currency: string;
  timestamp: Date;
}

export interface PaymentFailedEvent {
  paymentId: string;
  userId?: string;
  provider: string;
  amount: number;
  currency: string;
  timestamp: Date;
}

export interface PaymentCancelledEvent {
  paymentId: string;
  userId?: string;
  timestamp: Date;
}

export interface PaymentRefundedEvent {
  paymentId: string;
  refundId: string;
  userId?: string;
  amount: number;
  currency: string;
  timestamp: Date;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface NotificationSentEvent {
  notificationId: string;
  userId?: string;
  provider: string;
  channel: string;
  to: string;
  timestamp: Date;
}

export interface NotificationFailedEvent {
  notificationId: string;
  userId?: string;
  provider: string;
  channel: string;
  to: string;
  error: string;
  timestamp: Date;
}

// ── Storage ───────────────────────────────────────────────────────────────────

export interface FileUploadedEvent {
  fileId: string;
  userId?: string;
  provider: string;
  key: string;
  fileName: string;
  mimeType: string;
  size: number;
  timestamp: Date;
}

export interface FileDeletedEvent {
  fileId: string;
  userId?: string;
  key: string;
  timestamp: Date;
}

// ── Settings ──────────────────────────────────────────────────────────────────

export interface SettingUpdatedEvent {
  key: string;
  value: unknown;
  updatedBy?: string;
  timestamp: Date;
}

export interface SettingResetEvent {
  key: string;
  value: unknown;
  updatedBy?: string;
  timestamp: Date;
}

// ── Webhooks ──────────────────────────────────────────────────────────────────

export interface WebhookDeliveredEvent {
  subscriptionId: string;
  event: string;
  durationMs: number;
  timestamp: Date;
}

export interface WebhookFailedEvent {
  subscriptionId: string;
  event: string;
  error: string;
  attemptNumber: number;
  timestamp: Date;
}

export interface WebhookSuspendedEvent {
  subscriptionId: string;
  reason: string;
  timestamp: Date;
}
