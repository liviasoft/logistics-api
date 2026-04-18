/**
 * Central registry of queue names.
 * Import the constant rather than using raw strings — avoids typos
 * and makes refactoring safe.
 */
export const QUEUE_NAMES = {
  /** Example queue — demonstrates the pattern; replace with real queues. */
  EXAMPLE: 'example',

  /** Inbound webhook processing — async handling after signature verification. */
  WEBHOOK_INBOUND: 'webhook-inbound',

  /** Outbound webhook delivery — HTTP POST to subscriber URLs with retries. */
  WEBHOOK_DELIVERY: 'webhook-delivery',

  // Add your queues here:
  // EMAIL:  'email',
  // MEDIA:  'media',
  // EXPORT: 'export',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
