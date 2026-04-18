import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../datasources/prisma/prisma.service';
import { BaseService } from '../../common/base.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto';

@Injectable()
export class SubscriptionsService extends BaseService {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(userId: string, dto: CreateSubscriptionDto) {
    const secret = randomBytes(32).toString('hex');

    const subscription = await this.prisma.webhookSubscription.create({
      data: {
        userId,
        url: dto.url,
        events: dto.events,
        secret,
        description: dto.description,
      },
      select: {
        id: true,
        url: true,
        events: true,
        description: true,
        active: true,
        suspended: true,
        createdAt: true,
      },
    });

    return this.formatResponse({
      data: {
        subscription,
        // Secret is ONLY returned at creation — never again
        secret,
      },
      message:
        'Webhook subscription created. Save your secret — it will not be shown again.',
      statusCode: HttpStatus.CREATED,
    });
  }

  async findAll(userId: string, page = 1, limit = this.defaultPaginationLimit) {
    const skip = (page - 1) * limit;

    const [subscriptions, total] = await Promise.all([
      this.prisma.webhookSubscription.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          url: true,
          events: true,
          description: true,
          active: true,
          suspended: true,
          suspendedReason: true,
          createdAt: true,
          updatedAt: true,
          // Never return the full secret — show only last 4 chars as preview
          secret: true,
        },
      }),
      this.prisma.webhookSubscription.count({ where: { userId } }),
    ]);

    const masked = subscriptions.map(({ secret, ...s }) => ({
      ...s,
      secretPreview: `...${secret.slice(-4)}`,
    }));

    return this.formatResponse({
      data: masked,
      ...this.paginate(total, limit, page),
      statusCode: HttpStatus.OK,
    });
  }

  async findOne(userId: string, id: string) {
    const subscription = await this.findAndVerifyOwnership(userId, id);
    const { secret, ...rest } = subscription;

    return this.formatResponse({
      data: { ...rest, secretPreview: `...${secret.slice(-4)}` },
      statusCode: HttpStatus.OK,
    });
  }

  async update(userId: string, id: string, dto: UpdateSubscriptionDto) {
    await this.findAndVerifyOwnership(userId, id);

    const updated = await this.prisma.webhookSubscription.update({
      where: { id },
      data: {
        ...(dto.url && { url: dto.url }),
        ...(dto.events && { events: dto.events }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.active !== undefined && {
          active: dto.active,
          // Reactivating clears suspension
          ...(dto.active && { suspended: false, suspendedReason: null }),
        }),
      },
      select: {
        id: true,
        url: true,
        events: true,
        description: true,
        active: true,
        suspended: true,
        updatedAt: true,
      },
    });

    return this.formatResponse({
      data: updated,
      message: 'Subscription updated',
      statusCode: HttpStatus.OK,
    });
  }

  async remove(userId: string, id: string) {
    await this.findAndVerifyOwnership(userId, id);
    await this.prisma.webhookSubscription.delete({ where: { id } });
    return this.formatResponse({
      message: 'Subscription deleted',
      statusCode: HttpStatus.OK,
    });
  }

  async rotateSecret(userId: string, id: string) {
    await this.findAndVerifyOwnership(userId, id);
    const newSecret = randomBytes(32).toString('hex');

    await this.prisma.webhookSubscription.update({
      where: { id },
      data: { secret: newSecret },
    });

    return this.formatResponse({
      data: { secret: newSecret },
      message: 'Secret rotated. Update your webhook receiver immediately.',
      statusCode: HttpStatus.OK,
    });
  }

  async reactivate(userId: string, id: string) {
    await this.findAndVerifyOwnership(userId, id);

    const updated = await this.prisma.webhookSubscription.update({
      where: { id },
      data: { active: true, suspended: false, suspendedReason: null },
      select: { id: true, active: true, suspended: true, updatedAt: true },
    });

    return this.formatResponse({
      data: updated,
      message: 'Subscription reactivated',
      statusCode: HttpStatus.OK,
    });
  }

  async getDeliveryLogs(
    userId: string,
    subscriptionId: string,
    page = 1,
    limit = 20,
  ) {
    await this.findAndVerifyOwnership(userId, subscriptionId);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.webhookDeliveryLog.findMany({
        where: { subscriptionId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          event: true,
          status: true,
          statusCode: true,
          durationMs: true,
          attemptNumber: true,
          error: true,
          deliveredAt: true,
          createdAt: true,
        },
      }),
      this.prisma.webhookDeliveryLog.count({ where: { subscriptionId } }),
    ]);

    return this.formatResponse({
      data: logs,
      ...this.paginate(total, limit, page),
      statusCode: HttpStatus.OK,
    });
  }

  // ── Internal helpers (used by WebhookDispatcherService) ──────────────────

  async findActiveSubscriptionsForEvent(event: string) {
    return this.prisma.webhookSubscription.findMany({
      where: {
        active: true,
        suspended: false,
        // Match explicit event name OR wildcard '*'
        events: { hasSome: [event, '*'] },
      },
      select: { id: true, url: true, secret: true },
    });
  }

  async suspendSubscription(id: string, reason: string) {
    return this.prisma.webhookSubscription.update({
      where: { id },
      data: { suspended: true, suspendedReason: reason },
    });
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private async findAndVerifyOwnership(userId: string, id: string) {
    const subscription = await this.prisma.webhookSubscription.findUnique({
      where: { id },
    });

    if (!subscription)
      throw new NotFoundException(`Subscription ${id} not found`);
    if (subscription.userId !== userId) throw new ForbiddenException();

    return subscription;
  }
}
