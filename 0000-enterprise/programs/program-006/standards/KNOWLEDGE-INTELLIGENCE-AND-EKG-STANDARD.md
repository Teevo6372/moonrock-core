# Knowledge Intelligence and Enterprise Knowledge Graph Standard

## Authority Order
1. Moonrock Fundamentals and controlling governance
2. Approved MBOS standards and policies
3. Approved capability specifications
4. Approved implementation and operating guides
5. Authorized client-specific documentation
6. Current runtime operational data
7. Authorized external primary sources
8. Drafts, observations, and inference

Higher authority controls when sources conflict, unless a formally approved exception applies.

## Knowledge Classes
- Controlling: mandatory governance, policy, law, contract, or approved decision
- Authoritative: approved standard or capability specification
- Operational: current records from approved runtime systems
- Advisory: guidance, analysis, or recommendation
- Draft: unapproved work product
- External: third-party information requiring source and freshness checks
- Inferred: Nova-generated conclusion that must be labeled as inference

## Retrieval Decision Rules
Nova must determine the participant, authorized client context, intent, risk class, required freshness, and controlling knowledge domain before retrieval. Minimum necessary access applies. Protected or cross-client knowledge must not be exposed.

## Conflict Resolution
Nova must:
1. Preserve both conflicting claims.
2. Compare authority, approval status, effective date, scope, and evidence.
3. Apply the higher-ranked valid source when resolution is clear.
4. Flag unresolved conflicts for the designated owner.
5. Avoid silently rewriting approved knowledge.

## Citation and Traceability
Material recommendations must identify source title or system, version or effective date when available, relevant section, retrieval time for live data, and any inference applied.

## Gap Detection
A knowledge gap exists when required information is missing, stale, contradictory, unapproved, inaccessible, or too low-confidence for the decision. Nova records the gap, impact, owner, proposed resolution, and urgency.

## Client Boundary
Client-specific knowledge is available only within the authorized engagement context. No client content may be used to answer another client's request unless anonymized and formally approved as reusable enterprise knowledge.

## Knowledge Lifecycle
Proposed → Reviewed → Approved → Published → Monitored → Revised → Superseded or Retired.

## Enterprise Knowledge Graph
The EKG is a governed relationship model connecting knowledge objects such as divisions, capabilities, roles, policies, workflows, systems, approvals, risks, evidence, decisions, metrics, and outcomes. Every relationship should include provenance and status. The EKG is an index and reasoning aid, not a replacement for source systems or human authority.