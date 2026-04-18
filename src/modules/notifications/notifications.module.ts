import { Module } from '@nestjs/common';
import { PrismaModule } from '../../datasources/prisma/prisma.module';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { ResendProvider } from './providers/resend.provider';
import { SendGridProvider } from './providers/sendgrid.provider';
import { TwilioProvider } from './providers/twilio.provider';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    // All providers registered; active one selected by NOTIFICATION_PROVIDER env var.
    // email providers: resend | sendgrid
    // sms providers:   twilio
    ResendProvider,
    SendGridProvider,
    TwilioProvider,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
