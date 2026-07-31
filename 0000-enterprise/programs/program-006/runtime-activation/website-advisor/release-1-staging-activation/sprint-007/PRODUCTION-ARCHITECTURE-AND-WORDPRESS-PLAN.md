# Production Architecture and WordPress Integration Plan

## Target architecture

1. Existing WordPress/XStore child theme remains the public presentation
   system.
2. A small first-party Nova client is served as versioned static CSS/JS from
   the approved child theme or approved static asset origin.
3. The client talks only to the Moonrock-controlled Nova runtime over HTTPS.
4. The runtime owns session state, policy, knowledge, consent, model and GHL
   adapters, idempotency, redacted events, and kill switches.
5. Model and GHL credentials remain in the runtime secret store—never
   WordPress, HTML, JavaScript, Elementor, GitHub, or browser storage.
6. Static Flight Plan and contact paths work independently of the runtime.

## WordPress change plan

No files are modified in Sprint 007. A later approved implementation PR should:

1. add isolated, versioned Nova client assets under
   `xstore-child/assets/{css,js}/`;
2. add a narrowly scoped enqueue function in `xstore-child/functions.php`;
3. load only on approved pages;
4. inject only public runtime origin and release ID through an escaped,
   allowlisted configuration object;
5. render a keyboard-accessible launcher, panel, persistent AI disclosure,
   status region, close control, and full-advisor link;
6. preserve `nova-hero.webp` and `nova-profile.webp`;
7. avoid editing Elementor database content when a child-theme hook is enough;
8. add cache-version changes and post-deployment cache purge instructions.

The browser must never receive provider names, credentials, internal mappings,
prompts, private knowledge, GHL IDs, or unrestricted error detail.

## Security headers and origin boundary

- exact production origin allowlist;
- HTTPS only;
- restrictive Content Security Policy/connect source;
- no wildcard CORS;
- no credential-bearing query parameters;
- secure, same-site session mechanism;
- request-size and rate limits;
- no third-party analytics capture of chat content.

## Deployment sequence

1. approve immutable runtime release and provider posture;
2. deploy runtime dark with public traffic disabled;
3. verify health, readiness, alerts, kill switch, and static fallback;
4. deploy child-theme assets with launcher feature flag off;
5. verify accessibility, mobile layout, caching, CSP/CORS, and no-JS fallback;
6. enable only the approved pilot cohort/window;
7. monitor and enforce stop criteria;
8. disable the flag at pilot close.

## WordPress rollback

Fast rollback is feature-flag disable with no theme edit. Repository rollback:

1. disable the Nova launcher flag;
2. purge WordPress/CDN/browser-facing caches;
3. verify static CTAs and homepage remain functional;
4. revert the isolated child-theme integration commit if required;
5. keep runtime/provider shutdown independent;
6. reconcile any outcome-unknown GHL action before cleanup;
7. record the release, time, operator, reason, verification, and evidence.

Rollback must not replace, relocate, or delete existing homepage, Nova images,
Elementor, WooCommerce, XStore, or production assets.
