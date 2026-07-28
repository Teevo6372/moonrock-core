# Quality Gate Standard

**Document ID:** MRE-GOV-QGS-001  
**Version:** 0.1.0  
**Status:** Implemented  
**Owner:** Moonrock Enterprises  
**Approved by:** Stephen Tyler Jr.  
**Effective date:** 2026-07-28  
**Repository path:** `0000-enterprise/0100-governance/quality-gate-standard.md`

## Purpose

Define objective controls that must be satisfied before governed work advances between lifecycle, sprint, and release stages.

## Core gates

### Gate 1 — Definition Ready

- Scope and exclusions documented
- Owner assigned
- Dependencies identified
- Acceptance criteria testable
- Risks recorded

### Gate 2 — Implementation Complete

- Approved deliverables present
- Required metadata complete
- No unauthorized scope introduced
- Changes traceable to commits
- Existing protected assets unaffected unless explicitly approved

### Gate 3 — Review Ready

- Duplicate review completed
- Internal links and references validated
- Naming and numbering checked
- Decision and exception records current
- Repository impact documented

### Gate 4 — Release Ready

- Acceptance criteria satisfied
- Required reviews complete
- Blockers resolved or formally accepted
- Rollback or recovery considerations recorded where applicable
- Release notes prepared

### Gate 5 — Operational Acceptance

- Capability owner accepts responsibility
- Support and maintenance expectations defined
- Measures or evidence sources identified
- Known technical debt recorded

## Gate outcomes

A gate result is Pass, Conditional Pass, or Fail. Conditional Pass requires a named owner, remediation date, and approved exception record. Failed gates block advancement.

## Evidence

Gate evidence must be linked to repository paths, pull requests, commits, tests, reports, or approved decision records.