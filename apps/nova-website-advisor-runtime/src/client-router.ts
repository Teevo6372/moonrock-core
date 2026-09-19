import { Hono } from "hono";
import { requireClerkAuth, type ClerkAuthVariables } from "./http/clerk-auth-middleware.js";

export interface ClientRouterOptions {
  clerkSecretKey?: string;
}

/**
 * Foundation for the gated, authenticated Nova client experience (account
 * onboarding, account-specific Q&A) - see clerk-auth-middleware.ts. Only a
 * single identity-check route exists so far; the actual client-mode
 * conversation logic is a separate, later phase once the auth round-trip
 * itself is proven live.
 */
export function createClientRouter(options: ClientRouterOptions = {}): Hono<{ Variables: ClerkAuthVariables }> {
  const router = new Hono<{ Variables: ClerkAuthVariables }>();

  router.get("/me", requireClerkAuth(options.clerkSecretKey), (context) => {
    return context.json(context.get("clerkUser"));
  });

  return router;
}
