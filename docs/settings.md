# Settings Module

Application-wide settings with typed defaults, database persistence, and a synchronous in-process cache. Settings are available for injection in every module without any additional imports.

---

## How It Works

Three layers, working together:

1. **Coded defaults** (`settings.config.ts`) — the source of truth for what settings exist and what types they are. The app works with an empty database.
2. **DB overrides** (`Setting` table) — only stores keys where the value differs from the default. Admins can update these at runtime via API.
3. **In-process cache** — merged snapshot of defaults + DB overrides, populated once at startup (`onModuleInit`). Reads are synchronous and O(1).

---

## Adding a Setting

Edit `src/modules/settings/settings.config.ts` — only this file:

```typescript
// 1. Add to the interface
export interface AppSettings {
  // ...existing settings...
  'orders.autoConfirmThresholdUsd': number;
  'orders.requireSignatureAboveUsd': number;
}

// 2. Add a default
export const defaultSettings: AppSettings = {
  // ...existing defaults...
  'orders.autoConfirmThresholdUsd':    500,
  'orders.requireSignatureAboveUsd':   1000,
};
```

That's it. The setting is immediately available everywhere with full type inference.

---

## Reading Settings

`SettingsService` is global — inject it in any service, guard, middleware, or interceptor without importing `SettingsModule`.

```typescript
import { SettingsService } from '../settings';

@Injectable()
export class OrdersService {
  constructor(private readonly settings: SettingsService) {}

  async createOrder(dto: CreateOrderDto) {
    // Synchronous read — no await needed
    const threshold = this.settings.get('orders.autoConfirmThresholdUsd');
    // threshold is typed as `number` automatically

    const currencies = this.settings.get('payments.allowedCurrencies');
    // currencies is typed as `string[]`

    if (!currencies.includes(dto.currency)) {
      throw new BadRequestException('Currency not supported');
    }
  }
}
```

### Read all settings

```typescript
const { settings, overrides } = this.settings.getAll();
// settings — full AppSettings object (defaults + overrides merged)
// overrides — string[] of keys that have active DB overrides
```

### Check whether a key is overridden

```typescript
const isCustomised = this.settings.isOverridden('app.maintenanceMode');
```

---

## Writing Settings

```typescript
// Update — persists to DB, updates cache, emits 'setting.updated' event
await this.settings.set('app.maintenanceMode', true, userId);

// Reset to coded default — removes DB override
await this.settings.reset('app.maintenanceMode', userId);
```

---

## Reacting to Setting Changes

Other modules can listen for the `setting.updated` event via EventEmitter2:

```typescript
import { OnEvent } from '@nestjs/event-emitter';

@OnEvent('setting.updated')
handleSettingUpdated(payload: { key: string; value: unknown; updatedBy?: string }) {
  if (payload.key === 'app.maintenanceMode') {
    this.logger.warn(`Maintenance mode changed to: ${payload.value}`);
  }
}

@OnEvent('setting.reset')
handleSettingReset(payload: { key: string; value: unknown }) {
  // key was reset to its default value
}
```

---

## REST API

All endpoints are under `/api/v1/settings` and require authentication.
> Add an admin guard to write endpoints once RBAC is implemented.

### Get all settings

```
GET /api/v1/settings
```

```json
{
  "settings": {
    "app.maintenanceMode": false,
    "app.maintenanceMessage": "We are currently performing maintenance...",
    "storage.maxUploadSizeMb": 50,
    ...
  },
  "overrides": ["storage.maxUploadSizeMb"]
}
```

### List keys with metadata

```
GET /api/v1/settings/keys
```

```json
[
  {
    "key": "app.maintenanceMode",
    "defaultValue": false,
    "type": "boolean",
    "overridden": false,
    "currentValue": false
  },
  {
    "key": "storage.maxUploadSizeMb",
    "defaultValue": 50,
    "type": "number",
    "overridden": true,
    "currentValue": 100
  }
]
```

### Get a single setting

```
GET /api/v1/settings/app.maintenanceMode
```

### Update a setting

```
PATCH /api/v1/settings/app.maintenanceMode

{ "value": true }
```

### Reset to default

```
DELETE /api/v1/settings/app.maintenanceMode
```

### Refresh cache (distributed deployments)

```
PATCH /api/v1/settings/_refresh
```

Forces a reload from the DB. Useful when multiple instances share a database and you need to propagate a setting change without restarting.

---

## Maintenance Mode Example

A common pattern — use a guard or middleware that reads `app.maintenanceMode`:

```typescript
// src/common/guards/maintenance.guard.ts
@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(private readonly settings: SettingsService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const inMaintenance = this.settings.get('app.maintenanceMode');
    if (!inMaintenance) return true;

    const message = this.settings.get('app.maintenanceMessage');
    throw new ServiceUnavailableException(message);
  }
}
```

---

## Database Schema

```prisma
model Setting {
  key       String   @id    // 'app.maintenanceMode'
  value     Json            // any JSON-serialisable value
  updatedBy String?         // user ID for audit trail
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

The table starts empty. Every key missing from the DB is served from the coded default.

---

## Distributed Deployments

The in-process cache is per-instance. If you run multiple app instances:

- A `PATCH /settings/:key` on instance A updates the DB and instance A's cache immediately.
- Instance B's cache is stale until `PATCH /settings/_refresh` is called (or it restarts).

For automatic propagation, publish a Redis pub/sub message on write and subscribe in all instances:

```typescript
// In set() after the DB write:
await this.redis.publish('settings:invalidated', key);

// In onModuleInit, subscribe:
const sub = await this.redis.createSubscriber();
sub.subscribe('settings:invalidated', () => this.loadFromDb());
```

The `RedisService` already supports this pattern — see `docs/redis.md`.
