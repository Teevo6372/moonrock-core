# Nova Website Advisor Release 1 Deployment Activation — Sprint 008

## Objective

Activate and verify Nova's approved PostgreSQL durable-state foundation in the
private Railway staging environment without moving conversation sessions out
of the in-memory store.

## Authorized scope

- attach the runtime service to Railway PostgreSQL through a private service
  variable reference;
- explicitly enable the reviewed migration runner;
- deploy the merged PostgreSQL adapter release;
- verify migration-safe startup, health, restart recovery, and the
  provider-disconnected posture;
- record non-secret operator evidence and rollback instructions.

## Closed boundaries

Sprint 008 does not:

- enable durable conversation-session cutover or dual-write;
- connect an OpenAI or other model provider;
- connect GHL or permit external writes;
- expose a public Railway domain;
- modify WordPress, XStore, Elementor, DNS, or the published Nova review page;
- add credentials or resolved secret values to GitHub;
- authorize a limited pilot or production traffic.

## Acceptance gates

Sprint 008 is complete for review only when:

1. `DATABASE_URL` is a Railway service reference, not a copied credential;
2. `NOVA_RUN_MIGRATIONS=true` is explicitly present;
3. the merged runtime starts against the managed PostgreSQL service;
4. startup confirms the durable-state adapter while declaring session cutover
   disabled;
5. the runtime remains provider-disconnected;
6. the deployment health check reports success;
7. a container restart returns to the same safe state;
8. the runtime service remains unexposed;
9. no secret value appears in evidence or repository history.

## Exit gate

Merge records the staging activation evidence. It does not authorize durable
session cutover, model or GHL access, public networking, pilot traffic, or
production use. Each requires a later, separately approved work package.
