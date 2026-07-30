# Sprint 003 — Runtime Contracts and Knowledge Foundation

## Objective

Convert the approved Sprint 001 product definition and Sprint 002 architecture into versioned, machine-validatable contracts for implementation.

## Deliverables

| Artifact | Purpose |
|---|---|
| `contracts/openapi.yaml` | Public runtime HTTP and streaming contract |
| `schemas/model-output.schema.json` | Strict model proposal contract |
| `schemas/event-envelope.schema.json` | Operational event envelope |
| `schemas/consent-record.schema.json` | Granular consent evidence |
| `schemas/knowledge-manifest.schema.json` | Published knowledge-bundle manifest |
| `integrations/GHL-DATA-CONTRACT.md` | GHL object, field, method, receipt, and reconciliation contract |
| `prompts/SYSTEM-PROMPT-SPECIFICATION.md` | Versioned instruction package and prompt assembly rules |
| `knowledge/RELEASE-1-KNOWLEDGE-BUNDLE-SPECIFICATION.md` | Approved-source publishing and retrieval contract |
| `evaluations/EVALUATION-FIXTURE-CATALOG.md` | Contract, conversation, safety, injection, and failure evaluation plan |

## Scope boundaries

Sprint 003:

- defines contracts and fixtures;
- creates no executable runtime;
- uses no credentials or secret values;
- creates no GHL fields, workflows, contacts, opportunities, or appointments;
- modifies no WordPress or production asset;
- sends no OpenAI request;
- authorizes no deployment.

## Contract precedence

1. Program 006 and Program 007 controlling standards
2. Sprint 001 runtime product specification
3. Sprint 002 technical architecture and approved ADR
4. Sprint 003 contracts
5. Future implementation code and configuration

Implementation must not reinterpret a contract to expand Nova's authority.

## Versioning

- Public API: semantic version in path and OpenAPI metadata.
- JSON Schema: stable `$id` plus semantic version in artifact path or release manifest.
- Prompt: immutable prompt package version.
- Knowledge: immutable bundle version and SHA-256 content hash.
- GHL mapping: contract version tied to location and pipeline configuration review.
- Evaluations: fixture-set version tied to prompt, policy, knowledge, and model release.

Breaking contract changes require a new major version and migration decision. Additive optional fields require a minor version. Clarifications with no behavior change require a patch version.

## Sprint acceptance

- All JSON documents parse and all JSON Schemas pass metaschema validation.
- OpenAPI YAML parses and contains no secret or production identifier.
- Required Sprint 001 fields and Sprint 002 endpoints are traceable.
- Model output remains advisory and cannot encode external success as authority.
- Consent is granular and never inferred from conversation activity.
- GHL writes require deterministic authorization, idempotency, and receipts.
- Knowledge publishing rejects unapproved, expired, private, or conflicting sources.
- Evaluation fixtures cover normal, boundary, injection, failure, and recovery behavior.
- No production or provider mutation occurs.
- Owner approval is required before merge and before Sprint 004 implementation.

