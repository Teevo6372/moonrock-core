# Repository Dependency Map

**Document ID:** MBOS-ARC-RDM-001  
**Program:** 002 — MBOS Alpha Implementation  
**Sprint:** 001  
**Version:** 0.1.0  
**Lifecycle Status:** Implemented

## High-Level Map

```text
moonrock-core
├── Enterprise Governance
│   ├── MBOS standards
│   ├── Architecture decisions
│   ├── Program controls
│   └── Release controls
├── Commerce OS
│   ├── Application
│   ├── Product documentation
│   ├── Backlog
│   └── CI/CD dependencies
├── Moonrock Marketing Website
│   ├── Elementor templates
│   ├── XStore child theme
│   ├── WooCommerce integration
│   └── Deployment scripts
├── Mentorship Platform
│   └── Approved documents and future templates
└── Shared Enterprise Services
    ├── Automation
    ├── Documentation
    ├── Capability management
    └── Repository validation
```

## Protected Dependency Groups

| Group | Primary Assets | Change Risk |
|---|---|---|
| Commerce OS runtime | `apps/commerce-os/` | Critical |
| Deployment automation | `.github/workflows/`, `scripts/` | Critical |
| Marketing website | `xstore-child/`, `elementor/templates/` | Critical |
| Product knowledge | `docs/products/commerce-os/`, `backlog/` | High |
| Enterprise governance | `README.md`, `AGENTS.md`, `docs/governance/`, `decisions/adr/` | High |

## Change Rule

Any future migration must identify direct consumers, upstream dependencies, downstream dependencies, rollback method, owner approval, and release impact before implementation.