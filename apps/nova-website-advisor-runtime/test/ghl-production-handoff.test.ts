import { describe, expect, it } from "vitest";
import { diagnoseBusiness, type DiagnosticInput } from "../src/diagnostic-engine.js";
import { buildFlightPlan } from "../src/flight-plan.js";
import { formatConversationTranscript, handoffFlightPlanToGhl, type ProductionGhlContactIdentity } from "../src/ghl-production-handoff.js";
import { MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY } from "../src/ghl-production-registry.js";

const baseConfig = {
  enabled: true,
  fieldsVerified: true,
  writesEnabled: false,
  locationId: "dry-run-location",
  accessToken: "dry-run-token",
  fieldRegistry: MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY,
} as const;

function handoffFor(diagnosticInput: DiagnosticInput, identity: ProductionGhlContactIdentity = { email: "unit-test@example.com" }) {
  const diagnostic = diagnoseBusiness(diagnosticInput);
  const flightPlan = buildFlightPlan(diagnosticInput, diagnostic);
  return handoffFlightPlanToGhl(
    { sessionId: "unit-test-session", identity, diagnosticInput, diagnostic, flightPlan },
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

describe("handoffFlightPlanToGhl followUpEnabled reporting", () => {
  const diagnosticInput: DiagnosticInput = {
    path: "existing_business",
    businessName: "Prairie Card Shop",
    industry: "retail",
    missedCallsPerMonth: 10,
    medianLeadResponseMinutes: 45,
  };

  it("reports true only when the identity actually carried followUpConsent", async () => {
    const result = await handoffFor(diagnosticInput, { email: "unit-test@example.com", followUpConsent: true });
    expect(result.followUpEnabled).toBe(true);
  });

  it("reports false when followUpConsent was not given", async () => {
    const result = await handoffFor(diagnosticInput, { email: "unit-test@example.com" });
    expect(result.followUpEnabled).toBe(false);
  });

  it("reports false when followUpConsent is explicitly false", async () => {
    const result = await handoffFor(diagnosticInput, { email: "unit-test@example.com", followUpConsent: false });
    expect(result.followUpEnabled).toBe(false);
  });
});

describe("formatConversationTranscript", () => {
  it("renders each turn as 'Visitor: ...' / 'Nova: ...' in order, one per line", () => {
    const transcript = formatConversationTranscript([
      { role: "visitor", text: "We miss a lot of calls.", at: "2026-01-01T00:00:00.000Z" },
      { role: "nova", text: "Tell me more about that.", at: "2026-01-01T00:00:01.000Z" },
    ]);
    expect(transcript).toBe("Visitor: We miss a lot of calls.\nNova: Tell me more about that.");
  });

  it("returns an empty string for an empty history", () => {
    expect(formatConversationTranscript([])).toBe("");
  });
});
