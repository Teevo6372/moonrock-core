# Nova Release 1 — Staging Closeout

## Decision

Release 1 staging activation may be recorded complete only when the Sprint 014 validation evidence, Sprint 015 activation record, operator handoff, and critical-risk review are complete.

Completion of this record does **not** authorize production activation.

## Required closeout evidence

- Sprint 014 validation JSON and acceptance checklist.
- Sprint 015 activation JSON and operator acceptance record.
- Deployment revision and migration identifier.
- Rollback rehearsal evidence.
- Provider-isolation evidence.
- External-write-disabled evidence.
- Operational owner and escalation contact.
- Unresolved-risk register.

## Closeout command

From `apps/nova-website-advisor-runtime`:

```bash
NOVA_SPRINT014_EVIDENCE_PRESENT=true \
NOVA_SPRINT015_ACTIVATION_PRESENT=true \
NOVA_OPERATOR_HANDOFF_COMPLETE=true \
NOVA_UNRESOLVED_CRITICAL_RISKS=0 \
NOVA_PRODUCTION_DECISION=not-authorized \
npm run closeout:release-1
```

The command writes a machine-readable record and exits non-zero when required evidence, handoff, or critical-risk clearance is missing.

## Production boundary

The normal Release 1 closeout value is:

```text
productionDecision=not-authorized
```

A production authorization is valid only when a separate approval action supplies all three values:

- `NOVA_PRODUCTION_DECISION=authorized`
- `NOVA_PRODUCTION_APPROVER=<named authorized operator>`
- `NOVA_PRODUCTION_APPROVAL_REFERENCE=<separate approval record>`

No staging PR, merge, checklist, deployment, or closeout record substitutes for this explicit authorization.
