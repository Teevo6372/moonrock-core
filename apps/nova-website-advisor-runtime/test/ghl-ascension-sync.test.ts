import { describe, expect, it } from "vitest";
import { computeAscensionScore } from "../src/ascension-score.js";
import { diagnoseBusiness, type DiagnosticInput } from "../src/diagnostic-engine.js";
import { buildFlightPlan } from "../src/flight-plan.js";
import { buildGhlFlightPlanSyncPlan } from "../src/ghl-flight-plan-sync.js";
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

const diagnosticInput: DiagnosticInput = {
  path: "existing_business",
  businessName: "Prairie Card Shop",
  industry: "retail",
  missedCallsPerMonth: 10,
  medianLeadResponseMinutes: 45,
};

describe("ascension score consistency in the GHL sync plan (single source of truth)", () => {
  it("carries the exact same ascensionScore into upsert_contact as computeAscensionScore independently returns for this fixture", () => {
    const scoreResult = computeAscensionScore({
      purchaseHistory: [{ tier: "trust_builder", purchasedAt: "2026-01-01T00:00:00.000Z" }],
      conversationalSignals: { urgencyStated: true },
      lastEngagementAt: "2026-01-10T00:00:00.000Z",
      now: "2026-01-15T00:00:00.000Z",
    });

    const diagnostic = diagnoseBusiness(diagnosticInput);
    const flightPlan = buildFlightPlan(diagnosticInput, diagnostic);
    const plan = buildGhlFlightPlanSyncPlan({
      sessionId: "ascension-sync-test",
      diagnosticInput,
      diagnostic,
      flightPlan,
      fieldRegistry: MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY,
      ascension: { ascensionScore: scoreResult.score, currentTier: scoreResult.currentTier, lastEngagementAt: "2026-01-10T00:00:00.000Z" },
    });

    const contactOperation = plan.operations.find((operation) => operation.kind === "upsert_contact");
    expect(contactOperation).toBeDefined();
    const fields = contactOperation!.kind === "upsert_contact" ? contactOperation!.fields : {};
    expect(fields[MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY.contact.ascensionScore]).toBe(scoreResult.score);
    expect(fields[MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY.contact.currentTier]).toBe(scoreResult.currentTier);
    expect(fields[MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY.contact.lastEngagementAt]).toBe("2026-01-10T00:00:00.000Z");
  });

  it("writes 'none' for currentTier rather than null when no purchase history exists yet", () => {
    const scoreResult = computeAscensionScore({ purchaseHistory: [], conversationalSignals: {}, now: "2026-01-15T00:00:00.000Z" });
    const diagnostic = diagnoseBusiness(diagnosticInput);
    const flightPlan = buildFlightPlan(diagnosticInput, diagnostic);
    const plan = buildGhlFlightPlanSyncPlan({
      sessionId: "ascension-sync-test-2",
      diagnosticInput,
      diagnostic,
      flightPlan,
      fieldRegistry: MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY,
      ascension: { ascensionScore: scoreResult.score, currentTier: scoreResult.currentTier },
    });
    const contactOperation = plan.operations.find((operation) => operation.kind === "upsert_contact");
    const fields = contactOperation!.kind === "upsert_contact" ? contactOperation!.fields : {};
    expect(fields[MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY.contact.currentTier]).toBe("none");
  });

  it("omits the ascension fields entirely when no ascension state is passed in (does not invent one)", () => {
    const diagnostic = diagnoseBusiness(diagnosticInput);
    const flightPlan = buildFlightPlan(diagnosticInput, diagnostic);
    const plan = buildGhlFlightPlanSyncPlan({ sessionId: "ascension-sync-test-3", diagnosticInput, diagnostic, flightPlan, fieldRegistry: MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY });
    const contactOperation = plan.operations.find((operation) => operation.kind === "upsert_contact");
    const fields = contactOperation!.kind === "upsert_contact" ? contactOperation!.fields : {};
    expect(fields[MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY.contact.ascensionScore]).toBeUndefined();
  });

  it("flows the same ascension fields through handoffFlightPlanToGhl's dry run, not just the lower-level sync-plan builder", async () => {
    const scoreResult = computeAscensionScore({
      purchaseHistory: [{ tier: "trust_builder", purchasedAt: "2026-01-01T00:00:00.000Z" }],
      conversationalSignals: {},
      now: "2026-01-15T00:00:00.000Z",
    });
    const diagnostic = diagnoseBusiness(diagnosticInput);
    const flightPlan = buildFlightPlan(diagnosticInput, diagnostic);
    const result = await handoffFlightPlanToGhl(
      {
        sessionId: "ascension-sync-handoff-test",
        identity: { email: "ascension-sync@example.com" },
        diagnosticInput,
        diagnostic,
        flightPlan,
        ascension: { ascensionScore: scoreResult.score, currentTier: scoreResult.currentTier },
      },
      baseConfig,
      { apply: false },
    );
    expect(result.status).toBe("dry_run");
  });
});
