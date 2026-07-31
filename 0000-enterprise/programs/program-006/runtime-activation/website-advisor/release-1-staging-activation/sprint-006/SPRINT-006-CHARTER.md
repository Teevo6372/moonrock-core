# Nova Website Advisor Release 1 Staging Activation — Sprint 006

## Objective

Assemble the approved runtime foundations into one auditable, fail-closed
integrated staging candidate with knowledge-release, observability, review,
incident, and rollback gates.

## Sequencing

The original roadmap called this work Sprint 005. Controlled model evaluation
was inserted as Sprint 004 and GHL validation moved to Sprint 005. This Sprint
006 therefore performs the integrated-candidate work. Limited pilot and
production decision remain a later, separately authorized sprint.

## Included

- approved-source knowledge release validation and evidence;
- integrated component release manifest and readiness decision;
- redacted observability enforcement;
- end-to-end provider-disconnected synthetic conversation;
- incident and rollback exercise evidence;
- privacy, security, accessibility, and operations review checklist;
- explicit deployment and production blockers.

## Excluded

- self-approval of knowledge or reviews;
- provider credentials, network transports, or calls;
- GHL connection or mutation;
- staging infrastructure creation or deployment;
- production website embed, DNS, WordPress, or production activation;
- pilot traffic or real visitor/client data.

## Exit gate

The synthetic suite and exercises must pass, unsafe observability must fail
closed, and every unresolved external decision must remain a release blocker.
Owner merge approval does not approve deployment or production.
