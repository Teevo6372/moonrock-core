import { Hono } from "hono";
import { OptInBlockedError, submitSmsOptIn, type OptInGhlConfig } from "./ghl-opt-in.js";

export interface OptInRouterOptions {
  productionGhl?: OptInGhlConfig;
}

const PHONE_PATTERN = /^\+[1-9][0-9]{7,14}$/;

export function createOptInRouter(options: OptInRouterOptions = {}): Hono {
  const router = new Hono();

  router.post("/", async (context) => {
    const body = (await context.req.json()) as {
      phone?: unknown;
      firstName?: unknown;
      lastName?: unknown;
      email?: unknown;
      optedIn?: unknown;
    };
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    if (!PHONE_PATTERN.test(phone)) {
      return context.json({ code: "INVALID_OPT_IN_PHONE", detail: "A valid phone number is required, e.g. +15551234567." }, 400);
    }
    if (typeof body.optedIn !== "boolean") {
      return context.json({ code: "INVALID_OPT_IN_CHOICE", detail: "optedIn must be true or false." }, 400);
    }
    if (!options.productionGhl) {
      return context.json({ code: "OPT_IN_UNAVAILABLE", detail: "Moonrock's opt-in connection is not configured right now." }, 503);
    }

    try {
      const result = await submitSmsOptIn(
        {
          phone,
          optedIn: body.optedIn,
          ...(typeof body.firstName === "string" && body.firstName.trim() ? { firstName: body.firstName.trim() } : {}),
          ...(typeof body.lastName === "string" && body.lastName.trim() ? { lastName: body.lastName.trim() } : {}),
          ...(typeof body.email === "string" && body.email.trim() ? { email: body.email.trim() } : {}),
          sourcePath: "/opt-in",
        },
        options.productionGhl,
        { apply: options.productionGhl.enabled && options.productionGhl.writesEnabled },
      );
      const message = body.optedIn
        ? result.status === "confirmed"
          ? "You're opted in. Reply STOP at any time to opt out of SMS."
          : "Got it — your opt-in preference is saved."
        : result.status === "confirmed"
          ? "You're opted out. You will not receive SMS messages from Moonrock."
          : "Got it — your opt-out preference is saved.";
      return context.json({ status: result.status, message }, 201);
    } catch (error) {
      if (error instanceof OptInBlockedError) {
        return context.json({ code: "OPT_IN_BLOCKED", detail: error.message }, 503);
      }
      return context.json(
        { code: "OPT_IN_FAILED", detail: error instanceof Error ? error.message : "Moonrock could not save this preference right now." },
        503,
      );
    }
  });

  return router;
}
