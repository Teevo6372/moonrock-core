import type { RuntimeEvent } from "./events.js";

export interface RuntimeQualitySnapshot {
  generatedAt: string;
  eventCount: number;
  sessionCount: number;
  acceptedMessages: number;
  blockedMessages: number;
  escalations: number;
  confirmedBookings: number;
  toolDenied: number;
  providerOutcomeUnknown: number;
  degradedEvents: number;
  approvalComplianceRate: number;
}

export function buildQualitySnapshot(
  events: readonly RuntimeEvent[],
  now = new Date(),
): RuntimeQualitySnapshot {
  const count = (name: RuntimeEvent["eventName"]) =>
    events.filter((event) => event.eventName === name).length;
  const toolStarts = count("tool.started");
  const toolSuccess = count("tool.succeeded") + count("booking.confirmed");
  return {
    generatedAt: now.toISOString(),
    eventCount: events.length,
    sessionCount: new Set(events.map((event) => event.sessionId)).size,
    acceptedMessages: count("message.accepted"),
    blockedMessages: count("message.blocked"),
    escalations: count("escalation.created"),
    confirmedBookings: count("booking.confirmed"),
    toolDenied: count("tool.denied"),
    providerOutcomeUnknown: count("tool.outcome_unknown"),
    degradedEvents: count("runtime.degraded"),
    approvalComplianceRate: toolStarts === 0
      ? 1
      : Math.min(1, toolSuccess / toolStarts),
  };
}
