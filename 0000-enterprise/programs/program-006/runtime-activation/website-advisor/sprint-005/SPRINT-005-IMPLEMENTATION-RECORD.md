# Nova Website Advisor — Sprint 005 Implementation Record

## Status

Implementation complete for draft review. This sprint does not authorize staging
or production deployment.

## Objective

Add a local API and browser integration layer around the governed Sprint 004
runtime foundation so the Sprint 003 contracts can be exercised end to end
without connecting an external model, GHL, WordPress, or any production system.

## Delivered

- Local Node.js/Hono HTTP application implementing the approved Release 1 route
  surface:
  - session creation and disclosure;
  - bounded message submission;
  - public-safe server-sent events;
  - consent evidence;
  - human handoff;
  - appointment booking;
  - session close;
  - liveness and readiness.
- Consistent `application/problem+json` errors with correlation identifiers.
- Request controls for approved local origins, 16 KiB bodies, 4,000-character
  messages, sequence ordering, session expiry, and in-memory rate limits.
- Readiness that closes when the kill switch is enabled and always identifies
  this release as local mock/provider-disconnected.
- Synthetic, hash-validated public knowledge bundle.
- Mock GHL handoff and booking receipts with action/provider idempotency.
- Explicit consent gates:
  - handoff requires `save_contact`;
  - booking requires `save_contact` and `appointment_notifications`;
  - booking additionally requires the service consent corresponding to each
    requested notification channel.
- Credential-free accessible browser prototype with persistent AI disclosure,
  sensitive-data warning, live conversation log, keyboard-visible focus, and a
  separate affirmative contact-consent control.
- Executable API, contract, lifecycle, injection, privacy, safety, and adapter
  tests.

## Verification evidence

Run from `apps/nova-website-advisor-runtime`:

```text
npm run check
Test Files  6 passed (6)
Tests       42 passed (42)
```

The check performs strict TypeScript validation, Vitest execution, and a clean
TypeScript build. The local server may also be exercised with `npm run dev`.

## Security and authority boundaries

- No OpenAI or other model network adapter is present.
- No GHL network adapter is present.
- No credentials, secrets, provider URLs, or environment templates are added.
- No transcript persistence or raw visitor text is emitted through SSE.
- Mock provider calls occur only after deterministic validation and required
  purpose-specific consent.
- Handoff acceptance is not represented as proof that a human made contact.
- Booking confirmation is based only on the synthetic mock receipt.
- Protected billing/complaint language routes to human review.
- Prompt-like visitor instructions do not expand tools or provider authority.

## Explicit exclusions

- WordPress or XStore child-theme changes;
- live chat injection into the website;
- external API connections;
- GHL contact, opportunity, calendar, workflow, or field changes;
- credentials or secret management;
- persistent databases, queues, caches, or transcripts;
- container, cloud, staging, or production deployment;
- production DNS, CORS, CSP, monitoring, or alert configuration.

## Release 1 continuation gates

Before any staging activation, an approved later sprint must:

1. select and configure an authorized deployment target and secret store;
2. implement provider adapters behind the existing interfaces;
3. validate GHL field mappings and least-privilege scopes in a non-production
   GHL location;
4. replace synthetic knowledge with an approved signed release bundle;
5. add durable session/idempotency storage and real streaming/backpressure;
6. complete threat modeling, dependency review, accessibility review, and
   privacy/legal approval;
7. run the full evaluation catalog in staging;
8. define rollback, incident response, observability, retention, and deletion;
9. obtain explicit approval before any WordPress or production change.

## Rollback

This sprint is isolated to the runtime application and this implementation
record. Reverting the Sprint 005 commit restores the provider-disconnected
Sprint 004 foundation; no external cleanup is required.
