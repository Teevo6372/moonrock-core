# MBOS Versioning Standard

**Document ID:** MRE-STD-VRS-001  
**Version:** 1.0.0  
**Status:** Implemented  
**Owner:** Moonrock Enterprises  
**Approved by:** Stephen Tyler Jr.  
**Effective date:** 2026-07-28

## Purpose

Define consistent versioning for MBOS standards, governed documents, templates, and releases.

## Semantic versioning

Use `MAJOR.MINOR.PATCH`.

- MAJOR: incompatible governance, structure, or operating-model change.
- MINOR: backward-compatible capability, section, or requirement addition.
- PATCH: clarification, correction, formatting repair, or non-material update.

## Pre-release versions

Draft and review artifacts may use `0.x.y`. Version `1.0.0` or later indicates an approved baseline.

## Revision requirements

Each version change must identify the date, author or owner, summary of change, approval status, and related pull request or decision when applicable.

## Repository releases

Repository release tags use `vMAJOR.MINOR.PATCH`. Product releases and MBOS releases may advance independently when their scopes are clearly identified.

## Prohibited practices

Do not overwrite a released version without recording the change, reset version numbers after migration, or use dates as a substitute for version identity.
