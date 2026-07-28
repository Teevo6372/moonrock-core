# Exchange Pattern Selection Standard

## Purpose
Govern selection of synchronous, asynchronous, scheduled, and file-based exchange patterns.

## Selection Criteria
Pattern decisions must consider business urgency, coupling tolerance, delivery guarantees, volume, ordering, provider limits, outage behavior, auditability, and operating cost.

## Approved Pattern Guidance
- Synchronous APIs: immediate request-response needs with bounded latency.
- Events and queues: decoupled processing, burst handling, and resilient delivery.
- Scheduled exchange: non-urgent batch synchronization with explicit windows.
- Managed file transfer: controlled bulk interchange when APIs or events are unsuitable.
- Webhooks: provider-originated notifications with signature verification and replay protection.

## Controls
Every selection must define source of truth, acknowledgement behavior, duplicate handling, ordering assumptions, timeout and retry policy, reconciliation method, and fallback process.