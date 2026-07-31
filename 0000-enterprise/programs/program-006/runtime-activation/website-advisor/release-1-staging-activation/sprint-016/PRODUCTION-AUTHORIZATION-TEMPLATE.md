# Nova Production Authorization — Separate Decision Template

## Status

Default status: **NOT AUTHORIZED**

This document is intentionally separate from Release 1 staging closeout.

## Required decision fields

- Proposed production revision:
- Proposed production environment:
- Authorized provider mode:
- Data and privacy review reference:
- Security review reference:
- Load and reliability evidence reference:
- Monitoring and alerting owner:
- Incident and rollback owner:
- GHL or other external-write authorization:
- Website/DNS change authorization:
- Named approving authority:
- Approval date and time:
- Approval reference:
- Decision: authorized / denied

## Mandatory rule

Production remains denied unless every required control is reviewed and a named authorized operator records an explicit `authorized` decision with a separate approval reference.

A merge of Sprint 016 means only that the Release 1 staging program and its governance package are complete. It does not authorize public traffic, live providers, customer data, GHL writes, DNS changes, WordPress integration, or production credentials.
