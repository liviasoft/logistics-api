import { Position } from '@eventstore/db-client';

export type Event<
  EventType extends string = string,
  EventData extends Record<string, unknown> = Record<string, unknown>,
> = Readonly<{ type: Readonly<EventType>; data: Readonly<EventData> }>;

export type ApplyEvent<Entity, Event> = (
  currentState: Entity | undefined,
  event: Event,
) => Entity;

// const enum StreamAggregatorErrors {
//   STREAM_WAS_NOT_FOUND,
// }

// const StreamAggregator =
//   <Entity, Event>(when: ApplyEvent<Entity, Event>) =>
//   (events: Event[]): Entity => {};

export type ExtractedEvent =
  | {
      streamId: string;
      id: string;
      isJson: true;
      revision: bigint;
      type: string;
      created: Date;
      data: string | Record<string | number, unknown> | unknown[];
      metadata:
        | string
        | Record<string | number, unknown>
        | unknown[]
        | Uint8Array<ArrayBufferLike>;
      position: Position;
    }
  | {
      streamId: string;
      id: string;
      isJson: false;
      revision: bigint;
      type: string;
      created: Date;
      data: Uint8Array<ArrayBufferLike>;
      metadata:
        | string
        | Record<string | number, unknown>
        | unknown[]
        | Uint8Array<ArrayBufferLike>;
      position: Position;
    };
