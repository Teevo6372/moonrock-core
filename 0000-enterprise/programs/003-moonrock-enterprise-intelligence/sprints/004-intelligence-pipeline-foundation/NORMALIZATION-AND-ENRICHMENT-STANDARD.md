# Normalization and Enrichment Standard

## Purpose
Define how approved source data is converted into consistent, traceable enterprise information without obscuring original evidence.

## Canonicalization
Normalization maps source fields to governed canonical entities, attributes, identifiers, timestamps, units, statuses, and classifications.

## Required Controls
- Preserve raw values and source references
- Record transformation version
- Document field mappings
- Reject ambiguous destructive conversions
- Apply deterministic rules where possible
- Flag inferred or derived values distinctly

## Identity Resolution
Entity matching may use approved identifiers, normalized names, addresses, domains, repository paths, or source-specific keys. Probabilistic matches must include confidence and review status.

## Enrichment
Enrichment may add governed classifications, relationships, calculated indicators, reference data, or context. Every enrichment records method, input evidence, timestamp, version, and confidence.

## Data Quality
Normalization evaluates completeness, conformity, consistency, uniqueness, timeliness, and validity. Exceptions are routed to remediation or quarantine.

## Change Management
Canonical schemas and transformation rules are versioned. Breaking changes require impact assessment, migration planning, testing, and approval.

## Prohibited Behavior
The pipeline must not overwrite source evidence, present inferred values as source facts, conceal failed mappings, or silently discard material data.
