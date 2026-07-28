# Secrets and Identity Governance Standard

## Purpose
Protect credentials, tokens, keys, and runtime identities used by automation services.

## Identity Rules
- Every workflow must use a named service identity.
- Shared human credentials are prohibited.
- Privileges must be least-privilege, purpose-specific, and environment-specific.
- Identity ownership and expiration must be documented.

## Secret Handling
Secrets must never be stored in source files, workflow definitions, logs, screenshots, tickets, or documentation. Approved secret stores and encrypted transport are required for implementation.

## Lifecycle
Secrets must support issuance, rotation, revocation, expiration, and emergency replacement. Revoked or expired credentials must fail closed.

## Access
Access requires role-based authorization and must be auditable. Production secret access must be more restrictive than development and test access.

## Monitoring
Authentication failures, unusual access patterns, privilege changes, and secret retrieval events must be observable and escalated according to risk.

## Incident Response
Suspected exposure requires immediate revocation, impact assessment, credential replacement, log review, and documented closure.