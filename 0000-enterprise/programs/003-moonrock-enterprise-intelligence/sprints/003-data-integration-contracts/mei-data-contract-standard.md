# MEI Data Contract Standard

## Purpose
Establish the minimum agreement required between a source owner and Moonrock Enterprise Intelligence before data may be consumed.

## Required Contract Fields
- Contract ID
- Source-system ID
- Data owner
- Technical steward
- Business purpose
- Authorized consumers
- Schema version
- Classification and sensitivity
- Refresh or event cadence
- Availability target
- Quality thresholds
- Retention requirement
- Failure and escalation path
- Effective date and review date

## Versioning
Contracts use semantic versioning. Breaking schema, meaning, or authorization changes require a major version. Backward-compatible additions require a minor version. Clarifications require a patch version.

## Ownership
The source owner approves meaning and authorized use. The technical steward maintains delivery and schema behavior. MEI governance approves enterprise consumption.

## Change Control
No contract change becomes effective until impact, compatibility, quality, security, and rollback considerations are recorded.

## Exceptions
Exceptions require a documented owner, justification, compensating control, expiration date, and approval under enterprise decision and exception governance.
