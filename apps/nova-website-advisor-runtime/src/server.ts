import { serve } from "@hono/node-server";
import { createApp } from "./http/app.js";

const port = Number(process.env.NOVA_LOCAL_PORT ?? "8787");
const hostname = process.env.NOVA_BIND_HOST ?? "127.0.0.1";
const { app } = createApp();

serve({ fetch: app.fetch, hostname, port }, (info) => {
  process.stdout.write(`Nova provider-disconnected runtime listening on ${hostname}:${info.port}\n`);
});
