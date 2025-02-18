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
