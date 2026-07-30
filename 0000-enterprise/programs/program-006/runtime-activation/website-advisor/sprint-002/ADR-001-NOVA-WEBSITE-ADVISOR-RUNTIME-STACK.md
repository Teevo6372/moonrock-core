---
title: ADR-001 — Nova Website Advisor Runtime Stack
status: Proposed
date: 2026-07-30
decision_owner: Moonrock Marketing
supersedes: None
---

# ADR-001 — Nova Website Advisor Runtime Stack

## Context

The Moonrock homepage runs on WordPress with the XStore child theme. Nova Website Advisor needs governed AI conversation, approved knowledge, GHL contact/opportunity/booking integration, consent evidence, and safe failure behavior.

Direct browser-to-provider integration would expose credentials and allow client-side code to approach protected systems without a reliable policy boundary. Direct implementation inside WordPress would combine public content delivery, secrets, conversation state, model orchestration, and CRM writes in one failure and maintenance domain.

Release 1 must remain simple, low-cost, reversible, and compatible with the current website while preserving Nova's N0–N2 authority.

## Decision

Adopt a thin-client, server-orchestrated architecture:

1. Keep the approved WordPress/XStore implementation as the presentation layer.
2. Add a small accessible Nova client only after implementation approval.
3. Place all model, knowledge, policy, consent, GHL, session, and audit behavior behind a Moonrock-controlled TypeScript runtime.
4. Prefer Cloudflare Workers for the runtime, subject to account, pricing, data, and operational approval.
5. Use the OpenAI Responses API behind a provider adapter.
6. Evaluate `gpt-5.4-mini` as the initial Release 1 model candidate; select and pin a production model only after the approved evaluation suite passes.
7. Expose narrow business tools to the orchestrator; never expose generic provider APIs to the model.
8. Keep GHL authoritative for consented business records and appointments.
9. Use a published, immutable, public-safe knowledge bundle; disable open-web retrieval in Release 1.
10. Make static website CTAs the default fallback and independent rollback path.

## Rationale

- Preserves the working website and WooCommerce environment.
- Keeps provider secrets off the browser and WordPress.
- Creates one enforceable policy and audit boundary.
- Allows GHL to remain the CRM/calendar source of truth.
- Supports provider replacement through adapters.
- Enables explicit rate, cost, consent, idempotency, and kill controls.
- Avoids making an AI model the authority for business state.
- Supports independent rollback without taking the website offline.
- Reuses current or already contemplated infrastructure before adding overlapping services.

## Alternatives considered

### A. GHL-native chat/conversation AI only

Benefits:

- fewer custom components;
- native CRM and calendar proximity;
- potentially faster initial setup.

Not selected as the baseline because Sprint 001 requires a versioned knowledge hierarchy, deterministic authority engine, detailed consent separation, prompt-injection controls, source traceability, and provider-independent evaluation evidence. GHL-native functionality may still be evaluated as a lower-complexity alternative before WP-4 if it demonstrably satisfies every requirement.

### B. WordPress plugin performs model and GHL calls

Benefits:

- one hosting environment;
- familiar deployment surface.

Rejected because it places secrets, model orchestration, conversation state, CRM writes, and public CMS risk in the same operational domain and makes independent shutdown and scaling harder.

### C. Browser calls OpenAI and GHL directly

Benefits:

- minimal server code.

Rejected because protected credentials and policy enforcement cannot be safely entrusted to the public client.

### D. Full multi-agent platform

Benefits:

- advanced delegation and tracing.

Deferred because Release 1 is a bounded N0–N2 website advisor. Multi-agent orchestration would add cost and complexity without an approved requirement.

### E. Voice/Realtime-first runtime

Benefits:

- richer Nova experience.

Deferred. Sprint 001 excludes voice and movement from Release 1. Text establishes the governance, knowledge, consent, handoff, and CRM foundation that later channels can reuse.

## Consequences

Positive:

- clear separation of concerns;
- safer secrets and authority controls;
- reusable API and GHL adapters;
- provider and model version flexibility;
- measurable and testable release unit;
- independent degraded modes and rollback.

Costs:

- Moonrock must own a small runtime service;
- additional contract and integration testing is required;
- GHL field, consent, and duplicate behavior must be mapped carefully;
- operations ownership and alert response must be assigned;
- a non-production environment is required.

## Approval conditions

This ADR becomes accepted only when:

- the Sprint 002 PR is approved and merged;
- the preferred host/current-stack review is approved;
- privacy, data retention, provider use, and spend controls are approved;
- no higher-authority Moonrock standard conflicts with the decision.

Acceptance of this ADR does not authorize production deployment.

## Revisit triggers

Reconsider this decision if:

- GHL-native capabilities satisfy every approved requirement with materially lower total cost;
- the preferred runtime host cannot meet data, cost, security, or operational requirements;
- WordPress architecture materially changes;
- a model/provider change alters required API or data controls;
- voice, authenticated-client support, payments, or N3/N4 authority enters scope;
- pilot evidence shows unacceptable reliability, safety, cost, or maintenance burden.

