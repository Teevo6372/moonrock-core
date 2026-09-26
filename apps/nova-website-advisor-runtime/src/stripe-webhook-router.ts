import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { announceAddonPurchaseInGhl } from "./addon-fulfillment.js";
import { AI_EMPLOYEE_CATALOG } from "./ai-employee-catalog.js";
import { sendClerkInvitation, type ClerkInvitationConfig } from "./clerk-invitation.js";
import { restoreNovaDiscovery } from "./discovery-api-contract.js";
import type { DiagnosticInput } from "./diagnostic-engine.js";
import type { DiscoveryStateRepository } from "./discovery-state-repository.js";
import { recordConversationSale } from "./discovery-session.js";
import { handoffFlightPlanToGhl, type ProductionGhlHandoffConfig } from "./ghl-production-handoff.js";
import { purchasedAddonIdsFromMetadata } from "./launch-addon-prices.js";
import type { PostgresClientRepository } from "./postgres-client-repository.js";
import type { PostgresLaunchPlanRepository } from "./postgres-launch-plan-repository.js";
import { verifyStripeWebhookSignature } from "./stripe-client.js";

export interface StripeWebhookRouterOptions {
  webhookSecret?: string;
  discoveryRepository: DiscoveryStateRepository;
  productionGhl?: ProductionGhlHandoffConfig;
  launchPlanRepository?: PostgresLaunchPlanRepository;
  clientRepository?: PostgresClientRepository;
  clerkInvitation?: ClerkInvitationConfig;
}

interface StripeCheckoutSessionCompletedObject {
  id: string;
  customer?: string | null;
  subscription?: string | null;
  client_reference_id?: string | null;
  customer_details?: { email?: string | null; name?: string | null } | null;
  metadata?: Record<string, string> | null;
}

/** first word -> firstName, remainder -> lastName. */
function splitCustomerName(name: string | null | undefined): { firstName?: string; lastName?: string } {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  const firstName = parts[0]!;
  const rest = parts.slice(1);
  return rest.length > 0 ? { firstName, lastName: rest.join(" ") } : { firstName };
}

/** Upserts the GHL contact and stamps it with the nova-paid-onboarding tag. */
async function markGhlContactPaidOnboarding(email: string, config: ProductionGhlHandoffConfig): Promise<void> {
  const baseUrl = (config.baseUrl ?? "https://services.leadconnectorhq.com").replace(/\/$/, "");
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.accessToken}`,
    Version: "v3",
  };

  const upsertResponse = await fetch(`${baseUrl}/contacts/upsert`, {
    method: "POST",
    headers,
    body: JSON.stringify({ locationId: config.locationId, email, source: "Nova Moonrock 2 — Paid Onboarding" }),
  });
  const upsertText = await upsertResponse.text();
  if (!upsertResponse.ok) throw new Error(`GHL contact upsert failed (${upsertResponse.status}): ${upsertText}`);
  const upsertPayload = upsertText ? (JSON.parse(upsertText) as { contact?: { id?: string }; id?: string }) : {};
  const contactId = upsertPayload.contact?.id ?? upsertPayload.id;
  if (!contactId) return;

  await fetch(`${baseUrl}/contacts/${encodeURIComponent(contactId)}/tags`, {
    method: "POST",
    headers,
    body: JSON.stringify({ tags: ["nova-paid-onboarding"] }),
  });
}

/**
 * Mounted at /v1/webhooks/stripe (see http/moonrock2-app.ts). Reads the raw
 * request body itself for signature verification — never JSON.parse it
 * upstream of this handler, which would change the exact bytes Stripe signed
 * and always fail verification.
 */
export function createStripeWebhookRouter(options: StripeWebhookRouterOptions): Hono {
  const router = new Hono();

  router.post("/", async (context) => {
    if (!options.webhookSecret) return context.json({ code: "STRIPE_WEBHOOK_UNAVAILABLE" }, 503);
    const signatureHeader = context.req.header("stripe-signature");
    const rawBody = await context.req.text();
    if (!signatureHeader || !verifyStripeWebhookSignature(rawBody, signatureHeader, options.webhookSecret)) {
      return context.json({ code: "STRIPE_WEBHOOK_INVALID_SIGNATURE" }, 400);
    }

    let event: { id?: string; type?: string; data?: { object?: unknown } };
    try {
      event = JSON.parse(rawBody) as typeof event;
    } catch {
      return context.json({ code: "STRIPE_WEBHOOK_INVALID_PAYLOAD" }, 400);
    }
    if (event.type !== "checkout.session.completed") return context.json({ received: true });

    const eventId = event.id;
    if (!eventId) {
      console.error("[stripe-webhook] checkout.session.completed missing event.id — cannot deduplicate, skipping");
      return context.json({ received: true });
    }

    // Persist the event before any work so replays are caught up front.
    if (options.clientRepository) {
      const isNew = await options.clientRepository.recordProcessedEvent(eventId);
      if (!isNew) {
        console.log(`[stripe-webhook] duplicate event ${eventId} — skipping`);
        return context.json({ received: true });
      }
    }

    const session = event.data?.object as StripeCheckoutSessionCompletedObject | undefined;
    const sessionId = session?.client_reference_id ?? session?.metadata?.moonrock_session_id;
    if (!session || !sessionId) {
      console.error("[stripe-webhook] checkout.session.completed missing client_reference_id/metadata.moonrock_session_id", session?.id);
      return context.json({ received: true });
    }

    // Only Launch Plan purchases create client records. Future Tier 0/1
    // checkouts with a different tier in metadata must not trigger invites.
    const tier = session.metadata?.tier ?? (session.metadata?.moonrock_offer_id === "moonrock_launch_plan" ? "launch_plan" : null);
    if (tier !== "launch_plan") {
      console.log(`[stripe-webhook] non-launch-plan checkout (tier=${tier ?? "none"}) — skipping client provisioning`);
      return context.json({ received: true });
    }

    const usedFoundingPrice = session.metadata?.moonrock_used_founding_price === "true";
    const purchasedAddonIds = purchasedAddonIdsFromMetadata(session.metadata?.moonrock_addon_item_ids);

    if (options.launchPlanRepository) {
      await options.launchPlanRepository.recordSignup({
        signupId: randomUUID(),
        sessionId,
        stripeCheckoutSessionId: session.id,
        usedFoundingPrice,
      });
    }

    const current = await options.discoveryRepository.load(sessionId);
    if (!current) {
      console.error(`[stripe-webhook] no discovery session found for confirmed payment, session ${sessionId}`);
      return context.json({ received: true });
    }

    const offer = AI_EMPLOYEE_CATALOG.moonrock_launch_plan;
    const updatedState = recordConversationSale(current.state, {
      offerId: offer.id,
      offerName: offer.name,
      ladderTier: "ai_employee",
      setupFeeUsd: usedFoundingPrice ? offer.foundingCustomerSetupFeeUsd ?? offer.setupFeeUsd : offer.setupFeeUsd,
      monthlyFeeUsd: offer.monthlyFeeUsd,
    });

    try {
      await options.discoveryRepository.save(sessionId, updatedState, current.version);
    } catch (error) {
      console.error(`[stripe-webhook] failed to persist confirmed sale for session ${sessionId}:`, error instanceof Error ? error.message : error);
    }

    // Create the client record then send the Clerk invitation. Status lives only
    // in nova_clients — nothing else recomputes or caches it.
    const email = session.customer_details?.email;
    if (options.clientRepository && email) {
      let clientId: string | undefined;
      try {
        const client = await options.clientRepository.createClient({
          email,
          stripeCustomerId: session.customer ?? session.id,
          stripeSubscriptionId: session.subscription ?? null,
          flightPlanId: sessionId,
          tier,
        });
        clientId = client.id;

        if (purchasedAddonIds.length > 0) {
          try {
            await options.clientRepository.recordPurchasedAddons(client.id, purchasedAddonIds, session.id);
          } catch (addonError) {
            console.error(`[stripe-webhook] failed to record add-ons for client ${client.id}:`, addonError instanceof Error ? addonError.message : addonError);
          }
        }

        if (options.clerkInvitation) {
          try {
            await sendClerkInvitation({ email, clientId: client.id, tier }, options.clerkInvitation);
            await options.clientRepository.setInvited(client.id);
          } catch (clerkError) {
            await options.clientRepository.setInviteFailed(client.id);
            console.error(`[stripe-webhook] Clerk invitation failed for client ${client.id} (${email}):`, clerkError instanceof Error ? clerkError.message : clerkError);
          }
        } else {
          console.warn(`[stripe-webhook] Clerk invitation not configured — client ${client.id} left in 'paid' status`);
        }
      } catch (dbError) {
        console.error(`[stripe-webhook] failed to create client record for ${email}:`, dbError instanceof Error ? dbError.message : dbError);
      }

      process.stdout.write(
        JSON.stringify({ event: "nova-new-paid-client", email, clientId, sessionId, tier, ...(purchasedAddonIds.length > 0 ? { addons: purchasedAddonIds } : {}), ts: new Date().toISOString() }) + "\n",
      );
    }

    if (options.productionGhl?.enabled && options.productionGhl.writesEnabled && options.productionGhl.fieldsVerified && email) {
      try {
        const restored = restoreNovaDiscovery(updatedState);
        if (restored.result) {
          await handoffFlightPlanToGhl(
            {
              sessionId,
              identity: { email, ...splitCustomerName(session.customer_details?.name), followUpConsent: true },
              diagnosticInput: updatedState.answers as DiagnosticInput,
              diagnostic: restored.result.diagnostic,
              flightPlan: restored.result.flightPlan,
              ...(updatedState.conversationHistory ? { conversationHistory: updatedState.conversationHistory } : {}),
            },
            options.productionGhl,
            { apply: true },
          );
        }
      } catch (error) {
        console.error(`[stripe-webhook] failed to sync confirmed sale to GHL for session ${sessionId}:`, error instanceof Error ? error.message : error);
      }
    }

    // Apply the paid-onboarding tag regardless of fieldsVerified — it only
    // needs the contact to exist, not the full custom-field mapping.
    if (options.productionGhl?.enabled && options.productionGhl.writesEnabled && email) {
      try {
        await markGhlContactPaidOnboarding(email, options.productionGhl);
      } catch (ghlError) {
        console.error(`[stripe-webhook] failed to apply GHL paid-onboarding tag for ${email}:`, ghlError instanceof Error ? ghlError.message : ghlError);
      }
    }

    // Hand the purchased add-ons to the team in GHL (tags usable as workflow triggers, plus a note).
    if (purchasedAddonIds.length > 0 && options.productionGhl?.enabled && options.productionGhl.writesEnabled && email) {
      try {
        await announceAddonPurchaseInGhl({ email, itemIds: purchasedAddonIds, checkoutSessionId: session.id }, options.productionGhl);
      } catch (ghlError) {
        console.error(`[stripe-webhook] failed to announce add-on purchase in GHL for ${email}:`, ghlError instanceof Error ? ghlError.message : ghlError);
      }
    }

    return context.json({ received: true });
  });

  return router;
}
