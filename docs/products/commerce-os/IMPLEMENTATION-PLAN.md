# Moonrock Commerce OS MVP Implementation Plan

- Version: 0.1.0
- Status: Approved for implementation sequencing
- Owner: Moonrock Enterprises

## Delivery Strategy

Build the smallest complete manual workflow first. External data and marketplace integrations begin only after the core decision and outcome loop works reliably.

## Recommended Technical Shape

The implementation should use a modular web application with:

- typed application code
- a relational database and versioned migrations
- a deterministic calculation library
- a server-side API boundary
- a responsive operator interface
- automated unit and integration tests
- environment-based secret management

The first implementation pull request must record the selected framework and database in an ADR. The stack should favor low operating cost, portability, strong typing, and straightforward Codex maintenance.

## Epic 1 — Application Foundation

Deliverables:

- framework and database ADR
- isolated application scaffold
- `.env.example` without secrets
- local development instructions
- lint, formatting, type-check, test, build, migration, and health-check commands
- non-destructive CI validation

Definition of done:

- a new contributor can run the application locally from documented steps
- CI validates every pull request
- existing production deployment assets remain unchanged

## Epic 2 — Data and Authentication

Deliverables:

- initial relational schema from `DATA-MODEL.md`
- migrations and seed data
- internal authentication
- owner, operator, and viewer roles
- immutable calculation, decision, approval, and audit records

Definition of done:

- unauthenticated users cannot access application data
- migrations succeed on a clean database
- editable eBay fee and shipping profiles are seeded

## Epic 3 — Profit Engine

Deliverables:

- exact money and rate types
- acquisition and selling-cost calculations
- ROI and margin calculations
- break-even and minimum-price solvers
- validation errors and warnings
- required test matrix from `PROFIT-ENGINE.md`

Definition of done:

- independently verified fixtures pass
- no binary floating-point currency drift exists
- every output exposes inputs, assumptions, formula version, and warnings

## Epic 4 — Opportunity Workflow

Deliverables:

- normalized product records
- supplier offers
- market observations
- manual opportunity intake
- calculation results screen
- saved drafts and evidence timestamps

Definition of done:

- an operator can evaluate one MTG opportunity from a desktop or mobile browser
- incomplete data cannot produce a fabricated recommendation

## Epic 5 — Decision Workflow

Deliverables:

- configurable rulesets
- Buy, Watch, Reject, and Insufficient Data states
- confidence factors and risk flags
- approval and override workflow
- immutable decision history

Definition of done:

- every recommendation is explainable
- every override records the original recommendation and operator reason
- no recommendation initiates a purchase

## Epic 6 — Inventory, Listings, and Outcomes

Deliverables:

- approved purchase conversion to inventory
- quantity and storage tracking
- listing draft records
- sale and actual expense entry
- realized profit and ROI
- expected-versus-actual variance

Definition of done:

- quantity cannot be sold beyond available inventory
- actual values never overwrite estimates
- the full opportunity-to-outcome loop works without a separate spreadsheet

## Epic 7 — Operator Dashboard

Initial views:

- opportunity queue
- inventory summary
- configuration
- outcome and variance report

Initial metrics:

- opportunities evaluated
- recommendation counts
- capital committed
- inventory at landed cost
- expected and realized net profit
- average ROI
- average days held
- estimate error

## Epic 8 — Controlled Integrations

Sequence:

1. product metadata and imagery
2. marketplace observations
3. supplier offers
4. eBay listing drafts
5. inventory synchronization

Every connector must include permission scope, rate-limit handling, timeouts, retries, timestamps, secret-safe logging, a manual fallback, and a kill switch. No connector may purchase, publish, or reprice without explicit human approval during MVP.

## Pull Request Sequence

1. `feature/commerce-os-app-foundation`
2. `feature/commerce-os-data-auth`
3. `feature/commerce-os-profit-engine`
4. `feature/commerce-os-opportunity-workflow`
5. `feature/commerce-os-decision-workflow`
6. `feature/commerce-os-inventory-outcomes`
7. `feature/commerce-os-dashboard`
8. connector-specific branches

## Release Gates

A capability cannot merge unless:

- tests pass
- lint, formatting, type-check, and build checks pass
- migrations are reversible or have a recovery plan
- documentation is synchronized
- no secrets are committed
- human approval boundaries remain intact
- WordPress, Elementor, XStore, deployment, and rollback assets are unaffected unless explicitly in scope

## Initial Executable Milestone

The first executable milestone is a local internal application where the operator can enter an MTG product, acquisition costs, expected eBay price, fees, promotion rate, and shipping assumptions, then receive a transparent financial analysis and a non-autonomous recommendation.
