# Moonrock Marketing — Nova & Ascension Funnel

Reference doc — locked decisions, current build status, and open items

**Purpose:** a single source of truth for the Moonrock Marketing / Nova build, so any new chat, coding session, or planning conversation can start here instead of re-deriving context. Update this doc whenever a decision changes or a new one is locked in.

---

## 1. The Three Tiers

| Tier | Price | What it is | Status |
| --- | --- | --- | --- |
| Moonrock Launch Plan | $97/mo ($499 setup, $0 for founding customers) | Missed-call text-back, FAQ answering, automatic review requests, website build/upgrade, leads & bookings in one screen | Live — Nova closes autonomously via Stripe |
| Launch Plan Add-Ons | $19–$69/mo each; bundles $59–$249/mo | Zero-touch add-ons sold on top of Launch (review replies, referral engine, GBP autopilot, scorecard, reactivation newsletter, etc.); three gated items pending decisions | Catalog, bundles, Nova selling behavior, checkout add-on picker, and purchase hand-off are built and merged (PRs #229, #231, #233, #235). Test mode and staging verified 2026-09-26. **Not yet enabled in production or live Stripe** — see section 9 for the go-live steps |
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
- **Client portal banner** (PR #230, 2026-09-21) — signed-in clients on moonrockmarketing.com now see a "Welcome back" banner with a direct link to their client portal
- **Auth-state branching** (PR #230, 2026-09-21) — `main.ts` now checks Clerk sign-in state on load and shows the portal banner only to authenticated clients
- **Post-onboarding GHL notification** (PR #230, 2026-09-21) — when a client's onboarding conversation completes, the server tags the GHL contact `nova-onboarding-complete` and writes a note; fire-and-forget via `onOnboardingComplete` callback in `ClientRouterOptions`
- **Launch add-ons catalog, bundles, and Nova selling behavior** (PR #229, 2026-09-21) — 8 add-on items, 4 bundles with `isBundleSellable()` gating, pitch triggers in system prompt, `approvedServiceCatalog()` includes sellable add-ons, `StripeCheckoutConfig.addonMonthlyPriceIds` for order-bump at checkout (populated from env as of 2026-09-25, see Open Decisions)
- **Add-on Stripe provisioning and checkout wiring** (PR #231, 2026-09-26) — `npm run provision:stripe-addons` (dry-run by default, re-runnable), `STRIPE_ADDON_MONTHLY_PRICE_IDS` env parsing, checkout de-duplication and sellability re-check
- **Checkout add-on picker** (PR #233, 2026-09-26) — optional picker in the Save Flight Plan card with running total; Nova-named add-ons flagged "Suggested by Nova"; nothing pre-ticked
- **Add-on purchase hand-off** (PR #235, 2026-09-26) — database record (`nova_client_addons`, migration 0008) plus `nova-addon-*` GHL tags and a GHL note when a checkout includes add-ons
- **Stripe account cleanup** (2026-09-26) — 3,932 legacy imported products archived; Launch Plan and 50 lead magnets kept

**Not yet built:**

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

- **Social auto-posting** — resolved: NOT in Launch Plan; sold as `social_content_autopilot` add-on ($49/mo). Currently gated pending the Higgsfield vs GHL AI Studio decision.
- **Higgsfield vs. GHL AI Studio** — whether to keep the Higgsfield Plus subscription for video/content generation or shift that work to GHL's native AI Studio. Gates `social_content_autopilot`.
- **Per-client website architecture** — a shared template repo with per-client content injection, or a separate repo / Cloudflare Pages project per client? Gates `local_seo_page_pack` and `website_care_plan`.
- **Website Care Plan scope** — confirm what Launch already covers for hosting/edits; price may drop to ~$29 (edits-only) if hosting is already included. Gates `website_care_plan`.
- **Client dashboard build-out** — final design of the Clerk-gated client surface for Stage 5, once the above are answered.
- **Stripe key scope for post-purchase add-ons** — the current restricted Stripe key covers Checkout Sessions, Prices, and Customers only; adding an add-on to an existing subscription requires `subscription_update` permission. Pre-purchase add-ons (order bump at Launch checkout) work today; post-purchase does not.
- **Stripe Price IDs for add-ons** — code merged (PR #231, 2026-09-26). **Test mode and staging verified:** the 5 sandbox prices exist, and staging (`NOVA_STRIPE_ENABLED=true` + `STRIPE_ADDON_MONTHLY_PRICE_IDS` set 2026-09-26) returned a real test Checkout Session with Launch + Review Response Autopilot + Monthly Scorecard; a gated item and a duplicate id in the same request were correctly dropped. **Production and live Stripe are not done** (see the remaining steps at the end of this entry). Details of the code: `stripe-provision-addons-cli.ts` (`npm run provision:stripe-addons`) creates one monthly Price per sellable Launch add-on (5 today; gated items are never provisioned), keyed by lookup key `moonrock_addon_<item_id>_monthly` so it is safe to re-run, and prints the JSON map to set as `STRIPE_ADDON_MONTHLY_PRICE_IDS`. `server.ts` parses that variable, drops unknown or gated ids, and ignores malformed JSON with a warning; checkout de-duplicates ids and re-checks sellability. **Checkout add-on picker (PR #233, 2026-09-26):** the Save Flight Plan card now shows an optional add-on picker (from `GET /v1/discovery/addon-offers`: only sellable add-ons that have a configured price) with a running monthly total, and checkout sends exactly the ticked ids. When Nova names an add-on in a reply the server returns `suggestedAddonIds`; the picker labels it "Suggested by Nova" and lists it first, and nothing is ever pre-ticked. Nova's instructions were narrowed to the 5 purchasable add-ons: Quote & Estimate Follow-Up, Seasonal Campaign and bundle prices were removed from the pitch because they have no Stripe price (restore them once priced). **Remaining:** (1) verify on staging with a real Nova conversation; (2) purchased add-ons are now handed off (see **Add-on purchase hand-off** below) but delivery is manual: nobody or nothing activates the add-on yet, so build GHL workflows on the `nova-addon-*` tags or set them up by hand; (3) only after (1) and (2) are settled: a live-mode `--apply` and setting the Railway production variable (which redeploys production). Live steps need Stephen's explicit go-ahead; the CLI refuses a live key with `--apply` unless `--live` is passed. Do not run `stripe-provision-catalog-cli.ts --apply` again: it would duplicate the Launch Plan product. Setup fees are waived at Launch checkout per bundle spec.
- **Stripe account cleanup — done 2026-09-26.** The "Nova Stripe Account" held 3,983 products: 3,932 were a bulk import made through GoHighLevel on 2026-09-14/15 (WordPress themes, WooCommerce plugins, Elementor add-ons and resale bundles left over from the retired WordPress SaaS kit), 50 are Moonrock's own lead-magnet templates created in GHL (kept), and 1 is the Moonrock Launch Plan (kept). All 3,932 imported products were **archived, not deleted** (reversible); the archive list was saved as a manifest file kept by Stephen, and the temporary keys used were deleted. The archived products still exist in GHL, where they are mirrored. Prices on the archived products were left as they are. Only add-on products created by `stripe-provision-addons-cli.ts` (metadata `moonrock_offer_id`) and the lead magnets should remain active. Checkout branding was corrected from leftover Woo branding to Moonrock Marketing Company (logo and colors) on 2026-09-25. No brand palette is documented in the repo; the live site uses `#070712` (background), `#f8f7ff` (text), `#ff4fd8` (magenta accent) and `#9be7ff`/`#46c8ff` (cyan).
- **Add-on purchase hand-off** (PR #235, merged 2026-09-26) — when a paid Launch checkout carries add-ons (`moonrock_addon_item_ids` metadata), the Stripe webhook records them in the new `nova_client_addons` table (migration 0008, status `purchased`, idempotent per client and add-on), tags the GHL contact `nova-addon-<name>` per add-on (for example `nova-addon-review-response-autopilot`, usable as a GHL workflow trigger), and writes a GHL note listing them. It does not activate or deliver the add-on. GHL writes need the same flags as the paid-onboarding tag (`NOVA_GHL_HANDOFF_ENABLED`, `NOVA_GHL_WRITES_ENABLED`). Failures are logged and never fail the webhook.
- **Monthly Scorecard fulfillment** — Nova pitches the scorecard and it's in `approvedServiceCatalog()`; Phase 5 fulfillment (the actual monthly report delivery pipeline) is not yet built. One-tap "turn this on" from the scorecard is a clearly-marked extension point.
- **Post-purchase add-on upgrades** — current Stripe restricted key covers Checkout Sessions, Prices, and Customers only; adding an add-on to an existing subscription requires `subscription_update` permission. Pre-purchase order-bump at Launch checkout works today; post-purchase does not.

---

## 6. Keeping This in Sync Across Tools

Only the memory system follows you automatically across chat, this kind of session, and Claude Code — and it only captures durable personal/business facts, not full architecture discussions. To stay consistent:

- Use the Moonrock Marketing Project as the home base for planning and strategy conversations; keep this reference doc there and update it as decisions change.
- Use Claude Code (terminal or VS Code — pick one) purely for hands-on coding against the repo.
- Use a tool-equipped session like this one for tasks needing browser/device access (checking the live site, GHL, Cloudflare, Railway) — and write conclusions back into this doc afterward.
- Avoid starting new Moonrock-related work in a plain chat outside the Project; that's where context gets lost.

---

## 7. Branch State (as of 2026-09-26)

### Local branches

| Branch | Status | Notes |
| --- | --- | --- |
| `main` | Active — clean | All PRs merged; up to date with origin |
| `feat/site-pages-contact-form-nav` | Merged — safe to delete | Remote gone; all commits in main |
| `fix/tier0-catalog-name-drift` | Merged — safe to delete | Was 1 commit ahead locally; merged to main in earlier session |
| `feature/launch-addon-stripe-prices`, `feature/checkout-addon-picker`, `feature/addon-purchase-fulfillment` | Merged (PRs #231, #233, #235) — safe to delete | Squash-merged; remote branches can be deleted |
| `docs/nova-reference-*` (several) | Merged (PRs #232, #234, #236) — safe to delete | Doc-only branches |

### Remote branches of note (Nova / moonrockmarketing.com)

| Branch | Notes |
| --- | --- |
| `agent/nova-release-1-staging-sprint-010` | Last staging sprint branch — superseded by main |
| `agent/program-006-runtime-activation-sprint-001/002/003` | Runtime activation work — all superseded by main |
| `feat/mission-32-dynamic-conversation-engine` | Dynamic conversation engine work — superseded by main |
| `feat/mission-39-flight-plan-sales-journey` | Flight plan sales journey — superseded by main |
| `feat/production-ghl-handoff-service` | GHL production handoff — superseded by main |
| `feature/moonrock-2-production-cutover` | Production cutover scripts — superseded by main |
| `fix/ghl-autonomous-close-field` | GHL autonomous close field fix — check if merged |
| `fix/nova-health-ready-live-status` | Health/ready status fix — check if merged |
| Commerce-OS and enterprise branches | Not active — disregard |

All `agent/` and `feature/program-0*` branches are agent-generated sprint work from earlier build phases, all superseded by main. They can be deleted in bulk from GitHub to reduce noise.

### Connected software

| System | Role | Status |
| --- | --- | --- |
| Railway | Hosts Nova Website Advisor Runtime (Node/Hono) + PostgreSQL | Live in production |
| Cloudflare Pages | Hosts moonrock-2-frontend (Vite/TS) at `moonrockmarketing.com` + `clients.moonrockmarketing.com` | Live in production |
| Stripe | Payments — Checkout, subscriptions, webhook to Railway | Live; Launch Plan prices provisioned; legacy products archived 2026-09-26; add-on prices exist in the sandbox only — live provisioning pending (section 9) |
| Clerk | Client auth — invitations, sign-in, JWT for `/v1/client/*` | Live with live keys |
| GoHighLevel (GHL) | CRM — contact records, `nova-paid-onboarding` tag, GHL Client Portal for billing/onboarding | Live on Setterlun University sub-account |
| Anthropic | LLM backbone for Nova discovery, flight plan, and onboarding conversation | Live; Groq wired as fallback |
| ElevenLabs | Voice synthesis for Nova voice chat experience | Wired in code; production key status unknown |
| PostgreSQL (Railway) | Persistent state — discovery sessions, client records, onboarding state, launch plan signups | Live; 8 migrations (0008 `nova_client_addons` deployed 2026-09-26) |

---

## 8. Pre-Launch Checklist

### Blockers — must fix before first real client

- [x] **Merge `fix/tier0-catalog-name-drift`** — done; was already in main before this session.
- [x] **Production migration 0007 confirmed** — confirmed via Railway startup logs; `nova_clients` has all required columns; all 7 migrations applied.
- [x] **Auth-state branching on the homepage** — done (PR #230, 2026-09-21); signed-in clients see a "Welcome back" banner with a link to their portal.
- [x] **Post-onboarding team notification** — done (PR #230, 2026-09-21); GHL contact is tagged `nova-onboarding-complete` and a setup note is written when onboarding completes.
- [ ] **Stripe webhook production-mode verification** — confirm the Stripe webhook is pointed at the production Railway URL with live-mode events. One live test payment should be processed end-to-end: Stripe → Railway webhook → `nova_clients` INSERT → Clerk invitation sent → client signs in → onboarding completes. Add-on go-live is tracked separately in section 9 (staging end-to-end test, then live price provisioning and the production `STRIPE_ADDON_MONTHLY_PRICE_IDS` variable).

### Add-on go-live (see section 9)

- [ ] **Staging end-to-end purchase with add-ons** — real Nova suggestion, Stripe test checkout, GHL tags and note, database row.
- [ ] **Live add-on prices provisioned and `STRIPE_ADDON_MONTHLY_PRICE_IDS` set on Railway production** — needs Stephen's explicit go-ahead; redeploys production.
- [ ] **One live add-on checkout verified** end to end (small real payment, then refund).

### High priority — fix before first paying client ships

- [ ] **GHL handoff production flags** — Verify `NOVA_GHL_HANDOFF_ENABLED=true`, `NOVA_GHL_WRITES_ENABLED=true`, and `NOVA_GHL_FIELDS_VERIFIED=true` are set on Railway production. Without these, the discovery-to-GHL handoff is silently skipped. Confirm a real discovery session generates the correct GHL contact + flight plan fields.
- [ ] **Railway env vars audit** — Confirm all required vars are set for production: `NOVA_CLERK_SECRET_KEY` (live), `NOVA_CLERK_INVITE_REDIRECT_URL` (`https://clients.moonrockmarketing.com/onboarding`), `STRIPE_WEBHOOK_SECRET` (live mode), `NOVA_ANTHROPIC_MODEL`, `NOVA_GHL_*` (location ID, access token), `ELEVENLABS_API_KEY` if voice is live.
- [ ] **Cloudflare Pages env vars audit** — Confirm production Pages build has `VITE_CLERK_PUBLISHABLE_KEY` (live: `pk_live_Y2xlcmsubW9vbnJvY2ttYXJrZXRpbmcuY29tJA`) and `VITE_NOVA_API_BASE_URL` pointing to Railway production URL (not staging).
- [ ] **Clean up stale local branches** — Delete `feat/site-pages-contact-form-nav` (already merged) and the 30+ stale remote `agent/` and `feature/program-0*` branches from GitHub. They add noise to every branch listing and PRs.

### Medium priority — before second or third client

- [ ] **Old auth system retirement** — `auth.ts`, `auth-router.ts`, `postgres-account-repository.ts`, and the `nova_auth_accounts` table are still in the codebase and mounted. Now that Clerk handles customer-facing auth, these are dead weight. Removing them eliminates a security surface and simplifies the code.
- [ ] **Client portal post-onboarding UX** — After `onboarding_status = complete`, the client sees a static "You're all set" screen with no return path. The longer-term client dashboard (activity log, ongoing Nova interaction for Tiers 2/3) is not built. For Launch Plan clients at minimum, the completed screen should surface a link to their GHL Client Portal where their onboarding checklist and deliverables will live.
- [ ] **ElevenLabs voice production status** — Voice chat is wired in code (`elevenlabs-voice.ts`, `voice-chat-experience.ts`) but it's unclear if `ELEVENLABS_API_KEY` is set on Railway production and whether the voice experience is intended to be live for clients. Decide: live now or hide it behind a flag.
- [ ] **Per-client website architecture decision** — The open decision on shared template repo vs. separate repo/Pages project per client needs to be settled before the first website build is delivered. This determines whether `nova-managed-site-reference` is the right starting point and what the Nova-automated GitHub → Vite → Cloudflare pipeline looks like in practice.

---

## 9. Session Log and Next Steps (2026-09-25 to 2026-09-26)

Written so the next session can pick up without re-deriving anything. Source handoff: "Launch add-on Stripe prices (order-bump at checkout)".

### Done and merged to `main`

| PR | What |
| --- | --- |
| #231 | `stripe-provision-addons-cli.ts` (`npm run provision:stripe-addons`): dry-run by default, re-runnable (price lookup keys `moonrock_addon_<item_id>_monthly`), refuses a live key with `--apply` unless `--live`. `server.ts` reads `STRIPE_ADDON_MONTHLY_PRICE_IDS` (JSON map, degrades gracefully, drops unknown or gated ids). Checkout de-duplicates ids and re-checks sellability. Also fixed 3 stale tests that had kept CI red since 2026-09-21. |
| #233 | Checkout add-on picker: `GET /v1/discovery/addon-offers`, `suggestedAddonIds` on Nova turns, optional picker in the Save Flight Plan card with a running monthly total (nothing pre-ticked; Nova-named add-ons labelled "Suggested by Nova" and listed first). Nova's pitch narrowed to the 5 purchasable add-ons. |
| #235 | Webhook hand-off for purchased add-ons: migration 0008 `nova_client_addons`, `nova-addon-<name>` GHL tags and a "NOVA ADD-ONS PURCHASED" GHL note. |
| #232, #234, #236 | Doc updates (this file). |

### Verified so far
- **Stripe test mode:** 5 sandbox prices created; a test Checkout Session with Launch-style prices plus 2 add-ons returned the 4 expected line items ($499 one-time, $97/mo, $29/mo, $19/mo).
- **Staging** (`https://moonrock-core-staging.up.railway.app`, Railway project "Nova Website Advisor — Staging", service `moonrock-core`, deploys from `main`): `NOVA_STRIPE_ENABLED=true` and `STRIPE_ADDON_MONTHLY_PRICE_IDS` (the 5 sandbox price ids) are set. A staging checkout with add-ons showed the right lines with Moonrock branding, and a gated add-on and a duplicate id were dropped.
- **Both deploys healthy** after the merges (`/health/live` and `/health/ready` 200); production `addon-offers` returns an empty list because the price variable is not set there.
- **Local browser run** of the picker: nothing pre-ticked, suggested add-on first, total updates, checkout request carries exactly the ticked ids.
- **CI on `main` is green again** (Nova Runtime CI: typecheck, tests, build). Runtime: 552 tests; frontend: 9 tests.

### Stripe account cleanup (live "Nova Stripe Account")
3,932 legacy products (WordPress themes/plugins/resale bundles from the retired SaaS kit, bulk-imported through GHL on 2026-09-14/15) were **archived, not deleted**. Kept active: the 50 lead-magnet templates and the Moonrock Launch Plan (`prod_VIrMF5rhMIT7Vk`). The manifest file for undoing it is `stripe-archive-manifest-*.json` in Stephen's Downloads folder; the throwaway audit and archive scripts (`stripe-product-audit.mjs`, `stripe-product-archive.mjs`) are not in the repo. Checkout branding was corrected from leftover Woo branding to Moonrock Marketing Company. All temporary Stripe keys have been deleted.

### Sandbox (test-mode) add-on prices, for reference
`review_response_autopilot` $29, `referral_engine` $29, `gbp_autopilot` $39, `reactivation_newsletter` $49, `monthly_scorecard` $19. These are sandbox only; live prices do not exist yet.

### Design decisions taken this session
- Picker never pre-ticks a paid add-on (consent). Nova only highlights suggestions.
- Nova no longer pitches Quote & Estimate Follow-Up, Seasonal Campaign, or bundle prices, because none has a Stripe price and the bundle price ($59) would not match the checkout total ($77). Restore them by provisioning prices (and a Reputation Pack price) and reverting the prompt change from PR #233.
- Purchased add-ons are handed off (database row, GHL tag, GHL note); delivery is manual or via GHL workflows on the `nova-addon-*` tags.

### NEXT STEPS (in order)
1. **Staging end-to-end test of a purchase with add-ons.** On the staging site: chat with Nova, mention Google reviews, confirm Nova names Review Response Autopilot and the save form lists it first with "Suggested by Nova", tick one add-on, pay at Stripe test checkout with card `4242 4242 4242 4242`. Then check the GHL contact for `nova-addon-...` tags and a note starting "NOVA ADD-ONS PURCHASED". First check in Railway (staging) that `NOVA_GHL_HANDOFF_ENABLED` and `NOVA_GHL_WRITES_ENABLED` are on, otherwise nothing is written to GHL (the database record still is). This is the first real exercise of the GHL tag/note calls (only mocked tests so far) and of a real-LLM Nova suggestion.
2. **Production go-live (each step needs Stephen's explicit go-ahead):**
   1. Create a temporary live restricted key (Products Write, Prices Write, Prices Read). In PowerShell, from `C:\Users\steph\Documents\github\moonrock-core\apps\nova-website-advisor-runtime`: set the key with the hidden prompt (`$s = Read-Host "Paste rk_live key" -AsSecureString; $env:STRIPE_SECRET_KEY = [System.Net.NetworkCredential]::new("", $s).Password`), run `npm run provision:stripe-addons` (dry run, should list 5 to create), then `npm run provision:stripe-addons -- --apply --live`. Copy the printed JSON map.
   2. Set `STRIPE_ADDON_MONTHLY_PRICE_IDS` (that JSON) on Railway production, project "Moonrock Nova Runtime", service `moonrock-core`. **This redeploys production.**
   3. Delete the temporary key and clear the variable (`Remove-Item Env:STRIPE_SECRET_KEY`).
   4. Do one live add-on checkout yourself (small real payment, refund after) and confirm the row, the GHL tags, and the note.
   Do **not** run `stripe-provision-catalog-cli.ts --apply` again: it would duplicate the Launch Plan product.
3. **Confirm migration 0008 applied** on both databases (look for the migration line in Railway startup logs; health checks were fine after deploy, which implies it did).
4. **Check the Railway production Stripe key scope.** The handoff said Customers "read" only, but checkout creates a customer on every session, and the live test on 2026-09-24 worked, so the note is probably out of date. Post-purchase add-on upgrades still need `subscription_update`.
5. **Decide what happens after purchase:** who activates each add-on, and build GHL workflows on the `nova-addon-*` tags. Monthly Scorecard report generation is still not built; decide whether to keep selling it before it exists.
6. **Optional cleanups:** archive the prices attached to the archived products; bulk-delete the mirrored legacy products inside GHL; delete stale remote branches (see section 7).
7. **Frontend polish to consider:** an explicit "Add to my plan" chip in the chat itself (option C in the design mockups); a "due today" line showing the setup fee ($0 founding, $499 otherwise) next to the monthly total.

### Working notes and gotchas
- Stephen's local clone has an uncommitted whitespace edit to `README.md`; ignore it, do not commit it.
- PowerShell needs the key value in quotes; use the hidden `Read-Host -AsSecureString` prompt instead of pasting keys into commands. Never paste keys into chat.
- The `--` in `npm run provision:stripe-addons -- --apply` is required so npm passes the flag to the script.
- Runtime health routes are `/health/live`, `/health/ready`, `/health/persistence` (not `/health`).
- `main` auto-deploys to both staging and production on merge.
- Checkout pages opened in the in-app browser lose the `#fragment` of the URL; open Stripe checkout links in a normal browser.

---

*Generated for Stephen — Moonrock Marketing Company, Lawrence, KS. Keep this doc current as the single reference point.*
