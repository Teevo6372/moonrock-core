# Codex Mission COS-001 — Commerce OS Application Foundation

## Objective

Create the first executable Moonrock Commerce OS application foundation without modifying or relocating the existing WordPress, Elementor, XStore, deployment, or rollback assets.

## Required Reading

Before making changes, read:

1. `/AGENTS.md`
2. `/docs/products/commerce-os/README.md`
3. `/docs/products/commerce-os/PRD.md`
4. `/docs/products/commerce-os/PROFIT-ENGINE.md`
5. `/docs/products/commerce-os/DATA-MODEL.md`
6. `/docs/products/commerce-os/DECISION-ENGINE.md`
7. `/backlog/commerce-os-mvp-backlog.md`

## Branch

Create a branch from current `main`:

`feature/commerce-os-app-foundation`

Do not commit directly to `main`.

## Scope

Complete only COS-001 through COS-003 and prepare the codebase for COS-010.

### Deliverables

- recommend and document a practical MVP stack
- scaffold the application in a clearly isolated top-level directory, preferably `apps/commerce-os/`
- add a local development README
- add `.env.example` with placeholders only
- add lint, formatting, type-check, test, and build scripts
- add a basic health check
- add one representative unit test
- add CI validation for the isolated Commerce OS application
- add an ADR explaining the selected stack and tradeoffs

## Stack Selection Constraints

The stack must:

- support a responsive internal web application
- use typed application code
- support a relational database and versioned migrations
- support deterministic unit testing of financial logic
- minimize recurring cost
- run locally on the owner's Dell Latitude development laptop
- be deployable to a mainstream managed platform later
- avoid coupling to WordPress

Do not introduce microservices, Kubernetes, event streaming, paid proprietary databases, or autonomous AI infrastructure in this mission.

## Repository Safety

- Do not move existing files.
- Do not alter production deployment scripts.
- Do not change Elementor JSON templates.
- Do not change XStore child-theme files.
- Do not add secrets.
- Do not implement external supplier or marketplace integrations yet.

## Validation

Before opening the pull request, run and report:

- dependency installation
- lint
- formatting check
- type-check
- unit tests
- production build

## Pull Request

Open a draft pull request targeting `main`.

The PR description must include:

- selected stack and rationale
- new file paths
- commands executed
- validation results
- known limitations
- explicit statement that legacy production assets were not modified

## Definition of Done

The application starts locally, passes automated validation, has documented setup, and provides a stable foundation for the initial relational schema and Profit Engine.
