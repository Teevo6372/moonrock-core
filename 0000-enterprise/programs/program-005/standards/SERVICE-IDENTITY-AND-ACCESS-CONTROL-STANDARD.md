# Service Identity and Access Control Standard

## Purpose
Ensure every integration actor has a unique, governed identity and only the minimum permissions required for approved duties.

## Requirements
- Human and machine identities must be separate and individually attributable.
- Shared credentials are prohibited except through an approved emergency process.
- Service accounts must have a named business owner, technical owner, purpose, environment, and expiration or review date.
- Authentication must use approved methods; long-lived static credentials require documented exception approval.
- Authorization must apply least privilege, separation of duties, and deny-by-default behavior.
- Production access must be distinct from development and test access.
- Privileged actions must require stronger authentication and auditable approval.
- Access must be reviewed periodically and revoked promptly after role, vendor, system, or contract changes.

## Credential Handling
Credentials, tokens, certificates, and keys must be stored in approved secret-management systems, never committed to repositories, embedded in documentation, or exposed in logs.

## Evidence
Required evidence includes identity inventory, ownership, permission scope, approval record, review history, rotation history, and revocation record.

## Exceptions
Exceptions require documented risk, compensating controls, accountable approval, expiration, and follow-up review.