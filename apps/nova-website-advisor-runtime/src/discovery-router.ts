import { Hono } from "hono";
import type { DiagnosticInput } from "./diagnostic-engine.js";
import { startNovaDiscovery, submitNovaDiscoveryAnswer } from "./discovery-api-contract.js";
import { InMemoryDiscoveryStateRepository, type DiscoveryStateRepository } from "./discovery-state-repository.js";
import { SessionGroundedNovaConversationEngine, type NovaConversationEngine } from "./dynamic-conversation-engine.js";
import { handoffFlightPlanToGhl, type ProductionGhlContactIdentity, type ProductionGhlHandoffConfig } from "./ghl-production-handoff.js";
import { toImmersiveNovaView } from "./higgsfield-ui-adapter.js";

export interface DiscoveryRouterOptions {
  productionGhl?: ProductionGhlHandoffConfig;
  conversationEngine?: NovaConversationEngine;
}

export function createDiscoveryRouter(
  repository: DiscoveryStateRepository = new InMemoryDiscoveryStateRepository(),
  options: DiscoveryRouterOptions = {},
): Hono {
  const router = new Hono();
  const conversationEngine = options.conversationEngine ?? new SessionGroundedNovaConversationEngine();

  router.post("/:sessionId/start", async (context) => {
    const sessionId = context.req.param("sessionId");
    const body = await context.req.json() as { path?: unknown };
    if (body.path !== "startup" && body.path !== "existing_business") return context.json({ code: "INVALID_DISCOVERY_PATH" }, 400);
    const result = startNovaDiscovery(body.path);
    try { await repository.create(sessionId, result.state); } catch { return context.json({ code: "DISCOVERY_ALREADY_EXISTS" }, 409); }
    const openingText = body.path === "startup" ? "I'm starting something." : "My business needs to grow.";
    const conversationTurn = await conversationEngine.respond(result.state, openingText, { opening: true });
    return context.json({ ...result.response, conversationTurn, view: toImmersiveNovaView(result.response) }, 201);
  });

  router.post("/:sessionId/answers", async (context) => {
    const sessionId = context.req.param("sessionId");
    const current = await repository.load(sessionId);
    if (!current) return context.json({ code: "DISCOVERY_NOT_FOUND" }, 404);
    if (current.state.completed) return context.json({ code: "DISCOVERY_COMPLETE" }, 409);
    const body = await context.req.json() as { field?: unknown; value?: unknown; identity?: ProductionGhlContactIdentity };
    if (typeof body.field !== "string" || !("value" in body)) return context.json({ code: "INVALID_DISCOVERY_ANSWER" }, 400);
    const result = submitNovaDiscoveryAnswer(current.state, body.field as keyof DiagnosticInput, body.value);
    try { await repository.save(sessionId, result.state, current.version); } catch { return context.json({ code: "DISCOVERY_VERSION_CONFLICT" }, 409); }

    let ghlHandoff: Awaited<ReturnType<typeof handoffFlightPlanToGhl>> | undefined;
    if (result.response.completed && result.response.result && options.productionGhl && body.identity?.email) {
      ghlHandoff = await handoffFlightPlanToGhl({
        sessionId,
        identity: body.identity,
        diagnosticInput: result.state.answers as DiagnosticInput,
        diagnostic: result.response.result.diagnostic,
        flightPlan: result.response.result.flightPlan,
      }, options.productionGhl, {
        apply: options.productionGhl.enabled && options.productionGhl.fieldsVerified && options.productionGhl.writesEnabled,
      });
    }

    const rawCustomerText = typeof body.value === "string" ? body.value : String(body.value);
    const conversationTurn = result.response.completed
      ? undefined
      : await conversationEngine.respond(result.state, rawCustomerText, result.response.nextQuestion ? {
          nextNeed: { field: String(result.response.nextQuestion.field), prompt: result.response.nextQuestion.prompt },
        } : undefined);

    return context.json({
      ...result.response,
      ...(conversationTurn ? { conversationTurn } : {}),
      ...(ghlHandoff ? { ghlHandoff } : {}),
      view: toImmersiveNovaView(result.response),
    });
  });

  router.post("/:sessionId/conversation", async (context) => {
    const current = await repository.load(context.req.param("sessionId"));
    if (!current) return context.json({ code: "DISCOVERY_NOT_FOUND" }, 404);
    const body = await context.req.json() as { question?: unknown };
    if (typeof body.question !== "string" || !body.question.trim()) return context.json({ code: "INVALID_NOVA_QUESTION" }, 400);
    try {
      const turn = await conversationEngine.respond(current.state, body.question);
      return context.json(turn);
    } catch (error) {
      return context.json({
        code: "NOVA_CONVERSATION_UNAVAILABLE",
        detail: error instanceof Error ? error.message : "Nova could not answer that question right now.",
      }, 503);
    }
  });

  router.get("/:sessionId", async (context) => {
    const current = await repository.load(context.req.param("sessionId"));
    if (!current) return context.json({ code: "DISCOVERY_NOT_FOUND" }, 404);
    return context.json({ state: current.state, version: current.version });
  });

  return router;
}
