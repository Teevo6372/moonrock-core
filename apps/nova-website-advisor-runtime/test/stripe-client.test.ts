import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StripeClient, verifyStripeWebhookSignature } from "../src/stripe-client.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StripeClient", () => {
  it("creates a checkout session with a form-encoded, bracket-nested body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "cs_test_123", url: "https://checkout.stripe.com/cs_test_123" }) });
    vi.stubGlobal("fetch", fetchMock);

    const client = new StripeClient({ secretKey: "sk_test_x" });
    const result = await client.createCheckoutSession({
      mode: "subscription",
      success_url: "https://example.test/success",
      cancel_url: "https://example.test/cancel",
      client_reference_id: "session-1",
      line_items: [{ price: "price_setup", quantity: 1 }, { price: "price_monthly", quantity: 1 }],
      metadata: { moonrock_offer_id: "moonrock_launch_plan" },
    });

    expect(result).toEqual({ id: "cs_test_123", url: "https://checkout.stripe.com/cs_test_123" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.stripe.com/v1/checkout/sessions");
    expect(init.headers.authorization).toBe("Bearer sk_test_x");
    expect(init.headers["content-type"]).toBe("application/x-www-form-urlencoded");
    const body = init.body as string;
    expect(body).toContain("mode=subscription");
    expect(body).toContain(`line_items%5B0%5D%5Bprice%5D=price_setup`);
    expect(body).toContain(`line_items%5B1%5D%5Bprice%5D=price_monthly`);
    expect(body).toContain(`metadata%5Bmoonrock_offer_id%5D=moonrock_launch_plan`);
  });

  it("creates a customer with email and name", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "cus_test_123" }) });
    vi.stubGlobal("fetch", fetchMock);

    const client = new StripeClient({ secretKey: "sk_test_x" });
    const result = await client.createCustomer({ email: "jamie@example.com", name: "Jamie Owner" });

    expect(result).toEqual({ id: "cus_test_123" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.stripe.com/v1/customers");
    const body = init.body as string;
    expect(body).toContain("email=jamie%40example.com");
    expect(body).toContain("name=Jamie%20Owner");
  });

  it("lists prices by lookup key with a GET and bracketed lookup_keys[]", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ id: "price_1", lookup_key: "k1" }] }) });
    vi.stubGlobal("fetch", fetchMock);

    const client = new StripeClient({ secretKey: "sk_test_x" });
    const result = await client.listPricesByLookupKeys(["k1", "k2"]);

    expect(result).toEqual([{ id: "price_1", lookup_key: "k1" }]);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
    expect(init.headers.authorization).toBe("Bearer sk_test_x");
    expect(url).toBe("https://api.stripe.com/v1/prices?lookup_keys%5B%5D=k1&lookup_keys%5B%5D=k2&limit=100");
  });

  it("does not call Stripe when listing prices for no lookup keys", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await new StripeClient({ secretKey: "sk_test_x" }).listPricesByLookupKeys([])).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces Stripe errors from a GET", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: { message: "Permission denied" } }) }));
    await expect(new StripeClient({ secretKey: "sk_test_x" }).listPricesByLookupKeys(["k"])).rejects.toThrow(/403.*Permission denied/);
  });

  it("creates a price with inline product_data and a lookup key", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "price_new" }) });
    vi.stubGlobal("fetch", fetchMock);
    await new StripeClient({ secretKey: "sk_test_x" }).createPrice({
      product_data: { name: "Add-On", metadata: { moonrock_offer_id: "x" } }, unit_amount: 2900, currency: "usd", recurring: { interval: "month" }, lookup_key: "lk",
    });
    const body = fetchMock.mock.calls[0]![1].body as string;
    expect(body).toContain("product_data%5Bname%5D=Add-On");
    expect(body).toContain("product_data%5Bmetadata%5D%5Bmoonrock_offer_id%5D=x");
    expect(body).toContain("lookup_key=lk");
    expect(body).toContain("recurring%5Binterval%5D=month");
    expect(body).not.toContain("product=");
  });

  it("throws with the Stripe error message when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 402, json: async () => ({ error: { message: "Your card was declined." } }) }));
    const client = new StripeClient({ secretKey: "sk_test_x" });
    await expect(client.createCheckoutSession({ mode: "subscription", success_url: "a", cancel_url: "b", line_items: [] }))
      .rejects.toThrow(/402.*Your card was declined\./);
  });
});

describe("verifyStripeWebhookSignature", () => {
  function sign(body: string, secret: string, timestamp: number): string {
    const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
    return `t=${timestamp},v1=${signature}`;
  }

  it("accepts a correctly signed, fresh payload", () => {
    const body = JSON.stringify({ type: "checkout.session.completed" });
    const header = sign(body, "whsec_test", Math.floor(Date.now() / 1000));
    expect(verifyStripeWebhookSignature(body, header, "whsec_test")).toBe(true);
  });

  it("rejects a payload signed with the wrong secret", () => {
    const body = JSON.stringify({ type: "checkout.session.completed" });
    const header = sign(body, "wrong_secret", Math.floor(Date.now() / 1000));
    expect(verifyStripeWebhookSignature(body, header, "whsec_test")).toBe(false);
  });

  it("rejects a payload whose body was tampered with after signing", () => {
    const originalBody = JSON.stringify({ amount: 100 });
    const header = sign(originalBody, "whsec_test", Math.floor(Date.now() / 1000));
    const tamperedBody = JSON.stringify({ amount: 100000 });
    expect(verifyStripeWebhookSignature(tamperedBody, header, "whsec_test")).toBe(false);
  });

  it("rejects a stale timestamp outside the tolerance window (replay protection)", () => {
    const body = JSON.stringify({ type: "checkout.session.completed" });
    const staleTimestamp = Math.floor(Date.now() / 1000) - 600;
    const header = sign(body, "whsec_test", staleTimestamp);
    expect(verifyStripeWebhookSignature(body, header, "whsec_test", 300)).toBe(false);
  });

  it("rejects a malformed signature header", () => {
    expect(verifyStripeWebhookSignature("{}", "not-a-valid-header", "whsec_test")).toBe(false);
  });
});
