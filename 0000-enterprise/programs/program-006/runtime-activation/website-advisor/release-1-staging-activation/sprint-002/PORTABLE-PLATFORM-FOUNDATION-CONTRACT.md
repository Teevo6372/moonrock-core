# Nova Website Advisor Release 1 — Portable Platform Foundation Contract

## Purpose

Sprint 002 converts the approved Sprint 001 architecture into a portable,
provider-disconnected build and runtime foundation. It does not select a hosting
vendor, create infrastructure, resolve secrets, connect a provider, or deploy.

## Build contract

The container build:

- uses the repository root as build context;
- pins the Node.js 22 runtime family;
- installs from the committed lockfile;
- compiles TypeScript in a build stage;
- prunes development dependencies before the runtime stage;
- copies only compiled code, production dependencies, synthetic fixtures,
  prototype assets, and the controlling model-output schema;
- runs as the unprivileged `node` user;
- exposes the runtime port without publishing it;
- includes a liveness health check;
- contains no credential or provider endpoint;
- defaults external adapters to disconnected.

Build command after an approved container-capable environment exists:

```text
docker build \
  --file apps/nova-website-advisor-runtime/Dockerfile \
  --tag nova-website-advisor:staging-candidate \
  .
```

This command is documentation, not deployment authorization.

## Bind and ingress contract

Local execution defaults to `127.0.0.1`. The container explicitly sets
`NOVA_BIND_HOST=0.0.0.0` so an approved platform ingress can reach it. Public
exposure still requires platform TLS, exact origin policy, request limits,
network controls, and deployment approval.

## Configuration loading

Staging configuration is a bounded JSON document loaded only from an explicitly
allowed filesystem root. The loader:

- resolves canonical paths;
- rejects traversal/out-of-root files;
- enforces a 64 KiB default limit;
- requires valid JSON;
- delegates to the Sprint 001 fail-closed staging validator;
- accepts only opaque secret references;
- never resolves or logs secret values.

A later platform adapter may load the same validated object from a managed
configuration service. It may not weaken the contract.

## Dependency health

The registry records safe dependency state and reason codes. A critical
dependency in `degraded` or `unavailable` state closes readiness. Intentionally
`disconnected` providers do not prevent the provider-disconnected foundation
from starting, and never imply provider activation. External writes remain
false in every snapshot.

## Event streaming

The runtime supports:

- public-safe event projection only;
- session-scoped subscriptions;
- snapshot SSE compatibility;
- opt-in live SSE via `?follow=1`;
- bounded per-consumer queues;
- explicit `stream.reset` on backpressure overflow;
- cancellation cleanup;
- no raw message, transcript, contact, secret, or private reasoning content.

Production ingress must additionally validate proxy buffering, idle timeout,
connection limits, heartbeat cadence, reconnect behavior, and horizontal
fan-out before the integrated staging sprint.

## Provider-disconnected invariant

Sprint 002 adds no model or GHL SDK and makes no external provider request.
Containerization, durable interfaces, migrations, configuration, health, and
streaming do not expand Nova's authority or enable writes.
