// ─── Job data types ──────────────────────────────────────────────────────────
// Define the shape of each job's data payload here.
// Keeping them in one file makes it easy to find & maintain.

export interface ExampleJobData {
  message: string;
  userId?: string;
  timestamp?: number;
}

export interface InboundWebhookJobData {
  provider: string;
  eventId: string;
  eventType: string;
  payload: unknown;
  receivedAt: string;
}

export interface WebhookDeliveryJobData {
  /** DB id of the WebhookSubscription */
  subscriptionId: string;
  /** Domain event name, e.g. 'user.created' */
  event: string;
  /** Business payload to deliver */
  payload: Record<string, unknown>;
  /** Unique ID for this delivery envelope (for idempotency on receiver side) */
  deliveryId: string;
  /** Which attempt number this is (1-based, BullMQ also tracks internally) */
  attemptNumber: number;
}

// Add your job data types here:
// export interface EmailJobData { to: string; subject: string; template: string; context: Record<string, unknown>; }
// export interface MediaJobData  { fileKey: string; operations: string[]; }
