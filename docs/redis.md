# Redis

`RedisService` is a globally-available wrapper around ioredis. Inject it into any service to cache values, manage key expiry, work with hashes, or publish events to other processes.

## Environment variables

```env
REDIS_HOST=localhost        # default: localhost
REDIS_PORT=6379             # default: 6379
REDIS_PASSWORD=             # optional
REDIS_DB=0                  # default: 0  — used by RedisService
REDIS_QUEUE_DB=1            # default: 1  — used by BullMQ (separate DB for isolation)
```

## Injection

```typescript
import { RedisService } from '../../datasources/redis';

@Injectable()
export class ProductsService {
  constructor(private readonly redis: RedisService) {}
}
```

---

## Key / value cache

### Set a value (with TTL)

```typescript
// Store a string — expires after 300 seconds
await this.redis.set('session:abc123', 'userId-42', 300);

// Store an object — serialised to JSON automatically
await this.redis.set('user:42:profile', { name: 'Alice', role: 'admin' }, 600);
```

### Get a value

```typescript
// Returns null when key does not exist or has expired
const profile = await this.redis.get<{ name: string; role: string }>('user:42:profile');
if (!profile) {
  // cache miss — fetch from DB and re-cache
}
```

### Delete a key

```typescript
await this.redis.del('user:42:profile');

// Delete multiple keys at once
await this.redis.del('key1', 'key2', 'key3');
```

### Check existence / TTL

```typescript
const exists = await this.redis.exists('session:abc123');   // boolean
const ttl    = await this.redis.ttl('session:abc123');       // seconds, -1 = no expiry, -2 = gone
```

---

## Cache-aside pattern

The most common pattern — check the cache first; on a miss, fetch from the database and populate the cache.

```typescript
@Injectable()
export class ProductsService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async findById(id: string) {
    const cacheKey = `product:${id}`;

    // 1. Check cache
    const cached = await this.redis.get<Product>(cacheKey);
    if (cached) return cached;

    // 2. Cache miss — fetch from DB
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) return null;

    // 3. Populate cache (TTL: 5 minutes)
    await this.redis.set(cacheKey, product, 300);
    return product;
  }

  async update(id: string, data: UpdateProductDto) {
    const product = await this.prisma.product.update({ where: { id }, data });

    // Invalidate cache on write
    await this.redis.del(`product:${id}`);
    return product;
  }
}
```

---

## Hash operations

Useful for storing structured objects where you want to read/update individual fields without fetching the whole object.

```typescript
// Store individual fields
await this.redis.hset('user:42:settings', 'theme', 'dark');
await this.redis.hset('user:42:settings', 'language', 'en');

// Read one field
const theme = await this.redis.hget('user:42:settings', 'theme');

// Read all fields
const settings = await this.redis.hgetall('user:42:settings');
// => { theme: 'dark', language: 'en' }

// Remove a field
await this.redis.hdel('user:42:settings', 'theme');
```

---

## Pattern-based cache invalidation

```typescript
// Invalidate all cached products (e.g., after a bulk import)
await this.redis.deleteByPattern('product:*');

// Invalidate all user caches for a specific user
await this.redis.deleteByPattern('user:42:*');
```

> **Warning:** `deleteByPattern` uses `KEYS` which scans the entire keyspace. On large Redis instances use `SCAN` instead. Fine for development and small datasets; avoid on production with millions of keys.

---

## Pub / sub

Use pub/sub to push real-time notifications to other processes or services.

### Publisher

```typescript
// Broadcast a message on a channel
await this.redis.publish('orders', { event: 'created', orderId: '123' });
```

### Subscriber

`createSubscriber()` returns a **dedicated** ioredis connection (required by Redis — subscriber connections can only subscribe, not send commands).

```typescript
@Injectable()
export class OrderSubscriber implements OnModuleInit {
  constructor(private readonly redis: RedisService) {}

  onModuleInit() {
    const sub = this.redis.createSubscriber();

    sub.subscribe('orders', (err) => {
      if (err) console.error('Subscribe error:', err);
    });

    sub.on('message', (channel, message) => {
      const payload = JSON.parse(message);
      console.log(`[${channel}]`, payload);
      // Handle the event...
    });
  }
}
```

---

## Health check

```typescript
const pong = await this.redis.ping(); // returns 'PONG' when healthy
```

---

## Raw client

If you need a Redis command not covered by `RedisService`, access the underlying ioredis instance directly:

```typescript
const client = this.redis.getClient();
await client.incr('page-views');
await client.lpush('recent-searches', 'typescript');
await client.zadd('leaderboard', 1500, 'player-1');
```
