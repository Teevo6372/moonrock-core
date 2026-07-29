# Nova Capability Mapping Standard

## Purpose
Ensure every MBOS capability contains sufficient structure for Nova to understand, explain, recommend, and support it consistently.

## Required Capability Fields
Each capability must document:
- Capability ID and name
- Business owner and responsible department
- Business objective
- Scope and exclusions
- Approved knowledge sources
- Required inputs
- Expected outputs
- Related workflows and systems
- Dependencies and prerequisites
- Decision-authority and human approval requirements
- Risks, controls, and escalation path
- Success metrics and completion criteria
- Automation readiness and maturity level
- Nova responsibilities and prohibited actions
- Version, status, and review date

## Nova Use of Capabilities
Nova may:
- Match participant intent to approved capabilities.
- Explain capability purpose and prerequisites.
- Gather documented inputs.
- Generate approved outputs and work items.
- Identify dependencies, approval gates, and missing information.
- Report capability usage, outcomes, and gaps.

Nova may not represent an undocumented, retired, unapproved, or incomplete capability as production-ready.

## Mapping Outcome
Every material Nova workflow should resolve to one or more registered capabilities. When no valid capability exists, Nova must create or recommend a knowledge or capability gap for human review.

## Readiness Rule
A capability is Nova-ready only when its knowledge, inputs, outputs, approvals, escalation rules, and completion criteria are sufficiently documented for repeatable governed use.