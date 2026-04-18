# Cron Jobs & Scheduling

Scheduled tasks via `@nestjs/schedule`, which wraps the [`node-cron`](https://github.com/node-cron/node-cron) library. Supports declarative decorators (`@Cron`, `@Interval`, `@Timeout`) and fully dynamic job management at runtime via `SchedulerRegistry`.

---

## Setup

`ScheduleModule.forRoot()` is already registered in `AppModule`. No additional setup is needed.

---

## Patterns

### `@Cron` — expression-based schedule

```typescript
import { Cron, CronExpression } from '@nestjs/schedule';

@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: 'daily-cleanup' })
async handleDailyCleanup() {
  // runs every day at 00:00
}

// Raw expression — 5 fields: min hour dom month dow
@Cron('0 9 * * 1-5', { name: 'weekday-report' })
async handleWeekdayReport() {
  // runs at 09:00 Mon–Fri
}
```

**Named `CronExpression` constants** (avoid typos):

| Constant | Schedule |
|---|---|
| `EVERY_SECOND` | Every second |
| `EVERY_MINUTE` | Every minute |
| `EVERY_5_MINUTES` | Every 5 minutes |
| `EVERY_HOUR` | Every hour |
| `EVERY_DAY_AT_MIDNIGHT` | Daily at 00:00 |
| `EVERY_DAY_AT_NOON` | Daily at 12:00 |
| `EVERY_WEEK` | Weekly on Sunday |
| `EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT` | Monthly |

See the full list: `import { CronExpression } from '@nestjs/schedule'`

### `@Interval` — run every N milliseconds

```typescript
import { Interval } from '@nestjs/schedule';

@Interval('poll-api', 30_000)  // every 30 seconds
handlePoll() {
  // first execution happens after 30s, not immediately
}
```

### `@Timeout` — run once after N milliseconds

```typescript
import { Timeout } from '@nestjs/schedule';

@Timeout('startup-warmup', 5_000)  // 5 seconds after app starts
handleWarmup() {
  // runs once, then never again
}
```

---

## Dynamic Jobs via `SchedulerRegistry`

Add, remove, and inspect jobs at runtime — useful when schedules are user-configured.

```typescript
import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

@Injectable()
export class ReportsService {
  constructor(private readonly schedulerRegistry: SchedulerRegistry) {}

  scheduleReport(userId: string, expression: string) {
    const name = `report:${userId}`;

    if (this.schedulerRegistry.doesExist('cron', name)) return;

    const job = new CronJob(expression, () => {
      console.log(`Generating report for ${userId}`);
    });

    this.schedulerRegistry.addCronJob(name, job);
    job.start();
  }

  cancelReport(userId: string) {
    const name = `report:${userId}`;
    if (this.schedulerRegistry.doesExist('cron', name)) {
      this.schedulerRegistry.deleteCronJob(name);
    }
  }

  pauseReport(userId: string) {
    this.schedulerRegistry.getCronJob(`report:${userId}`).stop();
  }

  resumeReport(userId: string) {
    this.schedulerRegistry.getCronJob(`report:${userId}`).start();
  }

  listAll() {
    return Array.from(this.schedulerRegistry.getCronJobs().entries()).map(
      ([name, job]) => ({ name, nextRun: job.nextDate()?.toJSDate() }),
    );
  }
}
```

Dynamic intervals work the same way:

```typescript
const interval = setInterval(callback, ms);
this.schedulerRegistry.addInterval('my-poll', interval);

// later:
this.schedulerRegistry.deleteInterval('my-poll');
```

---

## Best Practice: Cron → BullMQ

Long-running cron work should be **offloaded to a BullMQ job** rather than executed inline. This keeps the cron tick fast, makes work retryable, and surfaces failures in the Bull Board dashboard.

```typescript
// ❌ Don't do work inline
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
async handleDailyCleanup() {
  await this.db.deleteOldRecords();  // if this throws, nothing retries
}

// ✅ Enqueue a job instead
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
async handleDailyCleanup() {
  await this.cleanupQueue.add('delete-old-records', { date: new Date() });
}
```

---

## Gating on Settings

Use `SettingsService` to control cron behavior without a redeploy:

```typescript
@Cron(CronExpression.EVERY_HOUR)
async handleHourlySync() {
  if (this.settings.get('app.maintenanceMode')) return;  // skip during maintenance

  await this.syncService.run();
}
```

---

## Cron Expression Reference

```
┌─── minute        (0–59)
│ ┌─── hour          (0–23)
│ │ ┌─── day of month (1–31)
│ │ │ ┌─── month        (1–12 or JAN–DEC)
│ │ │ │ ┌─── day of week  (0–7 or SUN–SAT, 0 and 7 are Sunday)
│ │ │ │ │
* * * * *
```

| Expression | Meaning |
|---|---|
| `* * * * *` | Every minute |
| `0 * * * *` | Every hour |
| `0 0 * * *` | Daily at midnight |
| `0 9 * * 1-5` | Weekdays at 09:00 |
| `0 0 1 * *` | First of every month |
| `*/5 * * * *` | Every 5 minutes |
| `0 9,17 * * *` | At 09:00 and 17:00 daily |

---

## Registering a Cron Provider

Any class with cron decorators must be registered as a **provider** in a module:

```typescript
@Module({
  providers: [BillingCron],  // just add it as a provider — NestJS does the rest
})
export class BillingModule {}
```

---

## Example Module

See `src/modules/example/example.cron.ts` for a working reference covering all patterns: `@Cron`, `@Interval`, `@Timeout`, dynamic job management, settings gating, and BullMQ delegation.

The example controller at `GET /api/v1/example/crons` lists all registered jobs and their next fire times.
