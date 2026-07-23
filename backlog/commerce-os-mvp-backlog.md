# Moonrock Commerce OS MVP Backlog

- Status: Ready for implementation sequencing
- Product owner: Stephen Tyler Jr.
- Engineering source of truth: `docs/products/commerce-os/`

## Epic 1 — Application Foundation

### COS-001 Select and document the MVP stack
Acceptance criteria:
- stack supports responsive web UI, typed business logic, relational database, migrations, authentication, and automated tests
- local setup requires documented commands
- no paid dependency is required for core local development

### COS-002 Scaffold the application
Acceptance criteria:
- application starts locally
- environment template contains no secrets
- lint, type-check, and test commands exist
- health endpoint or equivalent verifies startup

### COS-003 Add CI validation
Acceptance criteria:
- pull requests run lint, type-check, unit tests, and build
- failures block a green status

## Epic 2 — Data and Authentication

### COS-010 Implement the initial relational schema
Acceptance criteria:
- migrations cover entities in `DATA-MODEL.md`
- immutable run and audit records are enforced by application rules
- seed data includes the owner user, eBay marketplace, and an editable default fee profile

### COS-011 Implement internal authentication and roles
Acceptance criteria:
- unauthenticated users cannot access application data
- owner, operator, and viewer permissions are enforced

## Epic 3 — Profit Engine

### COS-020 Implement typed calculation inputs and outputs
### COS-021 Implement acquisition and selling-cost calculations
### COS-022 Implement ROI, margin, break-even, and minimum-price calculations
### COS-023 Add the required Profit Engine test matrix

Acceptance criteria for Epic 3:
- all formulas match `PROFIT-ENGINE.md`
- calculations are deterministic
- invalid inputs return structured validation errors
- no floating-point currency drift is introduced

## Epic 4 — Opportunity Workflow

### COS-030 Create normalized product records
### COS-031 Create supplier offers
### COS-032 Create manual opportunities
### COS-033 Display calculation results and assumptions

Acceptance criteria:
- operator can complete an evaluation from a mobile or desktop browser
- source URLs and evidence timestamps are retained
- drafts can be saved before evaluation

## Epic 5 — Decision Engine

### COS-040 Implement configurable rulesets
### COS-041 Implement recommendation states and confidence components
### COS-042 Implement risk flags and explainability response
### COS-043 Implement approval and override audit flow

Acceptance criteria:
- decisions conform to `DECISION-ENGINE.md`
- threshold edits require no source-code modification
- recommendations never initiate a purchase

## Epic 6 — Inventory and Outcomes

### COS-050 Convert approved purchases into inventory lots
### COS-051 Track listings and statuses
### COS-052 Record sales and actual costs
### COS-053 Show estimated-versus-actual variance

Acceptance criteria:
- realized profit is independently calculated from actual values
- quantity cannot be sold beyond available inventory
- estimated records are not overwritten by actuals

## Epic 7 — Operator Dashboard

### COS-060 Opportunity queue
### COS-061 Inventory summary
### COS-062 Outcome and variance report
### COS-063 Configuration screen

Initial dashboard metrics:
- opportunities evaluated
- Buy, Watch, Reject counts
- capital committed
- inventory at landed cost
- expected and realized net profit
- average ROI
- average days held
- estimate error

## Epic 8 — Controlled Integrations

These begin only after the manual workflow is validated.

### COS-070 TCG product data adapter
### COS-071 Marketplace observation adapter
### COS-072 eBay listing draft adapter

No integration may purchase, publish, or change prices without explicit human approval during MVP.

## Definition of MVP Complete

- manual MTG opportunity evaluation works end to end
- Profit Engine and Decision Engine are tested
- recommendation approval creates an auditable record
- approved purchases can be tracked through sale
- expected and realized economics can be compared
- application documentation allows Codex or a human developer to run and extend the system
