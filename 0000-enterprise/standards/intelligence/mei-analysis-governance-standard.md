# MEI Analysis Governance Standard

## Purpose
Establish mandatory controls for analytical outputs produced within Moonrock Enterprise Intelligence.

## Analytical Lifecycle
Every governed analysis must pass through:
1. question definition
2. source identification
3. evidence collection
4. method selection
5. analysis execution
6. validation
7. confidence assignment
8. human review when required
9. publication or escalation
10. retention and reassessment

## Required Metadata
Each analytical output must record:
- analysis identifier
- owner
- business question
- source systems and evidence references
- method or rule set
- assumptions
- confidence level
- materiality level
- reviewer and approval state
- created and reviewed timestamps
- superseded or expiration status

## Control Rules
- unsupported conclusions may not be published as facts
- material recommendations require traceable evidence
- conflicts between sources must be disclosed
- assumptions must be distinguishable from observed evidence
- expired or superseded analyses must not be presented as current
- automated outputs remain advisory unless a separately approved control grants execution authority

## Review Triggers
Human review is mandatory when an output:
- could affect customers, employees, finances, legal obligations, security, or production systems
- has low or disputed confidence
- relies on incomplete or stale evidence
- recommends irreversible action
- exceeds delegated authority

## Exceptions
Exceptions require a documented decision, owner, rationale, duration, risk treatment, and approval under the Decision and Exception Governance Standard.
