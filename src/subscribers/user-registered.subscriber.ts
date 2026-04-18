import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppEvents } from '../events/app-events';
import { UserRegisteredEvent } from '../events/event-payloads';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { SettingsService } from '../modules/settings/settings.service';

/**
 * Reacts to user.registered events.
 *
 * Responsibilities:
 *   - Send a welcome email if the setting is enabled
 *
 * Add more @OnEvent() methods to handle additional user events here,
 * or split into separate subscriber files for each concern.
 */
@Injectable()
export class UserRegisteredSubscriber {
  private readonly logger = new Logger(UserRegisteredSubscriber.name, { timestamp: true });

  constructor(
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
  ) {}

  @OnEvent(AppEvents.USER_REGISTERED, { async: true })
  async handleUserRegistered(payload: UserRegisteredEvent) {
    this.logger.log(`[user.registered] userId=${payload.userId} email=${payload.email}`);

    const shouldSend = this.settings.get('notifications.sendWelcomeEmail');
    if (!shouldSend) return;

    const fromName = this.settings.get('notifications.defaultFromName');

    try {
      await this.notifications.send(
        {
          to:      payload.email,
          channel: 'email',
          subject: `Welcome to ${fromName}!`,
          body:    `Hi ${payload.name}, thanks for joining ${fromName}.`,
          html:    `<h1>Welcome, ${payload.name}!</h1><p>Thanks for joining <strong>${fromName}</strong>.</p>`,
        },
        payload.userId,
      );
    } catch (err: any) {
      // Log and swallow — a failing welcome email must not break registration
      this.logger.error(`Failed to send welcome email to ${payload.email}: ${err?.message}`);
    }
  }
}
