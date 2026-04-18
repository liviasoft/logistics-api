// ─── Outbound delivery envelope ──────────────────────────────────────────────
// This is exactly what subscribers receive as the HTTP request body.

export interface WebhookEnvelope {
  /** Unique ID for this delivery — use for idempotency on receiver side */
  id: string;
  /** Event name, e.g. 'user.created' */
  event: string;
  /** ISO timestamp of when the event was dispatched */
  timestamp: string;
  /** Your API version — increment when payload shape changes */
  apiVersion: string;
  /** Business data for this event */
  data: Record<string, unknown>;
}

// ─── Inbound event context ────────────────────────────────────────────────────

export interface InboundWebhookContext {
  provider: string;
  eventId: string;
  eventType: string;
  rawBody: Buffer;
  payload: unknown;
}

// ─── Delivery result ──────────────────────────────────────────────────────────

export interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  durationMs: number;
  error?: string;
}
