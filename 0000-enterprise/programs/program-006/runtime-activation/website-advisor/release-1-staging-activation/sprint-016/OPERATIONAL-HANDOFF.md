# Release 1 Operational Handoff

## Required ownership

Before staging closeout, record:

- runtime owner;
- infrastructure owner;
- database owner;
- incident escalation contact;
- rollback authority;
- evidence custodian.

## Handoff checklist

- Operator can locate the deployment, migration, validation, activation, and rollback records.
- Operator understands that providers remain mock or disabled.
- Operator understands that external writes remain disabled.
- Operator can run health, readiness, validation, activation-record, and closeout commands.
- Operator can identify the deployed revision and staging migration.
- Operator has rehearsed rollback or reviewed retained rollback evidence.
- Operator knows that production requires a separate authorization record.

## Incident posture

On failed readiness, persistence, isolation, or rollback verification:

1. stop acceptance activity;
2. preserve sanitized evidence;
3. disable the affected private staging service if containment is required;
4. execute the approved rollback procedure;
5. record the incident and owner;
6. rerun validation only after remediation.

The handoff is incomplete until each responsibility has a named owner outside committed source files or a controlled reference to the applicable operational directory.
