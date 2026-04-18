/**
 * SendGrid Notification Provider (email)
 *
 * Install the SDK before using:
 *   npm install @sendgrid/mail
 *
 * Required env vars:
 *   SENDGRID_API_KEY=SG....
 *   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
 *   SENDGRID_FROM_NAME=YourApp          (optional)
 *
 * Docs: https://docs.sendgrid.com/api-reference/mail-send
 */

import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// TODO: uncomment after `npm install @sendgrid/mail`
// import sgMail from '@sendgrid/mail';
import { INotificationProvider } from '../interfaces/notification-provider.interface';
import {
  NotificationChannel,
  NotificationProviderName,
  NotificationResult,
  SendNotificationParams,
} from '../notifications.types';

@Injectable()
export class SendGridProvider implements INotificationProvider {
  readonly name: NotificationProviderName = 'sendgrid';
  readonly supportedChannels: NotificationChannel[] = ['email'];
  private readonly logger = new Logger(SendGridProvider.name, { timestamp: true });

  constructor(private readonly config: ConfigService) {
    // TODO: uncomment after installing @sendgrid/mail
    // sgMail.setApiKey(config.getOrThrow('SENDGRID_API_KEY'));
  }

  async send(params: SendNotificationParams): Promise<NotificationResult> {
    // TODO:
    // const fromEmail = params.from ?? this.config.getOrThrow('SENDGRID_FROM_EMAIL');
    // const fromName  = this.config.get('SENDGRID_FROM_NAME');
    //
    // const msg: sgMail.MailDataRequired = {
    //   to: params.to,
    //   from: fromName ? { email: fromEmail, name: fromName } : fromEmail,
    //   subject: params.subject ?? '(no subject)',
    //   text: params.body,
    //   html: params.html,
    //   // Dynamic template (SendGrid Templates):
    //   // templateId: params.templateId,
    //   // dynamicTemplateData: params.templateData,
    // };
    //
    // const [response] = await sgMail.send(msg);
    //
    // return {
    //   id: '',
    //   provider: this.name,
    //   channel: 'email',
    //   to: params.to,
    //   status: response.statusCode < 300 ? 'sent' : 'failed',
    //   providerMessageId: response.headers['x-message-id'] as string | undefined,
    //   raw: response,
    // };
    throw new NotImplementedException('Install @sendgrid/mail and implement send()');
  }
}
