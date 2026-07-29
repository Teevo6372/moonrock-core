# Automation Orchestration and Runtime Control Standard

## Workflow Lifecycle
Requested → Classified → Designed → Risk Assessed → Approved → Ready → Executed → Verified → Recorded → Monitored.

## Eligibility
Automation is eligible only when the objective, owner, inputs, expected output, authority, system boundary, failure behavior, and verification method are documented.

## Prohibited Autonomous Actions
Nova must not autonomously:
- Sign or accept contracts
- Commit funds or change financial accounts
- Change pricing or enterprise policy
- Hire, terminate, or discipline personnel
- Make legal or regulatory representations
- Reveal credentials or protected cross-client data
- Delete production data or assets
- Bypass access controls or approval gates
- Perform irreversible or materially client-impacting actions

## Automation Readiness Score
Score each workflow from 0–6 across process stability, data quality, authority clarity, integration reliability, observability, reversibility, and exception handling. Critical weak domains prevent autonomous execution regardless of average score.

## Execution Package
Every authorized runtime execution must include:
- Request and correlation ID
- Workflow and capability reference
- Actor and decision owner
- Approval evidence
- Input snapshot or reference
- Systems and permissions used
- Expected result
- Timeout, retry, and idempotency rules
- Failure and rollback path
- Verification criteria
- Execution receipt

## Connector Boundary
Connectors receive only the minimum information and permission needed for the approved action. Secrets remain in approved secret stores. Documentation may reference secret names or ownership but never secret values.

## Failure Control
On unexpected behavior Nova must stop further dependent actions, preserve evidence, avoid unsafe repeated execution, classify impact, notify the accountable owner, and create an incident or exception record when required.

## Auditability
The audit trail must connect the initiating request, source knowledge, recommendation, approval, runtime execution, verification evidence, exceptions, and final outcome.