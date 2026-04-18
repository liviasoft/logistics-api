# NestJS Backend Template

A production-ready NestJS backend template with authentication, background jobs, real-time communication, payments, notifications, file storage, webhooks, scheduled tasks, and application settings — all wired up and ready to extend.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 10 + TypeScript 5 |
| Database | PostgreSQL via Prisma 6 |
| Cache / Pub-Sub | Redis via ioredis |
| Background Jobs | BullMQ + `@nestjs/bullmq` |
| Job Dashboard | Bull Board at `/admin/queues` |
| Scheduling | `@nestjs/schedule` (cron, interval, timeout) |
| Real-time | Socket.io via `@nestjs/platform-socket.io` |
| Image Processing | Sharp |
| Auth | JWT access tokens + refresh tokens (httpOnly cookie) |
| API Docs | Scalar UI at `/api/docs` |
| Event Bus | `@nestjs/event-emitter` (EventEmitter2) |

---

## Quick Start

```bash
npm install
cp .env.example .env   # fill in values
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_QUEUE_DB=1          # BullMQ uses a separate DB index

# Auth
JWT_SECRET=change-me-in-production

# Active providers — swap without code changes
PAYMENT_PROVIDER=stripe         # stripe | adyen | paystack
NOTIFICATION_PROVIDER=resend    # resend | sendgrid | twilio
STORAGE_PROVIDER=local          # local | s3 | r2

# Storage (local — works out of the box)
STORAGE_LOCAL_PATH=./uploads
STORAGE_LOCAL_BASE_URL=http://localhost:3000/uploads

# CORS
CORS_ORIGIN=http://localhost:3000
```

Provider-specific variables (API keys, bucket names, etc.) are documented in each provider's doc file.

---

## Project Structure

```
src/
├── common/
│   ├── async-storage/        # Request-scoped AsyncLocalStorage
│   ├── queues/               # BullMQ queue definitions + processors
│   └── workflows/            # Saga / compensation workflow engine
│
├── datasources/
│   ├── prisma/               # Prisma client + service
│   ├── redis/                # Redis service (cache, pub/sub)
│   ├── neo4j/                # Neo4j driver (optional graph DB)
│   └── eventstore/           # EventStoreDB (optional event sourcing)
│
└── modules/
    ├── auth/                 # JWT auth, refresh tokens, guards
    ├── users/                # User CRUD
    ├── feature-flags/        # Runtime feature toggles
    ├── settings/             # Typed application settings with DB overrides
    ├── gateway/              # Socket.io WebSocket gateway
    ├── media/                # Sharp image processing
    ├── storage/              # File storage (local / S3 / R2)
    ├── notifications/        # Email + SMS (Resend / SendGrid / Twilio)
    ├── payments/             # Payments (Stripe / Adyen / Paystack)
    ├── webhooks/             # Inbound + outbound webhooks
    ├── health/               # Health check endpoint
    └── example/              # Working examples of every feature ← start here
```

---

## Features

### Authentication

JWT-based auth with 15-minute access tokens and 7-day refresh tokens stored in httpOnly cookies.

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

Protect any endpoint with `@UseGuards(AuthGuard)`. The authenticated user is available as `req.user`.

---

### Application Settings

Typed application settings with coded defaults and optional database overrides. Synchronous reads with zero overhead — backed by an in-process cache loaded at startup.

```typescript
// No import needed — SettingsModule is global
const inMaintenance = this.settings.get('app.maintenanceMode'); // boolean, typed
await this.settings.set('app.maintenanceMode', true, userId);
await this.settings.reset('app.maintenanceMode', userId);
```

To add a setting, edit only `src/modules/settings/settings.config.ts`:

```typescript
export interface AppSettings {
  'orders.maxItemsPerCart': number;  // add key + type
}
export const defaultSettings: AppSettings = {
  'orders.maxItemsPerCart': 50,      // add default
};
```

```
GET    /api/v1/settings
GET    /api/v1/settings/keys
PATCH  /api/v1/settings/:key    { "value": ... }
DELETE /api/v1/settings/:key    (reset to default)
```

→ [`docs/settings.md`](docs/settings.md)

---

### Background Jobs (BullMQ)

Redis-backed job queues with automatic retries, exponential backoff, delayed jobs, and recurring patterns. Every queue is visible in the Bull Board dashboard.

```typescript
await this.exampleQueue.sendWelcome(userId, 'Welcome!');
await this.exampleQueue.sendNotification(userId, 'Reminder', 60_000); // 1-min delay
await this.exampleQueue.scheduleRecurring('0 9 * * 1-5');             // weekdays 09:00
```

Bull Board: `http://localhost:3000/admin/queues`

To add a queue: register it in `src/common/queues/queues.module.ts`, add a job data type in `queues.types.ts`, create a processor, and add a queue service.

→ [`docs/queues.md`](docs/queues.md)

---

### Cron Jobs & Scheduling

Declarative and dynamic scheduled tasks powered by `@nestjs/schedule`.

```typescript
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: 'daily-cleanup' })
async handleDailyCleanup() {
  if (this.settings.get('app.maintenanceMode')) return;
  await this.cleanupQueue.add('run', {});
}

@Interval('health-check', 30_000)
handleHealthCheck() { ... }

@Timeout('startup-warmup', 5_000)
handleWarmup() { ... }
```

Dynamic jobs at runtime:

```typescript
this.schedulerRegistry.addCronJob('report:user-123', new CronJob('0 9 * * 1', callback));
this.schedulerRegistry.deleteCronJob('report:user-123');
```

→ [`docs/cron.md`](docs/cron.md) · `src/modules/example/example.cron.ts`

---

### WebSockets (Socket.io)

Real-time gateway at `/events` namespace with room-based messaging and direct client pushes.

```typescript
// Server-push from any service
this.gateway.broadcast('announcement', { message });
this.gateway.broadcastToRoom(`order:${orderId}`, 'status-changed', payload);
this.gateway.pushToClient(socketId, 'direct-message', payload);
```

Client-side:
```javascript
const socket = io('http://localhost:3000/events');
socket.emit('join-room', { room: 'order:abc' });
socket.on('status-changed', (data) => console.log(data));
```

→ [`docs/websockets.md`](docs/websockets.md)

---

### Redis

Global service for caching, key-value storage, hash maps, and pub/sub. Available anywhere without importing `RedisModule`.

```typescript
await this.redis.set('user:profile:123', JSON.stringify(profile), 300);
const cached = await this.redis.get<string>('user:profile:123');
await this.redis.deleteByPattern('user:profile:*');

// Pub/Sub
await this.redis.publish('settings:invalidated', key);
const sub = await this.redis.createSubscriber();
sub.subscribe('settings:invalidated', (key) => this.settings.refresh());
```

→ [`docs/redis.md`](docs/redis.md)

---

### Image Processing (Sharp)

Server-side image processing via Sharp. Resize, convert formats, adjust quality, strip EXIF data, generate thumbnails.

```typescript
const { buffer } = await this.media.processImage(file, {
  width: 1200, format: 'webp', quality: 85, stripMetadata: true,
});

const thumbs = await this.media.generateThumbnails(file, [
  { name: 'sm', width: 100 },
  { name: 'md', width: 400 },
  { name: 'lg', width: 1200 },
]);
```

Pair with `StorageService` to upload processed results.

→ [`docs/media.md`](docs/media.md)

---

### File Storage

Provider-agnostic storage with full CRUD + signed URLs. Local disk works out of the box with no credentials.

```typescript
const file = await this.storage.upload({ fileName, mimeType, buffer, isPublic: true }, userId);
const { url } = await this.storage.getSignedUrl(file.id, 3600);
await this.storage.delete(file.id);
```

```
POST   /api/v1/storage/upload
GET    /api/v1/storage/:id/signed-url?expiresIn=3600
DELETE /api/v1/storage/:id
```

`STORAGE_PROVIDER=local | s3 | r2`

→ [`docs/file-storage.md`](docs/file-storage.md)

---

### Notifications

Provider-agnostic email and SMS delivery. Every notification is persisted to Postgres with status tracking.

```typescript
await this.notifications.send({
  to: 'user@example.com',
  channel: 'email',
  subject: 'Welcome!',
  body: 'Thanks for signing up.',
  html: '<h1>Thanks for signing up.</h1>',
}, userId);
```

`NOTIFICATION_PROVIDER=resend | sendgrid | twilio`

→ [`docs/notifications.md`](docs/notifications.md)

---

### Payments

Provider-agnostic payment processing. Full lifecycle: create → confirm → capture → cancel → refund. Normalised status across all providers.

```typescript
const payment = await this.payments.createPayment({ amount: 5000, currency: 'usd' }, userId);
// response includes clientSecret (Stripe) or redirectUrl (Adyen/Paystack)

await this.payments.capturePayment(payment.id);
await this.payments.refundPayment(payment.id, { amount: 2500 });
```

```
POST /api/v1/payments
POST /api/v1/payments/:id/confirm
POST /api/v1/payments/:id/capture
POST /api/v1/payments/:id/cancel
POST /api/v1/payments/:id/refund
GET  /api/v1/payments/:id/refunds
```

`PAYMENT_PROVIDER=stripe | adyen | paystack`

→ [`docs/payments.md`](docs/payments.md)

---

### Webhooks

**Inbound** — receive and verify signed webhooks from Stripe, GitHub, or any HMAC provider. Two-layer idempotency (Redis check + Postgres unique constraint). Async processing via BullMQ.

**Outbound** — subscribe URLs to your domain events. HMAC-signed delivery, exponential backoff (6 attempts), delivery logs, automatic subscription suspension on failure.

```typescript
// Dispatch an event to all active subscribers
await this.dispatcher.dispatch('order.completed', { orderId, total, userId });
```

```
POST   /api/v1/webhooks/inbound/stripe
POST   /api/v1/webhooks/inbound/generic

POST   /api/v1/webhooks/subscriptions
GET    /api/v1/webhooks/subscriptions
DELETE /api/v1/webhooks/subscriptions/:id
GET    /api/v1/webhooks/deliveries/:subscriptionId
```

→ [`docs/webhooks.md`](docs/webhooks.md)

---

### Events, Subscribers & Hooks

Two extension mechanisms for reacting to and intercepting domain operations without modifying core services.

**Subscribers** — react after something happened (async, fire-and-forget):
```typescript
@Injectable()
export class OrderFulfilmentSubscriber {
  @OnEvent(AppEvents.PAYMENT_SUCCEEDED, { async: true })
  async handle(payload: PaymentSucceededEvent) {
    await this.orders.fulfil(payload.paymentId);
  }
}
```

**Hooks** — intercept before/after an operation (inline, typed):
```typescript
// Modify params before a payment is created
this.hooks.register(AppHooks.BEFORE_PAYMENT_CREATE, (params) => ({
  ...params, metadata: { ...params.metadata, source: 'web' },
}));

// Run side effects after (errors never break the main flow)
this.hooks.register(AppHooks.AFTER_PAYMENT_CREATE, async (payment) => {
  await this.analytics.track('payment_created', payment);
});
```

Add events in `src/events/app-events.ts` + `event-payloads.ts`.
Add hook points in `src/common/hooks/hooks.catalog.ts`.
Add subscribers in `src/subscribers/`.

→ [`docs/events.md`](docs/events.md)

---

### Feature Flags

Database-backed feature toggles with a `@FeatureFlag('flag-name')` guard decorator.

```
GET   /api/v1/feature-flags
POST  /api/v1/feature-flags
PATCH /api/v1/feature-flags/:id
```

---

### User Preferences

Per-user settings stored as JSONB. Three-tier fallback: user override → global Setting → coded default.

```typescript
// Inject UserPreferencesService (exported from UsersModule)
const locale = await this.userPreferences.get(userId, 'locale');
await this.userPreferences.patch(userId, { locale: 'fr', timezone: 'Europe/Paris' });
```

```
GET    /api/v1/users/me/preferences
PATCH  /api/v1/users/me/preferences
DELETE /api/v1/users/me/preferences/reset    (reset all)
DELETE /api/v1/users/me/preferences/:key     (reset one)
```

→ [`docs/user-preferences.md`](docs/user-preferences.md)

---

### Internationalisation (i18n)

Translation + locale context + currency utilities.

- **Translated messages** — `nestjs-i18n` with JSON files in `src/i18n/<locale>/`
- **Locale detection** — `Accept-Language` header (or `?lang=fr`) stored in AsyncLocalStorage per-request
- **Validation errors** — `I18nValidationPipe` translates class-validator messages automatically
- **Currency utils** — `formatCurrency`, `toSmallestUnit`, `fromSmallestUnit` (pure, no deps)

```typescript
// Translate in a service
const msg = this.i18n.t('common.auth.loginSuccess');

// Format currency
import { formatCurrency } from '../../common/utils/currency.utils';
formatCurrency(1234, 'usd', 'en-US')  // '$12.34'
formatCurrency(1234, 'jpy', 'ja-JP')  // '¥1,234'
```

Add a locale: create `src/i18n/<lang>/common.json` and add `'<lang>'` to `SUPPORTED_LOCALES` in `async-storage.middleware.ts`.

→ [`docs/i18n.md`](docs/i18n.md)

---

### Health Check

```
GET /api/health
```

---

## Example Module

`src/modules/example/` ties every feature together in working code. Use it as a reference when building your domain, then delete it.

```
GET  /api/v1/example/status              → read settings
POST /api/v1/example/events/user-created → emit domain event + WebSocket broadcast
POST /api/v1/example/jobs/welcome/:id    → enqueue BullMQ job
POST /api/v1/example/broadcast           → push to all WebSocket clients
POST /api/v1/example/notify/welcome      → send email via active provider
POST /api/v1/example/upload/avatar       → upload to active storage provider
GET  /api/v1/example/cache/:userId       → Redis cache read
POST /api/v1/example/cache/:userId       → Redis cache write
GET  /api/v1/example/crons               → list scheduled cron jobs
POST /api/v1/example/crons/:userId       → add dynamic cron
DELETE /api/v1/example/crons/:userId     → remove dynamic cron
```

---

## Docs

| Topic | File |
|---|---|
| Cron Jobs | [`docs/cron.md`](docs/cron.md) |
| BullMQ Queues | [`docs/queues.md`](docs/queues.md) |
| WebSockets | [`docs/websockets.md`](docs/websockets.md) |
| Redis | [`docs/redis.md`](docs/redis.md) |
| Image Processing | [`docs/media.md`](docs/media.md) |
| File Storage | [`docs/file-storage.md`](docs/file-storage.md) |
| Notifications | [`docs/notifications.md`](docs/notifications.md) |
| Payments | [`docs/payments.md`](docs/payments.md) |
| Webhooks | [`docs/webhooks.md`](docs/webhooks.md) |
| Settings | [`docs/settings.md`](docs/settings.md) |
| Events, Subscribers & Hooks | [`docs/events.md`](docs/events.md) |
| User Preferences | [`docs/user-preferences.md`](docs/user-preferences.md) |
| i18n & Currency | [`docs/i18n.md`](docs/i18n.md) |
| Workflow Engine | [`docs/WORKFLOW-ENGINE.md`](docs/WORKFLOW-ENGINE.md) |
