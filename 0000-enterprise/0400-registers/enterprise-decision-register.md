# Enterprise Decision Register

**Document ID:** MRE-ENT-REG-DEC-001  
**Version:** 0.1.0  
**Status:** Implemented  
**Owner:** Moonrock Enterprises  
**Approved by:** Stephen Tyler Jr.  
**Effective date:** 2026-07-28  
**Repository path:** `0000-enterprise/0400-registers/enterprise-decision-register.md`

## Purpose

Provide a central index of material enterprise decisions and their authoritative records.

## Required fields

Each entry must include a decision ID, title, date, owner, status, scope, rationale summary, affected capabilities, authoritative record, and supersession reference when applicable.

## Initial entries

| Decision ID | Decision | Status | Affected scope | Authoritative record |
|---|---|---|---|---|
| MRE-DEC-001 | Treat `moonrock-core` as the MBOS enterprise repository | Approved | Enterprise repository | Program 001 foundation records |
| MRE-DEC-002 | Freeze Program 001 as the MBOS Foundation baseline | Approved | MBOS governance | Program 002 charter context |
| MRE-DEC-003 | Use additive, non-destructive repository migration controls | Approved | Repository governance | Repository Disposition Register |
| MRE-DEC-004 | Adopt MDS, MNC, MCIS, lifecycle, and versioning standards | Approved | Enterprise standards | Sprint 002 standards |
| MRE-DEC-005 | Establish an Enterprise Architecture Review Board process | Approved | Architecture governance | EARB Standard |
| MRE-DEC-006 | Govern capabilities through a catalog, matrix, and quality gates | Implemented | Capability management | Sprint 004 artifacts |

## Status values

Proposed, In Review, Approved, Implemented, Superseded, Rejected, and Withdrawn.

## Control rules

- Material decisions must link to an ADR, standard, approved register, or program record.
- Superseded decisions remain in the register.
- Exceptions do not silently alter approved decisions.
- Contradictory active decisions block release until resolved.