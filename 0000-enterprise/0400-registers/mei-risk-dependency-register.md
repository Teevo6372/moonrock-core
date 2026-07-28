# MEI Risk and Dependency Register

**Document ID:** MRE-MEI-REG-002  
**Version:** 0.1.0  
**Status:** Implemented  
**Owner:** Moonrock Enterprises  
**Approved by:** Stephen Tyler Jr.  
**Effective date:** 2026-07-28

## Purpose

Record the initial risks and dependencies for Moonrock Enterprise Intelligence.

| ID | Type | Description | Initial control | Status |
|---|---|---|---|---|
| MEI-RSK-001 | Data quality | Source records may use inconsistent identifiers or definitions. | Require data contracts, stable IDs, and validation rules. | Open |
| MEI-RSK-002 | Security | Connected systems may expose confidential or sensitive data. | Apply least privilege, secret management, access review, and audit logging. | Open |
| MEI-RSK-003 | Automation | Recommendations could be mistaken for approved actions. | Separate advisory outputs from execution and require explicit authorization. | Open |
| MEI-RSK-004 | Source authority | Derived records may conflict with source systems. | Preserve source authority and document reconciliation rules. | Open |
| MEI-RSK-005 | Cost | Integration and model usage may create overlapping expenses. | Require cost estimates, reuse approved tools, and review recurring spend. | Open |
| MEI-DEP-001 | Governance | MEI depends on MBOS standards, quality gates, and decision governance. | Maintain references to Program 002 controls. | Active |
| MEI-DEP-002 | Ownership | Each domain and source requires a named operational owner. | Block production connection without ownership. | Active |
| MEI-DEP-003 | Platform access | Future integrations require approved developer access and credentials. | Address only in approved implementation sprints. | Pending |

## Review cadence

Review this register at each Program 003 sprint close and before any source system becomes Connected or Operational.
