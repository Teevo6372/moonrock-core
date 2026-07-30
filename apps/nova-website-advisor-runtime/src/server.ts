import { serve } from "@hono/node-server";
import { createApp } from "./http/app.js";

const port = Number(process.env.NOVA_LOCAL_PORT ?? "8787");
const { app } = createApp();

serve({ fetch: app.fetch, hostname: "127.0.0.1", port }, (info) => {
  process.stdout.write(`Nova local mock runtime: http://127.0.0.1:${info.port}/prototype/\n`);
});
