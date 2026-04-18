// =============================================================================
// Normalised notification types — shared across all providers
// =============================================================================

export type NotificationProviderName = 'resend' | 'sendgrid' | 'twilio';

export type NotificationChannel = 'email' | 'sms';

export type NotificationStatus = 'pending' | 'sent' | 'failed';

// ─── Input params ─────────────────────────────────────────────────────────────

export interface SendNotificationParams {
  /** Recipient: email address for email channel, E.164 phone number for sms */
  to: string;
  channel: NotificationChannel;
  /** Email subject — required for email channel */
  subject?: string;
  /** Plain-text body (used for SMS or email fallback) */
  body: string;
  /** HTML body for email — overrides body when present */
  html?: string;
  /** Provider-specific template ID */
  templateId?: string;
  /** Data merged into the template */
  templateData?: Record<string, unknown>;
  /** Override the default sender address/number */
  from?: string;
  metadata?: Record<string, string>;
}

// ─── Result ───────────────────────────────────────────────────────────────────

export interface NotificationResult {
  /** Your internal notification ID (cuid from Postgres) */
  id: string;
  provider: NotificationProviderName;
  channel: NotificationChannel;
  to: string;
  status: NotificationStatus;
  /** Provider's own message/email ID for tracking */
  providerMessageId?: string;
  raw: unknown;
}
