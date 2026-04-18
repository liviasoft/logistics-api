/**
 * Example Cron Jobs
 *
 * Demonstrates every scheduling pattern available via @nestjs/schedule:
 *   @Cron     — run on a cron expression
 *   @Interval — run every N milliseconds
 *   @Timeout  — run once after N milliseconds
 *   SchedulerRegistry — add / remove / inspect jobs at runtime
 *
 * Copy this file and rename it for your domain (e.g. billing.cron.ts).
 * Register the class as a provider in your module — that's all NestJS needs.
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  Cron,
  CronExpression,
  Interval,
  SchedulerRegistry,
  Timeout,
} from '@nestjs/schedule';
import { CronJob } from 'cron';
import { SettingsService } from '../settings/settings.service';
import { ExampleQueue } from '../../common/queues/example.queue';

@Injectable()
export class ExampleCron implements OnModuleDestroy {
  private readonly logger = new Logger(ExampleCron.name, { timestamp: true });

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly settings: SettingsService,
    private readonly exampleQueue: ExampleQueue,
  ) {}

  // ── @Cron — declarative, expression-based ─────────────────────────────────

  /**
   * Runs every minute.
   * CronExpression has named constants for common schedules — use them
   * instead of raw strings to avoid typos.
   */
  @Cron(CronExpression.EVERY_MINUTE, { name: 'heartbeat' })
  handleHeartbeat() {
    this.logger.debug('Heartbeat tick');
    // Example: update an in-memory metric, check a circuit breaker, etc.
  }

  /**
   * Runs at midnight every day (00:00:00).
   * Uses a raw cron expression — five fields: min hour dom month dow.
   * Read the expression at a glance: "at 00:00 every day".
   */
  @Cron('0 0 * * *', { name: 'daily-cleanup' })
  async handleDailyCleanup() {
    // Gate on a setting so cleanup can be paused without a redeploy
    const inMaintenance = this.settings.get('app.maintenanceMode');
    if (inMaintenance) {
      this.logger.warn('Daily cleanup skipped — app is in maintenance mode');
      return;
    }

    this.logger.log('Running daily cleanup…');

    // Offload the actual work to a BullMQ job so cleanup is:
    //   - retryable (BullMQ handles failures)
    //   - non-blocking (cron tick returns immediately)
    //   - visible in the Bull Board dashboard
    await this.exampleQueue.sendNotification('system', 'daily-cleanup', 0);

    this.logger.log('Daily cleanup job enqueued');
  }

  /**
   * Runs at 01:00 on the first day of every month.
   * Good for billing runs, report generation, data archival.
   */
  @Cron('0 1 1 * *', { name: 'monthly-report' })
  async handleMonthlyReport() {
    this.logger.log('Generating monthly report…');
    // await this.reportsService.generate();
  }

  // ── @Interval — polling / keep-alive ──────────────────────────────────────

  /**
   * Runs every 30 seconds — good for polling external APIs or refreshing
   * short-lived tokens.
   *
   * Note: @Interval uses wall-clock time, not cron math. The first execution
   * happens after the first interval has elapsed (not immediately).
   */
  @Interval('poll-external-api', 30_000)
  handleExternalApiPoll() {
    this.logger.debug('Polling external API…');
    // await this.externalApi.ping();
  }

  // ── @Timeout — one-shot startup tasks ─────────────────────────────────────

  /**
   * Runs once, 5 seconds after the app has fully started.
   * Useful for warm-up tasks that shouldn't block startup but need
   * the full DI container to be ready.
   */
  @Timeout('startup-warmup', 5_000)
  handleStartupWarmup() {
    this.logger.log('Startup warm-up complete');
    // await this.cacheService.warmUp();
  }

  // ── Dynamic crons via SchedulerRegistry ───────────────────────────────────

  /**
   * Add a new cron job at runtime — call this from a service or controller
   * when a user schedules a report, configures a recurring task, etc.
   *
   * @example
   * await this.exampleCron.addDynamicCron('user-123-report', '0 9 * * 1'); // every Monday at 09:00
   */
  addDynamicCron(name: string, expression: string, callback: () => void) {
    if (this.schedulerRegistry.doesExist('cron', name)) {
      this.logger.warn(`Cron "${name}" already exists — skipping`);
      return;
    }

    const job = new CronJob(expression, () => {
      this.logger.log(`Dynamic cron "${name}" fired`);
      callback();
    });

    this.schedulerRegistry.addCronJob(name, job);
    job.start();
    this.logger.log(`Dynamic cron "${name}" registered (${expression})`);
  }

  /**
   * Remove a dynamic cron job. Declarative @Cron jobs can also be stopped
   * this way — use their `name` option value.
   */
  removeCron(name: string) {
    if (!this.schedulerRegistry.doesExist('cron', name)) return;
    this.schedulerRegistry.deleteCronJob(name);
    this.logger.log(`Cron "${name}" removed`);
  }

  /**
   * Stop and restart a named cron without removing it.
   * Useful for pausing a job temporarily (e.g. during maintenance).
   */
  pauseCron(name: string) {
    const job = this.schedulerRegistry.getCronJob(name);
    job.stop();
    this.logger.log(`Cron "${name}" paused`);
  }

  resumeCron(name: string) {
    const job = this.schedulerRegistry.getCronJob(name);
    job.start();
    this.logger.log(`Cron "${name}" resumed`);
  }

  /**
   * List every registered cron job and when it will next fire.
   * Useful for a diagnostics endpoint.
   */
  listCrons(): { name: string; nextRun: Date | null; running: boolean }[] {
    const jobs = this.schedulerRegistry.getCronJobs();
    return Array.from(jobs.entries()).map(([name, job]) => ({
      name,
      nextRun: job.nextDate()?.toJSDate() ?? null,
      running: Boolean(job.isActive),
    }));
  }

  // ── Dynamic intervals ──────────────────────────────────────────────────────

  addDynamicInterval(name: string, ms: number, callback: () => void) {
    if (this.schedulerRegistry.doesExist('interval', name)) return;
    const interval = setInterval(callback, ms);
    this.schedulerRegistry.addInterval(name, interval);
    this.logger.log(`Interval "${name}" registered (every ${ms}ms)`);
  }

  removeInterval(name: string) {
    if (!this.schedulerRegistry.doesExist('interval', name)) return;
    this.schedulerRegistry.deleteInterval(name);
    this.logger.log(`Interval "${name}" removed`);
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  onModuleDestroy() {
    // SchedulerRegistry cleans up automatically, but log it for observability
    this.logger.log('Cron scheduler shutting down');
  }
}
