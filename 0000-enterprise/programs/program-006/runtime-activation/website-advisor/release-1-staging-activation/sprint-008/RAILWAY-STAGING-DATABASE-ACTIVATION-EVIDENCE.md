# Railway Staging Database Activation Evidence

## Evidence metadata

| Field | Observed value |
|---|---|
| Evidence date | 2026-07-31 UTC |
| Platform | Railway |
| Project | Nova Website Advisor — Staging |
| Environment | `staging` |
| Runtime service | `moonrock-core` |
| Runtime release | merged PR `#68`, `feat: add Nova PostgreSQL staging adapter` |
| Activation deployment | `0f030a07-fbdf-49e0-9419-66578e4b8cd6` |
| Region and replicas | US West, one replica |

Identifiers are recorded for operator traceability. No secret or resolved
connection value is included.

## Configuration evidence

The runtime service contains these reviewed variables:

- `DATABASE_URL` — Railway reference to `${{Postgres.DATABASE_URL}}`;
- `NOVA_RUN_MIGRATIONS` — `true`;
- `PORT` — retained from the prior private staging deployment;
- `RAILWAY_DOCKERFILE_PATH` — retained from the prior private staging
  deployment.

The browser displayed all values as masked. The database credential was not
copied, viewed, downloaded, or committed.

## Initial activation evidence

Railway reported the activation deployment as `Active` and `Deployment
successful`. The service card continued to report `Unexposed service`.

At `2026-07-30 20:01:57 PDT`, deployment logs recorded:

```text
Starting Container
Nova durable-state adapter verified; session cutover remains disabled
Nova provider-disconnected runtime listening on 0.0.0.0:8787
```

This establishes that:

- the managed database was reachable;
- the reviewed migration runner completed without a checksum or connection
  failure;
- repository initialization and verification succeeded;
- the runtime intentionally retained in-memory conversation sessions;
- model providers remained disconnected.

## Restart recovery evidence

The active deployment was restarted through Railway's deployment control.
Railway reported `Restart successful`.

At `2026-07-30 20:02:47 PDT`, the same deployment logged:

```text
Nova durable-state adapter verified; session cutover remains disabled
Nova provider-disconnected runtime listening on 0.0.0.0:8787
```

The service returned to `Active` with `Deployment successful` and remained
unexposed. Re-running startup against the already-migrated database completed
successfully, providing managed-environment evidence for migration idempotency
and restart recovery.

## Boundary verification

| Control | Result |
|---|---|
| Private database reference | Pass |
| Migration gate explicit | Pass |
| Adapter connection verification | Pass |
| Migration-safe restart | Pass |
| Deployment health | Pass |
| Session cutover disabled | Pass |
| Provider disconnected | Pass |
| Public Railway networking absent | Pass |
| GHL/external writes unchanged | Pass |
| WordPress/DNS unchanged | Pass |
| Repository secrets absent | Pass |

## Deferred evidence

Sprint 008 does not claim:

- backup/restore validation;
- failover or regional recovery;
- managed-database load testing;
- retention/deletion execution;
- durable conversation lifecycle conformance in Railway;
- GHL, provider, pilot, or production readiness.

Those controls require separate implementation and approval. In particular,
durable conversation cutover remains blocked until the PostgreSQL repository
passes the complete lifecycle, sequence, consent, idempotency, expiry, restart,
and rollback suite against the managed staging database.

## Rollback

If the database activation must be reversed:

1. remove `DATABASE_URL` from the runtime service;
2. remove `NOVA_RUN_MIGRATIONS`;
3. deploy the variable changes;
4. verify the runtime starts provider-disconnected with its in-memory store;
5. keep the Railway PostgreSQL service intact for evidence review unless its
   separately authorized retention procedure requires removal;
6. record operator, time, reason, deployment, and verification.

Rollback must not expose the service, enable providers or GHL, alter
WordPress, or delete database evidence without separate authorization.
