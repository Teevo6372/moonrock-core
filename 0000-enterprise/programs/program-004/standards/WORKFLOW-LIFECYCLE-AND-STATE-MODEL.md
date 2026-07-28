# Workflow Lifecycle and State Model

## Purpose
Define the controlled states through which an automation workflow progresses from idea to retirement.

## Lifecycle States
1. **Proposed** — opportunity recorded but not yet assessed.
2. **Qualified** — business value, owner, and preliminary risk are documented.
3. **Designed** — implementation-ready workflow specification completed.
4. **Approved** — required governance and human approvals recorded.
5. **Built** — workflow implementation exists in a non-production environment.
6. **Validated** — testing and acceptance criteria are satisfied.
7. **Pilot** — limited, monitored operation under explicit constraints.
8. **Operational** — approved for routine use with active ownership and monitoring.
9. **Suspended** — execution halted pending review, repair, or risk resolution.
10. **Retired** — disabled, archived, and removed from active service.

## Transition Controls
Each state transition must record the actor, timestamp, evidence, approval basis, version, and resulting obligations. Material changes return an operational workflow to Designed or Approved status as determined by impact.

## Prohibited Transitions
A workflow may not move directly from Proposed or Qualified into production operation. Suspended workflows may not resume without documented remediation and reauthorization.

## Ownership
The workflow owner is responsible for current status, evidence completeness, control effectiveness, and timely retirement when business need ends.