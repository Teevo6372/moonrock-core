import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import type { LocalRuntime } from "./bootstrap.js";
import { createLocalRuntime } from "./bootstrap.js";
import { problem } from "./problem.js";
import { InMemoryRateLimiter } from "./rate-limit.js";
import { RequestValidationError } from "./validation.js";

type Variables = { correlationId: string };

export interface AppLiveStatus {
  mode: "live" | "local-mock";
  providers: "connected" | "partially-connected" | "disconnected";
}

export interface AppOptions {
  runtime?: LocalRuntime;
  allowedOrigins?: string[];
  rateLimit?: number;
  bodyLimitBytes?: number;
  baseDir?: string;
  liveStatus?: AppLiveStatus;
}

export function createApp(options: AppOptions = {}): {
  app: Hono<{ Variables: Variables }>;
  runtime: LocalRuntime;
} {
  const baseDir = options.baseDir ?? process.cwd();
  const runtime = options.runtime ?? createLocalRuntime(baseDir);
  const app = new Hono<{ Variables: Variables }>();
  const limiter = new InMemoryRateLimiter(options.rateLimit ?? 30);
  const allowedOrigins = new Set(
    options.allowedOrigins ?? [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:8787",
      "http://127.0.0.1:8787",
    ],
  );

  app.use("*", async (context, next) => {
    const correlationId = context.req.header("x-correlation-id")?.slice(0, 128)
      || randomUUID().replaceAll("-", "");
    context.set("correlationId", correlationId);
    const origin = context.req.header("origin");
    if (origin && !allowedOrigins.has(origin)) {
      return problem(context, {
        type: "urn:nova:problem:origin-denied",
        title: "Origin denied",
        status: 403,
        detail: "This local runtime does not accept the supplied origin.",
        code: "ORIGIN_DENIED",
      });
    }
    const length = Number(context.req.header("content-length") ?? "0");
    if (length > (options.bodyLimitBytes ?? 16_384)) {
      return problem(context, {
        type: "urn:nova:problem:request-too-large",
        title: "Request too large",
        status: 413,
        detail: "The request exceeds the configured local limit.",
        code: "REQUEST_TOO_LARGE",
      });
    }
    const key = `${origin ?? "local"}:${context.req.header("x-forwarded-for") ?? "anonymous"}`;
    const rate = limiter.consume(key);
    if (!rate.allowed) {
      const response = problem(context, {
        type: "urn:nova:problem:rate-limited",
        title: "Rate limit reached",
        status: 429,
        detail: "Wait before sending another request.",
        code: "RATE_LIMITED",
      });
      response.headers.set("retry-after", String(rate.retryAfter));
      return response;
    }
    await next();
    context.header("x-correlation-id", correlationId);
    context.header("x-content-type-options", "nosniff");
    context.header("referrer-policy", "no-referrer");
    context.header("content-security-policy", "default-src 'self'; connect-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'");
    if (origin) context.header("access-control-allow-origin", origin);
  });

  app.get("/health/live", (context) =>
    context.json({ status: "live", runtime: "nova-website-advisor" }),
  );

  app.get("/health/ready", (context) => {
    const ready = !runtime.killSwitch.enabled
      && runtime.health.model === "healthy";
    return context.json(
      {
        status: ready ? "ready" : "degraded",
        mode: options.liveStatus?.mode ?? "local-mock",
        providers: options.liveStatus?.providers ?? "disconnected",
        persistenceMode: runtime.persistence.currentMode,
        knowledgeVersion: runtime.knowledgeVersion,
      },
      ready ? 200 : 503,
    );
  });

  app.get("/health/persistence", (context) => context.json({
    mode: runtime.persistence.currentMode,
    metrics: runtime.persistence.metrics,
    evidence: runtime.persistence.evidence,
  }));

  app.notFound((context) => problem(context, {
    type: "urn:nova:problem:not-found",
    title: "Not found",
    status: 404,
    detail: "The requested local resource does not exist.",
    code: "NOT_FOUND",
  }));

  app.onError((error, context) => {
    if (error instanceof RequestValidationError) {
      return problem(context, {
        type: "urn:nova:problem:invalid-request",
        title: "Invalid request",
        status: 400,
        detail: error.message,
        code: "INVALID_REQUEST",
        errors: error.errors,
      });
    }
    if (/not found|does not exist/i.test(error.message)) {
      return problem(context, {
        type: "urn:nova:problem:not-found",
        title: "Session not found",
        status: 404,
        detail: "No local session matches that identifier.",
        code: "SESSION_NOT_FOUND",
      });
    }
    if (/sequence conflict|not active|Invalid lifecycle|version|conflict/i.test(error.message)) {
      return problem(context, {
        type: "urn:nova:problem:state-conflict",
        title: "State conflict",
        status: 409,
        detail: error.message,
        code: "STATE_CONFLICT",
      });
    }
    return problem(context, {
      type: "urn:nova:problem:internal",
      title: "Internal error",
      status: 500,
      detail: "The local runtime could not complete the request.",
      code: "INTERNAL_ERROR",
    });
  });

  return { app, runtime };
}
