---
title: Moonrock Contribution Guide
document: CONTRIBUTING.md
version: 1.0.0
status: PRODUCTION
owner: Moonrock Marketing
repository: moonrock-core
author: Moonrock Product Team
last_updated: 2026-07-16
---

# Contributing

## Purpose

This document defines the standards for creating, reviewing, approving, and maintaining documentation within Moonrock Core.

Every contribution should improve the quality, consistency, and scalability of the repository.

---

# Core Principles

Moonrock documentation exists to support implementation.

Every document should be:

- Clear
- Actionable
- Version controlled
- Implementation-ready
- Understandable without chat history

Documentation is considered a production asset.

---

# Production Workflow

Every document follows this lifecycle:

Planning

↓

Production Draft

↓

Review

↓

Approved

↓

Locked

↓

Git Commit

↓

Implementation

↓

Release

↓

Revision

---

# Repository Standards

All production documents should include, where appropriate:

- YAML front matter
- Purpose
- Business Objective
- Emotional Objective
- Requirements
- Acceptance Criteria
- Version information

Use Markdown (`.md`) for all documentation.

---

# Versioning

Moonrock follows Semantic Versioning.

## Major Version

Breaking architectural or structural changes.

Example:

```text
2.0.0
```

## Minor Version

New functionality or significant additions.

Example:

```text
1.1.0
```

## Patch Version

Corrections, refinements, or documentation updates.

Example:

```text
1.0.1
```

---

# Review Process

Before approval, verify:

- Correct filename
- Proper Markdown formatting
- Logical heading hierarchy
- Consistent terminology
- No duplicate content
- Acceptance criteria included where applicable
- Links and references validated

Every production document should be reviewed before committing.

---

# Commit Standards

Each commit should clearly communicate:

- What changed
- Why it changed
- Files affected
- Version impact (if applicable)

Example summary:

```text
Add production CONTRIBUTING guide
```

Commit descriptions should provide additional context when useful.

---

# Repository Rules

- Never modify a locked production document without creating a new version.
- Never introduce undocumented architecture.
- Never duplicate production documents.
- Avoid feature creep during an active sprint.
- Keep one source of truth for every topic.
- Preserve approved repository structure unless an architectural decision is made.

---

# File Naming

Use lowercase with hyphens for project documentation.

Examples:

```text
homepage-blueprint.md
launch-assessment.md
growth-assessment.md
moonrock-flight-plan.md
nova-training.md
```

Use uppercase for repository-standard documents.

Examples:

```text
README.md
CONTRIBUTING.md
STYLE-GUIDE.md
CHANGELOG.md
```

Avoid filenames such as:

```text
homepage-final.md
homepage-new.md
final-version.md
latest.md
```

Git history preserves previous versions.

---

# Branch Strategy

Current repository workflow:

```text
main
```

The `main` branch contains approved production work.

Additional branches may be introduced when the project requires collaborative development.

---

# Definition of Done

A document is complete when:

- It fulfills its stated purpose.
- It is implementation-ready.
- It has been reviewed.
- It has been approved.
- It has been committed to GitHub.
- It can be understood without additional explanation.

---

# Moonrock Standard

Every contribution should improve one or more of the following:

- Customer Experience
- Documentation Quality
- Implementation Simplicity
- Scalability
- Business Value
- Decision Confidence

If work does not support the current sprint, it belongs in the backlog rather than production.

---

## Document Status

**Version:** 1.0.0

**Status:** PRODUCTION

**Review State:** Locked