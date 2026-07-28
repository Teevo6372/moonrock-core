# Interface Design Standard

## Purpose
Establish consistent, reviewable design requirements for enterprise interfaces.

## Requirements
Every interface must define owner, consumers, transport, direction, authentication boundary, data classification, availability target, latency expectation, volume assumptions, and failure behavior.

Interfaces must use explicit request, response, event, or file contracts. Hidden side effects, undocumented dependencies, and direct production coupling are prohibited.

## Design Principles
- Prefer loose coupling and bounded responsibilities.
- Use stable identifiers and deterministic correlation IDs.
- Separate transport concerns from business semantics.
- Require idempotency where duplicate delivery is possible.
- Define timeouts, limits, and cancellation behavior.
- Preserve human approval for high-impact outcomes.

## Review Gate
No interface may advance to implementation until architecture, security, ownership, and operational-support reviews are recorded.