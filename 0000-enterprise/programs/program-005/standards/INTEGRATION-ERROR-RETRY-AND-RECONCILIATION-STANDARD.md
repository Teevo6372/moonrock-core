# Integration Error, Retry, and Reconciliation Standard

## Purpose
Ensure failures are contained, visible, recoverable, and auditable.

## Error Model
Interfaces must distinguish validation, authentication, authorization, rate-limit, dependency, timeout, conflict, and internal-processing failures. Error responses must be safe, actionable, correlated, and free of secrets.

## Retry Controls
Retries require bounded attempts, backoff, jitter where appropriate, retryable-error classification, and idempotency protection. Permanent failures must not be retried indefinitely.

## Dead-Letter and Escalation
Unrecoverable messages or transactions must enter a controlled exception path with ownership, alerting, evidence, and human disposition.

## Reconciliation
Each material integration must define source-of-truth comparison, discrepancy detection, correction authority, evidence retention, and completion acknowledgement.

Automatic correction of financial, legal, employment, customer-impacting, or destructive discrepancies requires separately approved authority.