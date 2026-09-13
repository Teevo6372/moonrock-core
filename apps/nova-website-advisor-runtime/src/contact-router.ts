import { Hono } from "hono";
import { GeneralContactBlockedError, submitGeneralContactToGhl, type GeneralContactGhlConfig } from "./contact-form-ghl.js";

export interface ContactRouterOptions {
  ghl?: GeneralContactGhlConfig;
}

export function createContactRouter(options: ContactRouterOptions = {}): Hono {
  const router = new Hono();

  router.post("/", async (context) => {
    const body = (await context.req.json().catch(() => ({}))) as {
      name?: unknown; email?: unknown; message?: unknown; phone?: unknown;
    };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;

    if (!name || !email || !message) {
      return context.json({ code: "CONTACT_FORM_INVALID", detail: "Name, email, and message are all required." }, 400);
    }
    if (!options.ghl) {
      return context.json({ code: "CONTACT_FORM_UNAVAILABLE", detail: "The contact form is not configured right now." }, 503);
    }

    try {
      const result = await submitGeneralContactToGhl({ name, email, message, ...(phone ? { phone } : {}) }, options.ghl);
      return context.json({
        status: result.status,
        answer: result.status === "confirmed"
          ? "Thanks — your message has been received. Moonrock will get back to you soon."
          : "Your message was received, but live CRM writes are currently disabled, so please also reach us directly by phone or email.",
      });
    } catch (error) {
      // Learned this the hard way from the save-flight-plan 503s: log the
      // REAL reason server-side, not just a generic message to the client.
      console.error("[contact-form] submission failed:", error instanceof Error ? error.message : error);
      const detail = error instanceof GeneralContactBlockedError
        ? "Moonrock could not process your message right now. Please reach us directly by phone or email."
        : "Something went wrong submitting your message. Please reach us directly by phone or email.";
      return context.json({ code: "CONTACT_FORM_FAILED", detail }, 503);
    }
  });

  return router;
}
