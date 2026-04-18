/**
 * Example Service
 *
 * Shows how to combine the template's building blocks in a real feature.
 * Use this as a reference when building your own domain services.
 *
 * Features demonstrated:
 *   - SettingsService    — read typed application settings
 *   - EventEmitter2      — publish domain events
 *   - ExampleQueue       — enqueue background jobs
 *   - EventsGateway      — push real-time updates to connected clients
 *   - NotificationsService — send email / SMS
 *   - StorageService     — upload files
 *   - RedisService       — cache, pub/sub
 *   - ExampleCron        — manage scheduled jobs at runtime
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SettingsService } from '../settings/settings.service';
import { ExampleQueue } from '../../common/queues/example.queue';
import { EventsGateway } from '../gateway/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { RedisService } from '../../datasources/redis/redis.service';
import { ExampleCron } from './example.cron';

@Injectable()
export class ExampleService {
  private readonly logger = new Logger(ExampleService.name, { timestamp: true });

  constructor(
    private readonly settings: SettingsService,
    private readonly events: EventEmitter2,
    private readonly exampleQueue: ExampleQueue,
    private readonly gateway: EventsGateway,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
    private readonly redis: RedisService,
    private readonly cron: ExampleCron,
  ) {}

  // ── Settings ──────────────────────────────────────────────────────────────

  getAppStatus() {
    // get() is synchronous — no await needed
    const inMaintenance = this.settings.get('app.maintenanceMode');
    const message       = this.settings.get('app.maintenanceMessage');
    const currencies    = this.settings.get('payments.allowedCurrencies');

    return { inMaintenance, message, currencies };
  }

  // ── Events ────────────────────────────────────────────────────────────────

  async triggerUserCreatedEvent(userId: string, email: string) {
    // Emit a domain event — any @OnEvent('user.created') handler will receive this
    this.events.emit('user.created', { userId, email, timestamp: new Date() });

    // Push real-time update to all connected WebSocket clients in a room
    this.gateway.broadcastToRoom(`user:${userId}`, 'user:created', { userId });

    this.logger.log(`user.created event emitted for ${userId}`);
  }

  // ── Background Jobs ───────────────────────────────────────────────────────

  async enqueueWelcomeJob(userId: string) {
    const job = await this.exampleQueue.sendWelcome(userId, 'Welcome to the platform!');
    this.logger.log(`Enqueued welcome job ${job.id} for user ${userId}`);
    return { jobId: job.id };
  }

  async enqueueDelayedJob(userId: string, delayMs: number) {
    const job = await this.exampleQueue.sendNotification(
      userId,
      'Your delayed notification',
      delayMs,
    );
    return { jobId: job.id, delayMs };
  }

  // ── WebSocket ─────────────────────────────────────────────────────────────

  broadcastAnnouncement(message: string) {
    // Push to every connected client
    this.gateway.broadcast('announcement', { message, timestamp: new Date() });
    return { broadcast: true };
  }

  pushToUser(clientId: string, data: unknown) {
    // Push to a specific socket client by socket ID
    this.gateway.pushToClient(clientId, 'direct-message', data);
    return { pushed: true };
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  async sendWelcomeEmail(userId: string, email: string, name: string) {
    const fromName = this.settings.get('notifications.defaultFromName');
    return this.notifications.send(
      {
        to:      email,
        channel: 'email',
        subject: `Welcome to ${fromName}!`,
        body:    `Hi ${name}, thanks for signing up.`,
        html:    `<h1>Hi ${name}</h1><p>Thanks for signing up to <strong>${fromName}</strong>.</p>`,
      },
      userId,
    );
  }

  // ── Storage ───────────────────────────────────────────────────────────────

  async uploadProfilePicture(userId: string, file: Express.Multer.File) {
    const maxMb    = this.settings.get('storage.maxUploadSizeMb');
    const maxBytes = maxMb * 1024 * 1024;

    if (file.size > maxBytes) {
      throw new Error(`File exceeds the ${maxMb}MB limit set in settings`);
    }

    return this.storage.upload(
      {
        fileName: `avatar-${userId}.${file.mimetype.split('/')[1]}`,
        mimeType: file.mimetype,
        buffer:   file.buffer,
        key:      `avatars/${userId}/profile`,
        isPublic: true,
      },
      userId,
    );
  }

  // ── Redis ─────────────────────────────────────────────────────────────────

  async cacheUserProfile(userId: string, profile: object) {
    const key = `user:profile:${userId}`;
    await this.redis.set(key, JSON.stringify(profile), 300); // 5-minute TTL
    return { cached: true, key, ttlSeconds: 300 };
  }

  async getCachedProfile(userId: string) {
    const key  = `user:profile:${userId}`;
    const data = await this.redis.get<string>(key);
    return data ? JSON.parse(data) : null;
  }

  // ── Cron management ───────────────────────────────────────────────────────

  scheduleUserReport(userId: string, cronExpression: string) {
    this.cron.addDynamicCron(
      `user-report:${userId}`,
      cronExpression,
      () => this.logger.log(`Generating report for user ${userId}`),
    );
    return { scheduled: true, name: `user-report:${userId}`, expression: cronExpression };
  }

  cancelUserReport(userId: string) {
    this.cron.removeCron(`user-report:${userId}`);
    return { cancelled: true };
  }

  listScheduledJobs() {
    return this.cron.listCrons();
  }
}
