---
title: Codex Mission 001 - Commerce OS Application Foundation
version: 1.0.0
status: READY
owner: Moonrock Enterprises
---

# Codex Mission 001: Commerce OS Application Foundation

## Objective

Create the executable application foundation for Moonrock Commerce OS without modifying the existing WordPress, Elementor, XStore, deployment, or rollback assets.

## Required Reading

- `/AGENTS.md`
- `/docs/products/commerce-os/README.md`
- `/docs/products/commerce-os/PRD.md`
- `/docs/products/commerce-os/DATA-MODEL.md`
- `/docs/products/commerce-os/PROFIT-ENGINE.md`
- `/docs/products/commerce-os/IMPLEMENTATION-PLAN.md`

## Mission Scope

1. Inspect the repository and identify a safe top-level location for the application.
2. Propose a low-cost, portable, strongly typed framework and database stack.
3. Record the framework decision in a new ADR.
4. Scaffold the application and relational persistence layer.
5. Add development, test, lint, formatting, type-check, migration, and health-check commands.
6. Add a safe `.env.example` containing names only, never secrets.
7. Add CI that validates the new application without triggering production deployment.
8. Add local setup documentation.
9. Implement a minimal health page or endpoint proving the application and database configuration load correctly.

## Preferred Application Boundary

Use a clearly isolated directory such as `/apps/commerce-os/` unless repository inspection reveals a stronger documented convention. Do not place application code inside WordPress theme, Elementor, or deployment directories.

## Required Technical Qualities

- strong typing
- exact monetary arithmetic support
- relational migrations
- automated tests
- predictable local setup
- environment-based secrets
- modular boundaries suitable for later supplier and marketplace connectors
- responsive operator UI capability

## Prohibited Actions

- do not modify `main` directly
- do not move or rename existing production assets
- do not add real credentials or tokens
- do not deploy the application
- do not add autonomous purchasing, repricing, or listing publication
- do not implement the full Profit Engine in this mission
- do not assume marketplace fees are permanent constants

## Acceptance Criteria

- application starts locally using documented commands
- health endpoint or page returns a successful result
- database migration command succeeds on a clean environment
- test, lint, format-check, and type-check commands succeed
- CI runs only validation checks
- `.env.example` contains no secret values
- new ADR explains the stack choice and alternatives considered
- existing production deployment files remain unchanged
- pull request includes validation evidence and rollback instructions

## Deliverable

Open a pull request from `feature/commerce-os-app-foundation` into `main`. Keep the PR focused on scaffolding and infrastructure. Do not merge unrelated product features.
