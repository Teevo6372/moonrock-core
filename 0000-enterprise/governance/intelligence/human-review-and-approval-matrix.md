# Human Review and Approval Matrix

## Purpose
Define minimum human oversight for MEI outputs based on confidence, materiality, and action type.

| Scenario | Minimum Review | Approval Authority | Automated Execution |
|---|---|---|---|
| C1 / M1 exploration | Analyst self-review | Analysis owner | Prohibited |
| C2 / M1-M2 recommendation | Peer review | Capability owner | Prohibited |
| C3 / M2 reversible internal action | Peer or control-owner review | Delegated operational owner | Only under a separately approved workflow |
| C3 / M3 significant recommendation | Independent review | Program or business owner | Prohibited by default |
| C4 / M3 action proposal | Independent and control-owner review | Executive delegate | Only with explicit implementation approval |
| Any M4 output | Independent, legal/security/finance review as applicable | Executive authority | Prohibited unless separately governed and expressly authorized |

## Mandatory Escalation Conditions
- evidence conflict remains unresolved
- confidence is below the materiality threshold
- the action is irreversible
- authority is unclear
- policy or legal interpretation is required
- customer, employee, safety, security, or regulated data may be affected

## Reviewer Responsibilities
Reviewers must confirm evidence traceability, method suitability, disclosed assumptions, confidence assignment, materiality classification, and alignment with delegated authority.

## Separation of Duties
For M3 and M4 decisions, the analysis author may not serve as the sole approver.
