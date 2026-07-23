---
title: Moonrock Core Repository
document: README.md
version: 1.1.0
status: PRODUCTION
owner: Moonrock Enterprises
repository: moonrock-core
author: Moonrock Product Team
last_updated: 2026-07-22
---

# Moonrock Core

## Purpose

Moonrock Core is the central operating, documentation, and engineering repository for the Moonrock Enterprises ecosystem.

It is the single source of truth for business strategy, product specifications, website architecture, AI agent instructions, automation workflows, implementation standards, deployment assets, operating documentation, and approved architectural decisions.

Every production decision begins here.

## Mission

Help business owners move forward with confidence.

Every document, workflow, recommendation, and implementation within Moonrock Core exists to support this mission.

## Enterprise Scope

Moonrock Core supports:

- Moonrock Marketing
- Moonrock Systems
- Moonrock Marketplace
- Moonrock Biophilic
- Moonrock Properties
- Moonrock Commerce OS
- shared platform capabilities
- enterprise operations and governance

## Repository Philosophy

Documentation is a product.

Every document should be complete enough that a developer, designer, AI agent, operator, or future Moonrock team member can understand and implement it without requiring undocumented context.

## Repository Structure

```text
moonrock-core/
├── .github/
├── assets/
├── backlog/
├── brand/
├── decisions/
│   └── adr/
├── docs/
│   ├── archive/
│   ├── enterprise/
│   ├── governance/
│   ├── implementation/
│   ├── migration/
│   └── products/
│       └── commerce-os/
├── releases/
├── AGENTS.md
├── CONTRIBUTING.md
├── README.md
└── STYLE-GUIDE.md
```

Additional division and platform directories will be added incrementally. Existing WordPress, Elementor, XStore child-theme, deployment, and rollback assets remain protected in their current paths until an approved migration explicitly replaces them.

## Key Foundation Documents

- `AGENTS.md` — contributor and AI-agent governance
- `docs/governance/repository-audit-2026-07-22.md` — repository assessment and preservation plan
- `docs/enterprise/moonrock-enterprises-architecture.md` — enterprise structure
- `docs/migration/enterprise-migration-roadmap.md` — phased migration strategy
- `docs/products/commerce-os/README.md` — Commerce OS product foundation
- `decisions/adr/` — binding architecture decision records

## Development Lifecycle

```text
Strategy
↓
Architecture and Documentation
↓
Branch
↓
Implementation
↓
Validation
↓
Pull Request
↓
Approval
↓
Merge
↓
Release
↓
Revision
```

## Branching Model

- `main` — approved, production-ready source of truth
- `agent/*` — architecture and agent-authored foundations
- `feature/*` — new capabilities
- `fix/*` — corrections
- `hotfix/*` — urgent production corrections
- `release/*` — release preparation

## Current Program Status

| Area | Status |
|---|---|
| Repository | Healthy |
| Enterprise governance | Established |
| Production website assets | Protected |
| Enterprise migration | Foundation phase |
| Commerce OS | MVP foundation |
| Architecture decisions | ADR system active |

## Documentation Standards

Every production document should include, where applicable:

- purpose
- business objective
- requirements
- architecture or workflow
- technical requirements
- security and privacy considerations
- accessibility
- acceptance criteria
- ownership
- version information

## Product Philosophy

Moonrock does not sell technology for technology's sake.

Moonrock helps people and businesses make better decisions, improve operations, and move forward with confidence. Technology supports the experience; it is not the experience.

## Repository Rules

- Never modify approved production documents without versioning.
- Never introduce undocumented architecture.
- Never commit secrets or customer-sensitive information.
- Never move production assets without a tested migration and rollback plan.
- Always optimize for clarity before complexity.
- Always optimize for launch before perfection.
- Keep implementation and documentation synchronized.

---

Helping Business Owners Move Forward with Confidence.