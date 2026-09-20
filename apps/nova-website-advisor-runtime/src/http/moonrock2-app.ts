import type { AnswerInterpreter } from "../answer-interpreter.js";
import { createAuthRouter } from "../auth-router.js";
import { createClientRouter } from "../client-router.js";
import type { GeneralContactGhlConfig } from "../contact-form-ghl.js";
import { createContactRouter } from "../contact-router.js";
import { createDiscoveryRouter, type StripeCheckoutConfig } from "../discovery-router.js";
import { InMemoryDiscoveryStateRepository, type DiscoveryStateRepository } from "../discovery-state-repository.js";
import type { NovaConversationEngine, NovaConversationGenerator } from "../dynamic-conversation-engine.js";
import type { VoiceSynthesizer } from "../elevenlabs-voice.js";
import type { OptInGhlConfig } from "../ghl-opt-in.js";
import type { ProductionGhlHandoffConfig } from "../ghl-production-handoff.js";
import { loadGhlRuntimeConfig } from "../ghl-runtime-config.js";
import { createLaunchPlanRouter } from "../launch-plan-router.js";
import { createOptInRouter } from "../opt-in-router.js";
import type { PostgresAccountRepository } from "../postgres-account-repository.js";
import type { PostgresClientRepository } from "../postgres-client-repository.js";
import type { PostgresLaunchPlanRepository } from "../postgres-launch-plan-repository.js";
import { createStripeWebhookRouter } from "../stripe-webhook-router.js";
import { createApp, type AppOptions } from "./app.js";

export interface Moonrock2AppOptions extends AppOptions {
  discoveryRepository?: DiscoveryStateRepository;
  productionGhl?: ProductionGhlHandoffConfig;
  optInGhl?: OptInGhlConfig;
  contactGhl?: GeneralContactGhlConfig;
  conversationEngine?: NovaConversationEngine;
  answerInterpreter?: AnswerInterpreter;
  voiceSynthesizer?: VoiceSynthesizer;
  // New: only wired when a real Postgres Pool exists (see server.ts) - in
  // local/dev without DATABASE_URL, /v1/auth/login reports 503 rather than
  // throwing at startup, matching how optInGhl already degrades.
  accountRepository?: PostgresAccountRepository;
  sessionSecret?: string;
  // Same degrade-gracefully pattern - GET /v1/launch-plan/status reports 503
  // without a real Postgres Pool rather than throwing at startup.
  launchPlanRepository?: PostgresLaunchPlanRepository;
  stripe?: StripeCheckoutConfig;
  stripeWebhookSecret?: string;
  // Same degrade-gracefully pattern - GET /v1/client/me reports 503 without
  // a real Clerk secret key rather than throwing at startup. See
  // clerk-auth-middleware.ts for why this is a bearer token, not a cookie.
  clerkSecretKey?: string;
  // Client records and Stripe event dedup (Stage 3). When absent the webhook
  // still runs but skips client creation and idempotency tracking.
  clientRepository?: PostgresClientRepository;
  // URL clients land on after accepting the Clerk invite. Required for Clerk
  // invitations to be sent; webhook silently skips that step when absent.
  clerkInviteRedirectUrl?: string;
  /** The raw LLM generator, passed separately so the onboarding engine can
   * build its own system prompt and context without going through the
   * discovery-state-bound SessionGroundedNovaConversationEngine. */
  novaConversationGenerator?: NovaConversationGenerator;
}

function resolveOptInGhlConfig(explicit?: OptInGhlConfig): OptInGhlConfig | undefined {
  if (explicit) return explicit;
  try {
    const runtimeConfig = loadGhlRuntimeConfig();
    return {
      enabled: true,
      writesEnabled: (process.env.NOVA_GHL_WRITES_ENABLED ?? "").trim().toLowerCase() === "true",
      locationId: runtimeConfig.locationId,
      accessToken: runtimeConfig.privateIntegrationToken,
      baseUrl: runtimeConfig.baseUrl,
    };
  } catch {
    // GHL connection details are not configured in this environment (e.g. local/dev).
    // The opt-in endpoint reports 503 OPT_IN_UNAVAILABLE rather than throwing at startup.
    return undefined;
  }
}

// Reuses the same three NOVA_GHL_* env vars as opt-in (no new Railway
// config needed) - a standalone contact form has no discovery session, so
// it deliberately does not reuse productionGhl's separate fieldsVerified
// gate, which only makes sense for the field-mapped discovery handoff.
function resolveGeneralContactGhlConfig(explicit?: GeneralContactGhlConfig): GeneralContactGhlConfig | undefined {
  if (explicit) return explicit;
  try {
    const runtimeConfig = loadGhlRuntimeConfig();
    return {
      enabled: true,
      writesEnabled: (process.env.NOVA_GHL_WRITES_ENABLED ?? "").trim().toLowerCase() === "true",
      locationId: runtimeConfig.locationId,
      accessToken: runtimeConfig.privateIntegrationToken,
      baseUrl: runtimeConfig.baseUrl,
    };
  } catch {
    return undefined;
  }
}

export function createMoonrock2App(options: Moonrock2AppOptions = {}): ReturnType<typeof createApp> {
  const {
    discoveryRepository = new InMemoryDiscoveryStateRepository(),
    productionGhl,
    optInGhl,
    contactGhl,
    conversationEngine,
    novaConversationGenerator,
    answerInterpreter,
    voiceSynthesizer,
    accountRepository,
    sessionSecret,
    launchPlanRepository,
    stripe,
    stripeWebhookSecret,
    clerkSecretKey,
    clientRepository,
    clerkInviteRedirectUrl,
    ...appOptions
  } = options;
  const llmConnected = Boolean(conversationEngine);
  const ghlConnected = Boolean(productionGhl);
  const base = createApp({
    ...appOptions,
    liveStatus: {
      mode: llmConnected || ghlConnected ? "live" : "local-mock",
      providers: llmConnected && ghlConnected
        ? "connected"
        : llmConnected || ghlConnected
          ? "partially-connected"
          : "disconnected",
    },
  });
  base.app.route("/v1/discovery", createDiscoveryRouter(discoveryRepository, {
    ...(productionGhl ? { productionGhl } : {}),
    ...(conversationEngine ? { conversationEngine } : {}),
    ...(answerInterpreter ? { answerInterpreter } : {}),
    ...(voiceSynthesizer ? { voiceSynthesizer } : {}),
    ...(stripe ? { stripe } : {}),
    ...(launchPlanRepository ? { launchPlanRepository } : {}),
  }));
  const resolvedOptInGhl = resolveOptInGhlConfig(optInGhl);
  base.app.route("/v1/opt-in", createOptInRouter({
    ...(resolvedOptInGhl ? { productionGhl: resolvedOptInGhl } : {}),
  }));
  const resolvedContactGhl = resolveGeneralContactGhlConfig(contactGhl);
  base.app.route("/v1/contact", createContactRouter({
    ...(resolvedContactGhl ? { ghl: resolvedContactGhl } : {}),
  }));
  base.app.route("/v1/auth", createAuthRouter({
    ...(accountRepository ? { accountRepository } : {}),
    ...(sessionSecret ? { sessionSecret } : {}),
  }));
  base.app.route("/v1/launch-plan", createLaunchPlanRouter({
    ...(launchPlanRepository ? { launchPlanRepository } : {}),
  }));
  base.app.route("/v1/client", createClientRouter({
    ...(clerkSecretKey ? { clerkSecretKey } : {}),
    ...(clientRepository ? { clientRepository } : {}),
    discoveryRepository,
    ...(novaConversationGenerator ? { conversationGenerator: novaConversationGenerator } : {}),
  }));
  base.app.route("/v1/webhooks/stripe", createStripeWebhookRouter({
    discoveryRepository,
    ...(stripeWebhookSecret ? { webhookSecret: stripeWebhookSecret } : {}),
    ...(productionGhl ? { productionGhl } : {}),
    ...(launchPlanRepository ? { launchPlanRepository } : {}),
    ...(clientRepository ? { clientRepository } : {}),
    ...(clerkSecretKey && clerkInviteRedirectUrl ? { clerkInvitation: { secretKey: clerkSecretKey, inviteRedirectUrl: clerkInviteRedirectUrl } } : {}),
  }));
  return base;
}
