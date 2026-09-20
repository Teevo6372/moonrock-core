import { Hono } from "hono";
import { getClerkUserPublicMetadata } from "./clerk-invitation.js";
import { requireClerkAuth, type ClerkAuthVariables } from "./http/clerk-auth-middleware.js";
import { OnboardingConversationEngine, type OnboardingContext } from "./onboarding-conversation-engine.js";
import type { NovaConversationGenerator } from "./dynamic-conversation-engine.js";
import type { NovaClient } from "./postgres-client-repository.js";
import type { PostgresClientRepository } from "./postgres-client-repository.js";
import type { DiscoveryStateRepository } from "./discovery-state-repository.js";
import type { DiagnosticInput } from "./diagnostic-engine.js";

export interface ClientRouterOptions {
  clerkSecretKey?: string;
  clientRepository?: PostgresClientRepository;
  discoveryRepository?: DiscoveryStateRepository;
  conversationGenerator?: NovaConversationGenerator;
}

/**
 * Foundation for the gated, authenticated Nova client experience. On the first
 * hit after accepting a Clerk invitation, this handler links the Clerk identity
 * to the nova_clients row using the clientId stored in the invitation's
 * publicMetadata, then transitions status to 'active'. Subsequent calls take
 * the fast path (clerk_user_id lookup) without touching Clerk's API again.
 */
export function createClientRouter(options: ClientRouterOptions = {}): Hono<{ Variables: ClerkAuthVariables }> {
  const router = new Hono<{ Variables: ClerkAuthVariables }>();

  router.get("/me", requireClerkAuth(options.clerkSecretKey), async (context) => {
    const { clerkUserId, sessionId } = context.get("clerkUser");

    if (!options.clientRepository || !options.clerkSecretKey) {
      return context.json({ clerkUserId, sessionId });
    }

    // Fast path: already linked.
    let client: NovaClient | null = await options.clientRepository.findByClerkUserId(clerkUserId);
    if (client) {
      return context.json({ clerkUserId, sessionId, client: safeClientView(client) });
    }

    // First login: read the Clerk user's publicMetadata, which carries the
    // clientId written into the invitation, then link and activate.
    try {
      const meta = await getClerkUserPublicMetadata(clerkUserId, options.clerkSecretKey);
      if (meta.clientId) {
        client = await options.clientRepository.findById(meta.clientId);
        if (client) {
          await options.clientRepository.activateClient(client.id, clerkUserId);
          client = { ...client, status: "active", clerkUserId };
        }
      }
    } catch (error) {
      console.error(`[client-router] failed to link Clerk user ${clerkUserId} to client record:`, error instanceof Error ? error.message : error);
    }

    return context.json({ clerkUserId, sessionId, ...(client ? { client: safeClientView(client) } : {}) });
  });

  router.get("/onboarding", requireClerkAuth(options.clerkSecretKey), async (context) => {
    const { clerkUserId } = context.get("clerkUser");
    if (!options.clientRepository) return context.json({ status: "pending", conversation: [], answers: {} });

    const client = await options.clientRepository.findByClerkUserId(clerkUserId);
    if (!client) return context.json({ error: "Client record not found." }, 404);

    const state = await options.clientRepository.getOnboardingState(client.id);
    return context.json(state ?? { status: "pending", conversation: [], answers: {} });
  });

  router.post("/onboarding/conversation", requireClerkAuth(options.clerkSecretKey), async (context) => {
    const { clerkUserId } = context.get("clerkUser");

    if (!options.clientRepository || !options.conversationGenerator) {
      return context.json({ error: "Onboarding conversation is not available in this environment." }, 503);
    }

    let body: { question?: unknown };
    try {
      body = await context.req.json<{ question?: unknown }>();
    } catch {
      return context.json({ error: "Invalid JSON body." }, 400);
    }
    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!question) return context.json({ error: "question is required." }, 400);

    const client = await options.clientRepository.findByClerkUserId(clerkUserId);
    if (!client) return context.json({ error: "Client record not found." }, 404);

    const state = await options.clientRepository.getOnboardingState(client.id);
    const onboardingState = state ?? { status: "pending" as const, conversation: [], answers: {} };

    if (onboardingState.status === "complete") {
      return context.json({ answer: "Your onboarding is already complete. A Moonrock team member will be in touch to start setup.", complete: true });
    }

    // Build context from the discovery session (the flight plan that was purchased).
    const onboardingContext: OnboardingContext = {};
    if (options.discoveryRepository && client.flightPlanId) {
      try {
        const session = await options.discoveryRepository.load(client.flightPlanId);
        if (session) {
          const answers = session.state.answers as Partial<DiagnosticInput>;
          onboardingContext.businessName = answers.businessName ?? null;
          onboardingContext.industry = answers.industry ?? null;
          onboardingContext.statedChallenges = answers.businessChallenges ?? null;
          onboardingContext.existingWebsiteUrl = answers.existingWebsiteUrl ?? null;
        }
      } catch (error) {
        console.warn(`[client-router/onboarding] could not load discovery session ${client.flightPlanId}:`, error instanceof Error ? error.message : error);
      }
    }

    const engine = new OnboardingConversationEngine(options.conversationGenerator);

    let answer: string;
    let extractedAnswers: import("./postgres-client-repository.js").OnboardingAnswers;
    let complete: boolean;
    try {
      const result = await engine.respond(question, onboardingContext, onboardingState.conversation, onboardingState.answers);
      answer = result.answer;
      extractedAnswers = result.extractedAnswers;
      complete = result.complete;
    } catch (error) {
      console.error("[client-router/onboarding] conversation engine error:", error instanceof Error ? error.message : error);
      return context.json({ error: "Nova could not respond right now. Please try again." }, 503);
    }

    const ts = new Date().toISOString();
    await options.clientRepository.appendOnboardingTurn(client.id, { role: "client", text: question, ts });
    await options.clientRepository.appendOnboardingTurn(client.id, { role: "nova", text: answer, ts });

    const hasNewAnswers = Object.keys(extractedAnswers).length > 0;
    if (hasNewAnswers) {
      await options.clientRepository.updateOnboardingAnswers(client.id, extractedAnswers);
    }

    if (complete) {
      await options.clientRepository.completeOnboarding(client.id);
    }

    return context.json({ answer, complete });
  });

  return router;
}

function safeClientView(client: NovaClient) {
  return {
    id: client.id,
    email: client.email,
    tier: client.tier,
    status: client.status,
    flightPlanId: client.flightPlanId,
  };
}
