# Program 007 Dependency Matrix

## Purpose
This matrix identifies the minimum governance dependencies that must be considered before a Program 007 standard is implemented, automated, or interpreted.

| Domain | Primary Dependency | Downstream Consumers |
|---|---|---|
| Sprint 001 — MBOS Foundation | Enterprise governance programs 001–006 | All later sprints and implementations |
| Sprint 002 — Client Governance | Sprint 001 | Marketing, sales, delivery, finance, intelligence |
| Sprint 003 — Acquisition | Sprints 001–002 | MEDS intake, MEFS revenue controls, MEIS pipeline analytics |
| Sprint 004 — MEDS | Sprints 001–003 | Project tools, service operations, capacity planning, QA |
| Sprint 005 — MEFS | Sprints 001–004 | Billing, procurement, treasury, executive finance, MEIS |
| Sprint 006 — MEIS | Sprints 001–005 | Dashboards, forecasts, executive decision support |
| Sprint 007 — MEAS | Sprints 001–006 | Nova and all governed automations |
| Sprint 008 — Resilience | Sprints 001–007 | Security, continuity, incident response, audit readiness |

## Interpretation Rules
- Earlier approved governance is not automatically replaced by later work.
- A later standard may refine an earlier standard only when the change is explicit, approved, traceable, and versioned.
- Implementations must evaluate all applicable dependencies, not only the document closest to the workflow.
- Financial actions affecting delivery must satisfy both MEDS and MEFS.
- Client-facing automation must satisfy MCRS, MEDS or MEFS as applicable, and MEAS once established.
- Analytics may describe or recommend actions but do not create approval authority.

## Conflict Resolution
When standards conflict:
1. Stop the affected protected action.
2. Record the conflict and impacted documents.
3. Apply the stricter control temporarily when doing so does not create harm or unlawful conduct.
4. Escalate to the designated human authority.
5. Resolve through an approved repository change and cross-reference update.