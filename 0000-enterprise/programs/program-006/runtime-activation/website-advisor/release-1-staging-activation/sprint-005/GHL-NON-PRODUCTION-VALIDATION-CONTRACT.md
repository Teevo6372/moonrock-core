# GHL Non-Production Validation Contract

## Manifest

The GHL sandbox manifest identifies only:

- an explicit `non-production` environment;
- opaque sandbox-prefixed location and object mappings;
- an opaque `secretref://` credential reference;
- approved least-privilege scopes;
- CRM mapping and security scope review references;
- cleanup and outcome-reconciliation owners;
- `externalWritesEnabled: false`.

Candidate mappings use symbolic placeholders. Actual provider identifiers must
be resolved only in protected configuration after CRM-owner approval and never
enter prompts, browser responses, fixtures, or repository files.

## Read gate

Reads remain blocked until mapping and scope reviews are recorded. Allowed
reads are:

- exact email/phone duplicate candidate lookup;
- approved Flight Plan calendar availability.

Responses must be reduced to the minimum contract fields before reaching the
runtime. Broad contact, conversation, opportunity, user, or location export is
prohibited.

## Synthetic write gate

Every non-production write requires a separate immutable authorization:

- authorization and approver references;
- start and expiry timestamps;
- maximum successful write count;
- exact allowed write tools;
- required synthetic fixture-label prefix.

The window cannot enable production or general external writes. Writes outside
the time, count, tool, fixture, scope, or argument boundary fail closed.

## Idempotency and reconciliation

A confirmed idempotency key returns its prior receipt without another provider
call. Timeout, reset, malformed result, or ambiguous state is
`outcome_unknown`. The same write is blocked until reconciliation:

- confirmed: record authoritative receipt; do not repeat;
- absent: clear the ambiguity, then require a deliberate new attempt;
- still unknown: preserve the block and route to the reconciliation owner.

## Booking confirmation

A booking is confirmed only when the provider result contains:

- authoritative appointment ID;
- confirmed provider status;
- matching idempotency key;
- valid recorded timestamp;
- valid appointment start and time zone.

Missing appointment data is a receipt failure and must never be represented to
the visitor as booked.

## Cleanup

Every confirmed synthetic write is added to an in-memory cleanup ledger.
Cleanup runs in reverse creation order and reports attempted, deleted,
already-absent, failed, completion status, authorization ID, and timestamp.
Failed cleanup requires the named cleanup owner; it is not silently accepted.

## Safety

- tool-specific argument allowlists block secret, arbitrary-field, recipient,
  URL, pricing, and authority injection;
- the shared kill switch blocks reads and writes before transport;
- timeouts abort transport;
- receipts are validated before confirmation;
- evidence may include opaque sandbox IDs but no credentials or visitor data.
