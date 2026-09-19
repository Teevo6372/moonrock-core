import type { Context, Next } from "hono";
import { verifyToken } from "@clerk/backend";
import { problem } from "./problem.js";

export interface ClerkAuthUser {
  clerkUserId: string;
  sessionId: string;
}

export type ClerkAuthVariables = { clerkUser: ClerkAuthUser };

/**
 * Gates a route behind a valid Clerk session, passed as `Authorization:
 * Bearer <token>` (see clerk-auth.ts's getClerkAuthToken on the frontend -
 * Clerk issues short-lived JWTs rather than a first-party cookie, which
 * sidesteps the cross-origin cookie problem the homegrown auth.ts session
 * would have hit here, since the frontend and this API are different
 * origins). On success, sets `clerkUser` on the context.
 *
 * `secretKey` is `string | undefined` rather than `string` for the same
 * reason as the homegrown requireAuth: an unconfigured environment must
 * fail closed with a clear 503, not silently accept every request.
 */
export function requireClerkAuth(secretKey: string | undefined) {
  return async (context: Context<{ Variables: ClerkAuthVariables }>, next: Next) => {
    if (!secretKey) {
      return problem(context, {
        type: "urn:nova:problem:auth-unavailable",
        title: "Authentication unavailable",
        status: 503,
        detail: "Client authentication is not configured in this environment.",
        code: "AUTH_UNAVAILABLE",
      });
    }

    const header = context.req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
    if (!token) {
      return problem(context, {
        type: "urn:nova:problem:unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "A valid session is required.",
        code: "UNAUTHORIZED",
      });
    }

    // verifyToken throws on any invalid/expired token rather than returning
    // an error result - catch and fall through to the same 401 either way.
    const claims = await verifyToken(token, { secretKey }).catch(() => null);
    if (!claims) {
      return problem(context, {
        type: "urn:nova:problem:unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "A valid session is required.",
        code: "UNAUTHORIZED",
      });
    }

    context.set("clerkUser", { clerkUserId: claims.sub, sessionId: claims.sid });
    await next();
  };
}
