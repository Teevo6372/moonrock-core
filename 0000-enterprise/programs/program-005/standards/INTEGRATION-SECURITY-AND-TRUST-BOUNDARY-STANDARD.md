# Integration Security and Trust-Boundary Standard

## Purpose
Establish minimum security controls for data and event exchanges across system and organizational boundaries.

## Required Controls
- Document every trust boundary and data flow
- Use named service identities rather than shared user credentials
- Apply least-privilege scopes and environment-specific access
- Store no secrets in source files, examples, logs, or documentation
- Encrypt approved sensitive data in transit and at rest
- Validate origin, destination, payload shape, and authorization
- Prevent sensitive values from appearing in logs or error messages
- Define token rotation, revocation, and emergency disablement procedures
- Separate development, test, staging, and production identities
- Record security-relevant events in tamper-evident audit history

## High-Risk Boundaries
External marketplaces, payment systems, customer communications, identity providers, financial services, legal systems, and administrative interfaces require enhanced review and explicit human approval.

## Failure Posture
When identity, authorization, contract validity, or data classification cannot be verified, the integration must fail closed and route the exception for human review.