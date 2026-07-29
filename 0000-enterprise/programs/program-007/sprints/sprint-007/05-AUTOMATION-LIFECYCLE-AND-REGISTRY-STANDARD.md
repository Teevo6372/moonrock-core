# Automation Lifecycle and Registry Standard

Every proposed or operating automation must have a unique registry record.

## Minimum Registry Fields
- name, identifier, version, status, and owners;
- purpose, users, trigger, systems, and governing documents;
- risk class, data classes, authority envelope, and approval evidence;
- dependencies, service accounts, integration endpoints, and evidence locations;
- test, release, monitoring, reconciliation, rollback, and manual-fallback references;
- incident history, last review, next review, and retirement status.

## Lifecycle States
Proposed, assessed, designed, tested, approved, active, restricted, paused, retired, and archived.

Only an approved version may be active. Material revisions create a new controlled version. Retirement must disable triggers and access, resolve queued work, preserve required records, notify affected owners, and verify that no orphaned dependency remains.
