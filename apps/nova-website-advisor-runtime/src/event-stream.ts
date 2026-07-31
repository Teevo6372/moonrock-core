import type { RuntimeEvent } from "./events.js";

export interface PublicRuntimeEvent {
  eventId: string;
  eventName: RuntimeEvent["eventName"];
  occurredAt: string;
  state: string;
  outcome: RuntimeEvent["outcome"];
  reasonCode: string;
}

export type StreamItem =
  | { type: "event"; event: PublicRuntimeEvent }
  | { type: "reset"; reasonCode: "STREAM_BACKPRESSURE_LIMIT" };

export interface EventSubscription {
  next(): Promise<StreamItem | null>;
  cancel(): void;
}

interface Subscriber {
  sessionId: string;
  queue: StreamItem[];
  waiter: ((item: StreamItem | null) => void) | null;
  closed: boolean;
  maxQueue: number;
}

export class BoundedEventStreamHub {
  readonly #subscribers = new Set<Subscriber>();

  subscribe(sessionId: string, maxQueue = 100): EventSubscription {
    if (!Number.isInteger(maxQueue) || maxQueue < 1 || maxQueue > 1_000) {
      throw new Error("maxQueue must be between 1 and 1000");
    }
    const subscriber: Subscriber = {
      sessionId,
      queue: [],
      waiter: null,
      closed: false,
      maxQueue,
    };
    this.#subscribers.add(subscriber);
    return {
      next: () => this.#next(subscriber),
      cancel: () => this.#close(subscriber),
    };
  }

  publish(event: PublicRuntimeEvent, sessionId: string): void {
    for (const subscriber of this.#subscribers) {
      if (subscriber.sessionId !== sessionId || subscriber.closed) continue;
      const item: StreamItem = { type: "event", event: structuredClone(event) };
      if (subscriber.waiter) {
        const waiter = subscriber.waiter;
        subscriber.waiter = null;
        waiter(item);
        continue;
      }
      if (subscriber.queue.length >= subscriber.maxQueue) {
        subscriber.queue = [{
          type: "reset",
          reasonCode: "STREAM_BACKPRESSURE_LIMIT",
        }];
        this.#close(subscriber, false);
        continue;
      }
      subscriber.queue.push(item);
    }
  }

  #next(subscriber: Subscriber): Promise<StreamItem | null> {
    const item = subscriber.queue.shift();
    if (item) return Promise.resolve(item);
    if (subscriber.closed) return Promise.resolve(null);
    return new Promise((resolve) => {
      subscriber.waiter = resolve;
    });
  }

  #close(subscriber: Subscriber, clearQueue = true): void {
    subscriber.closed = true;
    this.#subscribers.delete(subscriber);
    if (clearQueue) subscriber.queue = [];
    if (subscriber.waiter) {
      subscriber.waiter(null);
      subscriber.waiter = null;
    }
  }
}

export function projectPublicEvent(event: RuntimeEvent): PublicRuntimeEvent {
  return {
    eventId: event.eventId,
    eventName: event.eventName,
    occurredAt: event.occurredAt,
    state: event.state,
    outcome: event.outcome,
    reasonCode: event.reasonCode,
  };
}
