# MEI Data Ingestion Specification

## Purpose
Establish governed requirements for acquiring data from approved enterprise sources.

## Source Eligibility
A source must have an assigned owner, documented purpose, approved access method, data classification, update cadence, retention rule, and revocation path before ingestion is permitted.

## Ingestion Modes
- Scheduled batch
- Event-driven delivery
- Manual controlled import
- Repository scan
- Approved API retrieval

## Required Metadata
Each ingestion unit must record source identifier, acquisition timestamp, source timestamp when available, schema version, checksum, classification, owner, ingestion method, and correlation identifier.

## Validation
Pre-ingestion validation checks authorization, expected format, size limits, malware risk where applicable, duplicate status, required fields, and source integrity.

## Idempotency
Repeated delivery of the same ingestion unit must not create uncontrolled duplicate records. Checksums, source keys, and correlation identifiers support duplicate detection.

## Quarantine
Invalid, suspicious, incomplete, or unauthorized inputs enter quarantine. Quarantined data cannot proceed until reviewed, corrected, or rejected with an auditable disposition.

## Error Handling
Failures record stage, source, timestamp, severity, retry eligibility, evidence, and responsible owner. Retries must be bounded and observable.

## Privacy and Security
Collection is limited to the minimum data required for the approved purpose. Sensitive fields require classification-aware handling, access control, and retention enforcement.
