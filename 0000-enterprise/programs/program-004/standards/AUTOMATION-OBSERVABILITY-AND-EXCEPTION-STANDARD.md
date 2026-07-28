# Automation Observability and Exception Standard

## Required Signals
Every production automation must expose workflow status, start and completion times, current stage, action outcomes, retry count, approval state, and final disposition.

## Event Record
Each execution must have a unique run identifier and record the workflow version, trigger, authorized actor, inputs by reference, material decisions, external actions, errors, and recovery steps.

## Exception Classes
- Validation failure
- Authorization failure
- Dependency unavailable
- Timeout or rate limit
- Duplicate or conflicting request
- Data-quality failure
- Policy or approval failure
- Partial completion
- Unexpected system failure

## Required Responses
Exceptions must route to retry, quarantine, manual review, rollback, compensation, safe termination, or escalation according to approved policy. Unlimited retries are prohibited.

## Alerting
Alerts must be severity-based, actionable, deduplicated, and routed to a named owner. High-impact partial completion requires immediate escalation.

## Recovery
Every workflow must define restart behavior, duplicate prevention, reconciliation, manual fallback, and evidence required to close the incident.

## Measurement
Track reliability, completion rate, exception rate, manual intervention, recovery time, avoided labor, and realized business outcome.