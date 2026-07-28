# Moonrock Program Management Framework (PMF)

**Document ID:** MRE-GOV-PMF-001  
**Version:** 1.0.0  
**Status:** Implemented  
**Owner:** Moonrock Enterprises  
**Approved by:** Stephen Tyler Jr.  
**Effective date:** 2026-07-28  
**Repository path:** `0000-enterprise/0100-governance/program-management-framework.md`

## Purpose

Define how Moonrock programs are authorized, planned, executed, reviewed, released, and closed.

## Work hierarchy

1. Enterprise objective
2. Program
3. Work package
4. Sprint
5. Mission or task
6. Deliverable

Each level must have an owner, status, scope, acceptance criteria, dependencies, and evidence of completion.

## Required program controls

Every active program must maintain a charter, roadmap, work-package register, decision register, risk and issue register, dependency record, release record, and completion report.

## Sprint operating cycle

1. Confirm approved scope and exclusions.
2. Create a branch from the current approved base.
3. Implement in small, traceable commits.
4. Validate metadata, links, duplication, scope, and repository impact.
5. Open a pull request with completion evidence.
6. Merge only after approval and mergeability confirmation.
7. Create the next sprint branch from the updated approved base.

## Status model

Permitted execution states are Planned, Active, Blocked, In Review, Approved, Complete, Cancelled, and Archived.

## Change control

Scope changes must identify the requested change, business reason, schedule or dependency impact, decision authority, and resulting update to acceptance criteria. Unapproved scope expansion is prohibited.

## Risk and issue control

Risks describe uncertain future events. Issues describe conditions already affecting delivery. Each entry requires an owner, impact, response, due or review date, and current state.

## Completion gate

A sprint is complete only when its deliverables satisfy acceptance criteria, repository changes are documented, tests or validations are recorded, unresolved blockers are disclosed, and the approving authority authorizes merge or closure.
