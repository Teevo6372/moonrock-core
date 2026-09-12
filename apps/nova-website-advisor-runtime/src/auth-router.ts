import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { signSessionToken, verifyPassword } from "./auth.js";
import { requireAuth, SESSION_COOKIE_NAME, type AuthVariables } from "./http/auth-middleware.js";
import type { PostgresAccountRepository } from "./postgres-account-repository.js";

export interface AuthRouterOptions {
  accountRepository?: PostgresAccountRepository;
  sessionSecret?: string;
}

const isProduction = process.env.RAILWAY_ENVIRONMENT !== undefined;

export function createAuthRouter(options: AuthRouterOptions = {}): Hono<{ Variables: AuthVariables }> {
  const router = new Hono<{ Variables: AuthVariables }>();
  const { accountRepository, sessionSecret } = options;

  router.post("/login", async (context) => {
    if (!accountRepository || !sessionSecret) {
      return context.json({ code: "AUTH_UNAVAILABLE", detail: "Login is not configured in this environment." }, 503);
    }
    const body = (await context.req.json()) as { email?: unknown; password?: unknown };
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) {
      return context.json({ code: "INVALID_LOGIN", detail: "Email and password are required." }, 400);
    }

    const account = await accountRepository.findByEmail(email);
    // Same generic message whether the account is missing or the password is
    // wrong - don't let a login attempt confirm which emails have accounts.
    const invalid = () => context.json({ code: "INVALID_CREDENTIALS", detail: "That email or password is not correct." }, 401);
    if (!account) return invalid();
    if (!(await verifyPassword(password, account.passwordHash))) return invalid();

    const token = signSessionToken(
      {
        accountId: account.accountId,
        role: account.role,
        ...(account.clientGhlLocationId ? { clientGhlLocationId: account.clientGhlLocationId } : {}),
      },
      sessionSecret,
    );
    setCookie(context, SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "Strict",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return context.json({ role: account.role, displayName: account.displayName });
  });

  router.post("/logout", (context) => {
    deleteCookie(context, SESSION_COOKIE_NAME, { path: "/" });
    return context.json({ status: "logged_out" });
  });

  router.get("/me", requireAuth(sessionSecret), (context) => {
    const account = context.get("account");
    return context.json(account);
  });

  return router;
}
