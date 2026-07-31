# Nova Website Advisor Release 1 Staging Activation — Sprint 007 Record

## Status

Complete for draft review as a planning-only limited-pilot and production
decision package. No pilot or production activation occurred.

## Delivered

- typed candidate pilot plan and validation;
- hard Release 1 traffic, message, token, cost, and GHL-write caps;
- Central Time date/day/hour admission;
- prohibited-data and kill-switch admission controls;
- named-owner, retention, support, review, and launch-approval gates;
- support and incident acknowledgement targets;
- immediate-stop rules;
- minimum pilot evidence thresholds;
- human executive production-decision gate;
- production architecture and isolated WordPress integration plan;
- feature-flag and repository rollback procedure;
- pilot evidence runbook and candidate manifest;
- synthetic tests for readiness, time/data/usage admission, stop, and
  production decisions.

## Verification

Run from `apps/nova-website-advisor-runtime`:

```text
npm run check
```

No provider, infrastructure, browser, WordPress, GHL, credential, or real
visitor is used.

## Unresolved approvals

- all named human owners and coverage;
- exact pilot dates and staffed hours;
- retention policy;
- integrated staging release;
- provider/data-use/cost scopes;
- privacy, security, accessibility, CRM, operations, and support reviews;
- WordPress change and rollback evidence;
- pilot launch;
- eventual production executive decision.

## External posture

- pilot: not launched;
- production: not approved;
- providers/credentials/deployment: unchanged;
- GHL and external writes: disabled;
- WordPress/XStore/Elementor/DNS: unchanged.

## Next gate

Merge completes planning only. Before implementation or pilot execution, the
owner must decide whether to resolve the listed prerequisites, revise the
candidate window/caps, and authorize a distinct deployment/pilot work package.

## Rollback

Revert the Sprint 007 commit. No external cleanup is required.
