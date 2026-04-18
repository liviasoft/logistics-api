# Queues (BullMQ)

Background job processing via BullMQ. Jobs survive server restarts (stored in Redis), support automatic retries with exponential back-off, delayed execution, cron-like repeating schedules, and a built-in dashboard.

## Environment variables

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_QUEUE_DB=1        # separate Redis DB from the cache (default: 1)
```

## Dashboard

Bull Board runs at **`/admin/queues`** (no `/api` prefix — it's a UI).

```
http://localhost:3001/admin/queues
```

You can monitor waiting, active, completed, failed, and delayed jobs for every registered queue. Failed jobs can be retried from the dashboard.

> In production, protect this route with IP allowlisting, basic auth, or an auth middleware. See `main.ts` where `expressApp.use('/admin/queues', ...)` is mounted — add middleware before that line.

---

## Adding a new queue

### 1. Register the queue name

```typescript
// src/common/queues/queues.constants.ts
export const QUEUE_NAMES = {
  EXAMPLE: 'example',
  EMAIL: 'email',     // ← add here
} as const;
```

### 2. Define the job data type

```typescript
// src/common/queues/queues.types.ts
export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}
```

### 3. Register the queue in QueuesModule

```typescript
// src/common/queues/queues.module.ts
BullModule.registerQueue(
  { name: QUEUE_NAMES.EXAMPLE },
  { name: QUEUE_NAMES.EMAIL },   // ← add here
),

BullBoardModule.forFeature({ name: QUEUE_NAMES.EMAIL, adapter: BullMQAdapter }),
```

Also add your processor to `providers` and your queue service to `exports`.

### 4. Create a processor

```typescript
// src/common/queues/processors/email.processor.ts
@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  async process(job: Job<EmailJobData>): Promise<unknown> {
    switch (job.name) {
      case 'welcome':
        return this.sendWelcomeEmail(job.data);
      case 'reset-password':
        return this.sendResetEmail(job.data);
      default:
        throw new Error(`Unknown job: ${job.name}`);
    }
  }

  private async sendWelcomeEmail(data: EmailJobData) {
    // Call your email service / Resend / Sendgrid here
    console.log(`Sending welcome to ${data.to}`);
    return { sent: true };
  }
}
```

### 5. Create a queue service

```typescript
// src/common/queues/email.queue.ts
@Injectable()
export class EmailQueue {
  constructor(@InjectQueue(QUEUE_NAMES.EMAIL) private readonly queue: Queue) {}

  async sendWelcome(to: string, name: string) {
    return this.queue.add(
      'welcome',
      { to, subject: 'Welcome!', template: 'welcome', context: { name } } satisfies EmailJobData,
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );
  }
}
```

### 6. Use in your feature module

```typescript
// In your feature module — import QueuesModule to get access to queue services
@Module({
  imports: [QueuesModule],
  providers: [UsersService],
})
export class UsersModule {}

// In your service
@Injectable()
export class UsersService {
  constructor(private readonly emailQueue: EmailQueue) {}

  async register(dto: CreateUserDto) {
    const user = await this.prisma.user.create({ data: dto });
    await this.emailQueue.sendWelcome(user.email, user.name);
    return user;
  }
}
```

---

## Job options reference

```typescript
this.queue.add('job-name', data, {
  // Retry behaviour
  attempts: 3,
  backoff: {
    type: 'exponential',  // or 'fixed'
    delay: 1000,          // base delay in ms
  },

  // Delayed execution (run after 10 minutes)
  delay: 10 * 60 * 1000,

  // Priority (lower number = higher priority)
  priority: 1,

  // Keep last N completed/failed jobs visible in Bull Board
  removeOnComplete: 100,
  removeOnFail: 200,

  // Deduplication — only one job with this ID can exist at a time
  jobId: `welcome:${userId}`,
});
```

---

## Repeating / scheduled jobs

```typescript
// Run every day at 9am UTC
await this.queue.add(
  'daily-report',
  { reportType: 'summary' },
  { repeat: { pattern: '0 9 * * *' } },
);

// Run every 5 minutes
await this.queue.add(
  'health-ping',
  {},
  { repeat: { every: 5 * 60 * 1000 } },
);

// Remove a repeatable job
const repeatableJobs = await this.queue.getRepeatableJobs();
const job = repeatableJobs.find((j) => j.name === 'daily-report');
if (job) await this.queue.removeRepeatableByKey(job.key);
```

---

## Queue metrics

`ExampleQueue.getMetrics()` returns the current job counts for any queue:

```typescript
const metrics = await this.exampleQueue.getMetrics();
// => { waiting: 2, active: 1, completed: 147, failed: 3, delayed: 5 }
```

---

## Processor lifecycle events

```typescript
@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  async process(job: Job<EmailJobData>) { /* ... */ }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    console.log(`Job ${job.id} done`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    console.error(`Job ${job.id} failed: ${err.message}`);
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    console.log(`Job ${job.id} started (attempt ${job.attemptsMade + 1})`);
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job, progress: number) {
    console.log(`Job ${job.id}: ${progress}%`);
  }
}
```

### Reporting progress from inside a job

```typescript
async process(job: Job<ExportJobData>) {
  const items = await loadItems();

  for (let i = 0; i < items.length; i++) {
    await processItem(items[i]);
    await job.updateProgress(Math.round((i / items.length) * 100));
  }

  return { exported: items.length };
}
```

---

## Connecting from within a workflow

You can enqueue jobs as a workflow step, with compensation that cancels the job if a later step fails:

```typescript
const enqueueEmailStepDef = createStep(
  'enqueue-welcome-email',
  async (user: User, { container }) => {
    const emailQueue = container.resolve(EmailQueue);
    const job = await emailQueue.sendWelcome(user.email, user.name);
    return new StepResponse(job, { jobId: job.id });
  },
  async ({ jobId }, { container }) => {
    const emailQueue = container.resolve(EmailQueue);
    const queue = (emailQueue as any).queue as Queue;
    const job = await queue.getJob(jobId);
    await job?.remove();
  },
);
```
