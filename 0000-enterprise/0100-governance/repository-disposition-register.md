# Repository Disposition Register

**Document ID:** MBOS-GOV-RDR-001  
**Program:** 002 — MBOS Alpha Implementation  
**Sprint:** 001  
**Version:** 0.1.0  
**Lifecycle Status:** Implemented  
**Owner:** Moonrock Enterprises  
**Approval Authority:** Stephen Tyler Jr.

## Purpose

This register controls the disposition of major assets in `moonrock-core`. It is additive and non-destructive. No protected asset may be moved or deleted without dependency review, rollback planning, approval, and release documentation.

| Asset | Classification | Lifecycle | Disposition | Priority | Owner |
|---|---|---|---|---|---|
| `README.md` | Enterprise governance | Operational | Keep and update | Critical | MBOS |
| `AGENTS.md` | AI governance | Operational | Keep and update | Critical | MBOS |
| `decisions/adr/` | Architecture decisions | Operational | Keep | Critical | Enterprise Architecture |
| `docs/enterprise/` | Enterprise documentation | Operational | Keep and reconcile | High | MBOS |
| `docs/governance/` | Governance documentation | Operational | Keep and reconcile | High | MBOS |
| `docs/migration/` | Migration documentation | Review | Review before consolidation | Medium | Release Management |
| `docs/products/commerce-os/` | Product documentation | Operational | Keep and protect | Critical | Commerce OS |
| `backlog/` | Product planning | Operational | Keep; standardize later | High | PMO |
| `apps/commerce-os/` | Production application | Operational | Protect | Critical | Commerce OS |
| `.github/workflows/` | CI/CD | Operational | Protect | Critical | Release Management |
| `scripts/` | Deployment and operations | Production | Protect | Critical | Engineering |
| `xstore-child/` | Website production asset | Production | Protect | Critical | Moonrock Marketing |
| `elementor/templates/` | Website production asset | Production | Protect | Critical | Moonrock Marketing |
| `docs/homepage-blueprint.md` | Marketing implementation | Operational | Keep until successor is approved | Medium | Moonrock Marketing |
| Mentorship platform documents | Enterprise product | Approved | Create and reconcile in later approved sprint | Critical | Mentorship Platform |
| MBOS standards | Enterprise system | Approved | Create incrementally | Critical | MBOS |

## Disposition States

- **Keep:** Preserve in its current location.
- **Keep and update:** Preserve while bringing content into compliance.
- **Protect:** No move, deletion, or breaking change without a controlled release.
- **Review:** Requires content and dependency review before disposition.
- **Archive candidate:** May be archived only after a successor is approved.
- **Create:** Approved new artifact not yet present.

## Sprint 001 Constraint

Sprint 001 does not move, rename, replace, or delete existing production assets.