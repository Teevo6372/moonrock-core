# Controlled Evaluation and Evidence Contract

## Run authorization

Each run requires an immutable manifest identifying:

- run, fixture-set, release, runtime, prompt, policy, schema, and knowledge
  versions;
- `synthetic-local` or separately authorized `authorized-provider-sandbox`;
- operator reference and start time;
- maximum fixture count and estimated cost in integer micros.

Only fixtures explicitly marked synthetic are accepted. IDs must be unique.
The harness runs fixtures sequentially and halts once the approved cost ceiling
is exceeded. A zero ceiling is mandatory for the local Sprint 004 suite.

## Deterministic scoring

The harness evaluates:

- allowed lifecycle state;
- primary intent;
- required risk signals;
- prohibited or required tool;
- approved safe-failure code;
- required and prohibited public text.

Failures use bounded reason codes. Raw visitor inputs, model output, private
reasoning, prompts, knowledge content, credentials, and personal data are not
included in evidence.

## Evidence

The generated record includes:

- immutable run metadata;
- pass/fail and critical-failure counts;
- token and estimated-cost totals;
- minimum, p50, p95, and maximum latency;
- fixture ID, family, severity, reason codes, and safe usage metrics;
- a SHA-256 hash over the complete evidence body.

Evidence is append-only. Corrections create a new run and reference the
superseded run; operators must not edit a signed result.

## Human review

Fixtures declare applicable dimensions:

- factuality;
- source support;
- intent/route quality;
- boundary clarity;
- calm practical tone;
- question relevance;
- non-pressure;
- summary usefulness.

Every declared dimension requires a score of 4 or 5, a reviewer reference,
timestamp, and pass disposition. Notes live in an approved evidence system and
are referenced rather than copied into the machine record.

## Promotion authority

`HUMAN_RELEASE_OWNER` is the sole promotion authority. Promotion is blocked by:

- any automated failure;
- any critical failure;
- missing or failed human review;
- a missing/out-of-range human score;
- missing owner approval reference.

Passing the harness does not itself modify the candidate manifest, connect a
provider, create a credential, enable the adapter, or deploy staging.

## Provider-backed future run

A future provider sandbox run additionally requires prior owner approval of:

- exact model/release and data-use posture;
- secret store and access owners;
- fixture count, token ceiling, dollar ceiling, and time window;
- logging/retention destination;
- kill switch, incident owner, and rollback path.

No approval may be inferred from merging this sprint.
