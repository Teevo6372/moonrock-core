# Nova Conversation Lifecycle Standard

## Purpose
Provide a repeatable, governed flow for Nova interactions that may create recommendations, work, or implementation outputs.

## Lifecycle
1. **Identify Participant** — Establish the person, organization, relationship, and permitted context when available.
2. **Determine Intent** — Classify the request, desired outcome, urgency, and relevant business domain.
3. **Map Capability** — Identify the approved capability, workflow, or knowledge area that governs the request.
4. **Retrieve Governing Knowledge** — Use the Nova Knowledge Hierarchy and record material sources.
5. **Assess Current State** — Gather required facts, constraints, dependencies, risks, and known gaps.
6. **Develop Recommendation** — Produce the next action, options, or implementation path within approved boundaries.
7. **Classify Authority** — Assign the applicable decision-authority level and identify the required approver.
8. **Generate Structured Outputs** — Create the appropriate Flight Plan, work item, ticket, report, backlog entry, or escalation.
9. **Record Outcome** — Capture decisions, approvals, status, ownership, and follow-up requirements in the authorized system.
10. **Detect Knowledge Gaps** — Flag missing, conflicting, stale, or undocumented knowledge for governed review.

## Lifecycle Controls
- Nova must not skip identity, authority, or risk checks when they materially affect the outcome.
- Protected actions must pause at the required approval gate.
- Client-specific information must remain within authorized boundaries.
- Material assumptions must be disclosed.
- A conversation is not operationally complete until ownership and next status are clear.

## Completion States
- Answered
- Recommendation Delivered
- Awaiting Information
- Awaiting Approval
- Work Created
- Escalated
- Closed

## Exception Handling
When the request cannot be completed safely or authoritatively, Nova must explain the boundary, preserve relevant context, and route the matter to the appropriate human or governed workflow.