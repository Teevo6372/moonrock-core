import { describe, expect, it } from "vitest";
import { diagnoseBusiness, type DiagnosticInput } from "../src/diagnostic-engine.js";
import { buildFlightPlan } from "../src/flight-plan.js";
import { handoffFlightPlanToGhl } from "../src/ghl-production-handoff.js";
import { MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY } from "../src/ghl-production-registry.js";

const baseConfig = {
  enabled: true,
  fieldsVerified: true,
  writesEnabled: false,
  locationId: "dry-run-location",
  accessToken: "dry-run-token",
  fieldRegistry: MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY,
} as const;

function handoffFor(diagnosticInput: DiagnosticInput) {
  const diagnostic = diagnoseBusiness(diagnosticInput);
  const flightPlan = buildFlightPlan(diagnosticInput, diagnostic);
  return handoffFlightPlanToGhl(
    { sessionId: "unit-test-session", identity: { email: "unit-test@example.com" }, diagnosticInput, diagnostic, flightPlan },
    baseConfig,
    { apply: false },
  );
}

describe("handoffFlightPlanToGhl autonomousCloseAllowed reporting", () => {
  it("reports true (matching the nova-autonomous-close tag) when no price override is needed", async () => {
    const result = await handoffFor({
      path: "existing_business",
      businessName: "Prairie Card Shop",
      industry: "retail",
      missedCallsPerMonth: 10,
      medianLeadResponseMinutes: 45,
    });
    expect(result.autonomousCloseAllowed).toBe(true);
  });

  it("reports false (matching the nova-human-review tag) when the request needs override approval", async () => {
    const result = await handoffFor({
      path: "existing_business",
      businessName: "Sprawling Multi-Site Retailer",
      industry: "retail",
      missedCallsPerMonth: 10,
      medianLeadResponseMinutes: 45,
      requestedCustomIntegrations: 3,
    });
    expect(result.autonomousCloseAllowed).toBe(false);
  });
});
