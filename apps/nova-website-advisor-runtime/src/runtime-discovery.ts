import type { BusinessPath, DiagnosticInput } from "./diagnostic-engine.js";
import { startNovaDiscovery, submitNovaDiscoveryAnswer } from "./discovery-api-contract.js";
import type { DiscoverySessionState } from "./discovery-session.js";

export interface RuntimeDiscoveryState {
  sessionId: string;
  discovery: DiscoverySessionState;
}

export function beginRuntimeDiscovery(sessionId: string, path: BusinessPath): RuntimeDiscoveryState {
  const result = startNovaDiscovery(path);
  return { sessionId, discovery: result.state };
}

export function continueRuntimeDiscovery(state: RuntimeDiscoveryState, field: keyof DiagnosticInput, value: unknown): RuntimeDiscoveryState {
  const result = submitNovaDiscoveryAnswer(state.discovery, field, value);
  return { sessionId: state.sessionId, discovery: result.state };
}
