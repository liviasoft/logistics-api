/**
 * Resend Notification Provider (email)
 *
 * Install the SDK before using:
 *   npm install resend
 *
 * Required env vars:
 *   RESEND_API_KEY=re_...
 *   RESEND_FROM_EMAIL=noreply@yourdomain.com
 *
 * Docs: https://resend.com/docs/api-reference/emails
 */

import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// TODO: uncomment after `npm install resend`
// import { Resend } from 'resend';
import { INotificationProvider } from '../interfaces/notification-provider.interface';
import {
  NotificationChannel,
  NotificationProviderName,
  NotificationResult,
  SendNotificationParams,
} from '../notifications.types';

@Injectable()
export class ResendProvider implements INotificationProvider {
  readonly name: NotificationProviderName = 'resend';
  readonly supportedChannels: NotificationChannel[] = ['email'];
  private readonly logger = new Logger(ResendProvider.name, { timestamp: true });

  // TODO: private readonly client: Resend;

  constructor(private readonly config: ConfigService) {
    // TODO: uncomment after installing resend
    // this.client = new Resend(config.getOrThrow('RESEND_API_KEY'));
  }

  async send(params: SendNotificationParams): Promise<NotificationResult> {
    // TODO:
    // const from = params.from ?? this.config.getOrThrow('RESEND_FROM_EMAIL');
    //
    // const { data, error } = await this.client.emails.send({
    //   from,
    //   to: params.to,
    //   subject: params.subject ?? '(no subject)',
    //   text: params.body,
    //   html: params.html,
    //   // Template-based sending (Resend Audiences):
    //   // react: EmailTemplate({ ...params.templateData }),
    // });
    //
    // if (error) throw new Error(`Resend error: ${error.message}`);
    //
    // return {
    //   id: '',
    //   provider: this.name,
    //   channel: 'email',
    //   to: params.to,
    //   status: 'sent',
    //   providerMessageId: data?.id,
    //   raw: data,
    // };
    throw new NotImplementedException('Install resend and implement send()');
  }
}
