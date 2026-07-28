# MEI Event Processing Model

## Purpose
Define how meaningful changes are represented, processed, correlated, and retained within the Moonrock Enterprise Intelligence pipeline.

## Event Envelope
Each event includes event identifier, event type, source identifier, occurred-at time, received-at time, schema version, subject reference, correlation identifier, classification, provenance reference, and payload checksum.

## Event Categories
- Asset created, changed, moved, or retired
- Dependency introduced, changed, or removed
- Risk or control state changed
- Source health changed
- Data-quality threshold crossed
- Recommendation created, reviewed, approved, rejected, or closed

## Processing Rules
Events are validated before processing, handled idempotently, ordered within defined subject boundaries where required, and associated with evidence. Processing outcomes are observable and auditable.

## Correlation
Related events may be grouped by correlation identifier, business subject, repository asset, program, sprint, source, or bounded time window.

## Replay
Replay must preserve original event evidence, identify the processing version used, avoid duplicate side effects, and create a distinct audit record.

## Dead-Letter Handling
Events that cannot be processed after bounded retries enter a controlled dead-letter state with failure reason, owner, severity, evidence, and remediation status.

## Human Control
Events may trigger analysis or review tasks, but cannot independently authorize financial, legal, customer-impacting, production, or destructive actions.
