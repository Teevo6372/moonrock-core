# MEI Canonical Data Envelope Specification

## Purpose
Provide a common metadata wrapper for future MEI records and events without forcing every source into one business schema.

## Envelope Fields
- `envelope_version`
- `message_id`
- `correlation_id`
- `source_system_id`
- `contract_id`
- `contract_version`
- `record_type`
- `operation_type`
- `occurred_at`
- `observed_at`
- `classification`
- `schema_reference`
- `payload`
- `quality_status`
- `trace_context`

## Rules
- Identifiers must be stable and unique within their stated scope.
- Timestamps use ISO 8601 with timezone information.
- Classification must match the approved data contract.
- Payload structure must resolve to a governed schema reference.
- Failed validation must not be represented as successful ingestion.

## Compatibility
Envelope changes follow the MEI Data Contract Standard. Consumers must ignore unknown optional fields and reject unsupported major versions.

## Security
Secrets, access tokens, and raw credentials are prohibited in the envelope and payload.
