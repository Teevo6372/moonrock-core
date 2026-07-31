# Nova Website Advisor Release 1 Staging Activation — Sprint 006 Record

## Status

Complete for draft review as a provider-disconnected integrated staging
candidate. It is not approved for deployment or production.

## Delivered

- approved-source knowledge evidence builder;
- content and evidence SHA-256 hashes;
- freshness, ownership, approval, and conflict gates;
- immutable integrated staging release manifest;
- complete deployment-blocker decision;
- permanent Sprint 006 production denial;
- redacted observability sink and artifact verifier;
- ordered incident and rollback evidence recorder;
- zero-call-after-containment and zero-unknown-replay rules;
- provider-disconnected end-to-end conversation/fallback test;
- integrated privacy, security, accessibility, and operations checklist;
- candidate release and knowledge manifests.

## Verification

Run from `apps/nova-website-advisor-runtime`:

```text
npm run check
```

All exercises are local and synthetic. No provider SDK, network transport,
credential, real record, deployment, or production traffic is used.

## Unresolved blockers

- knowledge release-owner approval;
- model and GHL sandbox connection approvals;
- privacy, security, accessibility, and operations reviews;
- real alert/incident and rollback exercise evidence;
- deployment target and secret store selection/approval;
- operating and incident owner assignments.

## External posture

- providers: disconnected;
- credentials: absent;
- GHL/external writes: disabled;
- infrastructure/deployment: none;
- WordPress/DNS/production: unchanged.

## Next gate

A later limited-pilot decision sprint must define named owners, hours, data
boundary, support service level, traffic/cost/write limits, success/stop
criteria, production architecture, WordPress change/rollback plan, and human
executive go/no-go. No pilot or production activation is implied by merge.

## Rollback

Revert the Sprint 006 commit. No external cleanup is required.
