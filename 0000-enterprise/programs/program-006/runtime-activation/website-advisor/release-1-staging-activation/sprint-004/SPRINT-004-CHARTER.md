# Nova Website Advisor Release 1 Staging Activation — Sprint 004

## Objective

Convert the approved model-evaluation catalog into a controlled executable
harness and operator evidence workflow. This sprint proves evaluation
mechanics locally; it does not authorize a provider connection or model
promotion.

## Sequencing decision

The original Sprint 001 roadmap labeled Sprint 004 as GHL non-production
validation. The later merged Sprint 003 handoff and the owner's explicit
Sprint 004 instruction place controlled model evaluation first. This sprint
records that newer direction without deleting or weakening the GHL gate. GHL
non-production validation remains required before integrated staging.

## Included

- typed executable synthetic fixtures;
- deterministic result scoring;
- bounded run manifest and cost ceiling;
- privacy-minimized evidence artifact;
- immutable evidence hashing;
- required human-review dimensions;
- human release-owner promotion gate;
- operator runbook, templates, and acceptance tests.

## Excluded

- API keys or secret values;
- provider SDK or concrete network transport;
- live or billable model calls;
- real visitor, client, employee, or GHL data;
- GHL access or mutation;
- model approval or release-manifest promotion;
- infrastructure, deployment, WordPress, DNS, or production changes.

## Exit gate

The local synthetic suite must pass, critical failures must block promotion,
evidence must exclude raw fixture/model content, and the owner must approve
the draft pull request. Merge does not authorize a provider-backed evaluation.
