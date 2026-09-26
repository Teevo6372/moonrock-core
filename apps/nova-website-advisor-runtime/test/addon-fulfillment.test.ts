import { createHmac } from "node:crypto";
import { resolve } from "node:path";
import type { Pool } from "pg";
import { DataType, newDb } from "pg-mem";
import { afterEach, describe, expect, it, vi } from "vitest";
import { announceAddonPurchaseInGhl } from "../src/addon-fulfillment.js";
import { MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY } from "../src/ghl-production-registry.js";
import type { ProductionGhlHandoffConfig } from "../src/ghl-production-handoff.js";
import { createMoonrock2App } from "../src/http/moonrock2-app.js";
import { addonGhlTag, purchasedAddonIdsFromMetadata } from "../src/launch-addon-prices.js";
import { runMigrations } from "../src/migrations.js";
import { PostgresClientRepository } from "../src/postgres-client-repository.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const ghlConfig: ProductionGhlHandoffConfig = {
  enabled: true,
  fieldsVerified: false,
  writesEnabled: true,
  locationId: "loc_test",
  accessToken: "token_test",
  baseUrl: "https://ghl.example.test",
  fieldRegistry: MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY,
};

/** GHL stand-in that records every call and answers the contact upsert with a contact id. */
function ghlFetch(overrides: { failUpsert?: boolean; failNote?: boolean } = {}) {
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const target = String(url);
    if (target.endsWith("/contacts/upsert")) {
      return overrides.failUpsert
        ? new Response("boom", { status: 500 })
        : new Response(JSON.stringify({ contact: { id: "contact_1" } }), { status: 200 });
    }
    if (target.endsWith("/notes") && overrides.failNote) return new Response("nope", { status: 422 });
    void init;
    return new Response("{}", { status: 200 });
  });
}
const callsTo = (mock: ReturnType<typeof ghlFetch>, suffix: string) => mock.mock.calls.filter(([url]) => String(url).endsWith(suffix));

describe("purchasedAddonIdsFromMetadata", () => {
  it("keeps known Launch add-on ids, de-duplicated, and drops anything else", () => {
    expect(purchasedAddonIdsFromMetadata("review_response_autopilot, monthly_scorecard,review_response_autopilot,bogus,email_marketing,__proto__")).toEqual(["review_response_autopilot", "monthly_scorecard"]);
    expect(purchasedAddonIdsFromMetadata(undefined)).toEqual([]);
    expect(purchasedAddonIdsFromMetadata("")).toEqual([]);
  });

  it("still recognises an add-on that is gated later, because the customer already paid", () => {
    expect(purchasedAddonIdsFromMetadata("website_care_plan")).toEqual(["website_care_plan"]);
  });

  it("derives a stable GHL tag from the id", () => {
    expect(addonGhlTag("review_response_autopilot")).toBe("nova-addon-review-response-autopilot");
  });
});

describe("announceAddonPurchaseInGhl", () => {
  it("upserts the contact, tags one tag per add-on, and writes a note listing them", async () => {
    const fetchImpl = ghlFetch();
    await announceAddonPurchaseInGhl({ email: "owner@example.com", itemIds: ["review_response_autopilot", "monthly_scorecard"], clientId: "client-1", checkoutSessionId: "cs_test_1" }, ghlConfig, fetchImpl as unknown as typeof fetch);

    expect(fetchImpl.mock.calls.map(([url]) => String(url))).toEqual([
      "https://ghl.example.test/contacts/upsert",
      "https://ghl.example.test/contacts/contact_1/tags",
      "https://ghl.example.test/contacts/contact_1/notes",
    ]);
    const upsertBody = JSON.parse(String(callsTo(fetchImpl, "/contacts/upsert")[0]![1]!.body));
    expect(upsertBody).toEqual({ locationId: "loc_test", email: "owner@example.com" });
    expect(JSON.parse(String(callsTo(fetchImpl, "/tags")[0]![1]!.body))).toEqual({ tags: ["nova-addon-review-response-autopilot", "nova-addon-monthly-scorecard"] });
    const note = JSON.parse(String(callsTo(fetchImpl, "/notes")[0]![1]!.body)).body as string;
    expect(note).toContain("NOVA ADD-ONS PURCHASED");
    expect(note).toContain("owner@example.com");
    expect(note).toContain("Client ID: client-1");
    expect(note).toContain("cs_test_1");
    expect(note).toContain("- Review Response Autopilot ($29/mo)");
    expect(note).toContain("- Nova Monthly Scorecard ($19/mo)");
  });

  it("does nothing when there are no add-ons", async () => {
    const fetchImpl = ghlFetch();
    await announceAddonPurchaseInGhl({ email: "owner@example.com", itemIds: [], checkoutSessionId: "cs_test_1" }, ghlConfig, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("throws (so the caller can log it) when GHL rejects the upsert or the note", async () => {
    await expect(announceAddonPurchaseInGhl({ email: "a@b.co", itemIds: ["referral_engine"], checkoutSessionId: "cs" }, ghlConfig, ghlFetch({ failUpsert: true }) as unknown as typeof fetch)).rejects.toThrow(/upsert failed \(500\)/);
    await expect(announceAddonPurchaseInGhl({ email: "a@b.co", itemIds: ["referral_engine"], checkoutSessionId: "cs" }, ghlConfig, ghlFetch({ failNote: true }) as unknown as typeof fetch)).rejects.toThrow(/note failed \(422\)/);
  });
});

describe("PostgresClientRepository add-ons", () => {
  async function pool(): Promise<Pool> {
    const database = newDb({ noAstCoverageCheck: true });
    database.public.registerFunction({ name: "hashtext", args: [DataType.text], returns: DataType.integer, implementation: () => 6372 });
    for (const name of ["pg_advisory_lock", "pg_advisory_unlock"]) {
      database.public.registerFunction({ name, args: [DataType.integer], returns: DataType.bool, implementation: () => true });
    }
    const adapter = database.adapters.createPg();
    const created = new adapter.Pool() as unknown as Pool;
    await runMigrations(created, resolve(import.meta.dirname, "../migrations"));
    return created;
  }
  const newClient = (repository: PostgresClientRepository) =>
    repository.createClient({ email: "owner@example.com", stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1", flightPlanId: "fp_1", tier: "launch_plan" });

  it("records add-ons idempotently and lists them", async () => {
    const repository = new PostgresClientRepository(await pool());
    const client = await newClient(repository);
    await repository.recordPurchasedAddons(client.id, ["review_response_autopilot", "monthly_scorecard"], "cs_1");
    await repository.recordPurchasedAddons(client.id, ["review_response_autopilot"], "cs_replay");
    const addons = await repository.listAddons(client.id);
    expect([...addons].sort((a, b) => a.itemId.localeCompare(b.itemId))).toEqual([
      { itemId: "monthly_scorecard", status: "purchased" },
      { itemId: "review_response_autopilot", status: "purchased" },
    ]);
  });

  it("records nothing for an empty list", async () => {
    const repository = new PostgresClientRepository(await pool());
    const client = await newClient(repository);
    await repository.recordPurchasedAddons(client.id, [], "cs_1");
    expect(await repository.listAddons(client.id)).toEqual([]);
  });
});

describe("POST /v1/webhooks/stripe with purchased add-ons", () => {
  const signed = (body: string) => {
    const timestamp = Math.floor(Date.now() / 1000);
    return { "stripe-signature": `t=${timestamp},v1=${createHmac("sha256", "whsec_test").update(`${timestamp}.${body}`).digest("hex")}` };
  };

  async function completedEvent(addonIds: string | undefined, eventId: string, overrides: { recordPurchasedAddons?: ReturnType<typeof vi.fn> } = {}) {
    const recordPurchasedAddons = overrides.recordPurchasedAddons ?? vi.fn().mockResolvedValue(undefined);
    const clientRepository = {
      recordProcessedEvent: vi.fn().mockResolvedValue(true),
      createClient: vi.fn().mockResolvedValue({ id: "client-1" }),
      setInvited: vi.fn(),
      setInviteFailed: vi.fn(),
      recordPurchasedAddons,
    } as unknown as PostgresClientRepository;
    const { app } = createMoonrock2App({ stripeWebhookSecret: "whsec_test", productionGhl: ghlConfig, clientRepository });

    const sessionId = `wh-${eventId}`;
    const post = (path: string, body: unknown) => app.request(`http://localhost${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    await post(`/v1/discovery/${sessionId}/start`, { path: "existing_business" });
    for (const [field, value] of [["businessName", "Webhook Co"], ["industry", "plumbing"], ["missedCallsPerMonth", 10], ["medianLeadResponseMinutes", 45]] as const) {
      await post(`/v1/discovery/${sessionId}/answers`, { field, value });
    }

    const fetchMock = ghlFetch();
    vi.stubGlobal("fetch", fetchMock);
    const body = JSON.stringify({
      id: eventId,
      type: "checkout.session.completed",
      data: { object: {
        id: `cs_${eventId}`,
        client_reference_id: sessionId,
        customer: "cus_1",
        customer_details: { email: "owner@example.com", name: "Jamie Owner" },
        metadata: { moonrock_offer_id: "moonrock_launch_plan", tier: "launch_plan", moonrock_session_id: sessionId, ...(addonIds !== undefined ? { moonrock_addon_item_ids: addonIds } : {}) },
      } },
    });
    const response = await app.request("http://localhost/v1/webhooks/stripe", { method: "POST", body, headers: { "content-type": "application/json", ...signed(body) } });
    return { response, recordPurchasedAddons, fetchMock, checkoutSessionId: `cs_${eventId}` };
  }

  it("records the valid add-ons on the client and tags and notes them in GHL", async () => {
    const { response, recordPurchasedAddons, fetchMock, checkoutSessionId } = await completedEvent("review_response_autopilot,bogus,monthly_scorecard", "evt_addons_1");
    expect(response.status).toBe(200);
    expect(recordPurchasedAddons).toHaveBeenCalledWith("client-1", ["review_response_autopilot", "monthly_scorecard"], checkoutSessionId);

    const tagBodies = callsTo(fetchMock, "/tags").map(([, init]) => JSON.parse(String(init!.body)).tags as string[]);
    expect(tagBodies).toContainEqual(["nova-paid-onboarding"]);
    expect(tagBodies).toContainEqual(["nova-addon-review-response-autopilot", "nova-addon-monthly-scorecard"]);
    const notes = callsTo(fetchMock, "/notes").map(([, init]) => JSON.parse(String(init!.body)).body as string);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain("NOVA ADD-ONS PURCHASED");
    expect(notes[0]).not.toContain("bogus");
  });

  it("does nothing add-on related when the checkout had no add-ons", async () => {
    const { response, recordPurchasedAddons, fetchMock } = await completedEvent(undefined, "evt_addons_none");
    expect(response.status).toBe(200);
    expect(recordPurchasedAddons).not.toHaveBeenCalled();
    expect(callsTo(fetchMock, "/notes")).toHaveLength(0);
    expect(callsTo(fetchMock, "/tags").every(([, init]) => !String(init!.body).includes("nova-addon-"))).toBe(true);
  });

  it("still answers 200 and still tells GHL when recording the add-ons in the database fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { response, fetchMock } = await completedEvent("referral_engine", "evt_addons_dbfail", { recordPurchasedAddons: vi.fn().mockRejectedValue(new Error("db down")) });
    expect(response.status).toBe(200);
    expect(callsTo(fetchMock, "/notes")).toHaveLength(1);
  });
});
