# Moonrock Core Agent Instructions

## Purpose

This file governs work performed by Codex, ChatGPT, and other AI or human contributors in `moonrock-core`.

## Source of Truth

GitHub is the authoritative record for Moonrock Enterprises architecture, product decisions, implementation plans, deployment assets, and operating documentation.

## Non-Negotiable Rules

1. Never commit directly to `main` unless an owner explicitly authorizes an emergency change.
2. Preserve the existing WordPress, Elementor, XStore child-theme, deployment, and rollback assets.
3. Do not move, rename, delete, or replace production assets without a documented migration plan.
4. Document architecture before implementation.
5. Keep changes small, reviewable, reversible, and tied to a clear objective.
6. Never commit credentials, API keys, access tokens, private customer data, or secrets.
7. Add tests or acceptance criteria for executable changes.
8. Update relevant documentation when behavior or architecture changes.
9. Prefer launch-ready simplicity over premature complexity.
10. Treat approved Architecture Decision Records as binding until superseded by a newer ADR.

## Branch Convention

- `agent/*` — architecture, research, planning, and agent-authored foundations
- `feature/*` — new product or platform capabilities
- `fix/*` — non-emergency corrections
- `hotfix/*` — urgent production corrections
- `release/*` — release preparation

## Commit Convention

Use concise conventional prefixes:

- `docs:` documentation
- `feat:` product capability
- `fix:` defect correction
- `refactor:` internal restructuring without intended behavior change
- `test:` tests and validation
- `chore:` maintenance and tooling

## Pull Requests

Every substantial change should explain:

- what changed
- why it changed
- affected business unit or platform
- production risk
- validation performed
- rollback approach

## Repository Boundaries

Moonrock Core supports:

- Moonrock Enterprises governance
- Moonrock Marketing
- Moonrock Systems
- Moonrock Marketplace
- Moonrock Biophilic
- Moonrock Properties
- Moonrock Commerce OS
- shared platform and operating documentation

Existing production deployment assets remain valid until a specific approved migration replaces them.

## Definition of Done

A change is complete when it is documented, versioned, validated, reviewable, and reversible.