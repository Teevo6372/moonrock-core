# MEI Repository Intelligence Model

**Document ID:** MRE-MEI-RIM-001  
**Version:** 0.1.0  
**Status:** Implemented  
**Owner:** Moonrock Enterprises  
**Approved by:** Stephen Tyler Jr.  
**Effective date:** 2026-07-28

## Purpose

Define how MEI represents repository assets, relationships, evidence, health, and change signals.

## Core entities

- Repository
- Branch
- Pull request
- Commit
- File
- Directory
- Document
- Capability
- Decision
- Program
- Sprint
- Dependency
- Risk
- Control

## Intelligence layers

1. Inventory: what exists and where it is stored.
2. Classification: what each asset is and which domain owns it.
3. Relationship: how assets depend on, reference, or supersede one another.
4. Health: whether assets meet governance and maintenance expectations.
5. Change: what changed, why it changed, and what may be affected.
6. Insight: prioritized findings supported by traceable evidence.

## Evidence rules

Every finding must identify its source asset, observation time, extraction method, confidence level, and whether the finding is factual, inferred, or recommended.

## Operating principle

MEI may summarize and recommend, but it must not silently modify governed assets or treat inferred relationships as confirmed facts.