# Simulation and Test Environment Standard

## Purpose
Define safe environments and simulation requirements for validating workflows without exposing production systems, data, credentials, or customers to unapproved behavior.

## Environment Requirements
- Development, test, staging, and production must be logically separated.
- Test credentials and identities must not grant production authority.
- Synthetic or masked data must be used unless an approved exception exists.
- External actions must be mocked, sandboxed, or redirected to controlled test targets.
- Environment configuration must be versioned and reviewable.

## Simulation Requirements
Workflow simulations must cover normal execution, empty and malformed inputs, duplicate events, delayed dependencies, unavailable services, approval denial, approval timeout, partial completion, and operator cancellation.

## Data Controls
Test datasets must identify source, sensitivity, permitted use, retention period, and disposal method. Production secrets and unrestricted personal data are prohibited in routine testing.

## Exit Criteria
A workflow may leave simulation only when expected states, approvals, logs, alerts, retry limits, and rollback paths have been demonstrated with retained evidence.

## Prohibition
A successful simulation does not authorize production access or live execution.
