import { randomUUID } from "node:crypto";

export type EventName =
  | "session.opened"
  | "disclosure.presented"
  | "message.accepted"
  | "message.blocked"
  | "intent.classified"
  | "route.proposed"
  | "consent.recorded"
  | "tool.requested"
  | "tool.denied"
  | "tool.started"
  | "tool.succeeded"
  | "tool.outcome_unknown"
  | "tool.failed"
  | "booking.confirmed"
  | "escalation.created"
  | "session.completed"
  | "runtime.degraded";

export interface RuntimeEvent {
  eventId: string;
  eventName: EventName;
  occurredAt: string;
  environment: "test";
  correlationId: string;
  sessionId: string;
  state: string;
  outcome:
    | "started"
    | "accepted"
    | "confirmed"
    | "denied"
    | "failed"
    | "outcome_unknown"
    | "degraded";
  severity: "info" | "warning" | "high" | "critical";
  reasonCode: string;
  release: {
    runtimeVersion: "0.1.0";
    promptVersion: "nova-web-prompt-1.0.0-draft";
    policyVersion: "nova-web-policy-1.0.0-draft";
    knowledgeVersion: string;
    modelId: "mock-model";
  };
}

export interface EventSink {
  emit(event: RuntimeEvent): void;
}

export class InMemoryEventSink implements EventSink {
  readonly events: RuntimeEvent[] = [];

  emit(event: RuntimeEvent): void {
    this.events.push(structuredClone(event));
  }
}

export function createEvent(input: {
  name: EventName;
  correlationId: string;
  sessionId: string;
  state: string;
  outcome: RuntimeEvent["outcome"];
  severity?: RuntimeEvent["severity"];
  reasonCode: string;
  knowledgeVersion: string;
  now?: Date;
}): RuntimeEvent {
  return {
    eventId: randomUUID(),
    eventName: input.name,
    occurredAt: (input.now ?? new Date()).toISOString(),
    environment: "test",
    correlationId: input.correlationId,
    sessionId: input.sessionId,
    state: input.state,
    outcome: input.outcome,
    severity: input.severity ?? "info",
    reasonCode: input.reasonCode,
    release: {
      runtimeVersion: "0.1.0",
      promptVersion: "nova-web-prompt-1.0.0-draft",
      policyVersion: "nova-web-policy-1.0.0-draft",
      knowledgeVersion: input.knowledgeVersion,
      modelId: "mock-model",
    },
  };
}

