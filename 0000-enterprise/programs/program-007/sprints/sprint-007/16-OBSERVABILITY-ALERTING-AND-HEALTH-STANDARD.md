# Automation Observability, Alerting, and Health Standard

Every active production automation must expose enough evidence to determine whether it is running, succeeding, failing, delayed, duplicating work, operating outside limits, or producing degraded outcomes.

## Minimum Signals
- workflow version, run and correlation identifiers;
- trigger, start, completion, duration, state, and outcome;
- approval and protected-action events;
- dependency, retry, exception, and recovery events;
- volume, cost, quality, and business outcome measures;
- data access and tool execution appropriate to classification.

Alerts must have severity, threshold, owner, destination, response expectation, suppression rule, and escalation path.

Logs must minimize sensitive content, resist unauthorized change, follow retention requirements, and support reconciliation. Lack of an alert does not prove correct operation.
