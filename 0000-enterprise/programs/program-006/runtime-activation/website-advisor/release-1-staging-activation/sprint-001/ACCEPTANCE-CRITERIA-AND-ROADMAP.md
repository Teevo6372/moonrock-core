# Sprint 001 Acceptance Criteria and Release 1 Roadmap

## Functional acceptance

- Staging configuration accepts only `environment: staging`.
- Public origin must be an HTTPS origin without credentials or extra path.
- Runtime configuration uses opaque secret references only.
- State backend must be durable.
- Raw transcript storage remains disabled.
- Raw visitor-message logging remains disabled.
- Providers support only `disconnected` or `sandbox` posture.
- External writes remain disabled.
- Readiness lists every unresolved approval and disconnected provider.
- Readiness authority is `HUMAN_RELEASE_OWNER`.

## Safety acceptance

- No secret value or production identifier exists in the sprint artifacts.
- No provider SDK or network call is added.
- No GHL, WordPress, DNS, hosting, or deployment mutation occurs.
- No real visitor/client data is used.
- No provider can bypass schema, lifecycle, policy, consent, idempotency, or
  kill-switch controls.
- No observation or metric expands Nova's authority.
- Missing configuration fails closed.

## Sprint 001 exit evidence

- architecture and trust boundaries reviewed;
- durable-state and transaction rules reviewed;
- secret-reference and retention boundaries reviewed;
- model/GHL/knowledge activation gates reviewed;
- observability, incident, and rollback gates reviewed;
- staging configuration tests pass;
- full runtime test suite and build pass;
- owner approves and merges the draft pull request.

Merge authorizes planning and implementation of Sprint 002. It does not
authorize infrastructure creation or staging deployment.

## Release 1 staging-activation roadmap

### Sprint 001 — Architecture and control plane

Reference architecture, durable-state design, secret-reference contract,
provider/knowledge gates, observability/incident/rollback design, configuration
validator, and readiness tests.

### Sprint 002 — Portable platform foundation

Container/build contract, durable repository interfaces and migrations,
transactional idempotency, real SSE/backpressure, config loading, dependency
health, and disconnected integration tests. Platform/vendor selection and any
infrastructure creation require owner approval.

### Sprint 003 — Model sandbox

Approved provider adapter, exact model/release manifest, cost/timeout/concurrency
controls, prompt/schema enforcement, full synthetic evaluation catalog, and
fallback/rollback evidence. No GHL writes.

### Sprint 004 — GHL non-production validation

Non-production location readiness, approved mappings/scopes, read validation,
bounded synthetic write approval, idempotency, booking reconciliation, cleanup,
and kill-switch tests. No production GHL.

### Sprint 005 — Integrated staging candidate

Approved knowledge bundle, deployable staging release, redacted observability,
privacy/security/accessibility reviews, end-to-end synthetic tests, incident
exercise, and rollback exercise. No production website embed.

### Sprint 006 — Limited pilot and production decision

Named owners, approved pilot limits/hours/data boundary, support/handoff service
level, success/stop criteria, pilot evidence, production architecture,
WordPress integration change plan, and human executive go/no-go. Production
activation requires a separate explicit approval.
