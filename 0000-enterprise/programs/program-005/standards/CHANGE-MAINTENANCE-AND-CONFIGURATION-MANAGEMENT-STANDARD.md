# Change, Maintenance, and Configuration Management Standard

## Purpose
Define controlled methods for proposing, reviewing, scheduling, implementing, validating, and reversing operational changes.

## Applicability
Applies to code, configuration, infrastructure, integrations, data mappings, prompts, models, access controls, schedules, dependencies, monitoring, runbooks, and supporting documentation.

## Change Classes
Changes must be classified as standard, normal, emergency, or prohibited. Classification criteria must reflect risk, repeatability, reversibility, customer impact, security and privacy implications, and required approvals.

## Required Change Record
Each material change must document:
- purpose, scope, owner, and affected services;
- implementation and validation plan;
- risk and dependency assessment;
- security, privacy, data, and compliance impact;
- maintenance window and communications;
- rollback triggers and procedure;
- approvals and segregation of duties;
- exact version, commit, configuration, or artifact identifiers.

## Approval and Scheduling
Production-impacting changes require authorized human approval. High-risk changes require stronger review and evidence. Conflicting changes must be coordinated. Maintenance windows must reflect service obligations and stakeholder needs.

## Configuration Control
Authoritative configurations must be versioned, access-controlled, reviewable, and traceable. Secrets and credentials must not be embedded in repository documentation or change evidence.

## Emergency Changes
Emergency changes are limited to restoring safe service or containing material risk. They require recorded authority, bounded scope, validation, rollback readiness, and retrospective review.

## Post-Change Validation
The owner must verify service health, monitoring, security controls, data integrity, dependencies, and expected outcomes. Failed validation triggers rollback, containment, or an approved corrective plan.

## Maintenance
Routine maintenance must have ownership, frequency, procedures, evidence, exception handling, and retirement criteria for obsolete components.

## Evidence
Retain change records, approvals, implementation timestamps, validation results, rollback decisions, configuration identifiers, communications, and follow-up actions.

## Exceptions
Exceptions require documented scope, rationale, residual risk, compensating controls, owner, approval, and expiration date.