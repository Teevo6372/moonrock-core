import { Hono } from "hono";
import type { DiagnosticInput } from "./diagnostic-engine.js";
import { startNovaDiscovery, submitNovaDiscoveryAnswer } from "./discovery-api-contract.js";
import type { DiscoverySessionState } from "./discovery-session.js";
import { toImmersiveNovaView } from "./higgsfield-ui-adapter.js";

interface StoredDiscovery {
  state: DiscoverySessionState;
}

export function createDiscoveryRouter(): Hono {
  const router = new Hono();
  const sessions = new Map<string, StoredDiscovery>();

  router.post("/:sessionId/start", async (context) => {
    const sessionId = context.req.param("sessionId");
    const body = await context.req.json() as { path?: unknown };
    if (body.path !== "startup" && body.path !== "existing_business") {
      return context.json({ code: "INVALID_DISCOVERY_PATH" }, 400);
    }
    const result = startNovaDiscovery(body.path);
    sessions.set(sessionId, { state: result.state });
    return context.json({ ...result.response, view: toImmersiveNovaView(result.response) }, 201);
  });

  router.post("/:sessionId/answers", async (context) => {
    const sessionId = context.req.param("sessionId");
    const current = sessions.get(sessionId);
    if (!current) return context.json({ code: "DISCOVERY_NOT_FOUND" }, 404);
    if (current.state.completed) return context.json({ code: "DISCOVERY_COMPLETE" }, 409);
    const body = await context.req.json() as { field?: unknown; value?: unknown };
    if (typeof body.field !== "string" || !("value" in body)) {
      return context.json({ code: "INVALID_DISCOVERY_ANSWER" }, 400);
    }
    const result = submitNovaDiscoveryAnswer(current.state, body.field as keyof DiagnosticInput, body.value);
    sessions.set(sessionId, { state: result.state });
    return context.json({ ...result.response, view: toImmersiveNovaView(result.response) });
  });

  router.get("/:sessionId", (context) => {
    const current = sessions.get(context.req.param("sessionId"));
    if (!current) return context.json({ code: "DISCOVERY_NOT_FOUND" }, 404);
    return context.json({ state: current.state });
  });

  return router;
}
