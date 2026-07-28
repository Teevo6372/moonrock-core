# Controlled Pilot and Rollout Standard

## Purpose
Define how an approved automation pilot is bounded, observed, evaluated, expanded, paused, or terminated.

## Pilot Plan Requirements
Every pilot plan must specify:
- Objective, hypothesis, and success measures
- Start and end dates
- Approved users, systems, records, and transaction limits
- Environment and connector boundaries
- Human approval points and prohibited actions
- Monitoring, alerting, support, and incident paths
- Rollback, safe-stop, and manual fallback procedures
- Data retention and evidence collection

## Boundary Controls
Pilots must use the smallest practical scope. Volume, concurrency, permissions, schedules, and affected populations must be explicitly capped. Scope expansion requires a new decision record.

## Evaluation
Pilot results must compare measured outcomes against baseline performance, acceptance criteria, incidents, control failures, cost, support burden, and user feedback.

## Rollout Gates
Expansion may occur only when:
1. Success criteria are met.
2. Material failures are resolved or accepted.
3. Capacity and cost remain within approved limits.
4. Operational ownership and support are ready.
5. Rollback remains viable.
6. Required approvers authorize the next stage.

## Pause and Termination
The pilot must pause or terminate upon uncontrolled impact, security concern, repeated failure, exceeded limits, missing ownership, invalid evidence, or inability to restore the manual process.
