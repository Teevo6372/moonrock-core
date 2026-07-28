# MBOS Enterprise Directory Blueprint

**Document ID:** MBOS-ARC-REP-001  
**Version:** 1.0.0  
**Status:** Approved for Additive Implementation  
**Owner:** Moonrock Enterprises

## Purpose

Define the governed target structure for enterprise operations while preserving current repository paths until migration is separately approved.

## Foundation Structure

```text
0000-enterprise/
├── README.md
├── 0100-governance/
├── 0200-architecture/
├── 0300-standards/
├── 0400-registers/
├── 0500-scorecards/
├── 0600-programs/
├── 0700-releases/
├── 0800-templates/
└── 0900-archive/
```

## Directory Responsibilities

| Directory | Responsibility |
|---|---|
| `0100-governance` | Policies, approvals, decision rights, disposition controls |
| `0200-architecture` | Enterprise architecture, repository maps, dependency models |
| `0300-standards` | Documentation, numbering, lifecycle, terminology standards |
| `0400-registers` | Risks, debt, decisions, capabilities, assets, lessons learned |
| `0500-scorecards` | Health, compliance, maturity, and quality measurements |
| `0600-programs` | Program charters, sprint records, work packages, reports |
| `0700-releases` | Release notes, baselines, version records, gate evidence |
| `0800-templates` | Reusable governed document and workspace templates |
| `0900-archive` | Superseded enterprise records retained for traceability |

## Protected Existing Domains

The following remain in their current locations during Sprint 001:

- `apps/commerce-os/`
- `docs/products/commerce-os/`
- `elementor/templates/`
- `xstore-child/`
- `scripts/`
- `.github/workflows/`
- Existing marketing and deployment documentation

## Migration Rule

This blueprint does not authorize relocation. A move requires:

1. Approved disposition entry
2. Dependency assessment
3. Link and consumer inventory
4. Rollback plan
5. Review approval
6. Dedicated migration sprint

## Expansion Convention

Future top-level domains may be added only after governance review. Numeric prefixes establish stable ordering and do not imply that empty placeholder directories must be committed.
