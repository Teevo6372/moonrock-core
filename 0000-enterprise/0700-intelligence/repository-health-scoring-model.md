# MEI Repository Health Scoring Model

**Document ID:** MRE-MEI-RHS-001  
**Version:** 0.1.0  
**Status:** Implemented  
**Owner:** Moonrock Enterprises  
**Approved by:** Stephen Tyler Jr.  
**Effective date:** 2026-07-28

## Purpose

Define a transparent method for assessing repository governance and maintenance health.

## Score dimensions

| Dimension | Weight |
|---|---:|
| Ownership and lifecycle metadata | 20% |
| Documentation compliance | 20% |
| Link and reference integrity | 15% |
| Dependency clarity | 15% |
| Test and validation evidence | 15% |
| Release and change traceability | 15% |

## Rating bands

- 90–100: Healthy
- 75–89: Managed
- 60–74: At Risk
- Below 60: Critical

## Scoring rules

Scores must be reproducible from visible evidence. Missing evidence scores as unknown or incomplete, not as compliant. Critical security or secret-exposure findings override the aggregate score and require immediate escalation.

## Output requirements

Each assessment must show the total score, dimension scores, supporting evidence, unresolved unknowns, priority findings, and recommended owner actions.

## Limitations

The score is an operational indicator, not proof that a repository is secure, legally compliant, or production-ready.