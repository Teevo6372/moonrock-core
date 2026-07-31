import type { EventSink, RuntimeEvent } from "./events.js";

const prohibitedKeys = new Set([
  "message",
  "messageText",
  "responseText",
  "transcript",
  "email",
  "phone",
  "firstName",
  "lastName",
  "secret",
  "token",
  "credential",
]);
const secretPattern =
  /\b(?:sk-|pit-)[a-z0-9_-]{16,}|\b(?:password|api[_ -]?key|access[_ -]?token)\s*[:=]/i;

export class UnsafeObservabilityEventError extends Error {}

function inspect(value: unknown, path = "$"): void {
  if (typeof value === "string") {
    if (secretPattern.test(value)) {
      throw new UnsafeObservabilityEventError(
        `Observability value contains prohibited secret material at ${path}`,
      );
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (prohibitedKeys.has(key)) {
      throw new UnsafeObservabilityEventError(
        `Observability event contains prohibited field at ${path}.${key}`,
      );
    }
    inspect(child, `${path}.${key}`);
  }
}

export class RedactedEventSink implements EventSink {
  constructor(private readonly destination: EventSink) {}

  emit(event: RuntimeEvent): void {
    inspect(event);
    this.destination.emit(structuredClone(event));
  }
}

export function verifyRedactedArtifact(value: unknown): true {
  inspect(value);
  return true;
}
