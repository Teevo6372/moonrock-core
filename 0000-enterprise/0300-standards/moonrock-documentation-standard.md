# Moonrock Documentation Standard (MDS)

**Document ID:** MRE-STD-MDS-001  
**Version:** 1.0.0  
**Status:** Implemented  
**Owner:** Moonrock Enterprises  
**Approved by:** Stephen Tyler Jr.  
**Effective date:** 2026-07-28

## Purpose

MDS defines the minimum structure, metadata, review controls, and maintenance expectations for governed Moonrock documentation.

## Required metadata

Every governed document must include:

- Document ID
- Title
- Version
- Lifecycle status
- Owner
- Approver or approval authority
- Effective date
- Repository path

## Required content controls

A governed document must state its purpose, scope, exclusions where relevant, requirements or decisions, dependencies, acceptance criteria, and revision history.

## Lifecycle states

Allowed states are Draft, In Review, Approved, Implemented, Operational, Superseded, and Archived.

## Writing rules

- Use direct, testable language.
- Separate requirements from recommendations.
- Avoid duplicate sources of truth.
- Reference authoritative documents by Document ID and repository path.
- Never include credentials, secrets, executed private agreements, or unnecessary client personal data.

## Change control

Material changes require a new version, documented revision entry, review against dependencies, and approval through the applicable program or release process.

## Compliance

A document is MDS-compliant only when its metadata is complete, lifecycle state is valid, internal references resolve, ownership is assigned, and the document is stored in its governed repository location.
