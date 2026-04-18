import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  JoinRoomPayload,
  LeaveRoomPayload,
  MessageBroadcast,
  PrivateMessagePayload,
  RoomEvent,
  SendMessagePayload,
} from './gateway.types';

/**
 * EventsGateway — main Socket.io gateway.
 *
 * Demonstrates:
 *  - connection / disconnection lifecycle
 *  - room join / leave
 *  - broadcast to a room
 *  - private (point-to-point) messages
 *  - server-initiated push (call server.emit / server.to() from any service)
 *
 * The gateway is mounted at the `/events` namespace by default.
 * Change `namespace` in @WebSocketGateway() to separate concerns
 * (e.g., namespace: '/notifications', namespace: '/chat').
 */
@WebSocketGateway({
  namespace: '/events',
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new Logger(EventsGateway.name, { timestamp: true });

  afterInit() {
    this.logger.log('WebSocket gateway initialised');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    // Optionally validate JWT here:
    // const token = client.handshake.auth?.token;
    client.emit('connected', { socketId: client.id, timestamp: new Date().toISOString() });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─── Room management ───────────────────────────────────────────────────

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    if (!payload?.room) throw new WsException('room is required');

    client.join(payload.room);
    this.logger.log(`${client.id} joined room: ${payload.room}`);

    const event: RoomEvent = {
      socketId: client.id,
      room: payload.room,
      timestamp: new Date().toISOString(),
    };
    // Notify others in the room
    client.to(payload.room).emit('user-joined', event);
    // Confirm to sender
    return { joined: true, room: payload.room };
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LeaveRoomPayload,
  ) {
    if (!payload?.room) throw new WsException('room is required');

    client.leave(payload.room);
    this.logger.log(`${client.id} left room: ${payload.room}`);

    const event: RoomEvent = {
      socketId: client.id,
      room: payload.room,
      timestamp: new Date().toISOString(),
    };
    client.to(payload.room).emit('user-left', event);
    return { left: true, room: payload.room };
  }

  // ─── Messaging ─────────────────────────────────────────────────────────

  @SubscribeMessage('send-message')
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessagePayload,
  ) {
    if (!payload?.room || !payload?.content) {
      throw new WsException('room and content are required');
    }

    const broadcast: MessageBroadcast = {
      from: client.id,
      room: payload.room,
      content: payload.content,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to everyone in the room including sender
    this.server.to(payload.room).emit('new-message', broadcast);
    return { sent: true };
  }

  @SubscribeMessage('private-message')
  handlePrivateMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PrivateMessagePayload,
  ) {
    if (!payload?.targetSocketId || !payload?.content) {
      throw new WsException('targetSocketId and content are required');
    }

    this.server.to(payload.targetSocketId).emit('private-message', {
      from: client.id,
      content: payload.content,
      timestamp: new Date().toISOString(),
    });
    return { sent: true };
  }

  // ─── Server-push helpers (called from other services) ──────────────────

  /**
   * Push an event to all connected clients.
   *   this.eventsGateway.broadcast('order-updated', { orderId });
   */
  broadcast(event: string, data: unknown) {
    this.server.emit(event, data);
  }

  /**
   * Push an event to all clients in a specific room.
   *   this.eventsGateway.broadcastToRoom('order:123', 'status-changed', { status });
   */
  broadcastToRoom(room: string, event: string, data: unknown) {
    this.server.to(room).emit(event, data);
  }

  /**
   * Push to a single client by socket ID.
   */
  pushToClient(socketId: string, event: string, data: unknown) {
    this.server.to(socketId).emit(event, data);
  }

  /** Returns the number of clients currently connected. */
  async connectedCount(): Promise<number> {
    const sockets = await this.server.fetchSockets();
    return sockets.length;
  }
}
