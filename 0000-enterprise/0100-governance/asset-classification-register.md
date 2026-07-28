# Asset Classification Register

**Document ID:** MBOS-GOV-ACR-001  
**Program:** 002 — MBOS Alpha Implementation  
**Sprint:** 001  
**Version:** 0.1.0  
**Lifecycle Status:** Implemented

## Classification Tiers

### Tier 1 — Protected Production Assets

Assets required for active applications, websites, deployment, or automation.

Controls:

- Dependency audit required before change
- Rollback plan required
- Owner approval required
- Release record required

Current examples:

- `apps/commerce-os/`
- `.github/workflows/`
- `scripts/`
- `xstore-child/`
- `elementor/templates/`

### Tier 2 — Enterprise Assets

Governance, standards, architecture, decisions, and MBOS documentation. These assets are versioned and may evolve through approved changes.

### Tier 3 — Product Assets

Assets owned by a defined Moonrock product or platform, including Commerce OS, the Mentorship Platform, and future approved products.

### Tier 4 — Historical Assets

Superseded artifacts retained for traceability. Historical assets are archived rather than deleted unless a separate deletion approval is recorded.

## Required Metadata

Each governed asset should ultimately identify:

- Owner
- Purpose
- Lifecycle status
- Version
- Dependencies
- Disposition
- Approval authority
- Last review date