import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  const baseDir = appOptions.baseDir ?? process.cwd();

  base.app.route("/v1/discovery", createDiscoveryRouter(discoveryRepository, { ...(productionGhl ? { productionGhl } : {}) }));
  base.app.get("/embed/nova-discovery.js", (context) => context.body(
    readFileSync(resolve(baseDir, "prototype/nova-discovery-widget.js"), "utf8"),
    200,
    {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  ));

  return base;
}
