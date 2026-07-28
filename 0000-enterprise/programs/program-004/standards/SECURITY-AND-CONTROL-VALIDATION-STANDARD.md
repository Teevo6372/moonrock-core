# Security and Control Validation Standard

## Purpose
Define the minimum security, privacy, identity, and human-control validation required for automated workflows.

## Validation Areas
- Least-privilege identities and scoped permissions.
- Separation of test and production credentials.
- Secret storage, rotation, and non-disclosure.
- Input validation and unsafe-content handling.
- Data classification, minimization, retention, and masking.
- Approval enforcement and bypass prevention.
- Audit-log completeness and tamper resistance.
- Dependency trust and connector authorization.
- Unauthorized action prevention.
- Emergency suspension and credential revocation.

## Approval-Control Tests
Testing must prove that required approvals cannot be skipped, reused outside their scope, silently self-approved, or applied after expiration. Denial and timeout paths must terminate or safely pause execution.

## Findings
Findings must include severity, affected workflow, evidence, control gap, owner, remediation, target date, and retest status. Critical findings block release. High findings require documented risk acceptance from the designated authority before further progression.

## Evidence
Security validation evidence must be retained with the workflow release package and remain traceable to the tested version and environment.
