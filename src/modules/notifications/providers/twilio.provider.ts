/**
 * Twilio Notification Provider (SMS)
 *
 * Install the SDK before using:
 *   npm install twilio
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID=AC...
 *   TWILIO_AUTH_TOKEN=...
 *   TWILIO_FROM_NUMBER=+1234567890   (your Twilio number or Messaging Service SID)
 *
 * Docs: https://www.twilio.com/docs/sms/api
 *
 * Note on phone numbers:
 *   All numbers must be in E.164 format: +<country><number> e.g. +2348012345678
 */

import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// TODO: uncomment after `npm install twilio`
// import twilio from 'twilio';
import { INotificationProvider } from '../interfaces/notification-provider.interface';
import {
  NotificationChannel,
  NotificationProviderName,
  NotificationResult,
  SendNotificationParams,
} from '../notifications.types';

@Injectable()
export class TwilioProvider implements INotificationProvider {
  readonly name: NotificationProviderName = 'twilio';
  readonly supportedChannels: NotificationChannel[] = ['sms'];
  private readonly logger = new Logger(TwilioProvider.name, { timestamp: true });

  // TODO: private readonly client: ReturnType<typeof twilio>;

  constructor(private readonly config: ConfigService) {
    // TODO: uncomment after installing twilio
    // this.client = twilio(
    //   config.getOrThrow('TWILIO_ACCOUNT_SID'),
    //   config.getOrThrow('TWILIO_AUTH_TOKEN'),
    // );
  }

  async send(params: SendNotificationParams): Promise<NotificationResult> {
    // TODO:
    // const from = params.from ?? this.config.getOrThrow('TWILIO_FROM_NUMBER');
    //
    // const message = await this.client.messages.create({
    //   to:   params.to,
    //   from,
    //   body: params.body,
    //   // Messaging Service SID (alternative to from number):
    //   // messagingServiceSid: this.config.get('TWILIO_MESSAGING_SERVICE_SID'),
    // });
    //
    // return {
    //   id: '',
    //   provider: this.name,
    //   channel: 'sms',
    //   to: params.to,
    //   status: message.errorCode ? 'failed' : 'sent',
    //   providerMessageId: message.sid,
    //   raw: message,
    // };
    throw new NotImplementedException('Install twilio and implement send()');
  }
}
