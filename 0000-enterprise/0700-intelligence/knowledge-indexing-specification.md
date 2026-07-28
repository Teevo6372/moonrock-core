# MEI Knowledge Indexing Specification

**Document ID:** MRE-MEI-KIS-001  
**Version:** 0.1.0  
**Status:** Implemented  
**Owner:** Moonrock Enterprises  
**Approved by:** Stephen Tyler Jr.  
**Effective date:** 2026-07-28

## Purpose

Define how governed repository knowledge may be prepared for search, retrieval, summarization, and evidence-backed AI assistance.

## Indexable content

- Approved enterprise documentation
- Architecture decisions
- Program and sprint records
- Capability and dependency records
- Product specifications
- Repository metadata
- Public code and configuration that contains no secrets

## Excluded content

Credentials, tokens, private keys, executed private agreements, regulated personal data, unnecessary customer records, and content prohibited by governance or contract must not be indexed.

## Index record requirements

Each indexed record must retain Asset ID, source path, source commit, content type, owner, lifecycle status, version, observation date, access classification, and retrievable evidence boundaries.

## Retrieval controls

Responses must identify authoritative sources, distinguish current from superseded content, preserve uncertainty, and avoid combining conflicting records without disclosure.

## Refresh and invalidation

Index entries must be refreshed when source commits change and invalidated when assets are archived, access classification changes, or source integrity cannot be verified.

## Acceptance criteria

A future indexing implementation must support source traceability, permission-aware retrieval, duplicate detection, lifecycle filtering, and reproducible evidence citations.