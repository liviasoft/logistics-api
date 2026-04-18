# Events, Subscribers & Hooks

Two complementary extension mechanisms inspired by Medusa.js:

| Mechanism | When to use |
|---|---|
| **Subscribers** | React to something that already happened — send an email, dispatch a webhook, update a log |
| **Hooks** | Intercept something before or after it happens — transform input, enforce rules, add metadata |

Both are built on top of infrastructure already in the template (`@nestjs/event-emitter` for subscribers, a custom `HooksService` for hooks) — no new dependencies.

---

## Subscribers

### How they work

Subscribers are plain NestJS providers decorated with `@OnEvent()`. EventEmitter2 calls every matching handler automatically whenever a service emits an event. Handlers marked `{ async: true }` run outside the request/response cycle — a slow subscriber never blocks the HTTP response.

### Creating a subscriber

```typescript
// src/subscribers/order-placed.subscriber.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppEvents } from '../events/app-events';
import { PaymentSucceededEvent } from '../events/event-payloads';

@Injectable()
export class OrderFulfilmentSubscriber {
  private readonly logger = new Logger(OrderFulfilmentSubscriber.name);

  @OnEvent(AppEvents.PAYMENT_SUCCEEDED, { async: true })
  async handlePaymentSucceeded(payload: PaymentSucceededEvent) {
    this.logger.log(`Fulfilling order for payment ${payload.paymentId}`);
    // await this.ordersService.fulfil(payload.paymentId);
  }
}
```

### Registering a subscriber

Add it to `src/subscribers/subscribers.module.ts`:

```typescript
@Module({
  imports: [OrdersModule],          // import whatever your subscriber needs
  providers: [OrderFulfilmentSubscriber],
})
export class SubscribersModule {}
```

That's it. NestJS instantiates the provider and EventEmitter2 wires up the decorator.

### Emitting events

Services emit typed events using the `AppEvents` constants:

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppEvents } from '../../events/app-events';
import { PaymentSucceededEvent } from '../../events/event-payloads';

this.events.emit(AppEvents.PAYMENT_SUCCEEDED, {
  paymentId: record.id,
  userId:    record.userId,
  amount:    record.amount,
  currency:  record.currency,
  provider:  record.provider,
  timestamp: new Date(),
} satisfies PaymentSucceededEvent);
```

The `satisfies` keyword catches missing fields at compile time.

### Adding a new event

1. Add a constant to `src/events/app-events.ts`:
```typescript
export const AppEvents = {
  ORDER_PLACED: 'order.placed',
  // ...
} as const;
```

2. Add a payload interface to `src/events/event-payloads.ts`:
```typescript
export interface OrderPlacedEvent {
  orderId: string;
  userId: string;
  total: number;
  currency: string;
  timestamp: Date;
}
```

3. Emit and subscribe using the new constant and interface.

---

## Hooks

### How they work

Hooks are named extension points that services expose at key moments in their operations. Unlike events (fire-and-forget after the fact), hooks run **inline** with the operation:

- **`before*` hooks** use `callWaterfall()` — each registered handler receives the params and can return a modified version. The final result is used instead of the original params.
- **`after*` hooks** use `call()` — all registered handlers run in parallel. Errors are caught and logged so they never break the main flow.

`HooksService` is a global service — inject it anywhere without importing `HooksModule`.

### Registering a hook handler

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { HooksService } from '../../common/hooks/hooks.service';
import { AppHooks } from '../../common/hooks/hooks.catalog';

@Injectable()
export class AttributionModule implements OnModuleInit {
  constructor(private readonly hooks: HooksService) {}

  onModuleInit() {
    // Add metadata to every payment before it's created
    this.hooks.register(
      AppHooks.BEFORE_PAYMENT_CREATE,
      (params) => ({ ...params, metadata: { ...params.metadata, source: 'web' } }),
      'AttributionModule',            // optional label for debugging
    );

    // React after a payment is saved (parallel, errors are swallowed)
    this.hooks.register(
      AppHooks.AFTER_PAYMENT_CREATE,
      async (payment) => {
        await this.analytics.track('payment_created', payment);
      },
      'AnalyticsModule',
    );
  }
}
```

### Calling hooks in a service

```typescript
// before — waterfall, result replaces the input params
const finalParams = await this.hooks.callWaterfall(AppHooks.BEFORE_PAYMENT_CREATE, params);
const result = await this.provider.createPayment(finalParams);

// after — parallel, errors are caught internally
await this.hooks.call(AppHooks.AFTER_PAYMENT_CREATE, {
  id: record.id, amount: result.amount, currency: result.currency,
});
```

### Adding a new hook point

1. Add a constant and payload type to `src/common/hooks/hooks.catalog.ts`:

```typescript
export const AppHooks = {
  BEFORE_ORDER_CREATE: 'order.beforeCreate',
  AFTER_ORDER_CREATE:  'order.afterCreate',
  // ...
} as const;

export interface HookPayloadMap {
  'order.beforeCreate': CreateOrderParams;
  'order.afterCreate':  { id: string; userId: string; total: number };
  // ...
}
```

2. Call it in your service:
```typescript
const finalParams = await this.hooks.callWaterfall(AppHooks.BEFORE_ORDER_CREATE, params);
// ... create the order ...
await this.hooks.call(AppHooks.AFTER_ORDER_CREATE, { id, userId, total });
```

3. Register handlers in any module that needs to extend the behaviour.

### Unregistering a hook

`register()` returns an unregister function. Call it in `onModuleDestroy` if needed:

```typescript
private unregister: () => void;

onModuleInit() {
  this.unregister = this.hooks.register(AppHooks.AFTER_PAYMENT_CREATE, handler);
}

onModuleDestroy() {
  this.unregister();
}
```

### Diagnosing registered hooks

```typescript
// Returns all hook names with handler count and labels
const registered = this.hooks.listHooks();
// [{ hookName: 'payment.afterCreate', count: 2, labels: ['AnalyticsModule', 'WebhooksModule'] }]
```

---

## Current Hook Points

| Hook | Method | Called in |
|---|---|---|
| `payment.beforeCreate` | `callWaterfall` | `PaymentsService.createPayment()` |
| `payment.afterCreate` | `call` | `PaymentsService.createPayment()` |
| `payment.afterSucceed` | `call` | `PaymentsService.handleWebhookEvent()` |
| `payment.afterRefund` | `call` | `PaymentsService.refundPayment()` |
| `user.beforeCreate` | `callWaterfall` | `AuthService.signup()` |
| `user.afterCreate` | `call` | `AuthService.signup()` |

## Current Events

| Event | Emitted by | Payload type |
|---|---|---|
| `user.registered` | `AuthService.signup()` | `UserRegisteredEvent` |
| `payment.created` | `PaymentsService.createPayment()` | `PaymentCreatedEvent` |
| `payment.succeeded` | `PaymentsService.handleWebhookEvent()` | `PaymentSucceededEvent` |
| `payment.refunded` | `PaymentsService.refundPayment()` | `PaymentRefundedEvent` |
| `setting.updated` | `SettingsService.set()` | `SettingUpdatedEvent` |
| `setting.reset` | `SettingsService.reset()` | `SettingResetEvent` |

## Current Subscribers

| File | Listens to | Does |
|---|---|---|
| `user-registered.subscriber.ts` | `user.registered` | Sends welcome email (if setting enabled) |
| `payment-succeeded.subscriber.ts` | `payment.succeeded`, `payment.failed`, `payment.refunded` | Logs events, placeholder for receipts/fulfilment |
| `setting-updated.subscriber.ts` | `setting.updated`, `setting.reset` | Logs changes, placeholder for Redis propagation |

---

## Hooks vs Subscribers — Decision Guide

```
Did it already happen?
  YES → Subscriber (@OnEvent)
  NO  → Hook (callWaterfall / call)

Do you need to modify the data?
  YES → before* hook (callWaterfall)
  NO  → after* hook (call) or Subscriber

Should an error cancel the operation?
  YES → before* hook (exceptions propagate)
  NO  → after* hook or Subscriber (errors are caught/logged)

Is it in a different module that shouldn't know about the emitter?
  YES → Subscriber (loose coupling via event name string)
  NO  → Either works
```
