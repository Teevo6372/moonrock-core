# Nova Website Advisor — Program Closure and Operational Handoff

## Closure decision

Program 006 may close as a governance and local-foundation program after owner
approval of this Sprint 006 pull request. Closure does not authorize staging,
production deployment, live provider connections, WordPress activation, or use
of real visitor data.

## Integrated validation

| Control area | Evidence | State |
| --- | --- | --- |
| Enterprise role and authority | Program 006 standards and Sprint 001 runtime specification | Defined |
| Technical architecture | Sprint 002 architecture and ADR | Defined |
| Contracts, prompt, knowledge, GHL data, evaluations | Sprint 003 artifacts | Defined |
| Lifecycle, policy, adapters, schema validation, events | Sprint 004 implementation | Locally verified |
| HTTP contract, synthetic knowledge, mock actions, browser prototype | Sprint 005 implementation | Locally verified |
| Learning queue, metrics, experiments, closure gate | Sprint 006 implementation | Locally verified |
| Live model and GHL providers | Explicitly excluded | Not authorized |
| WordPress activation and deployment | Explicitly excluded | Not authorized |

The end-to-end local control chain is:

visitor request → AI disclosure → bounded message → schema-validated proposal →
deterministic policy → consent or human escalation → mock administrative action
→ redacted event → aggregate measurement → non-controlling observation →
human-governed improvement lifecycle.

## Operating ownership

These roles must be assigned to named people before staging:

| Role | Accountability |
| --- | --- |
| Executive owner | Final authority, risk acceptance, production activation |
| Product owner | Visitor experience, routes, acceptance criteria, backlog |
| Knowledge owner | Public-approved sources, freshness, conflicts, publication |
| Runtime owner | service health, releases, rollback, dependencies |
| GHL owner | least privilege, fields, workflows, consent evidence, reconciliation |
| Privacy/security owner | threat model, privacy review, incidents, retention |
| Support owner | human handoff service level and visitor issue path |

Until named assignments and approval evidence exist, the executive owner retains
accountability and the release gate remains closed.

## Review cadence

- runtime health and incidents: each operating day after activation;
- knowledge freshness and unresolved gaps: monthly;
- consent, escalation, and handoff sampling: monthly;
- dependency and vulnerability review: each release and at least monthly;
- prompt/model/policy evaluations: every proposed change;
- authority matrix and privacy/security review: quarterly;
- full release and rollback exercise: before production and annually.

Cadence begins only after the corresponding environment is authorized.

## Residual risk register

| Risk | Current control | Owner role | Closure condition |
| --- | --- | --- | --- |
| Synthetic behavior differs from live model | schema and deterministic policy | Runtime owner | staging evaluation with selected model |
| Mock GHL differs from real objects/workflows | adapter boundary and mock receipts | GHL owner | sandbox field/workflow validation |
| In-memory state is not durable | local-only scope | Runtime owner | approved durable store and retention design |
| One-shot SSE is not production streaming | public-safe event projection | Runtime owner | load/backpressure/reconnect implementation |
| Browser prototype is not WordPress-integrated | isolated local prototype | Product owner | approved child-theme integration sprint |
| Privacy and threat reviews incomplete | no real data or providers | Privacy/security owner | formal approvals recorded |
| Knowledge bundle is synthetic | hash and public classification validation | Knowledge owner | signed approved Release 1 bundle |
| Human handoff service level unproven | acceptance is not contact confirmation | Support owner | staffing, SLA, and reconciliation test |
| Deployment and rollback unproven | no deployment authorized | Runtime owner | staging deploy and rollback exercise |

No residual risk is silently accepted by Nova.

## Release gate

Production activation remains blocked until all of the following are true:

- contracts validated against the deployable build;
- safety evaluations pass;
- privacy and accessibility reviews approve;
- threat model approves;
- residual risks have named owners;
- operating and incident owners are assigned;
- rollback is verified;
- credentials remain absent from the repository;
- the human executive explicitly approves production activation.

The executable release gate returns every missing control and always identifies
the decision authority as `HUMAN_EXECUTIVE`.

## Incident and rollback path

Before staging, the runtime owner must document detection, severity,
acknowledgement, kill-switch authority, visitor fallback, GHL reconciliation,
evidence preservation, notification, recovery, and post-incident review. The
kill switch must stop provider actions without relying on model behavior.

Sprint 006 rollback is a repository revert. No external provider, WordPress, or
deployment cleanup is required.

## Next authorized work package

Program closure hands future Website Advisor activation to a separately approved
Release 1 staging work package. That work package must cover deployment
architecture, secrets, durable storage, live adapters, non-production GHL,
approved knowledge, observability, privacy/security/accessibility approvals,
staging evaluations, rollback, and explicit production authorization.
