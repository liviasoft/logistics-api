/**
 * Hook Catalog
 *
 * Central registry of every named hook point and its payload type.
 * - before* hooks use callWaterfall() — handlers can transform the input params
 * - after*  hooks use call()          — handlers receive the result for side-effects
 *
 * To add a hook:
 *   1. Add a constant to AppHooks
 *   2. Add the payload type to HookPayloadMap
 *   3. Call it in your service: await this.hooks.callWaterfall(AppHooks.BEFORE_X, params)
 */

import { CreatePaymentParams } from '../../modules/payments/payments.types';

export const AppHooks = {
  // ── Payments ──────────────────────────────────────────────────────────────
  /** Runs before the provider call — waterfall, handlers can modify params */
  BEFORE_PAYMENT_CREATE: 'payment.beforeCreate',
  /** Runs after a payment record is saved — fire-and-forget side effects */
  AFTER_PAYMENT_CREATE:  'payment.afterCreate',
  AFTER_PAYMENT_SUCCEED: 'payment.afterSucceed',
  AFTER_PAYMENT_REFUND:  'payment.afterRefund',

  // ── Users ─────────────────────────────────────────────────────────────────
  /** Runs before user is created — waterfall, handlers can modify params */
  BEFORE_USER_CREATE:    'user.beforeCreate',
  /** Runs after user record is saved */
  AFTER_USER_CREATE:     'user.afterCreate',

  // ── Notifications ──────────────────────────────────────────────────────────
  BEFORE_NOTIFICATION_SEND: 'notification.beforeSend',
  AFTER_NOTIFICATION_SEND:  'notification.afterSend',

  // Add your hook points here:
  // BEFORE_ORDER_CREATE: 'order.beforeCreate',
  // AFTER_ORDER_CREATE:  'order.afterCreate',
} as const;

export type AppHookName = typeof AppHooks[keyof typeof AppHooks];

// ── Payload map — hook name → payload type ────────────────────────────────────

export interface HookPayloadMap {
  // Payments
  'payment.beforeCreate': CreatePaymentParams;
  'payment.afterCreate':  { id: string; providerPaymentId: string; amount: number; currency: string; status: string; userId?: string };
  'payment.afterSucceed': { id: string; amount: number; currency: string; userId?: string };
  'payment.afterRefund':  { paymentId: string; refundId: string; amount: number };

  // Users
  'user.beforeCreate':    { email: string; name: string; password: string };
  'user.afterCreate':     { id: string; email: string; name: string };

  // Notifications
  'notification.beforeSend': { to: string; channel: string; subject?: string; body: string };
  'notification.afterSend':  { id: string; provider: string; channel: string; to: string };
}
