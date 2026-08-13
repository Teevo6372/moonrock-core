import { createDiscoveryRouter } from "../discovery-router.js";
import { createApp, type AppOptions } from "./app.js";

export function createMoonrock2App(options: AppOptions = {}): ReturnType<typeof createApp> {
  const base = createApp(options);
  base.app.route("/v1/discovery", createDiscoveryRouter());
  return base;
}
