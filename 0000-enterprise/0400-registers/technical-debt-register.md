# Technical Debt Register

**Document ID:** MBOS-REG-TDR-001  
**Program:** 002 — MBOS Alpha Implementation  
**Sprint:** 001  
**Version:** 0.1.0  
**Lifecycle Status:** Implemented

| ID | Category | Item | Business Impact | Priority | Status |
|---|---|---|---|---|---|
| TDR-001 | Documentation | Reconcile legacy documentation with MBOS metadata requirements. | Improves searchability and governance consistency. | High | Open |
| TDR-002 | Documentation | Identify and consolidate duplicate guidance across enterprise and product documentation. | Reduces conflicting instructions. | High | Open |
| TDR-003 | Automation | Add validation for required document metadata. | Prevents non-compliant documents from entering governed branches. | Medium | Open |
| TDR-004 | Automation | Add internal-link validation to CI. | Reduces broken navigation and stale references. | Medium | Open |
| TDR-005 | Governance | Formalize archival and retention criteria. | Protects traceability while controlling clutter. | Medium | Open |
| TDR-006 | Release | Define an MBOS release cadence independent of application releases. | Allows standards to evolve without coupling to product deployments. | Medium | Open |
| TDR-007 | Architecture | Complete file-level dependency mapping for protected production assets. | Reduces migration and refactoring risk. | High | Open |

## Rules

- Debt items are tracked, not silently corrected outside an approved sprint.
- Critical production risks must be escalated immediately.
- Closing an item requires evidence in a commit, pull request, decision record, or release record.