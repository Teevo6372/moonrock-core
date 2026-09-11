import type { AnswerInterpreter } from "../answer-interpreter.js";
import { createDiscoveryRouter } from "../discovery-router.js";
import { InMemoryDiscoveryStateRepository, type DiscoveryStateRepository } from "../discovery-state-repository.js";
import type { NovaConversationEngine } from "../dynamic-conversation-engine.js";
import type { OptInGhlConfig } from "../ghl-opt-in.js";
import type { ProductionGhlHandoffConfig } from "../ghl-production-handoff.js";
import { loadGhlRuntimeConfig } from "../ghl-runtime-config.js";
import { createOptInRouter } from "../opt-in-router.js";
import { createApp, type AppOptions } from "./app.js";

export interface Moonrock2AppOptions extends AppOptions {
  discoveryRepository?: DiscoveryStateRepository;
  productionGhl?: ProductionGhlHandoffConfig;
  optInGhl?: OptInGhlConfig;
  conversationEngine?: NovaConversationEngine;
  answerInterpreter?: AnswerInterpreter;
}

function resolveOptInGhlConfig(explicit?: OptInGhlConfig): OptInGhlConfig | undefined {
  if (explicit) return explicit;
  try {
    const runtimeConfig = loadGhlRuntimeConfig();
    return {
      enabled: true,
      writesEnabled: (process.env.NOVA_GHL_WRITES_ENABLED ?? "").trim().toLowerCase() === "true",
      locationId: runtimeConfig.locationId,
      accessToken: runtimeConfig.privateIntegrationToken,
      baseUrl: runtimeConfig.baseUrl,
    };
  } catch {
    // GHL connection details are not configured in this environment (e.g. local/dev).
    // The opt-in endpoint reports 503 OPT_IN_UNAVAILABLE rather than throwing at startup.
    return undefined;
  }
}

export function createMoonrock2App(options: Moonrock2AppOptions = {}): ReturnType<typeof createApp> {
  const { discoveryRepository = new InMemoryDiscoveryStateRepository(), productionGhl, optInGhl, conversationEngine, answerInterpreter, ...appOptions } = options;
  const llmConnected = Boolean(conversationEngine);
  const ghlConnected = Boolean(productionGhl);
  const base = createApp({
    ...appOptions,
    liveStatus: {
      mode: llmConnected || ghlConnected ? "live" : "local-mock",
      providers: llmConnected && ghlConnected
        ? "connected"
        : llmConnected || ghlConnected
          ? "partially-connected"
          : "disconnected",
    },
  });
  base.app.route("/v1/discovery", createDiscoveryRouter(discoveryRepository, {
    ...(productionGhl ? { productionGhl } : {}),
    ...(conversationEngine ? { conversationEngine } : {}),
    ...(answerInterpreter ? { answerInterpreter } : {}),
  }));
  const resolvedOptInGhl = resolveOptInGhlConfig(optInGhl);
  base.app.route("/v1/opt-in", createOptInRouter({
    ...(resolvedOptInGhl ? { productionGhl: resolvedOptInGhl } : {}),
  }));
  return base;
}
