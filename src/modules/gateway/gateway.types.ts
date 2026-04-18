// ─── Incoming event payloads (client → server) ───────────────────────────────

export interface JoinRoomPayload {
  room: string;
}

export interface LeaveRoomPayload {
  room: string;
}

export interface SendMessagePayload {
  room: string;
  content: string;
}

export interface PrivateMessagePayload {
  targetSocketId: string;
  content: string;
}

// ─── Outgoing event payloads (server → client) ───────────────────────────────

export interface MessageBroadcast {
  from: string;   // socket ID of sender
  room: string;
  content: string;
  timestamp: string;
}

export interface RoomEvent {
  socketId: string;
  room: string;
  timestamp: string;
}
