# Service Ownership and Operating Model Standard

## Purpose
Define accountable ownership and the minimum operating model for Program 005 services.

## Applicability
Applies to each service, automation, integration, AI agent, API, connector, queue, scheduler, data flow, and supporting component governed by Program 005.

## Required Roles
Each service must identify:
- accountable service owner;
- technical or implementation owner;
- operations owner;
- security and privacy contacts;
- incident commander or escalation authority;
- change approver;
- business capability owner;
- backup or delegated owner.

## Ownership Requirements
The service owner is accountable for approved purpose, scope, risk, service levels, lifecycle, funding assumptions, and retirement decisions. Technical and operations owners are responsible for implementation evidence, runbooks, monitoring, maintenance, recovery, and support readiness.

## Operating Model
Each service must document:
- supported capabilities and users;
- operating hours and support coverage;
- dependencies and third parties;
- data classifications and retention needs;
- monitoring and alert ownership;
- incident and escalation paths;
- maintenance and change windows;
- backup, recovery, and rollback ownership;
- known limitations and prohibited uses;
- evidence and reporting cadence.

## Segregation of Duties
High-impact approvals should be separated from implementation where practical. No individual may self-authorize prohibited autonomous, destructive, financial, legal, employment, regulatory, or customer-impacting actions.

## Lifecycle Governance
Ownership must remain current through design, testing, pilot, operation, material change, suspension, and retirement. Orphaned services must not advance through release gates.

## Handoffs
Ownership transfers require documented acceptance, open-risk review, access review, runbook verification, and repository updates.

## Evidence
Retain the ownership record, operating model, role changes, approvals, exceptions, and review history.

## Exceptions
Exceptions require rationale, residual risk, compensating controls, accountable owner, approval, and expiration date.