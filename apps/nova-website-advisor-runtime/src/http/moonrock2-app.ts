import { createDiscoveryRouter } from "../discovery-router.js";
import { InMemoryDiscoveryStateRepository, type DiscoveryStateRepository } from "../discovery-state-repository.js";
import type { ProductionGhlHandoffConfig } from "../ghl-production-handoff.js";
import { createApp, type AppOptions } from "./app.js";

export interface Moonrock2AppOptions extends AppOptions {
  discoveryRepository?: DiscoveryStateRepository;
  productionGhl?: ProductionGhlHandoffConfig;
}

export function createMoonrock2App(options: Moonrock2AppOptions = {}): ReturnType<typeof createApp> {
  const { discoveryRepository = new InMemoryDiscoveryStateRepository(), productionGhl, ...appOptions } = options;
  const base = createApp(appOptions);
  base.app.route("/v1/discovery", createDiscoveryRouter(discoveryRepository, { ...(productionGhl ? { productionGhl } : {}) }));
  return base;
}
