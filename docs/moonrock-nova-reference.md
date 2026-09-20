# Moonrock Marketing — Nova & Ascension Funnel

Reference doc — locked decisions, current build status, and open items

**Purpose:** a single source of truth for the Moonrock Marketing / Nova build, so any new chat, coding session, or planning conversation can start here instead of re-deriving context. Update this doc whenever a decision changes or a new one is locked in.

---

## 1. The Three Tiers

| Tier | Price | What it is | Status |
| --- | --- | --- | --- |
| Moonrock Launch Plan | $97/mo ($499 setup, $0 for founding customers) | Missed-call text-back, FAQ answering, automatic review requests, website build/upgrade, leads & bookings in one screen | Live — Nova closes autonomously via Stripe |
| AI Agent Business Advisor ("ai_employee") | $999/mo | Nova scoped as a dedicated AI Employee doing ongoing work for one client's business, fully customized | Paused in code — not yet sellable |
| AI Agent Workforce ("ai_workforce") | $9,999/mo | Nova as part of a multi-agent team running tasks across a client's business, fully customized | Paused in code — not yet sellable |

Target market: startup businesses, local SMBs, and contractors — with a specific niche focus on home service contractors near Lawrence, KS.

---

## 2. Nova's Two Jobs

- **Sales & onboarding agent** — on moonrockmarketing.com, Nova talks to visitors, runs discovery, diagnoses their bottleneck, builds a Flight Plan, and closes the Launch Plan autonomously via Stripe. High-signal leads (role-replacement language, multi-location, team-of-agents language) get fast-tracked toward the two paused tiers for human review instead of an autonomous close.
- **The product itself** — once a client is on the AI Agent Business Advisor or AI Agent Workforce tier, Nova (or a Nova-led team) becomes an ongoing AI Employee doing real work for that client's business. This is a fundamentally different relationship than the Launch Plan's one-time website + automation delivery.

---

## 3. Current Build Status

**Built and live:**

- Clerk authentication in production (DNS, SSL, live keys on Railway/Cloudflare Pages)
- Stripe Checkout + webhook for Launch Plan purchase (`checkout.session.completed`)
- Full discovery → diagnosis → Flight Plan pipeline (`flight-plan.ts`, `diagnostic-engine.ts`, `ai-employee-catalog.ts`, `ascension-bundle.ts`, `fast-track.ts`)
- Moonrock 2.0 frontend (Vite/TS) and Nova Website Advisor Runtime backend (Hono), both on Cloudflare Pages / Railway
- GHL Client Portal confirmed present and usable on the Setterlun University sub-account — native feature, not restricted
- Stripe webhook → Clerk invitation handoff: after `checkout.session.completed`, a Clerk invitation is sent to the customer's email with `publicMetadata: { clientId, tier }` and redirect to `clients.moonrockmarketing.com/onboarding`
- `GET /v1/client/me` — full implementation: fast path by `clerk_user_id`, fallback via Clerk `publicMetadata.clientId` on first login, activates the client row and links the Clerk identity
- Clerk-gated onboarding conversation at `clients.moonrockmarketing.com/onboarding` — Nova conducts the post-payment intake Q&A via `POST /v1/client/onboarding/conversation` (`onboarding-conversation-engine.ts`); tested end-to-end 2026-09-19
- `clients.moonrockmarketing.com` — Cloudflare Pages custom domain for the client portal (required by Clerk's origin validation policy); DNS CNAME `clients → moonrock-2.pages.dev` (proxied)

**Not yet built:**

- Auth-state branching in the main site frontend (`main.ts` currently shows the same discovery chat to every visitor regardless of Clerk sign-in state)
- Full client dashboard build-out (Stage 5) — the onboarding conversation is live, but the ongoing client dashboard (activity log, task history) is not started
- AI Agent Business Advisor and AI Agent Workforce tiers — code exists in the catalog but is deliberately paused

**Being retired:**

- The WordPress/Elementor/XStore website stack — new and upgraded client sites will be built via GitHub → Vite → Cloudflare instead
- The old homegrown HMAC-session auth system (`auth.ts` / `auth-router.ts` / `postgres-account-repository.ts`) — recommended for retirement now that Clerk covers customer-facing auth

---

## 4. Architecture Decisions Locked In

### Client dashboard split

- **GHL Client Portal** — the account/billing/onboarding-status layer for all three tiers: invoices, onboarding checklist (via Courses), file exchange, contracts, booking. Runs on its own ClientClub domain/login, separate from Clerk.
- **Clerk-gated `/v1/client/*` surface** — reserved for Nova's own working data: talking to Nova today, and (once tiers 2/3 launch) an activity/task log showing what the client's AI Employee or Workforce is actually doing. Scaffold this as an extensible dashboard shell now rather than a one-off redirect.
- Clients will end up with two logins by design — one for Nova, one for their account/onboarding portal — because they're genuinely different surfaces used at different times.

### Client portal domain

- `clients.moonrockmarketing.com` is the production client-facing URL for all Clerk-gated surfaces. This is required — Clerk's origin validation rejects requests from domains that aren't `moonrockmarketing.com` subdomains. `moonrock-2.pages.dev` cannot be used for authenticated client flows.
- CORS policy (`cors-policy.ts`) explicitly allows `clients.moonrockmarketing.com` and includes `authorization` in `access-control-allow-headers` for Bearer token requests.

### GHL account structure

- Staying on the Setterlun University-supplied sub-account for now is fine. The code's Agency-account migration trigger is tied specifically to the first GHL SaaS reseller sale, not to onboarding a first Nova client — no action needed until that product line goes live.

### Repo & environment

- Correct, current repo path: `~/Documents/github/moonrock-core` (a separate, stale duplicate clone exists at `~/moonrock-core` and should be ignored).
- `apps/commerce-os` is not an active project and should be disregarded.

### Payments

- Invoicing/payments in scope for now are Moonrock's own plan billing from the customer ($97/mo etc. via Stripe) — not client-to-their-customer invoicing.

### Website build approach

- No paid ad management in the Launch Plan.
- Website builds and updates are done with Nova automating the GitHub → Vite → Cloudflare pipeline; the WordPress/Elementor/XStore stack is being retired.

### nova_clients DB schema (production)

- `stripe_customer_id` — NOT NULL (required at insert time)
- `flight_plan_id` — NOT NULL, TEXT (not a foreign key; the discovery session ID from Nova's flight plan pipeline)
- `clerk_user_id` — nullable; populated on first login by `activateClient()`
- `status` lifecycle: `paid` → `active` (via `activateClient` on first `/v1/client/me` hit) — do **not** insert rows with `status = 'active'` manually or `activateClient` will skip the `clerk_user_id` write (WHERE guard: `status != 'active'`)

---

## 5. Open Decisions (Not Yet Settled)

- **Social auto-posting / "prospect feed"** — in scope for the Launch Plan or not?
- **Per-client website architecture** — a shared template repo with per-client content injection, or a separate repo / Cloudflare Pages project per client?
- **Higgsfield vs. GHL AI Studio** — whether to keep the Higgsfield Plus subscription for video/content generation or shift that work to GHL's native AI Studio.
- **Client dashboard build-out** — final design of the Clerk-gated client surface for Stage 5, once the above are answered.

---

## 6. Keeping This in Sync Across Tools

Only the memory system follows you automatically across chat, this kind of session, and Claude Code — and it only captures durable personal/business facts, not full architecture discussions. To stay consistent:

- Use the Moonrock Marketing Project as the home base for planning and strategy conversations; keep this reference doc there and update it as decisions change.
- Use Claude Code (terminal or VS Code — pick one) purely for hands-on coding against the repo.
- Use a tool-equipped session like this one for tasks needing browser/device access (checking the live site, GHL, Cloudflare, Railway) — and write conclusions back into this doc afterward.
- Avoid starting new Moonrock-related work in a plain chat outside the Project; that's where context gets lost.

---

*Generated for Stephen — Moonrock Marketing Company, Lawrence, KS. Keep this doc current as the single reference point.*
