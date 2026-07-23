# ADR 0003: Commerce OS Application Stack

- Status: Accepted
- Date: 2026-07-22

## Decision

Build the initial Commerce OS as an isolated Next.js and TypeScript application under `apps/commerce-os/`, using Prisma for relational modeling and migrations, SQLite for zero-cost local development, PostgreSQL as the intended managed production database, Vitest for deterministic unit tests, and GitHub Actions for validation.

## Rationale

- One typed codebase supports the operator interface, server routes, and business logic.
- The stack runs locally without paid infrastructure.
- Prisma provides explicit relational schemas, generated types, and versioned migrations.
- SQLite minimizes local setup while preserving a migration path to PostgreSQL.
- Next.js supports a responsive internal application and mainstream managed deployment options.
- Vitest provides fast isolated testing for the future Profit Engine.

## Tradeoffs

- Next.js combines UI and server responsibilities, so module boundaries must remain explicit.
- SQLite and PostgreSQL differ; production-sensitive queries require PostgreSQL validation before deployment.
- Prisma adds generated code and migration tooling but reduces hand-written data-access risk.

## Rejected Alternatives

- WordPress plugin: too tightly coupled to the existing production website.
- Microservices: unnecessary operational complexity for the MVP.
- Paid proprietary backend platforms: avoidable recurring cost and lock-in.
- Python-only dashboard: weaker fit for the planned responsive product interface and shared typed web stack.

## Boundaries

This decision does not authorize production deployment, autonomous purchasing, marketplace publishing, repricing, or modification of existing WordPress and Elementor assets.
