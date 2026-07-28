# Enterprise Integration Reference Architecture

## Architecture Principles
- Contract first
- Least privilege
- Explicit ownership
- Environment separation
- Idempotent and replay-safe behavior where applicable
- Observable execution and traceable data movement
- Human approval for high-impact actions

## Logical Layers
1. Source and destination systems
2. Adapters and connectors
3. Integration gateway and policy enforcement
4. Transformation and validation
5. Event, queue, and scheduling services
6. Monitoring, audit, and evidence services

## Integration Patterns
- Request and response APIs
- Webhooks
- Event publication and subscription
- Managed file exchange
- Scheduled synchronization
- Queue-based asynchronous processing
- Human-reviewed batch import and export

## Required Controls
Each integration must define an owner, purpose, systems, data classes, contract version, authentication method, authorization scope, retry behavior, failure handling, retention, monitoring, rollback or disablement method, and approval state.

## Prohibited Assumptions
No integration may treat credentials, endpoint availability, data quality, consent, authority, or downstream reversibility as implied.