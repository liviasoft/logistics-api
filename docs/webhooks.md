# Webhooks

Two-sided webhook system:
- **Inbound** — receive signed POST requests from third-party services (Stripe, GitHub, etc.)
- **Outbound** — notify your users' systems when domain events occur in your app

---

## Environment variables

```env
# Inbound — one per provider you support
STRIPE_WEBHOOK_SECRET=whsec_...       # from Stripe Dashboard → Webhooks → Signing secret
WEBHOOK_SECRET=your-secret-here       # for the generic HMAC endpoint

# Outbound delivery timeout / retry config is in delivery.processor.ts
```

---

## Inbound webhooks

### How it works

```
Provider POST → /api/v1/webhooks/inbound/<provider>
                    │
              Signature guard
              (verifies HMAC before body is parsed)
                    │
              Enqueue to webhook-inbound queue
              (returns 200 immediately)
                    │
              InboundWebhookProcessor
              ├── Redis idempotency check (fast path)
              ├── Upsert InboundWebhookEvent in DB (audit)
              └── Dispatch to handleStripeEvent() / handleGenericEvent()
```

### Endpoints

| Provider | URL | Guard |
|---|---|---|
| Stripe | `POST /api/v1/webhooks/inbound/stripe` | `StripeSignatureGuard` |
| Generic HMAC | `POST /api/v1/webhooks/inbound/generic` | `GenericHmacGuard` |

**Register the Stripe URL in your Stripe Dashboard:**
```
Stripe Dashboard → Developers → Webhooks → Add endpoint
URL: https://your-api.com/api/v1/webhooks/inbound/stripe
Events: payment_intent.succeeded, customer.subscription.deleted, ...
```

Copy the **Signing secret** from the endpoint settings and set `STRIPE_WEBHOOK_SECRET`.

### Adding a new event handler

Open `src/modules/webhooks/processors/inbound-webhook.processor.ts` and add a case:

```typescript
private async handleStripeEvent(eventType: string, payload: unknown) {
  const event = payload as { data: { object: any } };

  switch (eventType) {
    case 'payment_intent.succeeded':
      await this.ordersService.markPaid(event.data.object.metadata.orderId);
      return { handled: true };

    case 'invoice.payment_failed':
      await this.subscriptionsService.handleFailedPayment(event.data.object.customer);
      return { handled: true };

    // Add your cases here
  }
}
```

### Adding a new provider

1. **Create a guard** — extend `HmacSignatureGuard`:

```typescript
// src/modules/webhooks/guards/github-signature.guard.ts
@Injectable()
export class GithubSignatureGuard extends HmacSignatureGuard {
  constructor(private readonly config: ConfigService) { super(); }

  protected getSecret() {
    return this.config.get<string>('GITHUB_WEBHOOK_SECRET', '');
  }

  protected getSignatureHeader() {
    return 'x-hub-signature-256'; // GitHub's header
  }
  // GitHub uses the same sha256=<hex> format — no need to override verify()
}
```

2. **Add a route** to `InboundWebhooksController`:

```typescript
@Post('github')
@UseGuards(GithubSignatureGuard)
@HttpCode(HttpStatus.OK)
async githubWebhook(@Req() req: Request & { rawBody?: Buffer }) {
  const body = req.body as Record<string, unknown>;
  const eventId = req.headers['x-github-delivery'] as string;
  const eventType = req.headers['x-github-event'] as string;

  await this.enqueue('github', eventId, eventType, body, req.rawBody);
  return { received: true };
}
```

3. **Add a handler** in the processor:

```typescript
case 'github':
  return this.handleGithubEvent(eventType, payload);
```

4. **Register the guard** as a provider in `WebhooksModule`.

### Idempotency

Two-layer protection against duplicate delivery:

- **Redis** (fast path): `webhook:inbound:<provider>:<eventId>` — checked first, TTL 7 days
- **Postgres** `InboundWebhookEvent` with `@@unique([provider, eventId])` — DB-level constraint

If your worker crashes mid-processing, the status in Postgres will be `processing`. You can query for these and replay:

```sql
SELECT * FROM "InboundWebhookEvent"
WHERE status = 'processing' AND "createdAt" < NOW() - INTERVAL '10 minutes';
```

---

## Outbound webhooks

### How it works

```
Your service calls dispatcher.dispatch('user.created', { userId, email })
                    │
         Query WebhookSubscription WHERE events @> ['user.created'] OR '*'
                    │
         Enqueue one WebhookDeliveryJob per subscriber
                    │
         DeliveryProcessor
         ├── Load subscription (URL + secret)
         ├── Build envelope { id, event, timestamp, apiVersion, data }
         ├── Sign: HMAC-SHA256(secret, JSON.stringify(envelope))
         ├── POST with 10s timeout
         ├── Log to WebhookDeliveryLog
         ├── On failure: BullMQ retries (1m, 2m, 4m, 8m, 16m, 32m)
         └── After 6 failures: suspend subscription
```

### Dispatching events

Inject `WebhookDispatcherService` into any service (import `WebhooksModule` first):

```typescript
@Module({
  imports: [WebhooksModule],
  providers: [UsersService],
})
export class UsersModule {}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: WebhookDispatcherService,
  ) {}

  async createUser(dto: CreateUserDto) {
    const user = await this.prisma.user.create({ data: dto });

    // Fire and forget — delivery is async via queue
    await this.dispatcher.dispatch('user.created', {
      userId: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    });

    return user;
  }
}
```

### EventEmitter integration (optional)

If you already emit events via `EventEmitter2`, you can wire dispatch automatically:

```typescript
@Injectable()
export class WebhookEventListener {
  constructor(private readonly dispatcher: WebhookDispatcherService) {}

  @OnEvent('user.created')
  async onUserCreated(payload: { userId: string; email: string }) {
    await this.dispatcher.dispatch('user.created', payload);
  }

  @OnEvent('order.completed')
  async onOrderCompleted(payload: { orderId: string; total: number }) {
    await this.dispatcher.dispatch('order.completed', payload);
  }
}
```

Add this as a provider to any module that has access to `WebhooksModule`.

### Delivery envelope

Every outbound webhook POST body has this shape:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "event": "user.created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "apiVersion": "2024-01-01",
  "data": {
    "userId": "user-abc123",
    "email": "alice@example.com"
  }
}
```

Headers sent with each request:

```
Content-Type: application/json
X-Webhook-Signature: sha256=<hmac_hex>
X-Webhook-Delivery: <uuid>    ← same as envelope.id
User-Agent: NestJS-Webhook/1.0
```

### How receivers should verify the signature

```typescript
// Node.js example for receivers
import { createHmac, timingSafeEqual } from 'crypto';

function verifyWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string,
  secret: string,
): boolean {
  const hex = signatureHeader.replace('sha256=', '');
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(hex, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}
```

### Subscription management API

All endpoints require a Bearer token.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/webhooks/subscriptions` | Create subscription (returns secret once) |
| `GET` | `/api/v1/webhooks/subscriptions` | List subscriptions (secret masked) |
| `GET` | `/api/v1/webhooks/subscriptions/:id` | Get subscription |
| `PUT` | `/api/v1/webhooks/subscriptions/:id` | Update URL / events / description |
| `DELETE` | `/api/v1/webhooks/subscriptions/:id` | Delete subscription |
| `POST` | `/api/v1/webhooks/subscriptions/:id/rotate-secret` | Generate new signing secret |
| `POST` | `/api/v1/webhooks/subscriptions/:id/reactivate` | Reactivate a suspended subscription |
| `GET` | `/api/v1/webhooks/subscriptions/:id/deliveries` | Delivery log (paginated) |

**Create subscription — request:**

```json
{
  "url": "https://example.com/webhooks",
  "events": ["user.created", "order.completed"],
  "description": "My production endpoint"
}
```

**Create subscription — response (secret shown once):**

```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "clx...",
      "url": "https://example.com/webhooks",
      "events": ["user.created", "order.completed"],
      "active": true,
      "suspended": false,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "secret": "a1b2c3d4e5f6..."
  },
  "message": "Webhook subscription created. Save your secret — it will not be shown again."
}
```

Subscribe to all events with `"events": ["*"]`.

### Retry policy

BullMQ retries delivery with exponential back-off:

| Attempt | Delay |
|---|---|
| 1 | immediate |
| 2 | ~1 minute |
| 3 | ~2 minutes |
| 4 | ~4 minutes |
| 5 | ~8 minutes |
| 6 | ~16 minutes |

After 6 consecutive failures the subscription is **automatically suspended** with a reason. The owner can reactivate it via `POST /api/v1/webhooks/subscriptions/:id/reactivate` once they've fixed their endpoint.

### Delivery logs

Every attempt is recorded. Query logs via the API or directly:

```typescript
// In a service
const logs = await this.prisma.webhookDeliveryLog.findMany({
  where: { subscriptionId, status: 'failed' },
  orderBy: { createdAt: 'desc' },
  take: 20,
});
```

---

## Security notes

- **Replay attacks**: the `StripeSignatureGuard` rejects events older than 5 minutes. Implement the same check in your custom guards.
- **Timing-safe comparison**: all signature checks use `crypto.timingSafeEqual` — never use `===` for HMAC comparison.
- **Raw body**: NestJS is started with `rawBody: true` so Express attaches `req.rawBody` before JSON parsing. If you add body-parser middleware elsewhere, ensure it doesn't consume the stream before the guards run.
- **Secrets at rest**: subscription secrets are stored in plaintext (needed for HMAC signing). Encrypt the column if your threat model requires it.
- **Bull Board**: protect `/admin/queues` in production with IP allowlisting or an auth middleware.
