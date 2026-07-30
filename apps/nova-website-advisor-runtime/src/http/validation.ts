import { consentCategories, type ConsentCategory } from "../domain.js";

export class RequestValidationError extends Error {
  constructor(readonly errors: Array<{ path: string; message: string }>) {
    super("Request validation failed");
    this.name = "RequestValidationError";
  }
}

function object(value: unknown, path = "$"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RequestValidationError([{ path, message: "must be an object" }]);
  }
  return value as Record<string, unknown>;
}

function text(
  value: unknown,
  path: string,
  max: number,
  pattern?: RegExp,
): string {
  if (typeof value !== "string" || value.length < 1 || value.length > max) {
    throw new RequestValidationError([{ path, message: `must be a string of 1-${max} characters` }]);
  }
  if (pattern && !pattern.test(value)) {
    throw new RequestValidationError([{ path, message: "has an invalid format" }]);
  }
  return value;
}

function exactKeys(value: Record<string, unknown>, allowed: string[]): void {
  const extra = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extra.length) {
    throw new RequestValidationError(extra.map((key) => ({ path: `$.${key}`, message: "is not allowed" })));
  }
}

export interface ClientPage {
  client: { locale: string; timeZone: string };
  page: { path: string; referrerClass: string };
}

function clientPage(value: Record<string, unknown>): ClientPage {
  const client = object(value.client, "$.client");
  const page = object(value.page, "$.page");
  exactKeys(client, ["locale", "timeZone"]);
  exactKeys(page, ["path", "referrerClass"]);
  return {
    client: {
      locale: text(client.locale, "$.client.locale", 16, /^[a-z]{2,3}(?:-[A-Z]{2})?$/),
      timeZone: text(client.timeZone, "$.client.timeZone", 64),
    },
    page: {
      path: text(page.path, "$.page.path", 512),
      referrerClass: text(page.referrerClass, "$.page.referrerClass", 64),
    },
  };
}

export function validateCreateSession(value: unknown): ClientPage {
  const root = object(value);
  exactKeys(root, ["client", "page"]);
  return clientPage(root);
}

export function validateMessage(value: unknown): ClientPage & {
  messageId: string;
  sequence: number;
  text: string;
} {
  const root = object(value);
  exactKeys(root, ["messageId", "sequence", "text", "client", "page"]);
  const context = clientPage(root);
  const messageId = text(root.messageId, "$.messageId", 36);
  if (!/^[0-9a-f-]{36}$/i.test(messageId)) {
    throw new RequestValidationError([{ path: "$.messageId", message: "must be a UUID" }]);
  }
  if (!Number.isInteger(root.sequence) || Number(root.sequence) < 1) {
    throw new RequestValidationError([{ path: "$.sequence", message: "must be a positive integer" }]);
  }
  return { ...context, messageId, sequence: Number(root.sequence), text: text(root.text, "$.text", 4000) };
}

export function validateConsent(value: unknown): {
  actionId: string;
  category: ConsentCategory;
  action: "grant" | "withdraw";
  disclosureVersion: string;
  affirmativeControlId: string;
} {
  const root = object(value);
  exactKeys(root, ["actionId", "category", "action", "disclosureVersion", "affirmativeControlId"]);
  const category = text(root.category, "$.category", 64) as ConsentCategory;
  if (!consentCategories.includes(category)) {
    throw new RequestValidationError([{ path: "$.category", message: "is not an approved consent category" }]);
  }
  if (root.action !== "grant" && root.action !== "withdraw") {
    throw new RequestValidationError([{ path: "$.action", message: "must be grant or withdraw" }]);
  }
  return {
    actionId: text(root.actionId, "$.actionId", 128),
    category,
    action: root.action,
    disclosureVersion: text(root.disclosureVersion, "$.disclosureVersion", 100),
    affirmativeControlId: text(root.affirmativeControlId, "$.affirmativeControlId", 128),
  };
}

export function validateHandoff(value: unknown): {
  actionId: string;
  route: string;
  contact: Record<string, unknown>;
} {
  const root = object(value);
  exactKeys(root, ["actionId", "route", "contact"]);
  const contact = object(root.contact, "$.contact");
  const routes = ["general_advisor", "launch", "growth", "systems", "support", "billing", "privacy", "security", "legal", "media", "partnership", "executive"];
  const route = text(root.route, "$.route", 64);
  if (!routes.includes(route)) {
    throw new RequestValidationError([{ path: "$.route", message: "is not an approved route" }]);
  }
  validateContact(contact);
  return {
    actionId: text(root.actionId, "$.actionId", 128),
    route,
    contact,
  };
}

export function validateBooking(value: unknown): {
  actionId: string;
  calendarId: string;
  slotStart: string;
  timeZone: string;
  contact: Record<string, unknown>;
  notificationChannels: Array<"email" | "sms">;
} {
  const root = object(value);
  exactKeys(root, ["actionId", "calendarId", "slotStart", "timeZone", "contact", "notificationChannels"]);
  const contact = object(root.contact, "$.contact");
  validateContact(contact);
  if (!Array.isArray(root.notificationChannels) || root.notificationChannels.length < 1 ||
      root.notificationChannels.some((channel) => channel !== "email" && channel !== "sms")) {
    throw new RequestValidationError([{ path: "$.notificationChannels", message: "must contain email or sms" }]);
  }
  const slotStart = text(root.slotStart, "$.slotStart", 64);
  if (Number.isNaN(Date.parse(slotStart))) {
    throw new RequestValidationError([{ path: "$.slotStart", message: "must be a date-time" }]);
  }
  return {
    actionId: text(root.actionId, "$.actionId", 128),
    calendarId: text(root.calendarId, "$.calendarId", 128),
    slotStart,
    timeZone: text(root.timeZone, "$.timeZone", 64),
    contact,
    notificationChannels: [...new Set(root.notificationChannels)] as Array<"email" | "sms">,
  };
}

function validateContact(contact: Record<string, unknown>): void {
  exactKeys(contact, ["firstName", "lastName", "email", "phone", "companyName", "preferredChannel"]);
  if (contact.email === undefined && contact.phone === undefined) {
    throw new RequestValidationError([{ path: "$.contact", message: "requires email or phone" }]);
  }
  if (contact.email !== undefined) {
    const email = text(contact.email, "$.contact.email", 254);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new RequestValidationError([{ path: "$.contact.email", message: "must be a valid email address" }]);
    }
  }
  if (contact.phone !== undefined) {
    text(contact.phone, "$.contact.phone", 16, /^\+[1-9][0-9]{7,14}$/);
  }
}

export async function jsonBody(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("application/json")) {
    throw new RequestValidationError([{ path: "$", message: "content-type must be application/json" }]);
  }
  try {
    return await request.json();
  } catch {
    throw new RequestValidationError([{ path: "$", message: "must contain valid JSON" }]);
  }
}
