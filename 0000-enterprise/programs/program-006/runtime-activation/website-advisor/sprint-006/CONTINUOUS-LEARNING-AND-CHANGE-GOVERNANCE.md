# Nova Website Advisor — Continuous Learning and Change Governance

## Purpose

This control defines how Website Advisor runtime observations become reviewable
improvement proposals without becoming approved knowledge or changing Nova's
authority. It specializes the Program 006 Continuous Improvement and Program
Closure Standard for the Website Advisor Release 1 runtime.

## Separation boundary

The Continuous Learning Queue is an evidence and work-management boundary. A
queue record:

- is not an approved knowledge source;
- is not eligible for retrieval into a visitor response;
- cannot change a prompt, model, policy, tool, consent rule, route, or governing
  document;
- cannot authorize an experiment or deployment;
- cannot be represented as a verified finding until human review is recorded.

Nova may record an observation and draft a proposal. Nova may not review,
approve, implement, verify, publish, or reject its own authority-changing work.

## Required record

Every observation must contain:

- concise observation;
- source reference, never a raw transcript by default;
- affected capability or workflow;
- evidence references and confidence;
- business impact and urgency;
- privacy concern indicator;
- proposed action;
- accountable owner and one or more reviewers;
- approval class and risk class;
- measurable success condition;
- triage classification;
- status, disposition, and immutable transition history.

Sensitive values are redacted before in-memory recording. A production successor
must apply approved retention, access, encryption, deletion, and client-boundary
controls before accepting real visitor-derived observations.

## Lifecycle and authority

| Transition | Authorized role |
| --- | --- |
| Create `RECORDED` | Nova or operator |
| `RECORDED` → `TRIAGED` | Operator |
| `TRIAGED` → `INVESTIGATED` | Operator |
| `INVESTIGATED` → `PROPOSED` | Nova or operator |
| `PROPOSED` → `REVIEWED` | Approver |
| `REVIEWED` → `APPROVED` | Approver |
| `APPROVED` → `IMPLEMENTED` | Implementer |
| `IMPLEMENTED` → `VERIFIED` | Approver |
| `VERIFIED` → `PUBLISHED` | Publisher |
| Eligible non-terminal state → `REJECTED` | Operator or approver |

Protected changes require the `legal_security_privacy` approval class. No actor
may skip a lifecycle stage. Publication is the point at which an approved
artifact may enter its separately governed controlling location.

## Triage classes

- correctness or safety;
- knowledge gap or contradiction;
- client experience;
- operational efficiency;
- capability enhancement;
- automation opportunity;
- governance or compliance;
- deferred idea.

Correctness, safety, privacy, security, legal, discrimination, billing, and
authority concerns receive priority human review. Queue urgency never grants
Nova additional decision authority.

## Measurement

Sprint 006 permits aggregate counts derived from redacted runtime events:

- sessions;
- accepted and blocked messages;
- escalations;
- confirmed mock bookings;
- denied tools;
- outcome-unknown provider responses;
- degraded runtime events;
- tool completion/approval compliance.

Metrics contain no message or transcript text. Metrics are signals for
investigation, not proof of causality or autonomous change authorization.

## Experiment control

Every experiment defines hypothesis, scope, owner, participants, data boundary,
baseline, metric, duration, stop condition, rollback, risk class, and approval
evidence. Only an approver may authorize an experiment. High and protected risk
experiments require explicit approval evidence before activation.

Sprint 006 experiments are limited to synthetic fixtures and local mock runtime
execution. Production visitors, client records, live providers, and production
traffic are out of scope.

## Prompt, model, knowledge, and policy changes

Any change to a prompt, model selection, retrieval rule, knowledge bundle,
consent rule, escalation rule, tool policy, disclosure, or authority boundary
requires:

1. linked queue record and evidence;
2. risk and approval classification;
3. versioned proposed artifact;
4. independent review;
5. evaluation against the approved catalog;
6. rollback artifact;
7. approval by the controlling human authority;
8. verified publication through a separate pull request or release process.

Runtime observation alone never updates a controlling artifact.
