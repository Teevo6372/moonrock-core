# Artifact Lifecycle Standard

**Document ID:** MRE-STD-ALS-001  
**Version:** 1.0.0  
**Status:** Implemented  
**Owner:** Moonrock Enterprises  
**Approved by:** Stephen Tyler Jr.  
**Effective date:** 2026-07-28

## Purpose

Define the permitted lifecycle states and transition controls for governed Moonrock artifacts.

## States

| State | Meaning |
|---|---|
| Draft | Work is incomplete and not approved for use. |
| In Review | Work is complete enough for formal evaluation. |
| Approved | Content is authorized but may not yet be deployed. |
| Implemented | Approved content has been introduced into the governed environment. |
| Operational | The artifact is actively used and supported. |
| Superseded | A newer approved artifact replaces it. |
| Archived | Retained for history and no longer active. |

## Transition controls

- Draft to In Review requires completed required metadata.
- In Review to Approved requires named approval authority.
- Approved to Implemented requires implementation evidence.
- Implemented to Operational requires acceptance validation.
- Operational to Superseded requires a successor reference.
- Superseded to Archived requires retention confirmation.

## Prohibited practices

Artifacts may not skip required approval, be silently replaced, be deleted solely because they are obsolete, or remain Operational without an owner.
