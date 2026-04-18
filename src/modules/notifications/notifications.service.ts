import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../datasources/prisma/prisma.service';
import { INotificationProvider } from './interfaces/notification-provider.interface';
import { ResendProvider } from './providers/resend.provider';
import { SendGridProvider } from './providers/sendgrid.provider';
import { TwilioProvider } from './providers/twilio.provider';
import {
  NotificationProviderName,
  NotificationResult,
  SendNotificationParams,
} from './notifications.types';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name, { timestamp: true });
  private readonly provider: INotificationProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly resend: ResendProvider,
    private readonly sendgrid: SendGridProvider,
    private readonly twilio: TwilioProvider,
  ) {
    const name = this.config.get<NotificationProviderName>('NOTIFICATION_PROVIDER', 'resend');
    this.provider = this.resolveProvider(name);
    this.logger.log(`Active notification provider: ${this.provider.name} (channels: ${this.provider.supportedChannels.join(', ')})`);
  }

  // ── Provider ──────────────────────────────────────────────────────────────

  private resolveProvider(name: NotificationProviderName): INotificationProvider {
    switch (name) {
      case 'resend':    return this.resend;
      case 'sendgrid':  return this.sendgrid;
      case 'twilio':    return this.twilio;
      default:
        throw new BadRequestException(`Unknown notification provider: ${name}`);
    }
  }

  // ── Send ──────────────────────────────────────────────────────────────────

  async send(params: SendNotificationParams, userId?: string): Promise<NotificationResult> {
    if (!this.provider.supportedChannels.includes(params.channel)) {
      throw new BadRequestException(
        `Provider "${this.provider.name}" does not support channel "${params.channel}". ` +
        `Supported: ${this.provider.supportedChannels.join(', ')}`,
      );
    }

    // Create a pending record before sending so we have an ID even if the call fails
    const record = await this.prisma.notification.create({
      data: {
        userId,
        provider: this.provider.name,
        channel:  params.channel,
        to:       params.to,
        subject:  params.subject,
        status:   'pending',
        metadata: params.metadata ?? {},
      },
    });

    try {
      const result = await this.provider.send(params);

      await this.prisma.notification.update({
        where: { id: record.id },
        data: {
          status:            'sent',
          providerMessageId: result.providerMessageId,
        },
      });

      return { ...result, id: record.id };
    } catch (err: any) {
      await this.prisma.notification.update({
        where: { id: record.id },
        data: { status: 'failed', error: err?.message ?? String(err) },
      });
      throw err;
    }
  }

  // ── History ───────────────────────────────────────────────────────────────

  async listNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, items] = await this.prisma.$transaction([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);
    return { total, page, limit, items };
  }

  async getNotification(id: string) {
    const record = await this.prisma.notification.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Notification ${id} not found`);
    return record;
  }
}
