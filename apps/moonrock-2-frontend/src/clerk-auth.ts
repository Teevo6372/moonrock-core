import type { Clerk as ClerkInstance } from "@clerk/clerk-js";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

let clerk: ClerkInstance | null = null;
let loadPromise: Promise<ClerkInstance | null> | null = null;

/**
 * The Frontend API domain is base64-encoded into the publishable key's
 * middle segment (pk_test_<base64>$) - Clerk always appends a trailing "$"
 * to the decoded value as a delimiter, hence the slice.
 */
function frontendApiDomain(publishableKey: string): string {
  const encoded = publishableKey.split("_")[2] ?? "";
  return atob(encoded).slice(0, -1);
}

/**
 * @clerk/clerk-js's npm package is core-only as of v6 - its UI components
 * (sign-in modal, etc.) ship as a separate bundle served from Clerk's own
 * CDN and must be loaded as a plain <script> tag *before* clerk.load(),
 * which then wires it in via the `ui.ClerkUI` option. Skipping this yields
 * no error until the first call to openSignIn()/mountSignIn(), which throws
 * "Clerk was not loaded with Ui components".
 */
function loadClerkUiScript(publishableKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://${frontendApiDomain(publishableKey)}/npm/@clerk/ui@1/dist/ui.browser.js`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load the Clerk UI bundle"));
    document.head.appendChild(script);
  });
}

/**
 * Lazily loads and initializes Clerk exactly once, on first actual use (see
 * call sites - none run at module-eval time). @clerk/clerk-js is a large SDK
 * (~580KB gzipped); a static top-level import would bundle it into
 * site-nav's eagerly-loaded chunk and ship it to every single page view,
 * even for the overwhelming majority of visitors who never touch login. The
 * dynamic import() here makes Vite code-split it into its own chunk that
 * only downloads once someone actually opens the nav.
 * Returns null when no publishable key is configured (matches this app's
 * pattern for every other optional integration - e.g. voice, Stripe
 * checkout - degrading gracefully instead of throwing when a feature isn't
 * wired up in a given environment).
 */
export function loadClerk(): Promise<ClerkInstance | null> {
  if (!PUBLISHABLE_KEY) return Promise.resolve(null);
  if (!loadPromise) {
    loadPromise = (async () => {
      const [{ Clerk }] = await Promise.all([import("@clerk/clerk-js"), loadClerkUiScript(PUBLISHABLE_KEY)]);
      const instance = new Clerk(PUBLISHABLE_KEY);
      // `ui` isn't in @clerk/clerk-js's public ClerkOptions type - it's how
      // the separately-loaded UI bundle above registers itself. Global name
      // and wiring per Clerk's own vanilla-JS guidance, not officially typed.
      const clerkUiCtor = (window as unknown as { __internal_ClerkUICtor: unknown }).__internal_ClerkUICtor;
      await instance.load({ ui: { ClerkUI: clerkUiCtor } } as Parameters<typeof instance.load>[0]);
      clerk = instance;
      return instance;
    })();
  }
  return loadPromise;
}

export function isClerkConfigured(): boolean {
  return Boolean(PUBLISHABLE_KEY);
}

export function isSignedIn(): boolean {
  return Boolean(clerk?.user);
}

export function currentUserLabel(): string | null {
  const user = clerk?.user;
  if (!user) return null;
  return user.primaryEmailAddress?.emailAddress ?? user.fullName ?? "Client";
}

/** Opens Clerk's hosted sign-in modal. No-op if Clerk isn't configured. */
export async function openClientSignIn(): Promise<void> {
  const instance = await loadClerk();
  instance?.openSignIn({});
}

export async function signOutClient(): Promise<void> {
  const instance = await loadClerk();
  await instance?.signOut();
}

/**
 * The short-lived JWT the Nova runtime verifies server-side (see
 * clerk-auth-middleware.ts). Null when signed out or Clerk isn't configured.
 */
export async function getClerkAuthToken(): Promise<string | null> {
  const instance = await loadClerk();
  return (await instance?.session?.getToken()) ?? null;
}

/** Re-fires `listener` on every Clerk auth state change, and once immediately with the current state. */
export function onClerkAuthChange(listener: (signedIn: boolean) => void): void {
  loadClerk().then((instance) => {
    if (!instance) { listener(false); return; }
    listener(isSignedIn());
    instance.addListener(() => listener(isSignedIn()));
  });
}
