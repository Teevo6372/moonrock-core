import { createDiscoveryRouter } from "../discovery-router.js";
import { InMemoryDiscoveryStateRepository, type DiscoveryStateRepository } from "../discovery-state-repository.js";
import { createApp, type AppOptions } from "./app.js";

export interface Moonrock2AppOptions extends AppOptions {
  discoveryRepository?: DiscoveryStateRepository;
}

export function createMoonrock2App(options: Moonrock2AppOptions = {}): ReturnType<typeof createApp> {
  const { discoveryRepository = new InMemoryDiscoveryStateRepository(), ...appOptions } = options;
  const base = createApp(appOptions);
  base.app.route("/v1/discovery", createDiscoveryRouter(discoveryRepository));
  return base;
}
