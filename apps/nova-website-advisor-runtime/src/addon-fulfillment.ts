import { ALA_CARTE_CATALOG, isLaunchAddonId } from "./ala-carte-catalog.js";
import type { ProductionGhlHandoffConfig } from "./ghl-production-handoff.js";
import { addonDisplayName, addonGhlTag } from "./launch-addon-prices.js";

/**
 * Tells the Moonrock team which Launch add-ons a new client bought, in GHL: one
 * `nova-addon-<name>` tag per add-on (usable as a workflow trigger) plus a note
 * listing them. Delivery itself is not automated here; this is the hand-off.
 * Throws on failure so the caller can log it without failing the webhook.
 */
export async function announceAddonPurchaseInGhl(
  input: { email: string; itemIds: readonly string[]; clientId?: string; checkoutSessionId: string },
  config: ProductionGhlHandoffConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (input.itemIds.length === 0) return;
  const baseUrl = (config.baseUrl ?? "https://services.leadconnectorhq.com").replace(/\/$/, "");
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.accessToken}`,
    Version: "2021-07-28",
  };

  // Email-only upsert returns the existing contact rather than creating a duplicate.
  const upsert = await fetchImpl(`${baseUrl}/contacts/upsert`, {
    method: "POST",
    headers,
    body: JSON.stringify({ locationId: config.locationId, email: input.email }),
  });
  const upsertText = await upsert.text();
  if (!upsert.ok) throw new Error(`GHL contact upsert failed (${upsert.status}): ${upsertText}`);
  const payload = upsertText ? (JSON.parse(upsertText) as { contact?: { id?: string }; id?: string }) : {};
  const contactId = payload.contact?.id ?? payload.id;
  if (!contactId) throw new Error("GHL contact upsert returned no contact id");

  const contact = encodeURIComponent(contactId);
  const tagResponse = await fetchImpl(`${baseUrl}/contacts/${contact}/tags`, {
    method: "POST",
    headers,
    body: JSON.stringify({ tags: input.itemIds.map(addonGhlTag) }),
  });
  if (!tagResponse.ok) throw new Error(`GHL add-on tagging failed (${tagResponse.status})`);

  const lines = input.itemIds.map((id) => `- ${addonDisplayName(id)} ($${isLaunchAddonId(id) ? ALA_CARTE_CATALOG[id].monthlyFeeUsd : "?"}/mo)`);
  const note = [
    "NOVA ADD-ONS PURCHASED",
    `Client: ${input.email}`,
    ...(input.clientId ? [`Client ID: ${input.clientId}`] : []),
    `Stripe checkout: ${input.checkoutSessionId}`,
    "Bought with the Launch Plan at checkout (setup fees waived). Activate after onboarding:",
    ...lines,
  ].join("\n");
  const noteResponse = await fetchImpl(`${baseUrl}/contacts/${contact}/notes`, {
    method: "POST",
    headers,
    body: JSON.stringify({ body: note }),
  });
  if (!noteResponse.ok) throw new Error(`GHL add-on note failed (${noteResponse.status})`);
}
