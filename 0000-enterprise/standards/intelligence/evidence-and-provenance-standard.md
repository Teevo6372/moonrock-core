# Evidence and Provenance Standard

## Purpose
Ensure every MEI conclusion can be traced to identifiable evidence and evaluated for quality, freshness, authority, and transformation history.

## Evidence Classes
- primary system record
- approved enterprise document
- external authoritative source
- derived metric
- analyst observation
- assumption or hypothesis

## Minimum Provenance Record
Each evidence item must include:
- evidence identifier
- source name and location
- source owner
- acquisition date
- effective date or observation window
- evidence class
- transformation or normalization steps
- access restrictions
- freshness status
- related analysis identifiers

## Quality Dimensions
Evidence is evaluated for:
- authority
- accuracy
- completeness
- consistency
- timeliness
- relevance
- reproducibility

## Rules
- assumptions cannot be represented as source evidence
- derived metrics must reference their inputs and calculation logic
- inaccessible or deleted evidence invalidates reproducibility and triggers review
- stale evidence must be labeled and may lower confidence
- restricted data must retain its original classification throughout the analytical lifecycle
- conflicting evidence must be preserved and disclosed rather than silently discarded

## Retention
Evidence references and transformation history must be retained at least as long as the analytical output remains active or relied upon.
