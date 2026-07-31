# Nova Website Advisor Release 1 — Staging Reference Architecture

## Decision

Use a separately deployed, managed Node.js runtime behind HTTPS. WordPress
remains a public presentation client and receives no model, CRM, database, or
observability credential. The staging runtime uses a host-managed secret store
and a managed durable data service. Model and GHL access enter only through
server-side adapters and remain disabled until their individual gates pass.

This sprint approves the portable architecture, not a vendor, account, spend,
deployment, or provider connection.

## Trust topology

```text
Approved staging browser origin
        |
        | HTTPS, origin allowlist, bounded requests
        v
Managed Node 22 runtime
  - disclosure and session API
  - schema validation
  - lifecycle and policy engine
  - consent and authority checks
  - kill switch
  - redacted public SSE
        |
        +--> durable state repository
        |      sessions, consent evidence,
        |      idempotency, safe event envelopes
        |
        +--> approved knowledge bundle
        |      immutable version + hash
        |
        +--> model adapter ----------> sandbox model endpoint
        |
        +--> GHL adapter ------------> non-production GHL location
        |
        +--> redacted telemetry -----> approved event/alert sink
```

The model never receives GHL credentials. The browser never receives any
provider or database credential. GHL does not determine Nova's lifecycle,
consent, or decision authority.

## Deployment target requirements

The target selected in a later approved sprint must provide:

- supported Node.js 22 runtime or OCI-compatible container execution;
- TLS, custom staging hostname, and managed certificate;
- deployment identity distinct from human credentials;
- managed secret references injected only at runtime;
- immutable release identifier and version history;
- health/readiness probes and zero-downtime or bounded-downtime rollout;
- private or strongly authenticated durable-state connection;
- outbound allowlisting or equivalent provider restriction;
- log and metric export with field-level redaction;
- resource, request, concurrency, and cost limits;
- one-command or one-control rollback to the prior immutable release;
- environment separation between staging and production;
- access audit history and least-privilege roles;
- backup/restore support for durable evidence.

Shared WordPress hosting is not an acceptable runtime target unless it can prove
all requirements without sharing the WordPress failure or credential domain.

## Runtime components

### Edge/request boundary

- HTTPS only;
- exact staging-origin allowlist;
- request/body/message limits;
- per-source and per-session rate limits;
- correlation identifiers;
- content-type and schema enforcement;
- security headers;
- no direct provider calls from the browser.

### Orchestration boundary

The existing deterministic lifecycle, schema validator, consent policy, tool
allowlist, risk escalation, idempotency, provider-receipt handling, kill switch,
and unknown-outcome behavior remain controlling. Adapters cannot bypass them.

### Durable-state boundary

Repository interfaces replace in-memory implementations without changing domain
rules. The authoritative transaction must atomically enforce session sequence,
state version, consent evidence, and idempotency claim before an external action
can begin.

### Provider boundary

Adapters receive only the fields required for one approved operation. Each
adapter has an independent health state, timeout, retry policy, circuit breaker,
scope manifest, sandbox gate, and kill-switch response.

### Observability boundary

Only redacted structured events, aggregate metrics, health state, latency,
reason codes, and release identifiers may leave the runtime. Raw messages,
transcripts, secrets, authorization headers, chain-of-thought, and full contact
objects are prohibited.

## Environment promotion

```text
local mock
  → architecture approved
  → platform foundation
  → disconnected staging
  → model sandbox evaluation
  → GHL sandbox validation
  → controlled synthetic end-to-end staging
  → privacy/security/accessibility approval
  → limited pilot approval
  → separately approved production release
```

No environment promotes itself. Every promotion uses an immutable release,
evaluation evidence, named owner, approval record, rollback target, and change
window.

## Current Sprint 001 posture

- deployment target: not selected;
- secret store: not selected;
- durable backend: designed, not provisioned;
- model: disconnected;
- GHL: disconnected;
- external writes: disabled;
- knowledge: synthetic/local only;
- raw message logging: disabled;
- transcript storage: disabled;
- staging deployment: not authorized.
