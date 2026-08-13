import { Hono } from "hono";
import type { DiagnosticInput } from "./diagnostic-engine.js";
import { startNovaDiscovery, submitNovaDiscoveryAnswer } from "./discovery-api-contract.js";
import { InMemoryDiscoveryStateRepository, type DiscoveryStateRepository } from "./discovery-state-repository.js";
import { toImmersiveNovaView } from "./higgsfield-ui-adapter.js";

export function createDiscoveryRouter(repository: DiscoveryStateRepository = new InMemoryDiscoveryStateRepository()): Hono {
  const router = new Hono();

  router.post("/:sessionId/start", async (context) => {
    const sessionId = context.req.param("sessionId");
    const body = await context.req.json() as { path?: unknown };
    if (body.path !== "startup" && body.path !== "existing_business") return context.json({ code: "INVALID_DISCOVERY_PATH" }, 400);
    const result = startNovaDiscovery(body.path);
    try { await repository.create(sessionId, result.state); } catch { return context.json({ code: "DISCOVERY_ALREADY_EXISTS" }, 409); }
    return context.json({ ...result.response, view: toImmersiveNovaView(result.response) }, 201);
  });

  router.post("/:sessionId/answers", async (context) => {
    const sessionId = context.req.param("sessionId");
    const current = await repository.load(sessionId);
    if (!current) return context.json({ code: "DISCOVERY_NOT_FOUND" }, 404);
    if (current.state.completed) return context.json({ code: "DISCOVERY_COMPLETE" }, 409);
    const body = await context.req.json() as { field?: unknown; value?: unknown };
    if (typeof body.field !== "string" || !("value" in body)) return context.json({ code: "INVALID_DISCOVERY_ANSWER" }, 400);
    const result = submitNovaDiscoveryAnswer(current.state, body.field as keyof DiagnosticInput, body.value);
    try { await repository.save(sessionId, result.state, current.version); } catch { return context.json({ code: "DISCOVERY_VERSION_CONFLICT" }, 409); }
    return context.json({ ...result.response, view: toImmersiveNovaView(result.response) });
  });

  router.get("/:sessionId", async (context) => {
    const current = await repository.load(context.req.param("sessionId"));
    if (!current) return context.json({ code: "DISCOVERY_NOT_FOUND" }, 404);
    return context.json({ state: current.state, version: current.version });
  });

  return router;
}
