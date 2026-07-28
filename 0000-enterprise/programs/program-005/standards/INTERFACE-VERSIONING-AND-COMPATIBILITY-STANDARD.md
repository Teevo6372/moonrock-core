# Interface Versioning and Compatibility Standard

## Purpose
Control interface evolution without unmanaged consumer disruption.

## Versioning Rules
Contracts must carry an identifiable version and use a documented compatibility policy. Additive changes must not alter existing field meaning. Breaking changes require a new major version or separately governed replacement interface.

## Change Process
Producers must document affected consumers, migration steps, testing evidence, release timing, rollback path, and support window. Consumers must acknowledge readiness before removal of a supported contract.

## Deprecation
Deprecation notices must identify replacement guidance, owner, effective date, support deadline, and unresolved dependencies. Retirement requires evidence that approved consumers have migrated or accepted a documented exception.

## Emergency Changes
Emergency modifications must preserve audit evidence, use the smallest safe scope, and receive retrospective review.