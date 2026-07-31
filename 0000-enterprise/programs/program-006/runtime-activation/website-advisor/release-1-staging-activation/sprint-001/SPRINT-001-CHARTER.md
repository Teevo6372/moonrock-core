# Nova Website Advisor Release 1 Staging Activation — Sprint 001 Charter

## Mission

Convert the approved Program 006 local runtime foundation into an
implementation-ready staging architecture and fail-closed configuration
contract without deploying, connecting providers, introducing credentials, or
changing production systems.

## Scope

- staging system boundary and reference topology;
- deployment-target selection requirements;
- host-managed secret-reference contract;
- durable session, consent, idempotency, and event-state design;
- model and GHL sandbox adapter activation gates;
- knowledge-bundle promotion boundary;
- redacted observability, incident, kill-switch, and rollback design;
- privacy, security, accessibility, and operational approval dependencies;
- executable staging configuration and readiness checks;
- staged Release 1 implementation roadmap.

## Non-scope

- selecting or purchasing a hosting plan;
- creating cloud infrastructure;
- creating or entering secret values;
- calling a live model or GHL;
- changing a GHL location, field, workflow, calendar, pipeline, or contact;
- using real visitor or client data;
- enabling external writes;
- modifying WordPress/XStore;
- DNS, staging, or production deployment;
- production activation.

## Definition of done

- Architecture preserves the browser → runtime → provider trust boundary.
- Staging can be configured only with opaque secret references.
- Durable state and retention boundaries are implementation-ready.
- Provider sandbox activation remains separately gated.
- Raw message logging and transcript storage remain disabled.
- External provider writes remain disabled.
- Readiness reports every unresolved approval or dependency.
- Human release authority remains explicit.
- Typecheck, tests, and build pass.
- Draft pull request is presented for owner approval without merge.
