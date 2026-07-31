# Integrated Staging Release Contract

## Immutable component binding

An integrated release binds:

- runtime and container contract;
- database migration;
- model release and evaluation evidence hash;
- GHL manifest and validation evidence hash;
- knowledge version/content/evidence hash;
- prompt, policy, and schema versions;
- observability posture;
- review references;
- incident and rollback exercise hashes;
- deployment target and secret-store references.

Changing any bound component creates a new candidate release ID.

## Knowledge gate

Every included record must:

- be `public-approved` and active;
- reference an approved source;
- have a current review date;
- contain no unresolved conflict;
- have an owner, approval reference, source path, and reproducible SHA-256 hash.

The publisher produces metadata evidence, not a source-content copy. An
`approved` bundle additionally requires a named knowledge-release approver.
The repository candidate remains unapproved until that owner acts.

## Observability gate

Runtime evidence permits opaque IDs, lifecycle state, safe outcome/reason
codes, severity, timing, counts, and immutable release versions.

The redacted sink rejects raw message/response/transcript fields, personal
contact fields, secret/token/credential fields, and secret-like strings before
forwarding an event. Raw message logging and transcript storage remain false.

## Integrated readiness

Staging deployment requires:

- human release approval;
- approved knowledge;
- approved sandbox posture for model and GHL;
- redaction and alert-exercise evidence;
- privacy, security, accessibility, and operations reviews;
- passed incident and rollback exercises;
- approved deployment target and secret store;
- credentials absent from the repository;
- external writes still disabled by default.

Readiness authority is `HUMAN_RELEASE_OWNER`.

Production readiness is always false in Sprint 006. Production authority
remains `HUMAN_EXECUTIVE`.
