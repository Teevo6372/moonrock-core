import { describe, expect, it } from "vitest";
import { AI_EMPLOYEE_CATALOG, GHL_SAAS_CATALOG, WEBSITE_BUILD_CATALOG } from "../src/ai-employee-catalog.js";
import { ALA_CARTE_CATALOG } from "../src/ala-carte-catalog.js";
import { executeNovaTool, NOVA_TOOL_DEFINITIONS, type NovaToolContext } from "../src/anthropic-tools.js";
import { diagnoseBusiness, diagnoseGhlSaas, diagnoseWebsiteBuild, type DiagnosticInput } from "../src/diagnostic-engine.js";
import { evaluateFastTrack } from "../src/fast-track.js";
import type { DiscoverySessionState } from "../src/discovery-session.js";
import { TIER0_CATALOG } from "../src/tier0-catalog.js";

function ctx(answers: Partial<DiagnosticInput>, stateOverrides: Partial<DiscoverySessionState> = {}): NovaToolContext {
  const state: DiscoverySessionState = { path: "existing_business", completed: false, answers, ...stateOverrides };
  return { answers, state };
}

describe("NOVA_TOOL_DEFINITIONS", () => {
  it("declares one entry per tool with strict schema validation", () => {
    expect(NOVA_TOOL_DEFINITIONS.map((tool) => tool.name)).toEqual([
      "get_business_diagnosis",
      "get_website_build_diagnosis",
      "get_ghl_saas_diagnosis",
      "classify_service_tier",
      "get_catalog",
      "compose_bundle",
      "build_flight_plan",
      "check_fast_track_eligibility",
      "get_ascension_state",
      "get_conversation_sale_total",
      "get_tier0_catalog",
    ]);
    for (const tool of NOVA_TOOL_DEFINITIONS) expect(tool.strict).toBe(true);
  });
});

describe("executeNovaTool", () => {
  const businessInput: Partial<DiagnosticInput> = {
    path: "existing_business",
    businessChallenges: "We miss evening calls and follow-up can get delayed.",
    missedCallsPerMonth: 8,
    medianLeadResponseMinutes: 45,
  };

  it("get_business_diagnosis dispatches to diagnoseBusiness with the same input", () => {
    const result = executeNovaTool("get_business_diagnosis", {}, ctx(businessInput));
    expect(result).toEqual(diagnoseBusiness(businessInput as DiagnosticInput));
  });

  it("get_website_build_diagnosis dispatches to diagnoseWebsiteBuild", () => {
    const input: Partial<DiagnosticInput> = { path: "existing_business", hasExistingWebsite: false, websiteScopeNeeded: "multi_page" };
    const result = executeNovaTool("get_website_build_diagnosis", {}, ctx(input));
    expect(result).toEqual(diagnoseWebsiteBuild(input as DiagnosticInput));
  });

  it("get_ghl_saas_diagnosis dispatches to diagnoseGhlSaas", () => {
    const input: Partial<DiagnosticInput> = { path: "existing_business", isAgencyOrReseller: true, numberOfClientsManaged: 12 };
    const result = executeNovaTool("get_ghl_saas_diagnosis", {}, ctx(input));
    expect(result).toEqual(diagnoseGhlSaas(input as DiagnosticInput));
  });

  it("classify_service_tier dispatches to classifyServiceTier", () => {
    const result = executeNovaTool("classify_service_tier", {}, ctx(businessInput)) as { tier: string };
    expect(result.tier).toBe("ai_employee");
  });

  it("get_catalog returns the exact catalog object values for each tier", () => {
    expect(executeNovaTool("get_catalog", { tier: "ai_employee" }, ctx({ path: "existing_business" }))).toEqual(Object.values(AI_EMPLOYEE_CATALOG));
    expect(executeNovaTool("get_catalog", { tier: "website_build" }, ctx({ path: "existing_business" }))).toEqual(Object.values(WEBSITE_BUILD_CATALOG));
    expect(executeNovaTool("get_catalog", { tier: "ghl_saas" }, ctx({ path: "existing_business" }))).toEqual(Object.values(GHL_SAAS_CATALOG));
    expect(executeNovaTool("get_catalog", { tier: "ala_carte" }, ctx({ path: "existing_business" }))).toEqual(Object.values(ALA_CARTE_CATALOG));
  });

  it("get_catalog throws on an unknown tier rather than silently returning nothing", () => {
    expect(() => executeNovaTool("get_catalog", { tier: "bogus" }, ctx({ path: "existing_business" }))).toThrow();
  });

  it("compose_bundle auto-attaches CRM per the Always-Bundle rule", () => {
    const result = executeNovaTool("compose_bundle", { requestedItemIds: ["reputation_management"] }, ctx({ path: "existing_business" })) as { crmAutoAttached: boolean; lineItems: Array<{ itemId: string }> };
    expect(result.crmAutoAttached).toBe(true);
    expect(result.lineItems.some((item) => item.itemId === "crm_pipeline")).toBe(true);
  });

  it("compose_bundle respects an explicit hasExistingCrm override from Claude's input over ctx.answers", () => {
    const result = executeNovaTool(
      "compose_bundle",
      { requestedItemIds: ["reputation_management"], hasExistingCrm: true },
      ctx({ path: "existing_business", hasExistingCrm: false }),
    ) as { crmAutoAttached: boolean };
    expect(result.crmAutoAttached).toBe(false);
  });

  it("build_flight_plan returns a preliminary plan even before discovery completes", () => {
    const result = executeNovaTool("build_flight_plan", {}, ctx(businessInput, { completed: false })) as { status: string };
    expect(result.status).toBe("preliminary");
  });

  it("build_flight_plan returns a confirmed plan once the session is marked completed", () => {
    const result = executeNovaTool("build_flight_plan", {}, ctx(businessInput, { completed: true })) as { status: string };
    expect(result.status).toBe("confirmed");
  });

  it("check_fast_track_eligibility dispatches to evaluateFastTrack with the diagnosis's own bottlenecks", () => {
    const input: Partial<DiagnosticInput> = { path: "existing_business", businessChallenges: "We operate across 5 locations." };
    const result = executeNovaTool("check_fast_track_eligibility", {}, ctx(input));
    const diagnostic = diagnoseBusiness(input as DiagnosticInput);
    expect(result).toEqual(evaluateFastTrack(input as DiagnosticInput, diagnostic.bottlenecks));
  });

  it("get_ascension_state is a read-only passthrough of already-computed session fields, never a recomputation", () => {
    const result = executeNovaTool(
      "get_ascension_state",
      {},
      ctx({ path: "existing_business" }, { ascensionScore: 42, ascensionBand: "warm", currentTier: "trust_builder", lastOfferedTier: "ascension_addon" }),
    );
    expect(result).toEqual({ ascensionScore: 42, ascensionBand: "warm", currentTier: "trust_builder", lastOfferedTier: "ascension_addon" });
  });

  it("get_conversation_sale_total returns a zero total with no cumulative-value review needed for a fresh session", () => {
    const result = executeNovaTool("get_conversation_sale_total", {}, ctx({ path: "existing_business" }));
    expect(result).toEqual({ monthlyCommitmentUsd: 0, oneTimeValueUsd: 0, saleCount: 0, requiresCumulativeValueReview: false });
  });

  it("get_conversation_sale_total sums conversationSalesClosed off session state and flags the $700/mo cumulative threshold", () => {
    const state = ctx({ path: "existing_business" }, {
      conversationSalesClosed: [
        { offerId: "sales_follow_up", offerName: "AI Sales & Follow-Up Agent", ladderTier: "ai_employee", setupFeeUsd: 250, monthlyFeeUsd: 499, closedAt: "2026-01-01T00:00:00.000Z" },
        { offerId: "customer_care", offerName: "AI Customer Care Agent", ladderTier: "ai_employee", setupFeeUsd: 150, monthlyFeeUsd: 299, closedAt: "2026-01-01T00:05:00.000Z" },
      ],
    });
    const result = executeNovaTool("get_conversation_sale_total", {}, state);
    expect(result).toEqual({ monthlyCommitmentUsd: 798, oneTimeValueUsd: 400, saleCount: 2, requiresCumulativeValueReview: true });
  });

  it("get_tier0_catalog returns the full catalog with no filters", () => {
    const result = executeNovaTool("get_tier0_catalog", {}, ctx({ path: "existing_business" }));
    expect(result).toEqual(TIER0_CATALOG);
  });

  it("get_tier0_catalog filters by subTier and category", () => {
    const result = executeNovaTool("get_tier0_catalog", { subTier: "0b" }, ctx({ path: "existing_business" })) as Array<{ subTier: string }>;
    expect(result).toHaveLength(20);
    expect(result.every((product) => product.subTier === "0b")).toBe(true);
  });

  it("throws on an unknown tool name", () => {
    expect(() => executeNovaTool("not_a_real_tool", {}, ctx({ path: "existing_business" }))).toThrow();
  });
});
