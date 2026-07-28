# MEI Repository Asset Schema

**Document ID:** MRE-MEI-RAS-001  
**Version:** 0.1.0  
**Status:** Implemented  
**Owner:** Moonrock Enterprises  
**Approved by:** Stephen Tyler Jr.  
**Effective date:** 2026-07-28

## Purpose

Define the minimum normalized fields used to describe repository assets within MEI.

## Required fields

- Asset ID
- Asset type
- Name
- Repository path or GitHub reference
- Owning domain
- Lifecycle status
- Version where applicable
- Responsible owner
- Last observed commit
- Last observed date
- Classification source
- Confidence level

## Relationship fields

Assets may record parent, child, dependency, dependent, reference, supersedes, superseded-by, implements, governs, and evidence relationships.

## Data-quality controls

- Asset IDs must be stable and unique.
- Repository paths must be exact and case-sensitive.
- Unknown values must remain explicitly unknown.
- Inferred ownership or relationships require a confidence value and evidence reference.
- Secrets, credentials, private agreements, and unnecessary personal data must not be indexed.

## Change handling

An asset path change does not create a new identity when purpose remains unchanged. Material purpose changes require a new Asset ID and a documented predecessor relationship.