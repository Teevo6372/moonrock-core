# Interface Contract Standard

## Purpose
Define the minimum specification required for every API, webhook, event, file, queue, or scheduled-exchange interface.

## Contract Requirements
- Stable interface identifier and owner
- Business purpose and authorized consumers
- Request, response, event, or file schema
- Required and optional fields
- Data types, validation, and allowed values
- Authentication and authorization expectations
- Versioning and compatibility policy
- Idempotency and duplicate-handling behavior
- Timeout, retry, and rate-limit behavior
- Error model and correlation identifiers
- Data classification, retention, and audit requirements
- Deprecation and retirement process

## Change Rules
Breaking changes require a new major contract version, impact assessment, migration window, consumer notice, test evidence, and approval before promotion.

## Evidence
Approved contracts must be stored with examples, ownership metadata, review history, and testable acceptance criteria.