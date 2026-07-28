# Idempotency, Retry, and Recovery Standard

## Purpose
Prevent duplicate effects, uncontrolled retry loops, and unrecoverable workflow failures.

## Idempotency
Every action capable of creating an external side effect must define an idempotency key or equivalent duplicate-prevention control. Replayed events must not create duplicate financial, customer, repository, or operational effects.

## Retry Policy
Retries must be limited, observable, and appropriate to the failure type. Each retry policy must define maximum attempts, delay strategy, timeout, retryable conditions, non-retryable conditions, and escalation threshold.

## Recovery Modes
- Automatic recovery for low-risk transient failures
- Human-assisted recovery for ambiguous or material failures
- Compensation or rollback for reversible side effects
- Quarantine for malformed, duplicated, or suspicious events
- Suspension for repeated control failures

## Dead-Letter Handling
Unresolved work items must be retained in a reviewable queue with original payload reference, failure history, owner, risk class, and disposition status.

## Safety Rules
Infinite retries, silent drops, destructive rollback without approval, and recovery that bypasses authorization controls are prohibited.

## Evidence
Recovery actions must preserve traceability from the original trigger through final resolution.