# Program 006 — Sprint 005 Charter

## Automation Orchestration

### Mission
Define how Nova coordinates approved workflows across Moonrock runtime systems while preserving human authority, least privilege, traceability, safety, and recovery.

### Scope
- Orchestration lifecycle
- Workflow eligibility and risk screening
- Human approval checkpoints
- Runtime connector boundaries
- Work-item and handoff standards
- Execution receipts and audit trail
- Failure, retry, rollback, and incident escalation
- Automation readiness scoring

### Principles
Nova is an orchestrator, not an unrestricted system administrator. GitHub contains governed specifications; runtime systems execute authorized actions. Credentials and secrets never belong in program documentation.

### Definition of Done
- Eligible and prohibited automation categories are defined.
- Every execution has an owner, authorization, inputs, expected output, and evidence.
- Protected actions cannot be approved by Nova.
- Failures stop safely, preserve context, and escalate.
- Cross-system activity remains traceable from request through outcome.