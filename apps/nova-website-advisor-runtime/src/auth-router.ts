import { Hono, type Context } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { hashPassword, signSessionToken, verifyPassword } from "./auth.js";
import { requireAuth, SESSION_COOKIE_NAME, type AuthVariables } from "./http/auth-middleware.js";
import type { PostgresAccountRepository } from "./postgres-account-repository.js";

export interface AuthRouterOptions {
  accountRepository?: PostgresAccountRepository;
  sessionSecret?: string;
}

const isProduction = process.env.RAILWAY_ENVIRONMENT !== undefined;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
// Long enough to be worth having, short enough not to reject the generated
// bootstrap credentials the seed CLI produces.
const MINIMUM_PASSWORD_LENGTH = 12;

function issueSessionCookie(context: Context<{ Variables: AuthVariables }>, token: string): void {
  setCookie(context, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "Strict",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

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
    issueSessionCookie(context, token);
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

  /**
   * Rotate the signed-in account's own password. The current password is
   * required even though the caller already holds a valid session: a stolen
   * cookie should not be enough to lock the real owner out of their account.
   *
   * Caveat worth knowing: session tokens are stateless HMAC signatures with
   * no server-side registry (see auth.ts), so this cannot invalidate tokens
   * already issued on other devices - they stay valid until they expire.
   * The caller's own cookie is re-issued so it does not matter to them.
   */
  router.post("/password", requireAuth(sessionSecret), async (context) => {
    if (!accountRepository || !sessionSecret) {
      return context.json({ code: "AUTH_UNAVAILABLE", detail: "Password changes are not configured in this environment." }, 503);
    }
    const session = context.get("account");
    const body = (await context.req.json()) as { currentPassword?: unknown; newPassword?: unknown };
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    if (!currentPassword || !newPassword) {
      return context.json({ code: "INVALID_PASSWORD_CHANGE", detail: "Both currentPassword and newPassword are required." }, 400);
    }
    if (newPassword.length < MINIMUM_PASSWORD_LENGTH) {
      return context.json({ code: "PASSWORD_TOO_SHORT", detail: `The new password must be at least ${MINIMUM_PASSWORD_LENGTH} characters.` }, 400);
    }
    if (newPassword === currentPassword) {
      return context.json({ code: "PASSWORD_UNCHANGED", detail: "The new password must differ from the current one." }, 400);
    }

    // Resolve by id from the session rather than trusting an email in the
    // body - the token is the only thing that says who the caller is.
    const account = await accountRepository.findById(session.accountId);
    if (!account || !(await verifyPassword(currentPassword, account.passwordHash))) {
      return context.json({ code: "INVALID_CREDENTIALS", detail: "That password is not correct." }, 401);
    }

    await accountRepository.updatePasswordHash(account.accountId, await hashPassword(newPassword));
    const token = signSessionToken(
      {
        accountId: account.accountId,
        role: account.role,
        ...(account.clientGhlLocationId ? { clientGhlLocationId: account.clientGhlLocationId } : {}),
      },
      sessionSecret,
    );
    issueSessionCookie(context, token);
    return context.json({ status: "password_updated" });
  });

  return router;
}
