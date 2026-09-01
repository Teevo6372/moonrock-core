# Nova Managed Site Reference

Non-production reference application for ADR 0005 and the Nova-managed website pilot.

## Purpose

This app proves the first provider-neutral slice before Claude Code, Higgsfield, or a deployment provider is wired into Nova. It keeps routine business content in typed structured data, renders that data through reusable site components, and defines deterministic change-risk policy.

## Commands

```bash
npm install
npm run typecheck
npm test
npm run build
```

## Current boundaries

- No production customer domain.
- No WordPress or Elementor changes.
- No Claude Code provider call yet.
- No Higgsfield provider call yet.
- No automatic production deployment.
- No secrets or customer data.

## Pilot change examples

- `Change Saturday hours from 8-2 to 8-4` -> low risk / auto eligible after a bounded change is parsed.
- `Redesign the homepage layout` -> moderate risk / preview required.
- `Move my DNS and change the payment account` -> high risk / operator review.

## Next slice

Add a request parser/orchestration service that converts customer-style Nova requests into `SiteChangeRequest`, then introduce replaceable Claude Code and Higgsfield adapters behind that contract. A managed preview provider is selected only after local/CI validation is green.
