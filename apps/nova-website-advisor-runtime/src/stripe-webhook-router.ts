import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { AI_EMPLOYEE_CATALOG } from "./ai-employee-catalog.js";
import { restoreNovaDiscovery } from "./discovery-api-contract.js";
import type { DiagnosticInput } from "./diagnostic-engine.js";
import type { DiscoveryStateRepository } from "./discovery-state-repository.js";
import { recordConversationSale } from "./discovery-session.js";
import { handoffFlightPlanToGhl, type ProductionGhlHandoffConfig } from "./ghl-production-handoff.js";
import type { PostgresLaunchPlanRepository } from "./postgres-launch-plan-repository.js";
import { verifyStripeWebhookSignature } from "./stripe-client.js";

export interface StripeWebhookRouterOptions {
  webhookSecret?: string;
  discoveryRepository: DiscoveryStateRepository;
  productionGhl?: ProductionGhlHandoffConfig;
  launchPlanRepository?: PostgresLaunchPlanRepository;
}

interface StripeCheckoutSessionCompletedObject {
  id: string;
  client_reference_id?: string | null;
  customer_details?: { email?: string | null; name?: string | null } | null;
  metadata?: Record<string, string> | null;
}

/** first word -> firstName, remainder -> lastName, both omitted if there's nothing usable - handoffFlightPlanToGhl's plausible-name check only fires when a name is actually supplied. */
function splitCustomerName(name: string | null | undefined): { firstName?: string; lastName?: string } {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  const firstName = parts[0]!;
  const rest = parts.slice(1);
  return rest.length > 0 ? { firstName, lastName: rest.join(" ") } : { firstName };
}

/**
 * Mounted at /v1/webhooks/stripe (see http/moonrock2-app.ts). Reads the raw
 * request body itself for signature verification - never JSON.parse it
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

    let event: { type?: string; data?: { object?: unknown } };
    try {
      event = JSON.parse(rawBody) as typeof event;
    } catch {
      return context.json({ code: "STRIPE_WEBHOOK_INVALID_PAYLOAD" }, 400);
    }
    if (event.type !== "checkout.session.completed") return context.json({ received: true });

    const session = event.data?.object as StripeCheckoutSessionCompletedObject | undefined;
    const sessionId = session?.client_reference_id ?? session?.metadata?.moonrock_session_id;
    if (!session || !sessionId) {
      console.error("[stripe-webhook] checkout.session.completed missing client_reference_id/metadata.moonrock_session_id", session?.id);
      return context.json({ received: true });
    }
    const usedFoundingPrice = session.metadata?.moonrock_used_founding_price === "true";

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

    if (options.productionGhl?.enabled && options.productionGhl.writesEnabled && options.productionGhl.fieldsVerified && session.customer_details?.email) {
      try {
        const restored = restoreNovaDiscovery(updatedState);
        if (restored.result) {
          await handoffFlightPlanToGhl(
            {
              sessionId,
              identity: { email: session.customer_details.email, ...splitCustomerName(session.customer_details.name), followUpConsent: true },
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

    return context.json({ received: true });
  });

  return router;
}
