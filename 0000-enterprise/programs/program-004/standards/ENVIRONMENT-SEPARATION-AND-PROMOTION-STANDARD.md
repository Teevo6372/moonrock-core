# Environment Separation and Promotion Standard

## Objective
Prevent untested automation changes from reaching operational environments.

## Required Environments
Where technically feasible, workflows must progress through development, test, staging, and production environments. Risk owners may approve a reduced model only with documented compensating controls.

## Separation
Each environment must use separate configuration, data boundaries, identities, credentials, endpoints, and access controls. Production data must not be copied into lower environments without authorization and protection.

## Promotion Gates
Promotion requires:
- approved workflow specification;
- passing test and assurance evidence;
- versioned configuration;
- dependency validation;
- named owner and operator;
- rollback readiness;
- required risk approval.

## Configuration
Environment-specific values must be externalized from workflow logic. Manual production edits are prohibited except through an approved emergency process.

## Production Entry
Production activation must be deliberate, time-bounded where appropriate, observable, and subject to post-activation verification.

## Rollback
The prior stable version and restoration procedure must be identified before promotion. Failed verification requires rollback or suspension.