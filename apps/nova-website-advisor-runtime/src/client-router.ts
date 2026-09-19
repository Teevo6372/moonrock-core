import { Hono } from "hono";
import { getClerkUserPublicMetadata } from "./clerk-invitation.js";
import { requireClerkAuth, type ClerkAuthVariables } from "./http/clerk-auth-middleware.js";
import type { NovaClient } from "./postgres-client-repository.js";
import type { PostgresClientRepository } from "./postgres-client-repository.js";

export interface ClientRouterOptions {
  clerkSecretKey?: string;
  clientRepository?: PostgresClientRepository;
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
