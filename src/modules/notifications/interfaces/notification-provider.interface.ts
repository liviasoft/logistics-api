import {
  NotificationChannel,
  NotificationProviderName,
  NotificationResult,
  SendNotificationParams,
} from '../notifications.types';

/**
 * INotificationProvider
 *
 * Every provider (Resend, SendGrid, Twilio) implements this interface.
 * NotificationsService depends only on this interface — swap providers by
 * changing NOTIFICATION_PROVIDER in your environment.
 *
 * Each provider declares which channels it supports via `supportedChannels`.
 * The service will throw if you try to send through an unsupported channel.
 */
export interface INotificationProvider {
  readonly name: NotificationProviderName;
  readonly supportedChannels: NotificationChannel[];

  /**
   * Send a notification through this provider.
   *
   * Resend/SendGrid: sends an email via their REST API
   * Twilio:          sends an SMS via the Twilio Messaging API
   */
  send(params: SendNotificationParams): Promise<NotificationResult>;
}
