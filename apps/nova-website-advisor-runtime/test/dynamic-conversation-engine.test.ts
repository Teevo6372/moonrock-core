import { describe, expect, it, vi } from "vitest";
import { SessionGroundedNovaConversationEngine } from "../src/dynamic-conversation-engine.js";
import type { NovaConversationGenerator } from "../src/dynamic-conversation-engine.js";
import { normalizeDiscoveryAnswer } from "../src/conversation-normalizer.js";
import type { DiscoverySessionState } from "../src/discovery-session.js";

function completedState(): DiscoverySessionState {
  return {
    path: "existing_business",
    completed: true,
    answers: {
      path: "existing_business",
      businessName: "Prairie Service Co",
      industry: "home services",
      businessChallenges: "We miss evening calls and follow-up can get delayed.",
      monthlyLeads: 40,
      missedCallsPerMonth: 8,
      medianLeadResponseMinutes: 45,
      averageJobValueUsd: 1200,
      closeRatePercent: 30,
      appointmentsNeedManualScheduling: true,
      estimatesNeedManualFollowUp: true,
      repetitiveSupportLoad: "medium",
      dormantCustomerList: true,
      departmentsAffected: 3,
    },
  };
}

describe("SessionGroundedNovaConversationEngine", () => {
  // Ascension funnel v2: every completed Flight Plan now recommends Moonrock
  // Launch Plan ($97/mo, $499 setup) regardless of bottleneck signals - see
  // diagnostic-engine.ts's chooseOffer.
  it("answers pricing questions from the completed Flight Plan context", async () => {
    const engine = new SessionGroundedNovaConversationEngine();
    const turn = await engine.respond(completedState(), "What would this cost me?");
    expect(turn.mode).toBe("grounded_fallback");
    expect(turn.answer).toContain("Prairie Service Co");
    expect(turn.answer).toContain("$97/month");
    expect(turn.answer).toContain("$499");
  });

  it("keeps implementation answers grounded without exposing vendor names", async () => {
    const engine = new SessionGroundedNovaConversationEngine();
    const turn = await engine.respond(completedState(), "How would implementation work?");
    expect(turn.answer).toContain("validating the workflow");
    expect(turn.answer).toContain("vendor stack");
  });

  it("regression: does not fall back to the pre-completion discovery question once a Flight Plan exists (this previously caused a repeating-question lockup when the LLM provider failed)", async () => {
    const engine = new SessionGroundedNovaConversationEngine();
    const turn = await engine.respond(completedState(), "I can't afford that much per month, can we look at something smaller?");
    expect(turn.answer).not.toContain("before I recommend a starting plan");
    expect(turn.answer).toContain("Flight Plan");
  });

  it("retries the generator once before falling back, so a single transient provider failure does not surface the fallback", async () => {
    const generate = vi.fn<NovaConversationGenerator["generate"]>()
      .mockRejectedValueOnce(new Error("Groq request failed with 429"))
      .mockResolvedValueOnce("Here's a smaller option that fits your budget.");
    const engine = new SessionGroundedNovaConversationEngine({ generate });
    const turn = await engine.respond(completedState(), "Something smaller?");
    expect(generate).toHaveBeenCalledTimes(2);
    expect(turn.mode).toBe("generated");
    expect(turn.answer).toBe("Here's a smaller option that fits your budget.");
  });

  it("falls back gracefully (without throwing) when the generator fails on every attempt", async () => {
    const generate = vi.fn<NovaConversationGenerator["generate"]>().mockRejectedValue(new Error("Groq request failed with 503"));
    const engine = new SessionGroundedNovaConversationEngine({ generate });
    const turn = await engine.respond(completedState(), "Something smaller?");
    expect(turn.mode).toBe("grounded_fallback");
    expect(turn.answer).toContain("Flight Plan");
  });
});

describe("conversational clarification", () => {
  it("does not convert an unparseable required scope answer into zero", () => {
    const normalized = normalizeDiscoveryAnswer("departmentsAffected", "It kind of touches everything in different ways");
    expect(normalized.needsClarification).toBe(true);
    expect(normalized.value).not.toBe(0);
  });

  it("can count named business areas from conversational context", () => {
    const normalized = normalizeDiscoveryAnswer("departmentsAffected", "sales, support and admin");
    expect(normalized.value).toBe(3);
    expect(normalized.interpreted).toBe(true);
  });
});

describe("ascension funnel grounding in businessContext", () => {
  async function contextFromRespond(state: DiscoverySessionState, question = "Tell me more."): Promise<Record<string, unknown>> {
    const generate = vi.fn<NovaConversationGenerator["generate"]>().mockResolvedValue("ok");
    const engine = new SessionGroundedNovaConversationEngine({ generate });
    await engine.respond(state, question);
    return generate.mock.calls[0]![0].businessContext;
  }

  // Sellable add-ons flow through approvedServiceCatalog() (see
  // ai-employee-catalog.ts), never as a raw alaCarteCatalog dump — keeping
  // grounding to the same approved-name list the system prompt enforces.
  it("never injects the raw a-la-carte catalog object into businessContext (add-ons flow via approvedServiceCatalog instead)", async () => {
    const context = await contextFromRespond(completedState());
    expect(context.alaCarteCatalog).toBeUndefined();
  });

  it("never leaks the internal GHL-native-component note into the LLM prompt context", async () => {
    const context = await contextFromRespond(completedState());
    const serialized = JSON.stringify(context);
    expect(serialized).not.toContain("GHL");
    expect(serialized).not.toContain("ghlNativeComponentNote");
  });

  // Ascension funnel v2: classifyServiceTier always resolves ai_employee (see
  // diagnostic-engine.ts), and composeCrossTierBundle only ever applies to the
  // website_build tier, so activeBundle is always undefined right now - the prior
  // "website-build signal produces an active bundle" case is unreachable until
  // website_build is a sellable tier again.
  it("never includes activeBundle now that website_build/ghl_saas/ala_carte are paused", async () => {
    const withoutSignal = await contextFromRespond(completedState());
    expect(withoutSignal.activeBundle).toBeUndefined();

    const websiteBuildState: DiscoverySessionState = {
      path: "existing_business",
      completed: false,
      answers: { path: "existing_business", hasExistingWebsite: false, websiteMustHaves: "We need a quote form on the new site." },
    };
    const withSignal = await contextFromRespond(websiteBuildState);
    expect(withSignal.activeBundle).toBeUndefined();
  });

  // Ascension funnel v2: fastTrack (a path toward AI Employees/AI Workforce)
  // is paused along with the rest of the old multi-tier catalog - every
  // visitor already lands on the one active offer, so it never appears now,
  // even when the underlying signals that used to trigger it are present.
  it("never includes fastTrack now that the ascension ladder is paused", async () => {
    const plainState: DiscoverySessionState = { path: "existing_business", completed: false, answers: { path: "existing_business", missedCallsPerMonth: 3 } };
    const notEligible = await contextFromRespond(plainState);
    expect(notEligible.fastTrack).toBeUndefined();

    const eligibleSignalsState: DiscoverySessionState = {
      path: "existing_business",
      completed: false,
      answers: { path: "existing_business", businessChallenges: "We operate across 5 locations." },
    };
    const stillNotEligible = await contextFromRespond(eligibleSignalsState);
    expect(stillNotEligible.fastTrack).toBeUndefined();
  });

  it("keeps the grounded fallback price-accurate", async () => {
    const engine = new SessionGroundedNovaConversationEngine();
    const turn = await engine.respond(completedState(), "What would this cost me?");
    expect(turn.mode).toBe("grounded_fallback");
    expect(turn.answer).toContain("$97/month");
  });

  // Bug found reviewing a real visitor transcript: a visitor asked "doesn't
  // this plan currently offer 0 setup cost" and Nova had no way to answer -
  // foundingCustomerEligible never reached businessContext at all, so the
  // Flight Plan (and every grounded fallback) always showed the $499 standard
  // fee even when the homepage's own founding-customer offer was still live.
  it("always includes foundingOffer, even before a Flight Plan exists, reflecting the session's frozen founding-eligibility snapshot", async () => {
    const notEligibleContext = await contextFromRespond({ path: "existing_business", completed: false, answers: { path: "existing_business" } });
    expect(notEligibleContext.foundingOffer).toEqual({ eligible: false, foundingSetupFeeUsd: 0, standardSetupFeeUsd: 499 });

    const eligibleContext = await contextFromRespond({ path: "existing_business", completed: false, foundingCustomerEligible: true, answers: { path: "existing_business" } });
    expect(eligibleContext.foundingOffer).toEqual({ eligible: true, foundingSetupFeeUsd: 0, standardSetupFeeUsd: 499 });
  });

  it("prices the completed Flight Plan at the $0 founding setup fee when the session was started while founding slots were open", async () => {
    const context = await contextFromRespond({ ...completedState(), foundingCustomerEligible: true });
    expect((context.flightPlan as { recommendation: { setupFeeUsd: number } }).recommendation.setupFeeUsd).toBe(0);
  });

  it("keeps the grounded fallback's stated setup fee in sync with foundingOffer instead of always quoting the standard fee", async () => {
    const engine = new SessionGroundedNovaConversationEngine();
    const turn = await engine.respond({ ...completedState(), foundingCustomerEligible: true }, "What would this cost me?");
    expect(turn.answer).toContain("$0 setup");
    expect(turn.answer).not.toContain("$499");
  });
});

describe("tool-calling path (usesToolCalling) vs. context-stuffing path (Groq)", () => {
  it("a plain (Groq-shaped) generator with no usesToolCalling marker still receives the full pre-computed context and no addendum/toolContext dependency - proving the Groq fallback path is unaffected by this migration", async () => {
    const generate = vi.fn<NovaConversationGenerator["generate"]>().mockResolvedValue("ok");
    const engine = new SessionGroundedNovaConversationEngine({ generate });
    await engine.respond(completedState(), "Tell me more.");
    const call = generate.mock.calls[0]![0];
    expect(call.system).not.toContain("TOOL-CALLING RULE");
    expect(call.volatileSystemSuffix).toBeUndefined();
    expect(call.businessContext.flightPlan).toBeDefined();
    expect(call.businessContext.approvedServiceCatalog).toBeDefined();
  });

  it("a generator marked usesToolCalling receives the addendum, a stripped context, and toolContext, with turn guidance carried separately for caching", async () => {
    const generate = vi.fn<NovaConversationGenerator["generate"]>().mockResolvedValue("ok");
    const generator: NovaConversationGenerator = { generate, usesToolCalling: true };
    const engine = new SessionGroundedNovaConversationEngine(generator);
    await engine.respond(completedState(), "Tell me more.", { opening: true });
    const call = generate.mock.calls[0]![0];
    expect(call.system).toContain("TOOL-CALLING RULE");
    expect(call.volatileSystemSuffix).toContain("TURN GUIDANCE");
    expect(call.system).not.toContain("TURN GUIDANCE");
    expect(call.toolContext).toBeDefined();
    expect(call.toolContext?.answers.businessName).toBe("Prairie Service Co");
    expect(call.toolContext?.state.completed).toBe(true);
    for (const commercialKey of ["activeBundle", "flightPlan", "flightPlanConfidence", "fastTrack", "alaCarteCatalog", "approvedServiceCatalog", "salesJourney"]) {
      expect(call.businessContext[commercialKey]).toBeUndefined();
    }
  });
});
