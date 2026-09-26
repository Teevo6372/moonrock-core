import { createHmac, timingSafeEqual } from "node:crypto";

export interface StripeClientOptions {
  secretKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export interface StripePriceSummary {
  id: string;
  active: boolean;
  lookup_key: string | null;
  unit_amount: number | null;
  currency: string;
  recurring: { interval: string } | null;
}

export interface StripeCheckoutSession {
  id: string;
  url: string | null;
}

/**
 * Raw fetch, matching the rest of this app's third-party integrations
 * (ElevenLabsVoiceSynthesizer, GroqConversationGenerator) rather than the
 * `stripe` npm SDK. Stripe's REST API takes form-encoded bodies with
 * bracket-notation nesting (e.g. line_items[0][price]=...), not JSON.
 */
export class StripeClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly options: StripeClientOptions) {
    this.baseUrl = (options.baseUrl ?? "https://api.stripe.com").replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  private async post<T>(path: string, params: Record<string, unknown>): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.options.secretKey}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: toStripeFormBody(params),
        signal: controller.signal,
      });
      const payload = (await response.json()) as T & { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(`Stripe request to ${path} failed with ${response.status}: ${payload.error?.message ?? "unknown error"}`);
      }
      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async get<T>(path: string, query: Array<[string, string]>): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const search = query.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&");
      const response = await fetch(`${this.baseUrl}${path}${search ? `?${search}` : ""}`, {
        method: "GET",
        headers: { authorization: `Bearer ${this.options.secretKey}` },
        signal: controller.signal,
      });
      const payload = (await response.json()) as T & { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(`Stripe request to ${path} failed with ${response.status}: ${payload.error?.message ?? "unknown error"}`);
      }
      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Looks up Prices (active or archived) by lookup_key; keys with no Price are simply absent from the result. */
  async listPricesByLookupKeys(lookupKeys: readonly string[]): Promise<StripePriceSummary[]> {
    if (lookupKeys.length === 0) return [];
    const result = await this.get<{ data: StripePriceSummary[] }>("/v1/prices", [
      ...lookupKeys.map((key): [string, string] => ["lookup_keys[]", key]),
      ["limit", "100"],
    ]);
    return result.data;
  }

  createProduct(params: { name: string; metadata?: Record<string, string> }): Promise<{ id: string }> {
    return this.post("/v1/products", params);
  }

  createPrice(params: {
    product?: string;
    /** Creates the Product in the same call as the Price, so there is no orphaned Product on partial failure. Use instead of `product`. */
    product_data?: { name: string; metadata?: Record<string, string> };
    unit_amount: number;
    currency: string;
    recurring?: { interval: "month" | "year" };
    lookup_key?: string;
    metadata?: Record<string, string>;
  }): Promise<{ id: string }> {
    return this.post("/v1/prices", params);
  }

  /** Prefer this over passing customer_email to createCheckoutSession - a real Customer is what actually lets Checkout prefill the visitor's name, not just their email. */
  createCustomer(params: { email: string; name?: string; metadata?: Record<string, string> }): Promise<{ id: string }> {
    return this.post("/v1/customers", params);
  }

  createCheckoutSession(params: {
    mode: "subscription" | "payment";
    success_url: string;
    cancel_url: string;
    client_reference_id?: string;
    customer?: string;
    customer_email?: string;
    line_items: Array<{ price: string; quantity: number }>;
    metadata?: Record<string, string>;
  }): Promise<StripeCheckoutSession> {
    return this.post("/v1/checkout/sessions", params);
  }
}

/** Stripe's bracket-notation form encoding for nested objects/arrays. */
function toStripeFormBody(params: Record<string, unknown>): string {
  const pairs: string[] = [];
  const walk = (prefix: string, value: unknown): void => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(`${prefix}[${index}]`, item));
      return;
    }
    if (typeof value === "object") {
      for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
        walk(`${prefix}[${key}]`, nested);
      }
      return;
    }
    pairs.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(value))}`);
  };
  for (const [key, value] of Object.entries(params)) walk(key, value);
  return pairs.join("&");
}

/**
 * Verifies a Stripe webhook's Stripe-Signature header against the raw request
 * body. Must be called with the exact raw bytes Stripe signed - never a
 * re-serialized/re-parsed JSON body, which would change the byte sequence and
 * always fail verification.
 */
export function verifyStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string,
  toleranceSeconds = 300,
): boolean {
  const parts = new Map<string, string>();
  for (const segment of signatureHeader.split(",")) {
    const [key, value] = segment.split("=");
    if (key && value) parts.set(key.trim(), value.trim());
  }
  const timestamp = parts.get("t");
  const providedSignature = parts.get("v1");
  if (!timestamp || !providedSignature) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > toleranceSeconds) return false;

  const expectedSignature = createHmac("sha256", webhookSecret).update(`${timestamp}.${rawBody}`).digest("hex");
  const provided = Buffer.from(providedSignature, "hex");
  const expected = Buffer.from(expectedSignature, "hex");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
