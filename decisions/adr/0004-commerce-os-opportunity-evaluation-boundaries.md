# ADR 0004: Commerce OS Opportunity Evaluation Boundaries

- Status: Accepted
- Date: 2026-07-23

## Decision

Implement manual opportunity evaluation as a server-owned workflow. Next.js server
actions accept operator input, a validation module normalizes it, a service loads the
current marketplace fee profile from the database, and a repository persists the
normalized records in one Prisma transaction.

Every evaluation recalculates on the server and appends an immutable
`CalculationRun`. Editing or re-evaluating an opportunity never overwrites prior
calculation snapshots. Incomplete input may be returned to the operator with field
errors, but it must not produce or persist a calculated result.

## Rationale

- Server ownership prevents browser-supplied fee assumptions from becoming trusted
  calculation inputs.
- Explicit validation and persistence boundaries keep the UI, domain rules, and
  database behavior independently testable.
- Transactional writes prevent partial product, supplier, offer, opportunity, or
  calculation records.
- Immutable snapshots preserve the evidence needed to reproduce an operator
  decision.

## Tradeoffs

- The MVP uses server actions rather than a public API, so future external clients
  will require a separate authenticated interface.
- The workflow creates a new supplier offer for each observation; later deduplication
  can consolidate equivalent offers without rewriting evaluation history.
- Authentication is represented by the seeded local owner until an approved identity
  provider is selected.

## Boundaries

This decision does not authorize purchasing, listing publication, repricing,
production deployment, or live marketplace and supplier integrations.
