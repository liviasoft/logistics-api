# WebSockets (Socket.io)

Real-time bidirectional communication via `EventsGateway` — built on NestJS WebSockets with the Socket.io adapter.

## Architecture

```
Client ──── WS ────► /events namespace ──► EventsGateway
                                                │
                                     SubscribeMessage handlers
                                                │
                              broadcast helpers (called from services)
```

The gateway lives at the `/events` Socket.io namespace. Add more gateways with different namespaces (e.g., `/notifications`, `/chat`) to separate concerns.

---

## Environment variables

```env
CORS_ORIGIN=http://localhost:3000    # restrict WebSocket CORS origin
```

---

## Server-side usage

### Inject the gateway into any service

```typescript
import { EventsGateway } from '../gateway';

@Injectable()
export class OrdersService {
  constructor(private readonly gateway: EventsGateway) {}

  async createOrder(dto: CreateOrderDto) {
    const order = await this.prisma.order.create({ data: dto });

    // Push real-time update to all clients
    this.gateway.broadcast('order:created', { orderId: order.id });

    // Push to a specific room (e.g., the customer's room)
    this.gateway.broadcastToRoom(`user:${order.userId}`, 'order:update', order);

    return order;
  }
}
```

> **Import `GatewayModule`** into any feature module that needs server-push:
> ```typescript
> @Module({ imports: [GatewayModule], ... })
> export class OrdersModule {}
> ```

### Available server-push methods

| Method | Description |
|---|---|
| `gateway.broadcast(event, data)` | Send to every connected client |
| `gateway.broadcastToRoom(room, event, data)` | Send to all clients in a room |
| `gateway.pushToClient(socketId, event, data)` | Send to a single client |
| `gateway.connectedCount()` | Returns number of connected sockets |

---

## Client-side usage (JavaScript / TypeScript)

### Install Socket.io client

```bash
npm install socket.io-client
```

### Connect

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001/events', {
  auth: {
    token: 'Bearer <your-jwt-access-token>',
  },
  withCredentials: true,
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('connected', (data) => {
  console.log('Server confirmed connection:', data);
  // => { socketId: 'abc123', timestamp: '...' }
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});
```

### Join / leave rooms

```typescript
// Join a room
socket.emit('join-room', { room: 'order:123' });

// Confirmation comes back as the return value (request-response pattern)
socket.emit('join-room', { room: 'order:123' }, (response) => {
  console.log(response); // => { joined: true, room: 'order:123' }
});

// React to others joining
socket.on('user-joined', ({ socketId, room }) => {
  console.log(`${socketId} joined ${room}`);
});

// Leave a room
socket.emit('leave-room', { room: 'order:123' });
socket.on('user-left', ({ socketId, room }) => {
  console.log(`${socketId} left ${room}`);
});
```

### Send and receive messages

```typescript
// Broadcast to a room
socket.emit('send-message', {
  room: 'order:123',
  content: 'Status updated to dispatched',
});

// Listen for messages in joined rooms
socket.on('new-message', ({ from, room, content, timestamp }) => {
  console.log(`[${room}] ${from}: ${content}`);
});

// Private message to a specific socket
socket.emit('private-message', {
  targetSocketId: 'xyz789',
  content: 'Hi, this is private',
});

socket.on('private-message', ({ from, content }) => {
  console.log(`Private from ${from}: ${content}`);
});
```

### Listen for server-pushed events

```typescript
// These are emitted by the server via gateway.broadcast() or broadcastToRoom()
socket.on('order:created', (data) => {
  console.log('New order:', data);
});

socket.on('order:update', (order) => {
  console.log('Order updated:', order);
});
```

---

## Adding JWT auth to the gateway

The current gateway logs connections but does not enforce authentication. To protect it, validate the JWT in `handleConnection`:

```typescript
// src/modules/gateway/events.gateway.ts

constructor(private readonly jwtService: JwtService) {}

handleConnection(client: Socket) {
  const token = client.handshake.auth?.token?.replace('Bearer ', '');

  if (!token) {
    client.disconnect();
    return;
  }

  try {
    const payload = this.jwtService.verify(token);
    // Attach user to socket data for use in handlers
    client.data.user = payload;
    client.emit('connected', { socketId: client.id });
  } catch {
    client.disconnect();
  }
}
```

Access the user in any handler:

```typescript
@SubscribeMessage('join-room')
handleJoinRoom(@ConnectedSocket() client: Socket, ...) {
  const userId = client.data.user?.sub;
  // ...
}
```

---

## Adding a new namespace (separate gateway)

Create a second gateway file for a separate concern:

```typescript
// src/modules/notifications/notifications.gateway.ts

@WebSocketGateway({ namespace: '/notifications', cors: { origin: '*' } })
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  handleConnection(client: Socket) {
    // Auto-join the user's personal notification room
    const userId = client.data.user?.sub;
    if (userId) client.join(`notifications:${userId}`);
  }

  pushToUser(userId: string, event: string, data: unknown) {
    this.server.to(`notifications:${userId}`).emit(event, data);
  }
}
```

Client connects to the namespace:

```typescript
const notifications = io('http://localhost:3001/notifications', { auth: { token } });
notifications.on('new-notification', handler);
```

---

## Scaling with Redis adapter

When running multiple server instances, Socket.io's in-memory state is local to each process. To share room membership and broadcasts across instances, add the Redis adapter:

```bash
npm install @socket.io/redis-adapter
```

```typescript
// In GatewayModule or AppModule bootstrap
import { createAdapter } from '@socket.io/redis-adapter';

// After app.listen():
const io = app.get(Server); // or via gateway injection
const pubClient = redisService.getClient();
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```
