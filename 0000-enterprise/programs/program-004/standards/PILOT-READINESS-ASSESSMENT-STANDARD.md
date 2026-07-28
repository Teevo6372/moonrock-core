# Pilot Readiness Assessment Standard

## Purpose
Provide a repeatable go, conditional-go, or no-go assessment before any automation pilot begins.

## Assessment Domains
- Business ownership and decision rights
- Workflow specification completeness
- Security, privacy, identity, and secret handling
- Test and simulation evidence
- Failure handling, rollback, and manual fallback
- Monitoring, alerting, incident response, and support coverage
- Cost, capacity, scheduling, and concurrency controls
- User communication and change readiness

## Evidence Requirements
The assessment must reference approved specifications, test results, known limitations, unresolved risks, dependencies, operating procedures, and named approvers. Assertions without evidence are not sufficient.

## Decision Outcomes
- **Go:** all mandatory gates pass and residual risk is accepted.
- **Conditional Go:** limited pilot may proceed only after documented conditions are satisfied or bounded by explicit controls.
- **No-Go:** one or more mandatory gates fail, ownership is missing, or risk cannot be contained.

## Mandatory Stop Conditions
Pilot entry is prohibited when rollback is untested, monitoring is absent, credentials are unmanaged, production scope is unclear, required approvals are missing, or the workflow can perform prohibited autonomous actions.

## Validity
A readiness decision expires when material design, data, connector, identity, scope, owner, or environment changes occur. Reassessment is then required.
