import type { DiagnosticInput, DiagnosticResult } from "./diagnostic-engine.js";
import type { FlightPlan } from "./flight-plan.js";
import { mapDiscoveryToGhl, type GhlDiscoveryPayload } from "./ghl-discovery-mapping.js";
import type { GhlFieldRegistry } from "./ghl-field-registry.js";

export type GhlFlightPlanOperation =
  | { kind: "upsert_contact"; fields: GhlDiscoveryPayload["contactFields"] }
  | { kind: "upsert_opportunity"; fields: GhlDiscoveryPayload["opportunityFields"] }
  | { kind: "add_tags"; tags: string[] }
  | { kind: "add_note"; note: string };

export interface GhlFlightPlanSyncPlan {
  sessionId: string;
  idempotencyKey: string;
  operations: GhlFlightPlanOperation[];
  autonomousCloseAllowed: boolean;
}

export interface GhlFlightPlanSyncConfig {
  enabled: boolean;
  locationId: string | null;
  fieldsVerified: boolean;
  fieldRegistry: GhlFieldRegistry;
}

export class GhlFlightPlanSyncDisabledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GhlFlightPlanSyncDisabledError";
  }
}

export function buildGhlFlightPlanSyncPlan(input: {
  sessionId: string;
  diagnosticInput: DiagnosticInput;
  diagnostic: DiagnosticResult;
  flightPlan: FlightPlan;
  fieldRegistry: GhlFieldRegistry;
}): GhlFlightPlanSyncPlan {
  const payload = mapDiscoveryToGhl(
    input.diagnosticInput,
    input.diagnostic,
    input.flightPlan,
    input.fieldRegistry,
  );
  return {
    sessionId: input.sessionId,
    idempotencyKey: `moonrock2:flight-plan:${input.sessionId}`,
    autonomousCloseAllowed: input.diagnostic.autonomousCloseAllowed,
    operations: [
      { kind: "upsert_contact", fields: payload.contactFields },
      { kind: "upsert_opportunity", fields: payload.opportunityFields },
      { kind: "add_tags", tags: payload.tags },
      { kind: "add_note", note: payload.note },
    ],
  };
}

export function assertGhlFlightPlanSyncReady(config: GhlFlightPlanSyncConfig): void {
  if (!config.enabled) throw new GhlFlightPlanSyncDisabledError("GHL Flight Plan sync is disabled");
  if (!config.locationId) throw new GhlFlightPlanSyncDisabledError("GHL location ID is not configured");
  if (!config.fieldsVerified) throw new GhlFlightPlanSyncDisabledError("GHL field registry has not been verified");
  if (Object.values(config.fieldRegistry.contact).some((value) => !value)
    || Object.values(config.fieldRegistry.opportunity).some((value) => !value)) {
    throw new GhlFlightPlanSyncDisabledError("GHL field registry is incomplete");
  }
}

export interface GhlFlightPlanTransport {
  execute(input: {
    locationId: string;
    idempotencyKey: string;
    operation: GhlFlightPlanOperation;
  }): Promise<{ status: "confirmed" | "outcome_unknown"; providerObjectId?: string }>;
}

export async function executeGhlFlightPlanSync(
  plan: GhlFlightPlanSyncPlan,
  config: GhlFlightPlanSyncConfig,
  transport: GhlFlightPlanTransport,
): Promise<{ status: "confirmed" | "outcome_unknown"; completedOperations: number }> {
  assertGhlFlightPlanSyncReady(config);
  let completedOperations = 0;
  for (let index = 0; index < plan.operations.length; index += 1) {
    const result = await transport.execute({
      locationId: config.locationId!,
      idempotencyKey: `${plan.idempotencyKey}:${index + 1}`,
      operation: plan.operations[index]!,
    });
    if (result.status === "outcome_unknown") return { status: "outcome_unknown", completedOperations };
    completedOperations += 1;
  }
  return { status: "confirmed", completedOperations };
}
