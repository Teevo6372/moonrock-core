import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Hono } from "hono";
import type { LocalRuntime } from "./bootstrap.js";
import { createLocalRuntime } from "./bootstrap.js";
import { problem } from "./problem.js";
import { InMemoryRateLimiter } from "./rate-limit.js";
import {
  jsonBody,
  RequestValidationError,
  validateBooking,
  validateConsent,
  validateCreateSession,
  validateHandoff,
  validateMessage,
} from "./validation.js";
import type { StreamItem } from "../event-stream.js";

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

const disclosure = {
  version: "nova-disclosure-1.0.0",
  aiIdentityText: "I’m Nova, Moonrock’s AI Website Advisor—not a human.",
  persistentText: "AI Website Advisor",
  sensitiveDataText: "Please don’t share passwords, payment-card details, government IDs, or other sensitive information.",
};

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
  const receipts = new Map<string, Record<string, unknown>>();

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

  app.post("/v1/sessions", async (context) => {
    validateCreateSession(await jsonBody(context.req.raw));
    return runtime.persistence.transactCreate(() => {
      const session = runtime.orchestrator.createSession();
      return {
        session,
        result: context.json({
          sessionId: session.id,
          correlationId: session.correlationId,
          state: session.state,
          disclosure,
          expiresAt: session.expiresAt,
          streamUrl: `/v1/sessions/${session.id}/events`,
        }, 201),
      };
    });
  });

  app.post("/v1/sessions/:sessionId/messages", async (context) => {
    const sessionId = context.req.param("sessionId");
    const input = validateMessage(await jsonBody(context.req.raw));
    return runtime.persistence.transact(sessionId, async () => {
      const reply = await runtime.orchestrator.handleMessage(sessionId, {
        messageId: input.messageId,
        sequence: input.sequence,
        text: input.text,
        locale: input.client.locale,
        timeZone: input.client.timeZone,
        pagePath: input.page.path,
      });
      return context.json({
        correlationId: reply.correlationId,
        status: reply.status === "confirmed" ? "accepted" : reply.status,
        publicMessage: reply.text,
      }, 202);
    });
  });

  app.get("/v1/sessions/:sessionId/events", async (context) => {
    const sessionId = context.req.param("sessionId");
    if (!await runtime.persistence.ensureLoaded(sessionId)) {
      return problem(context, {
        type: "urn:nova:problem:not-found",
        title: "Session not found",
        status: 404,
        detail: "No local session matches that identifier.",
        code: "SESSION_NOT_FOUND",
      });
    }
    const lastEventId = context.req.header("last-event-id");
    const sessionEvents = runtime.events.events.filter(
      (event) => event.sessionId === sessionId
        && (!lastEventId || event.eventId !== lastEventId),
    );
    if (context.req.query("follow") === "1") {
      const subscription = runtime.eventStream.subscribe(sessionId);
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const event of sessionEvents) {
            controller.enqueue(encoder.encode(formatSse({
              type: "event",
              event: {
                eventId: event.eventId,
                eventName: event.eventName,
                occurredAt: event.occurredAt,
                state: event.state,
                outcome: event.outcome,
                reasonCode: event.reasonCode,
              },
            })));
          }
          void pumpSubscription(subscription, controller, encoder);
        },
        cancel() {
          subscription.cancel();
        },
      });
      return new Response(stream, {
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-store",
          connection: "keep-alive",
          "x-accel-buffering": "no",
        },
      });
    }
    const stream = sessionEvents.map((event) =>
      `id: ${event.eventId}\nevent: ${event.eventName}\ndata: ${JSON.stringify({
        eventName: event.eventName,
        occurredAt: event.occurredAt,
        state: event.state,
        outcome: event.outcome,
        reasonCode: event.reasonCode,
      })}\n\n`
    ).join("");
    return new Response(stream || ": no new events\n\n", {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-store",
        connection: "keep-alive",
      },
    });
  });

  app.post("/v1/sessions/:sessionId/consents", async (context) => {
    const sessionId = context.req.param("sessionId");
    const input = validateConsent(await jsonBody(context.req.raw));
    const existing = receipts.get(input.actionId);
    if (existing) return context.json(existing, 201);
    return runtime.persistence.transact(sessionId, async () => {
      const session = requireSession(sessionId, runtime);
      runtime.sessions.setConsent(
        session.id,
        input.category,
        input.action === "grant" ? "granted" : "withdrawn",
      );
      const receipt = actionReceipt(session.correlationId);
      receipts.set(input.actionId, receipt);
      return context.json(receipt, 201);
    });
  });

  app.post("/v1/sessions/:sessionId/handoffs", async (context) => {
    const sessionId = context.req.param("sessionId");
    const input = validateHandoff(await jsonBody(context.req.raw));
    const existing = receipts.get(input.actionId);
    if (existing) return context.json(existing, 202);
    return runtime.persistence.transact(sessionId, async () => {
      const session = requireSession(sessionId, runtime);
      if (session.consent.save_contact !== "granted") {
        return consentProblem(context, ["save_contact"]);
      }
      const provider = await runtime.ghl.execute({
        tool: "create_follow_up_task",
        args: { route: input.route, contact: input.contact },
        idempotencyKey: `${session.id}:handoff:${input.actionId}`,
      });
      const response = provider.status === "outcome_unknown"
        ? { correlationId: session.correlationId, status: "outcome_unknown", publicMessage: "A person must verify the request." }
        : { correlationId: session.correlationId, status: "accepted", publicMessage: "Your request was recorded for human follow-up." };
      receipts.set(input.actionId, response);
      return context.json(response, 202);
    });
  });

  app.post("/v1/sessions/:sessionId/bookings", async (context) => {
    const sessionId = context.req.param("sessionId");
    const input = validateBooking(await jsonBody(context.req.raw));
    const existing = receipts.get(input.actionId);
    if (existing) return context.json(existing, 201);
    return runtime.persistence.transact(sessionId, async () => {
      const session = requireSession(sessionId, runtime);
      const required = ["save_contact", "appointment_notifications"];
      if (input.notificationChannels.includes("email")) required.push("email_service");
      if (input.notificationChannels.includes("sms")) required.push("sms_service");
      const missing = required.filter(
        (category) => session.consent[category as keyof typeof session.consent] !== "granted",
      );
      if (missing.length) return consentProblem(context, missing);
      const provider = await runtime.ghl.execute({
        tool: "request_appointment",
        args: input,
        idempotencyKey: `${session.id}:${input.calendarId}:${input.slotStart}`,
      });
      if (provider.status === "outcome_unknown") {
        return context.json({
          correlationId: session.correlationId,
          status: "outcome_unknown",
          publicMessage: "The booking could not be confirmed and will not be retried automatically.",
        }, 202);
      }
      const response = {
        correlationId: session.correlationId,
        receiptId: provider.receiptId,
        appointmentId: provider.providerObjectId,
        status: "confirmed",
        start: input.slotStart,
        timeZone: input.timeZone,
        advisorDisplayName: "Moonrock Advisor (synthetic)",
      };
      receipts.set(input.actionId, response);
      return context.json(response, 201);
    });
  });

  app.post("/v1/sessions/:sessionId/close", async (context) => {
    const sessionId = context.req.param("sessionId");
    const root = await jsonBody(context.req.raw) as Record<string, unknown>;
    if (!root || typeof root.actionId !== "string"
      || !["visitor_closed", "visitor_declined", "completed"].includes(String(root.reason))) {
      throw new RequestValidationError([{ path: "$", message: "actionId and approved reason are required" }]);
    }
    const actionId = root.actionId;
    const reason = String(root.reason);
    const existing = receipts.get(actionId);
    if (existing) return context.json(existing);
    return runtime.persistence.transact(sessionId, async () => {
      const session = requireSession(sessionId, runtime);
      const target = reason === "visitor_declined" ? "VISITOR_DECLINED" : "CLOSED";
      const closed = runtime.sessions.transition(session.id, target);
      if (closed.state !== "CLOSED") runtime.sessions.transition(session.id, "CLOSED");
      const receipt = actionReceipt(session.correlationId);
      receipts.set(actionId, receipt);
      return context.json(receipt);
    });
  });

  app.get("/prototype", (context) => context.redirect("/prototype/"));
  app.get("/prototype/", (context) =>
    context.html(readFileSync(resolve(baseDir, "prototype/index.html"), "utf8")),
  );
  app.get("/prototype/nova-client.css", (context) =>
    context.body(readFileSync(resolve(baseDir, "prototype/nova-client.css"), "utf8"), 200, { "content-type": "text/css" }),
  );
  app.get("/prototype/nova-client.js", (context) =>
    context.body(readFileSync(resolve(baseDir, "prototype/nova-client.js"), "utf8"), 200, { "content-type": "text/javascript" }),
  );

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

function requireSession(sessionId: string, runtime: LocalRuntime) {
  const session = runtime.sessions.get(sessionId);
  if (!session) throw new Error("Session not found");
  if (session.state === "CLOSED" || session.state === "EXPIRED") {
    throw new Error("Session is not active");
  }
  return session;
}

function actionReceipt(correlationId: string): Record<string, unknown> {
  return {
    correlationId,
    receiptId: randomUUID().replaceAll("-", ""),
    status: "confirmed",
    recordedAt: new Date().toISOString(),
  };
}

function consentProblem(context: Parameters<typeof problem>[0], missing: string[]): Response {
  return problem(context, {
    type: "urn:nova:problem:consent-required",
    title: "Consent required",
    status: 409,
    detail: `Explicit consent is required for: ${missing.join(", ")}.`,
    code: "CONSENT_REQUIRED",
  });
}

function formatSse(item: StreamItem): string {
  if (item.type === "reset") {
    return `event: stream.reset\ndata: ${JSON.stringify({
      reasonCode: item.reasonCode,
    })}\n\n`;
  }
  return `id: ${item.event.eventId}\nevent: ${item.event.eventName}\ndata: ${JSON.stringify({
    eventName: item.event.eventName,
    occurredAt: item.event.occurredAt,
    state: item.event.state,
    outcome: item.event.outcome,
    reasonCode: item.event.reasonCode,
  })}\n\n`;
}

async function pumpSubscription(
  subscription: ReturnType<LocalRuntime["eventStream"]["subscribe"]>,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: { encode(input?: string): Uint8Array },
): Promise<void> {
  try {
    while (true) {
      const item = await subscription.next();
      if (!item) break;
      controller.enqueue(encoder.encode(formatSse(item)));
      if (item.type === "reset") break;
    }
    controller.close();
  } catch {
    controller.error(new Error("Event stream closed"));
  } finally {
    subscription.cancel();
  }
}
