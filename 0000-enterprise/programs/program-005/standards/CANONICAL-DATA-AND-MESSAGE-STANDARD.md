# Canonical Data and Message Standard

## Purpose
Define common rules for payloads exchanged across Moonrock systems.

## Contract Requirements
Each message must identify its schema version, producer, event or operation type, creation time, correlation ID, business entity identifiers, and data classification.

Required and optional fields must be explicit. Units, currencies, time zones, enumerations, null behavior, precision, and validation rules must be documented.

## Governance
Canonical models should represent shared business meaning without exposing one system's private storage model. Extensions must be namespaced and reviewed.

Sensitive data must be minimized. Secrets, authentication tokens, and unnecessary personal information must not appear in business payloads.

## Quality Controls
Schema validation, sample payloads, ownership, retention expectations, and provenance requirements must be defined before implementation.