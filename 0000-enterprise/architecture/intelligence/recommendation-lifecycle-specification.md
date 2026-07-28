# MEI Recommendation Lifecycle Specification

## States
1. Draft
2. Evidence Pending
3. Ready for Review
4. Approved
5. Rejected
6. Deferred
7. Implemented
8. Validated
9. Superseded
10. Closed

## Required Recommendation Record
- recommendation identifier
- analysis and evidence references
- owner
- proposed action
- intended outcome
- confidence and materiality levels
- assumptions and dependencies
- risks and controls
- reviewer and approval record
- target and expiration dates
- implementation status
- outcome-validation evidence

## Transition Controls
- Draft recommendations cannot be represented as approved work.
- Ready for Review requires complete evidence references and classification.
- Approved requires authority consistent with the Human Review and Approval Matrix.
- Implemented status requires an execution record; approval alone is not evidence of implementation.
- Validated requires measurable outcome evidence.
- Deferred recommendations must include a reconsideration trigger or date.
- Superseded records must link to the replacement recommendation.

## Expiration
Recommendations expire when their evidence, assumptions, decision window, or business context is no longer current. Expired recommendations require reassessment before use.

## Automation Boundary
MEI may assist with drafting, classification, routing, and status reporting. It may not execute material actions unless a separate approved workflow explicitly defines authority, controls, rollback, and audit evidence.
