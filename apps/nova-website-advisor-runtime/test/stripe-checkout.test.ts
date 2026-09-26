import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMoonrock2App } from "../src/http/moonrock2-app.js";
import type { StripeCheckoutConfig } from "../src/discovery-router.js";
import type { PostgresLaunchPlanRepository } from "../src/postgres-launch-plan-repository.js";

afterEach(() => {
  vi.restoreAllMocks();
});

function mockStripe(
  createCheckoutSession = vi.fn().mockResolvedValue({ id: "cs_test_1", url: "https://checkout.stripe.com/cs_test_1" }),
  createCustomer = vi.fn().mockResolvedValue({ id: "cus_test_1" }),
): StripeCheckoutConfig {
  return {
    enabled: true,
    client: { createCheckoutSession, createCustomer } as unknown as StripeCheckoutConfig["client"],
    foundingSetupPriceId: "price_founding",
    standardSetupPriceId: "price_standard",
    monthlyPriceId: "price_monthly",
    successUrl: "https://example.test/success",
    cancelUrl: "https://example.test/cancel",
  };
}

function mockLaunchPlanRepository(foundingCount: number): PostgresLaunchPlanRepository {
  return {
    countFoundingSignups: () => Promise.resolve(foundingCount),
    recordSignup: () => Promise.resolve(),
  } as unknown as PostgresLaunchPlanRepository;
}

async function post(app: ReturnType<typeof createMoonrock2App>["app"], path: string, body: unknown) {
  const response = await app.request(`http://localhost${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: response.status, json: (await response.json()) as any };
}

describe("POST /:sessionId/create-checkout-session", () => {
  it("reports 503 when Stripe is not configured, once the Flight Plan is otherwise ready", async () => {
    const { app } = createMoonrock2App();
    const sessionId = "checkout-unconfigured";
    await post(app, `/v1/discovery/${sessionId}/start`, { path: "existing_business" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "businessName", value: "Test Co" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "industry", value: "plumbing" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "missedCallsPerMonth", value: 10 });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "medianLeadResponseMinutes", value: 45 });
    const result = await post(app, `/v1/discovery/${sessionId}/create-checkout-session`, {});
    expect(result.status).toBe(503);
    expect(result.json.code).toBe("CHECKOUT_UNAVAILABLE");
  });

  it("reports 409 when the Flight Plan is not completed yet", async () => {
    const { app } = createMoonrock2App({ stripe: mockStripe() });
    const sessionId = "checkout-not-ready";
    await post(app, `/v1/discovery/${sessionId}/start`, { path: "existing_business" });
    const result = await post(app, `/v1/discovery/${sessionId}/create-checkout-session`, {});
    expect(result.status).toBe(409);
    expect(result.json.code).toBe("FLIGHT_PLAN_NOT_READY");
  });

  it("uses the founding setup price and returns the checkout URL when founding slots remain", async () => {
    const createCheckoutSession = vi.fn().mockResolvedValue({ id: "cs_test_1", url: "https://checkout.stripe.com/cs_test_1" });
    const { app } = createMoonrock2App({ stripe: mockStripe(createCheckoutSession), launchPlanRepository: mockLaunchPlanRepository(3) });
    const sessionId = "checkout-founding";
    await post(app, `/v1/discovery/${sessionId}/start`, { path: "existing_business" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "businessName", value: "Test Co" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "industry", value: "plumbing" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "missedCallsPerMonth", value: 10 });
    const final = await post(app, `/v1/discovery/${sessionId}/answers`, { field: "medianLeadResponseMinutes", value: 45 });
    expect(final.json.completed).toBe(true);

    const result = await post(app, `/v1/discovery/${sessionId}/create-checkout-session`, { identity: { email: "owner@example.com", firstName: "Jamie", lastName: "Owner" } });
    expect(result.status).toBe(200);
    expect(result.json.url).toBe("https://checkout.stripe.com/cs_test_1");
    const params = createCheckoutSession.mock.calls[0]![0];
    expect(params.line_items).toEqual([{ price: "price_founding", quantity: 1 }, { price: "price_monthly", quantity: 1 }]);
    expect(params.client_reference_id).toBe(sessionId);
    expect(params.customer).toBe("cus_test_1");
    expect(params.metadata.moonrock_used_founding_price).toBe("true");
  });

  it("creates a real Stripe Customer with the collected name/email rather than only passing customer_email", async () => {
    const createCheckoutSession = vi.fn().mockResolvedValue({ id: "cs_test_name", url: "https://checkout.stripe.com/cs_test_name" });
    const createCustomer = vi.fn().mockResolvedValue({ id: "cus_test_name" });
    const { app } = createMoonrock2App({ stripe: mockStripe(createCheckoutSession, createCustomer), launchPlanRepository: mockLaunchPlanRepository(0) });
    const sessionId = "checkout-customer-name";
    await post(app, `/v1/discovery/${sessionId}/start`, { path: "existing_business" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "businessName", value: "Test Co" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "industry", value: "plumbing" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "missedCallsPerMonth", value: 10 });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "medianLeadResponseMinutes", value: 45 });

    const result = await post(app, `/v1/discovery/${sessionId}/create-checkout-session`, { identity: { email: "jamie@example.com", firstName: "Jamie", lastName: "Owner" } });
    expect(result.status).toBe(200);
    expect(createCustomer).toHaveBeenCalledWith(expect.objectContaining({ email: "jamie@example.com", name: "Jamie Owner" }));
    expect(createCheckoutSession.mock.calls[0]![0].customer).toBe("cus_test_name");
  });

  it("reports 400 when no email is provided", async () => {
    const { app } = createMoonrock2App({ stripe: mockStripe(), launchPlanRepository: mockLaunchPlanRepository(0) });
    const sessionId = "checkout-no-email";
    await post(app, `/v1/discovery/${sessionId}/start`, { path: "existing_business" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "businessName", value: "Test Co" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "industry", value: "plumbing" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "missedCallsPerMonth", value: 10 });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "medianLeadResponseMinutes", value: 45 });

    const result = await post(app, `/v1/discovery/${sessionId}/create-checkout-session`, {});
    expect(result.status).toBe(400);
    expect(result.json.code).toBe("CHECKOUT_CONTACT_REQUIRED");
  });

  it("uses the standard setup price once founding slots are exhausted", async () => {
    const createCheckoutSession = vi.fn().mockResolvedValue({ id: "cs_test_2", url: "https://checkout.stripe.com/cs_test_2" });
    const { app } = createMoonrock2App({ stripe: mockStripe(createCheckoutSession), launchPlanRepository: mockLaunchPlanRepository(10) });
    const sessionId = "checkout-standard";
    await post(app, `/v1/discovery/${sessionId}/start`, { path: "existing_business" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "businessName", value: "Test Co" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "industry", value: "plumbing" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "missedCallsPerMonth", value: 10 });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "medianLeadResponseMinutes", value: 45 });

    const result = await post(app, `/v1/discovery/${sessionId}/create-checkout-session`, { identity: { email: "owner@example.com" } });
    expect(result.status).toBe(200);
    const params = createCheckoutSession.mock.calls[0]![0];
    expect(params.line_items).toEqual([{ price: "price_standard", quantity: 1 }, { price: "price_monthly", quantity: 1 }]);
    expect(params.metadata.moonrock_used_founding_price).toBe("false");
  });

  it("appends add-on line items when addonMonthlyPriceIds are configured and addonItemIds are passed at checkout", async () => {
    const createCheckoutSession = vi.fn().mockResolvedValue({ id: "cs_test_addon", url: "https://checkout.stripe.com/cs_test_addon" });
    const stripeWithAddons: StripeCheckoutConfig = {
      ...mockStripe(createCheckoutSession),
      addonMonthlyPriceIds: { review_response_autopilot: "price_review_response", referral_engine: "price_referral" },
    };
    const { app } = createMoonrock2App({ stripe: stripeWithAddons, launchPlanRepository: mockLaunchPlanRepository(0) });
    const sessionId = "checkout-with-addons";
    await post(app, `/v1/discovery/${sessionId}/start`, { path: "existing_business" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "businessName", value: "Test Co" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "industry", value: "plumbing" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "missedCallsPerMonth", value: 10 });
    const final = await post(app, `/v1/discovery/${sessionId}/answers`, { field: "medianLeadResponseMinutes", value: 45 });
    expect(final.json.completed).toBe(true);

    // addonItemIds passed directly in the checkout request (set by the frontend
    // from the visitor's add-on selections, not pre-stored in session state)
    const result = await post(app, `/v1/discovery/${sessionId}/create-checkout-session`, {
      identity: { email: "owner@example.com" },
      addonItemIds: ["review_response_autopilot", "referral_engine"],
    });
    expect(result.status).toBe(200);
    const params = createCheckoutSession.mock.calls[0]![0];
    expect(params.line_items).toEqual([
      { price: "price_founding", quantity: 1 },
      { price: "price_monthly", quantity: 1 },
      { price: "price_review_response", quantity: 1 },
      { price: "price_referral", quantity: 1 },
    ]);
    expect(params.metadata.moonrock_addon_item_ids).toBe("review_response_autopilot,referral_engine");
  });

  it("does not append add-on line items when addonMonthlyPriceIds is not configured, even if addonItemIds are requested", async () => {
    const createCheckoutSession = vi.fn().mockResolvedValue({ id: "cs_test_no_addon", url: "https://checkout.stripe.com/cs_test_no_addon" });
    // Use full founding slots so line_items uses the standard price (no founding ambiguity)
    const { app } = createMoonrock2App({ stripe: mockStripe(createCheckoutSession), launchPlanRepository: mockLaunchPlanRepository(10) });
    const sessionId = "checkout-no-addon-prices";
    await post(app, `/v1/discovery/${sessionId}/start`, { path: "existing_business" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "businessName", value: "Test Co" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "industry", value: "plumbing" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "missedCallsPerMonth", value: 10 });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "medianLeadResponseMinutes", value: 45 });

    const result = await post(app, `/v1/discovery/${sessionId}/create-checkout-session`, {
      identity: { email: "owner@example.com" },
      addonItemIds: ["review_response_autopilot"],
    });
    expect(result.status).toBe(200);
    const params = createCheckoutSession.mock.calls[0]![0];
    expect(params.line_items).toEqual([
      { price: "price_standard", quantity: 1 },
      { price: "price_monthly", quantity: 1 },
    ]);
  });

  async function completedSession(app: ReturnType<typeof createMoonrock2App>["app"], sessionId: string) {
    await post(app, `/v1/discovery/${sessionId}/start`, { path: "existing_business" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "businessName", value: "Test Co" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "industry", value: "plumbing" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "missedCallsPerMonth", value: 10 });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "medianLeadResponseMinutes", value: 45 });
  }

  it("de-duplicates add-on ids and skips gated, unknown and unpriced ids, recording only ids that became line items", async () => {
    const createCheckoutSession = vi.fn().mockResolvedValue({ id: "cs_test_hardening", url: "https://checkout.stripe.com/cs_test_hardening" });
    const stripeWithAddons: StripeCheckoutConfig = {
      ...mockStripe(createCheckoutSession),
      // Gated and non-Launch ids are in the map on purpose: checkout must ignore them regardless.
      addonMonthlyPriceIds: { review_response_autopilot: "price_review_response", website_care_plan: "price_gated", email_marketing: "price_older_item" },
    };
    const { app } = createMoonrock2App({ stripe: stripeWithAddons, launchPlanRepository: mockLaunchPlanRepository(10) });
    const sessionId = "checkout-addon-hardening";
    await completedSession(app, sessionId);

    const result = await post(app, `/v1/discovery/${sessionId}/create-checkout-session`, {
      identity: { email: "owner@example.com" },
      addonItemIds: ["review_response_autopilot", "review_response_autopilot", "website_care_plan", "email_marketing", "referral_engine", "__proto__"],
    });
    expect(result.status).toBe(200);
    const params = createCheckoutSession.mock.calls[0]![0];
    expect(params.line_items).toEqual([
      { price: "price_standard", quantity: 1 },
      { price: "price_monthly", quantity: 1 },
      { price: "price_review_response", quantity: 1 },
    ]);
    expect(params.metadata.moonrock_addon_item_ids).toBe("review_response_autopilot");
  });

  it("omits add-on metadata when no requested add-on became a line item", async () => {
    const createCheckoutSession = vi.fn().mockResolvedValue({ id: "cs_test_nometa", url: "https://checkout.stripe.com/cs_test_nometa" });
    const { app } = createMoonrock2App({ stripe: mockStripe(createCheckoutSession), launchPlanRepository: mockLaunchPlanRepository(10) });
    const sessionId = "checkout-addon-nometa";
    await completedSession(app, sessionId);
    await post(app, `/v1/discovery/${sessionId}/create-checkout-session`, { identity: { email: "owner@example.com" }, addonItemIds: ["referral_engine"] });
    expect(createCheckoutSession.mock.calls[0]![0].metadata).not.toHaveProperty("moonrock_addon_item_ids");
  });

  it("reports 409 when the Flight Plan escalated and isn't autonomous-close eligible", async () => {
    const { app } = createMoonrock2App({ stripe: mockStripe() });
    const sessionId = "checkout-escalated";
    await post(app, `/v1/discovery/${sessionId}/start`, { path: "existing_business" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "businessName", value: "Test Co" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "industry", value: "plumbing" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "missedCallsPerMonth", value: 10 });
    const final = await post(app, `/v1/discovery/${sessionId}/answers`, { field: "riskCategories", value: ["healthcare_phi"] });
    expect(final.json.completed).toBe(true);

    const result = await post(app, `/v1/discovery/${sessionId}/create-checkout-session`, {});
    expect(result.status).toBe(409);
    expect(result.json.code).toBe("CHECKOUT_NOT_ELIGIBLE");
  });
});

describe("POST /v1/webhooks/stripe", () => {
  function signedRequest(body: string, secret: string) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
    return { "stripe-signature": `t=${timestamp},v1=${signature}` };
  }

  it("reports 503 when no webhook secret is configured", async () => {
    const { app } = createMoonrock2App();
    const response = await app.request("http://localhost/v1/webhooks/stripe", { method: "POST", body: "{}" });
    expect(response.status).toBe(503);
  });

  it("rejects a request with an invalid signature", async () => {
    const { app } = createMoonrock2App({ stripeWebhookSecret: "whsec_test" });
    const body = JSON.stringify({ type: "checkout.session.completed" });
    const response = await app.request("http://localhost/v1/webhooks/stripe", { method: "POST", body, headers: { "stripe-signature": "t=1,v1=deadbeef" } });
    expect(response.status).toBe(400);
  });

  // productionGhl is deliberately omitted here: GHL sync on a confirmed payment
  // reuses the same handoffFlightPlanToGhl already covered end-to-end in
  // discovery-ghl-handoff-e2e.test.ts - this test's job is only to verify the
  // webhook itself (signature check, signup recording, persisting the closed
  // sale into session state), without making a real network call to GHL.
  it("records a confirmed signup and persists the closed sale to session state on checkout.session.completed", async () => {
    const recordSignup = vi.fn().mockResolvedValue(undefined);
    const launchPlanRepository = { countFoundingSignups: () => Promise.resolve(0), recordSignup } as unknown as PostgresLaunchPlanRepository;
    const { app } = createMoonrock2App({ stripeWebhookSecret: "whsec_test", launchPlanRepository });

    const sessionId = "webhook-session-1";
    await post(app, `/v1/discovery/${sessionId}/start`, { path: "existing_business" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "businessName", value: "Webhook Test Co" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "industry", value: "plumbing" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "missedCallsPerMonth", value: 10 });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "medianLeadResponseMinutes", value: 45 });

    const eventBody = JSON.stringify({
      id: "evt_test_confirmed",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_confirmed",
          client_reference_id: sessionId,
          customer_details: { email: "confirmed@example.com", name: "Jamie Owner" },
          metadata: { moonrock_offer_id: "moonrock_launch_plan", tier: "launch_plan", moonrock_session_id: sessionId, moonrock_used_founding_price: "true" },
        },
      },
    });
    const response = await app.request("http://localhost/v1/webhooks/stripe", {
      method: "POST",
      body: eventBody,
      headers: { "content-type": "application/json", ...signedRequest(eventBody, "whsec_test") },
    });
    expect(response.status).toBe(200);
    expect(recordSignup).toHaveBeenCalledWith(expect.objectContaining({ sessionId, stripeCheckoutSessionId: "cs_test_confirmed", usedFoundingPrice: true }));

    const getResponse = await app.request(`http://localhost/v1/discovery/${sessionId}`);
    const state = (await getResponse.json()) as { state: { conversationSalesClosed?: Array<{ offerId: string; setupFeeUsd: number; monthlyFeeUsd: number }> } };
    expect(state.state.conversationSalesClosed).toEqual([
      expect.objectContaining({ offerId: "moonrock_launch_plan", setupFeeUsd: 0, monthlyFeeUsd: 97 }),
    ]);
  });

  it("ignores event types other than checkout.session.completed", async () => {
    const recordSignup = vi.fn();
    const launchPlanRepository = { countFoundingSignups: () => Promise.resolve(0), recordSignup } as unknown as PostgresLaunchPlanRepository;
    const { app } = createMoonrock2App({ stripeWebhookSecret: "whsec_test", launchPlanRepository });
    const body = JSON.stringify({ type: "customer.created", data: { object: {} } });
    const response = await app.request("http://localhost/v1/webhooks/stripe", {
      method: "POST",
      body,
      headers: { "content-type": "application/json", ...signedRequest(body, "whsec_test") },
    });
    expect(response.status).toBe(200);
    expect(recordSignup).not.toHaveBeenCalled();
  });
});
