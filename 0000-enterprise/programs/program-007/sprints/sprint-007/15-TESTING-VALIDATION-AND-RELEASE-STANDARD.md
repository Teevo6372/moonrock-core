# Automation Testing, Validation, and Release Standard

Production release requires evidence that the approved workflow version satisfies business, technical, control, security, data, and recovery requirements.

## Minimum Test Coverage
- normal and boundary inputs;
- missing, malformed, duplicate, stale, and unauthorized inputs;
- approval denial, timeout, and unavailable approver;
- dependency outage, throttling, and partial success;
- retry, idempotency, reconciliation, rollback, and manual fallback;
- permission and data-boundary enforcement;
- monitoring, alerting, and shutdown.

Testing must use non-production data unless specifically authorized. Production change must identify version, approver, release window, owner, validation steps, rollback criteria, and post-release observation.

Material tool, model, permission, data, rule, recipient, or integration changes require impact review and proportionate retesting.
