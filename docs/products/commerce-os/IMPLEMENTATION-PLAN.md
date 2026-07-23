---
title: Moonrock Commerce OS MVP Implementation Plan
version: 0.1.0
status: APPROVED
owner: Moonrock Enterprises
---

# Moonrock Commerce OS MVP Implementation Plan

## Delivery Strategy

Build the smallest complete manual workflow first. External data and marketplace integrations come after the core decision and outcome loop works reliably.

## Recommended Technical Shape

The implementation should use a modular web application with:

- a typed application layer
- a relational database and migrations
- a deterministic calculation library
- a server-side API boundary
- a responsive operator interface
- automated unit and integration tests
- environment-based secret management

The first implementation PR must propose the specific framework and record the choice in an ADR before scaffolding. The architecture should favor low operating cost, portability, strong typing, and straightforward Codex maintenance.

## Epic 1: Application Foundation

Deliverables:

- framework and database ADR
- application scaffold
- environment configuration example without secrets
- local development instructions
- formatting, linting, type checking, and test commands
- CI workflow for non-destructive validation
- health endpoint

Definition of done:

- a new contributor can run the application locally from documented steps
- CI validates every pull request
- no production deployment workflow is modified

## Epic 2: Profit Engine

Deliverables:

- money and percentage value objects
- fee profiles
- shipping profiles
- profit calculations
- break-even and minimum-price solvers
- recommendation rules
- reason codes and confidence factors
- unit tests for all specified boundaries

Definition of done:

- calculations match independently verified fixtures
- no binary floating-point money math is used
- every output exposes its assumptions

## Epic 3: Opportunity Intake

Deliverables:

- product creation and normalization
- opportunity form
- supplier offer entry
- market observation entry
- validation and draft states
- analysis screen

Definition of done:

- an operator can manually evaluate one MTG opportunity end to end
- incomplete data cannot silently produce a BUY recommendation

## Epic 4: Decision Workflow

Deliverables:

- BUY, REVIEW, and PASS output
- threshold configuration
- risk flags
- operator approve, reject, and defer actions
- override reason capture
- immutable analysis history

Definition of done:

- decisions are explainable and auditable
- every override retains the original recommendation

## Epic 5: Inventory and Listings

Deliverables:

- approved opportunity conversion to inventory lot
- quantity and location tracking
- listing-draft workflow
- title, description, attributes, image checklist, price, and shipping guidance
- manual published-listing reference

Definition of done:

- inventory quantity remains consistent across acquisition, listing, and sale events
- no listing is published autonomously

## Epic 6: Sales and Outcomes

Deliverables:

- sale entry
- actual fee and shipping entry
- realized profit and ROI calculation
- expected-versus-actual comparison
- days-to-sale measurement
- basic performance dashboard

Definition of done:

- the full opportunity-to-outcome loop can be completed without an external spreadsheet

## Epic 7: Controlled Integrations

Sequence:

1. product metadata and imagery
2. market price observations
3. supplier data
4. marketplace listing drafts
5. inventory synchronization

Each connector must include:

- explicit permission scope
- rate-limit handling
- retry and timeout behavior
- source timestamps
- error logging without secrets
- manual fallback
- feature flag or kill switch

## Codex Work Packages

Codex should receive one epic or narrowly scoped vertical slice at a time. Each package must include:

- objective
- allowed files and boundaries
- data model references
- acceptance criteria
- tests required
- prohibited behavior
- rollback expectations

## Pull Request Sequence

1. `feature/commerce-os-app-foundation`
2. `feature/commerce-os-profit-engine`
3. `feature/commerce-os-opportunity-intake`
4. `feature/commerce-os-decision-workflow`
5. `feature/commerce-os-inventory-listings`
6. `feature/commerce-os-sales-outcomes`
7. connector-specific branches

## Release Gates

A capability cannot merge unless:

- tests pass
- types and lint checks pass
- documentation is updated
- migrations are reversible or have a documented recovery plan
- no secrets are committed
- human approval boundaries remain intact
- production WordPress deployment assets are unaffected unless explicitly in scope

## Initial Milestone

The first executable milestone is a local operator application where a user manually enters an MTG product, supplier costs, expected eBay sale price, fees, and shipping, then receives an explainable BUY, REVIEW, or PASS recommendation.
