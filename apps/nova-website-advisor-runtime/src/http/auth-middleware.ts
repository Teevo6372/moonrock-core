import type { Context, Next } from "hono";
import { verifySessionToken, type SessionTokenPayload } from "../auth.js";
import { problem } from "./problem.js";

export type AuthVariables = { account: SessionTokenPayload };

const SESSION_COOKIE_NAME = "nova_session";

function readSessionCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const match = new RegExp(`(?:^|;\s*)${SESSION_COOKIE_NAME}=([^;]+)`).exec(cookieHeader);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Gate a route behind a valid session, optionally restricted to specific
 * roles. On success, sets `account` on the context so downstream handlers
 * (e.g. the dashboard data routes) can scope queries to
 * account.clientGhlLocationId without re-deriving identity themselves.
 *
 * `secret` is deliberately `string | undefined` rather than `string`: an
 * unconfigured environment must fail closed here, and accepting `undefined`
 * means no call site needs an empty-string fallback to satisfy the type.
 */
export function requireAuth(secret: string | undefined, allowedRoles?: Array<"admin" | "client">) {
  return async (context: Context<{ Variables: AuthVariables }>, next: Next) => {
    // Verifying against an empty HMAC key would make every token forgeable,
    // so a deployment with no NOVA_SESSION_SECRET reports 503 here for the
    // same reason /v1/auth/login already does.
    if (!secret) {
      return problem(context, {
        type: "urn:nova:problem:auth-unavailable",
        title: "Authentication unavailable",
        status: 503,
        detail: "Authentication is not configured in this environment.",
        code: "AUTH_UNAVAILABLE",
      });
    }

    const token = readSessionCookie(context.req.header("cookie"));
    const payload = token ? verifySessionToken(token, secret) : null;

    if (!payload) {
      return problem(context, {
        type: "urn:nova:problem:unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "A valid session is required.",
        code: "UNAUTHORIZED",
      });
    }
    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      return problem(context, {
        type: "urn:nova:problem:forbidden",
        title: "Forbidden",
        status: 403,
        detail: "This account does not have access to this resource.",
        code: "FORBIDDEN",
      });
    }

    context.set("account", payload);
    await next();
  };
}

export { SESSION_COOKIE_NAME };
