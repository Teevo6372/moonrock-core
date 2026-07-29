# Idempotency, Retry, and Transaction Safety Standard

Any workflow that can create a duplicate communication, record, order, charge, purchase, listing, shipment, entitlement, or external action must implement duplicate protection.

## Requirements
- use a stable idempotency or correlation key where supported;
- define retryable and non-retryable failures;
- bound retries with delay and escalation;
- prevent concurrent workers from performing the same protected action;
- verify external outcome before repeating an uncertain request;
- reconcile partial completion;
- document compensating action where atomic rollback is unavailable.

Financial, contractual, inventory, marketplace, and client-acceptance actions require post-action reconciliation against the applicable system of record.

An unknown outcome is not a failed outcome. The workflow must investigate before retrying an action that may already have succeeded.
