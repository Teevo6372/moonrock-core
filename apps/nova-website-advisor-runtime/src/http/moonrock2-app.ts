import type { AnswerInterpreter } from "../answer-interpreter.js";
import { createDiscoveryRouter } from "../discovery-router.js";
import { InMemoryDiscoveryStateRepository, type DiscoveryStateRepository } from "../discovery-state-repository.js";
import type { NovaConversationEngine } from "../dynamic-conversation-engine.js";
import type { ProductionGhlHandoffConfig } from "../ghl-production-handoff.js";
import { createApp, type AppOptions } from "./app.js";

export interface Moonrock2AppOptions extends AppOptions {
  discoveryRepository?: DiscoveryStateRepository;
  productionGhl?: ProductionGhlHandoffConfig;
  conversationEngine?: NovaConversationEngine;
  answerInterpreter?: AnswerInterpreter;
}

export function createMoonrock2App(options: Moonrock2AppOptions = {}): ReturnType<typeof createApp> {
  const { discoveryRepository = new InMemoryDiscoveryStateRepository(), productionGhl, conversationEngine, answerInterpreter, ...appOptions } = options;
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
  return base;
}
