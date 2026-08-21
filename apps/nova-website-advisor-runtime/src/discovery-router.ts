import { Hono } from "hono";
import type { DiagnosticInput } from "./diagnostic-engine.js";
import { startNovaDiscovery, submitNovaDiscoveryAnswer } from "./discovery-api-contract.js";
import { InMemoryDiscoveryStateRepository, type DiscoveryStateRepository } from "./discovery-state-repository.js";
import { isHumanHandoffRequest, SessionGroundedNovaConversationEngine, type NovaConversationEngine } from "./dynamic-conversation-engine.js";
import { handoffFlightPlanToGhl, handoffHumanRequestToGhl, type ProductionGhlContactIdentity, type ProductionGhlHandoffConfig } from "./ghl-production-handoff.js";
import { toImmersiveNovaView } from "./higgsfield-ui-adapter.js";
import { completedJourney, journeyForProgress } from "./nova-sales-journey.js";

export interface DiscoveryRouterOptions { productionGhl?: ProductionGhlHandoffConfig; conversationEngine?: NovaConversationEngine; }

export function createDiscoveryRouter(repository: DiscoveryStateRepository = new InMemoryDiscoveryStateRepository(), options: DiscoveryRouterOptions = {}): Hono {
  const router = new Hono();
  const conversationEngine = options.conversationEngine ?? new SessionGroundedNovaConversationEngine();

  router.post("/:sessionId/start", async (context) => {
    const sessionId = context.req.param("sessionId");
    const body = await context.req.json() as { path?: unknown; visitorId?: unknown; conversationId?: unknown; previousConversationSummary?: unknown };
    if (body.path !== "startup" && body.path !== "existing_business") return context.json({ code: "INVALID_DISCOVERY_PATH" }, 400);
    const visitorId = typeof body.visitorId === "string" && body.visitorId.trim() ? body.visitorId.trim() : `anonymous-${sessionId}`;
    const conversationId = typeof body.conversationId === "string" && body.conversationId.trim() ? body.conversationId.trim() : sessionId;
    const previousConversationSummary = typeof body.previousConversationSummary === "string" && body.previousConversationSummary.trim() ? body.previousConversationSummary.trim() : undefined;
    const result = startNovaDiscovery(body.path, { visitorId, conversationId, ...(previousConversationSummary ? { previousConversationSummary } : {}) });
    try { await repository.create(sessionId, result.state); } catch { return context.json({ code: "DISCOVERY_ALREADY_EXISTS" }, 409); }
    const openingText = body.path === "startup" ? "I'm starting something." : "My business needs to grow.";
    const conversationTurn = await conversationEngine.respond(result.state, openingText, { opening: true, progressPercent: 0 });
    return context.json({ ...result.response, conversationTurn, journey: journeyForProgress(0, false), view: toImmersiveNovaView(result.response) }, 201);
  });

  router.post("/:sessionId/answers", async (context) => {
    const sessionId = context.req.param("sessionId");
    const current = await repository.load(sessionId);
    if (!current) return context.json({ code: "DISCOVERY_NOT_FOUND" }, 404);
    if (current.state.completed) return context.json({ code: "DISCOVERY_COMPLETE" }, 409);
    const body = await context.req.json() as { field?: unknown; value?: unknown; identity?: ProductionGhlContactIdentity };
    if (typeof body.field !== "string" || !("value" in body)) return context.json({ code: "INVALID_DISCOVERY_ANSWER" }, 400);
    const rawCustomerText = typeof body.value === "string" ? body.value : String(body.value);
    if (isHumanHandoffRequest(rawCustomerText)) {
      const conversationTurn = await conversationEngine.respond(current.state, rawCustomerText);
      return context.json({ path: current.state.path, completed: current.state.completed, progress: { answered: Object.keys(current.state.answers).filter((key) => key !== "path").length, requiredRemaining: 0 }, progressiveFlightPlan: { phase: "listening", summary: "Discovery paused for a human handoff.", signals: [] }, conversationTurn, humanHandoff: { status: "contact_required", requestText: rawCustomerText, message: "Nova paused discovery. Add your contact details and Moonrock can continue from what you've already shared." }, view: { ...toImmersiveNovaView({ path: current.state.path, completed: false, progress: { answered: 0, requiredRemaining: 0 }, progressiveFlightPlan: { phase: "listening", summary: "Discovery paused for a human handoff.", signals: [] } }), visualState: "handoff" } });
    }

    const result = submitNovaDiscoveryAnswer(current.state, body.field as keyof DiagnosticInput, body.value);
    try { await repository.save(sessionId, result.state, current.version); } catch { return context.json({ code: "DISCOVERY_VERSION_CONFLICT" }, 409); }
    const view = toImmersiveNovaView(result.response);
    const journey = result.response.completed && result.response.result ? completedJourney(result.response.result.flightPlan) : journeyForProgress(view.progressPercent, false);

    let ghlHandoff: Awaited<ReturnType<typeof handoffFlightPlanToGhl>> | undefined;
    if (result.response.completed && result.response.result && options.productionGhl && body.identity?.email) ghlHandoff = await handoffFlightPlanToGhl({ sessionId, identity: body.identity, diagnosticInput: result.state.answers as DiagnosticInput, diagnostic: result.response.result.diagnostic, flightPlan: result.response.result.flightPlan }, options.productionGhl, { apply: options.productionGhl.enabled && options.productionGhl.fieldsVerified && options.productionGhl.writesEnabled });

    const conversationTurn = result.response.clarification
      ? { answer: result.response.clarification.message, mode: "grounded_fallback" as const, intent: "pause_discovery" as const }
      : result.response.completed
        ? await conversationEngine.respond(result.state, rawCustomerText, { progressPercent: 100 })
        : await conversationEngine.respond(result.state, rawCustomerText, { progressPercent: view.progressPercent, ...(result.response.nextQuestion ? { nextNeed: { field: String(result.response.nextQuestion.field), prompt: result.response.nextQuestion.prompt } } : {}) });
    return context.json({ ...result.response, conversationTurn, journey, ...(ghlHandoff ? { ghlHandoff } : {}), view });
  });

  router.post("/:sessionId/handoff", async (context) => {
    const sessionId = context.req.param("sessionId"); const current = await repository.load(sessionId);
    if (!current) return context.json({ code: "DISCOVERY_NOT_FOUND" }, 404);
    const body = await context.req.json() as { identity?: ProductionGhlContactIdentity; requestText?: unknown };
    if (!body.identity?.email?.trim()) return context.json({ code: "HANDOFF_CONTACT_REQUIRED", detail: "An email is required so a Moonrock person can follow up without making you start over." }, 400);
    if (typeof body.requestText !== "string" || !body.requestText.trim()) return context.json({ code: "HANDOFF_REQUEST_REQUIRED" }, 400);
    if (!options.productionGhl) return context.json({ code: "HANDOFF_UNAVAILABLE", detail: "Moonrock's handoff connection is not configured right now." }, 503);
    try { const result = await handoffHumanRequestToGhl({ sessionId, identity: body.identity, state: current.state, requestText: body.requestText }, options.productionGhl, { apply: options.productionGhl.enabled && options.productionGhl.fieldsVerified && options.productionGhl.writesEnabled }); return context.json({ humanHandoff: result, answer: result.status === "confirmed" ? "You're set. I saved what we covered and flagged this for a Moonrock person. You won't need to start over." : "I've got your handoff request ready, but Moonrock's live CRM writes are currently disabled." }); } catch (error) { return context.json({ code: "HANDOFF_FAILED", detail: error instanceof Error ? error.message : "Moonrock could not complete the handoff right now." }, 503); }
  });

  router.post("/:sessionId/conversation", async (context) => {
    const current = await repository.load(context.req.param("sessionId")); if (!current) return context.json({ code: "DISCOVERY_NOT_FOUND" }, 404);
    const body = await context.req.json() as { question?: unknown }; if (typeof body.question !== "string" || !body.question.trim()) return context.json({ code: "INVALID_NOVA_QUESTION" }, 400);
    try { const turn = await conversationEngine.respond(current.state, body.question, { progressPercent: current.state.completed ? 100 : 0 }); return context.json({ ...turn, ...(turn.intent === "human_handoff" ? { humanHandoff: { status: "contact_required", requestText: body.question, message: "Nova paused discovery. Add your contact details and Moonrock can continue from what you've already shared." } } : {}) }); } catch (error) { return context.json({ code: "NOVA_CONVERSATION_UNAVAILABLE", detail: error instanceof Error ? error.message : "Nova could not answer that question right now." }, 503); }
  });

  router.get("/:sessionId", async (context) => { const current = await repository.load(context.req.param("sessionId")); if (!current) return context.json({ code: "DISCOVERY_NOT_FOUND" }, 404); return context.json({ state: current.state, version: current.version }); });
  return router;
}
