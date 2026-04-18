# Notifications Module

Provider-agnostic notification delivery supporting **Resend**, **SendGrid** (email), and **Twilio** (SMS). Swap providers with a single environment variable. Every notification is persisted to Postgres for auditing and history.

---

## Quick Start

### 1. Set the active provider

```env
# .env
NOTIFICATION_PROVIDER=resend   # resend | sendgrid | twilio
```

### 2. Install the SDK for your chosen provider

```bash
# Resend (email)
npm install resend

# SendGrid (email)
npm install @sendgrid/mail

# Twilio (SMS)
npm install twilio
```

### 3. Add provider credentials to `.env`

See the [Environment Variables](#environment-variables) section below.

### 4. Fill in the TODOs

Open the relevant provider file and uncomment the implementation:

| Provider | File |
|---|---|
| Resend | `src/modules/notifications/providers/resend.provider.ts` |
| SendGrid | `src/modules/notifications/providers/sendgrid.provider.ts` |
| Twilio | `src/modules/notifications/providers/twilio.provider.ts` |

---

## Environment Variables

### Resend
```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### SendGrid
```env
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=YourApp      # optional
```

### Twilio
```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1234567890  # E.164 format
# Or use a Messaging Service:
# TWILIO_MESSAGING_SERVICE_SID=MG...
```

---

## Supported Channels by Provider

| Provider | Email | SMS |
|---|---|---|
| Resend | ✅ | ❌ |
| SendGrid | ✅ | ❌ |
| Twilio | ❌ | ✅ |

Sending through an unsupported channel throws a `400 Bad Request`.

---

## Sending Notifications Programmatically

The primary usage is from the service layer — inject `NotificationsService` wherever you need it.

```typescript
// In any service or event handler:
import { NotificationsService } from '../notifications';

constructor(private readonly notifications: NotificationsService) {}

// Send an email
await this.notifications.send({
  to: 'user@example.com',
  channel: 'email',
  subject: 'Welcome to YourApp',
  body: 'Thanks for signing up!',
  html: '<h1>Thanks for signing up!</h1>',
}, userId);

// Send an SMS
await this.notifications.send({
  to: '+2348012345678',   // E.164 format
  channel: 'sms',
  body: 'Your verification code is 123456',
});
```

---

## REST API

All endpoints are under `/api/v1/notifications` and require authentication.

### Send a notification (ad-hoc / admin)

```
POST /api/v1/notifications
Authorization: Bearer <token>

{
  "to": "user@example.com",
  "channel": "email",
  "subject": "Hello",
  "body": "Plain text fallback",
  "html": "<p>HTML body</p>"
}
```

### List notification history

```
GET /api/v1/notifications?page=1&limit=20
```

### Get a single notification

```
GET /api/v1/notifications/:id
```

---

## Database Schema

```prisma
model Notification {
  id                String    @id @default(cuid())
  userId            String?
  provider          String    // 'resend' | 'sendgrid' | 'twilio'
  channel           String    // 'email' | 'sms'
  to                String
  subject           String?
  status            String    // 'pending' | 'sent' | 'failed'
  providerMessageId String?
  error             String?
  metadata          Json?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

Records are created with `status: pending` before the API call so failures are always recorded.

---

## Adding a New Provider

1. Create `src/modules/notifications/providers/myprovider.provider.ts` implementing `INotificationProvider`
2. Declare `supportedChannels: NotificationChannel[]` on your provider
3. Add `'myprovider'` to `NotificationProviderName` in `notifications.types.ts`
4. Register in `NotificationsModule` providers array
5. Inject in `NotificationsService` and add a case to `resolveProvider()`
6. Set `NOTIFICATION_PROVIDER=myprovider` in `.env`

---

## Multi-channel Strategy

If you need both email and SMS active simultaneously, the simplest approach is to extend `NotificationsService` to maintain a map of `channel → provider` instead of a single active provider:

```typescript
// Extend resolveProvider to accept a channel:
private readonly providers: Map<NotificationChannel, INotificationProvider>;

// Route by channel in send():
const provider = this.providers.get(params.channel);
```

Set separate env vars (`NOTIFICATION_EMAIL_PROVIDER`, `NOTIFICATION_SMS_PROVIDER`) and populate the map in the constructor.
