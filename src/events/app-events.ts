/**
 * Application Event Catalog
 *
 * Central registry of every domain event name emitted via EventEmitter2.
 *
 * Usage:
 *   // Emit
 *   this.events.emit(AppEvents.USER_REGISTERED, payload satisfies UserRegisteredEvent);
 *
 *   // Subscribe
 *   @OnEvent(AppEvents.USER_REGISTERED)
 *   async handle(payload: UserRegisteredEvent) { ... }
 *
 * To add a new event:
 *   1. Add a constant here
 *   2. Add its payload interface in event-payloads.ts
 */

export const AppEvents = {
  // ── Auth / Users ────────────────────────────────────────────────────────
  USER_REGISTERED:       'user.registered',
  USER_LOGGED_IN:        'user.logged_in',
  USER_PASSWORD_CHANGED: 'user.password_changed',
  USER_DEACTIVATED:      'user.deactivated',

  // ── Payments ─────────────────────────────────────────────────────────────
  PAYMENT_CREATED:       'payment.created',
  PAYMENT_SUCCEEDED:     'payment.succeeded',
  PAYMENT_FAILED:        'payment.failed',
  PAYMENT_CANCELLED:     'payment.cancelled',
  PAYMENT_REFUNDED:      'payment.refunded',

  // ── Notifications ─────────────────────────────────────────────────────────
  NOTIFICATION_SENT:     'notification.sent',
  NOTIFICATION_FAILED:   'notification.failed',

  // ── Storage ───────────────────────────────────────────────────────────────
  FILE_UPLOADED:         'file.uploaded',
  FILE_DELETED:          'file.deleted',

  // ── Settings ──────────────────────────────────────────────────────────────
  SETTING_UPDATED:       'setting.updated',
  SETTING_RESET:         'setting.reset',

  // ── Webhooks ──────────────────────────────────────────────────────────────
  WEBHOOK_DELIVERED:     'webhook.delivered',
  WEBHOOK_FAILED:        'webhook.failed',
  WEBHOOK_SUSPENDED:     'webhook.suspended',

  // Add your domain events here:
  // ORDER_PLACED:       'order.placed',
  // ORDER_SHIPPED:      'order.shipped',
} as const;

export type AppEventName = typeof AppEvents[keyof typeof AppEvents];
