import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppEvents } from '../events/app-events';
import { PaymentSucceededEvent, PaymentRefundedEvent } from '../events/event-payloads';

/**
 * Reacts to payment lifecycle events.
 *
 * Extend this subscriber with real logic once you have the supporting
 * services in place (e.g. receipts, order fulfilment, accounting).
 */
@Injectable()
export class PaymentSubscriber {
  private readonly logger = new Logger(PaymentSubscriber.name, { timestamp: true });

  @OnEvent(AppEvents.PAYMENT_SUCCEEDED, { async: true })
  async handlePaymentSucceeded(payload: PaymentSucceededEvent) {
    this.logger.log(
      `[payment.succeeded] id=${payload.paymentId} amount=${payload.amount} ${payload.currency}`,
    );

    // Examples of what to do here:
    //   - Send a payment receipt email
    //   - Trigger order fulfilment workflow
    //   - Dispatch an outbound webhook to subscribers
    //   - Update accounting / revenue metrics

    // await this.notifications.send({ to: userEmail, channel: 'email', subject: 'Payment received', ... });
    // await this.dispatcher.dispatch('payment.succeeded', payload);
  }

  @OnEvent(AppEvents.PAYMENT_FAILED, { async: true })
  async handlePaymentFailed(payload: PaymentSucceededEvent) {
    this.logger.warn(
      `[payment.failed] id=${payload.paymentId} amount=${payload.amount} ${payload.currency}`,
    );

    // Examples:
    //   - Notify user of failed payment
    //   - Retry or prompt for a new payment method
  }

  @OnEvent(AppEvents.PAYMENT_REFUNDED, { async: true })
  async handlePaymentRefunded(payload: PaymentRefundedEvent) {
    this.logger.log(
      `[payment.refunded] paymentId=${payload.paymentId} refundId=${payload.refundId} amount=${payload.amount}`,
    );

    // Examples:
    //   - Send refund confirmation email
    //   - Reverse fulfilment / stock adjustments
  }
}
