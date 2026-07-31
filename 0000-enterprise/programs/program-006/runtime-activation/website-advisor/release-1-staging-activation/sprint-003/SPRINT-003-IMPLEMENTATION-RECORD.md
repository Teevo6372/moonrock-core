# Nova Website Advisor Release 1 Staging Activation — Sprint 003 Record

## Status

Complete for draft review. The model remains provider-disconnected, disabled,
uncredentialed, and undeployed.

## Delivered

- transport-injected OpenAI Responses adapter;
- strict JSON Schema request and post-response validation;
- redacted and bounded visitor/knowledge context;
- privacy-safe stable safety identifier;
- storage-disabled, tool-disconnected request contract;
- timeout, safe-retry, concurrency, request, token, and circuit controls;
- exact-model release-manifest validation;
- candidate release record with immutable asset hashes;
- synthetic success, failure, refusal, injection-boundary, budget, retry,
  concurrency, circuit, and approval-gate tests;
- documented promotion, fallback, and rollback sequence.

## Verification

Run from `apps/nova-website-advisor-runtime`:

```text
npm run check
```

The suite uses no network transport and creates no billable request.

## External posture

- provider/API: selected in candidate architecture, not connected;
- candidate model: `gpt-5.6-terra`, not approved or invoked;
- credentials: absent;
- storage: disabled;
- model tools and external writes: disabled;
- GHL, WordPress, DNS, infrastructure, and production: unchanged;
- deployment: not authorized.

## Next gate

Sprint 004 may prepare the controlled evaluation harness and operator evidence
workflow after this pull request is approved. A live provider evaluation still
requires separate approval of the data-use terms, secret store, staging
budget, and exact release candidate.

## Rollback

Revert the Sprint 003 commit. No external cleanup is required.
