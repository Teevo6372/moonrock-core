# Pilot Evidence Runbook

## Before launch approval

1. Replace every `null` owner and approval in `pilot-plan.candidate.json` with
   a durable reference through a new reviewed manifest.
2. Reduce the operating window to confirmed staffed support.
3. Approve retention, model/GHL sandbox, cost, infrastructure, knowledge,
   observability, privacy, security, accessibility, CRM, and operations.
4. Pass incident, rollback, support-handoff, WordPress feature-flag, and
   WordPress rollback exercises.
5. Obtain a distinct human release-owner pilot-launch approval.

## During an authorized pilot

- evaluate admission before every session/message/write;
- record only redacted metrics and immutable release identifiers;
- review stop criteria continuously;
- display persistent AI identity and human option;
- stop automated handling outside the approved window;
- reconcile uncertain writes before any retry;
- route handoffs to the staffed owner;
- keep static contact and Flight Plan paths available.

## Evidence package

- exact pilot/release/configuration hashes;
- owner and approval references;
- operating intervals and traffic counts;
- admission denials by safe reason;
- latency, token, cost, and GHL-write totals;
- completion, consent, handoff, fallback, escalation, and error rates;
- incident, rollback, cleanup, and accessibility results;
- every stop/exception and disposition;
- residual risks and owner;
- reviewer approvals or rejections.

No raw transcript, contact value, prompt, secret, private knowledge, or
provider credential belongs in the evidence package.

## Close

Disable the pilot flag, block new sessions, allow bounded active-session
closure or safe fallback, reconcile pending writes, clean synthetic objects,
revoke temporary write authority, record final metrics, and submit evidence
for human review.
