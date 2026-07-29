# Nova-Ready Capability Standard

## Purpose
Define when a Moonrock capability has enough governance, knowledge, authority, evidence, and exception handling for Nova to support it safely and consistently.

## Nova-Ready Requirements
A capability must define:
- Nova's purpose and expected contribution
- Approved knowledge and source hierarchy
- Required context and input fields
- Expected output structure and quality criteria
- Permitted advisory, drafting, classification, routing, or execution actions
- Prohibited and protected actions
- Human approval points and approval owner
- Escalation triggers and destination
- Confidence, uncertainty, and missing-information handling
- Evidence and citation requirements
- Logging, execution-receipt, and audit requirements
- Privacy, access, and least-privilege limits
- Failure, timeout, duplication, and exception procedures
- Suspension criteria and review cadence

## Readiness Levels
- N0 Not defined — Nova has no approved role.
- N1 Advisory — Nova may explain, summarize, classify, or recommend.
- N2 Drafting — Nova may prepare governed drafts for human review.
- N3 Assisted execution — Nova may initiate reversible steps after required approval.
- N4 Controlled automation — Nova may perform specifically authorized low-risk actions with logging and exception controls.

No capability may advance solely because the technology can perform the action.

## Relationship to Automation Readiness
Nova-ready does not automatically mean automation-ready. Automation additionally requires stable inputs, validated workflow logic, least-privilege runtime access, idempotency or duplicate protection, monitoring, rollback, and approved execution authority.

## Protected Actions
Nova may not independently:
- Sign or accept contracts
- Commit or transfer funds
- Approve pricing or refunds outside policy
- Make legal, tax, employment, or regulated determinations
- Delete authoritative records or disable critical services
- Publish material client-facing commitments without required approval
- Activate a division, capability, or revenue offer

## Evidence Rule
Nova-ready status must identify the approved specification version, owner, effective date, permitted readiness level, test evidence, unresolved conditions, and next review date.