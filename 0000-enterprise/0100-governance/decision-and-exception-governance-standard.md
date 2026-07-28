# Decision and Exception Governance Standard

**Document ID:** MRE-GOV-DEG-001  
**Version:** 1.0.0  
**Status:** Implemented  
**Owner:** Moonrock Enterprises  
**Approved by:** Stephen Tyler Jr.  
**Effective date:** 2026-07-28  
**Repository path:** `0000-enterprise/0100-governance/decision-and-exception-governance-standard.md`

## Purpose

Define how material enterprise decisions and temporary exceptions are recorded, approved, reviewed, and closed.

## Decision record requirements

A governed decision record must include:

- Decision ID and title
- Date and decision authority
- Context and problem statement
- Options considered
- Decision and rationale
- Affected capabilities and dependencies
- Risks and consequences
- Implementation owner
- Related pull requests, ADRs, or program records

## Decision classes

- Enterprise: affects multiple divisions, products, or shared platforms.
- Architecture: affects technical structure, data ownership, security, or deployment.
- Program: affects scope, funding, sequence, acceptance criteria, or release.
- Operational: affects a governed recurring process.

## Exception requirements

An exception must identify the governing standard, reason compliance is not currently possible, risk owner, compensating controls, start date, expiration or review date, remediation action, and approval authority.

## Closure

A decision remains active until superseded or retired. An exception closes when compliance is restored, the affected standard is formally changed, or the exception is explicitly renewed after review.

## Prohibited practices

Material decisions may not be recorded only in chat, undocumented verbal approval, or commit messages. Exceptions may not omit an owner or review date.
