---
title: Moonrock Enterprises Migration Roadmap
version: 1.0.0
status: APPROVED
owner: Moonrock Enterprises
---

# Enterprise Migration Roadmap

## Objective

Evolve `moonrock-core` into the operating and engineering repository for Moonrock Enterprises while preserving current production website assets and deployment capability.

## Phase 1 — Foundation

Status: in progress

Deliverables:

- root agent governance
- repository audit
- enterprise architecture
- migration roadmap
- Commerce OS product foundation
- architecture decision records
- updated root README

Exit criteria:

- approved documentation is merged to `main`
- existing production paths remain unchanged
- future contributors can identify repository boundaries and rules

## Phase 2 — Division Organization

Create additive division directories and index documents for:

- Moonrock Marketing
- Moonrock Systems
- Moonrock Marketplace
- Moonrock Biophilic
- Moonrock Properties

Each division index will define purpose, audience, offers, systems, roadmap, dependencies, and ownership.

## Phase 3 — Shared Platform Definition

Define shared capabilities and boundaries:

- identity and access
- CRM
- AI agents
- automation
- analytics
- knowledge management
- commerce services
- integrations
- observability and security

No shared service will be implemented until ownership, data boundaries, and acceptance criteria are documented.

## Phase 4 — Commerce OS MVP

Build the initial internal product around MTG commerce workflows:

1. opportunity intake
2. product normalization
3. supplier and acquisition comparison
4. fee and shipping estimation
5. profit and ROI calculation
6. buy/no-buy recommendation
7. listing preparation
8. inventory and outcome tracking

Expansion to other categories follows validation of the MTG workflow.

## Phase 5 — Production Asset Rationalization

Only after dependency analysis:

- identify obsolete or duplicate files
- propose path changes
- validate scripts and workflows
- test deployment and rollback
- migrate in isolated pull requests
- archive rather than delete when history remains useful

## Migration Controls

Every migration PR must include:

- source-to-target map
- affected references
- risk level
- validation steps
- rollback steps
- production impact statement

## Explicitly Protected Assets

Until superseded by an approved migration:

- WordPress deployment assets
- Elementor templates and implementation assets
- XStore child-theme assets
- rollback scripts and instructions
- homepage blueprint and approved build specifications

## Success Definition

The migration succeeds when Moonrock Core can guide business strategy, AI agents, developers, deployments, and operating workflows without losing the ability to reproduce or safely update existing production systems.