# Nova Website Advisor Release 1 Staging Activation — Sprint 003

## Objective

Create the provider-disconnected model sandbox, exact release manifest, and
synthetic evidence required to evaluate a model safely before any staging
credential or billable provider call is authorized.

## Approved scope

- OpenAI Responses request contract;
- strict structured-output enforcement;
- privacy-safe input preparation;
- timeout, retry, concurrency, token, request-rate, and circuit-breaker controls;
- prompt, policy, schema, and model release version binding;
- synthetic functional, failure, injection, and release-gate tests;
- static fallback and rollback definition.

## Explicit exclusions

This sprint does not:

- obtain, store, or use an API key;
- make an OpenAI or other provider request;
- approve the candidate model for staging;
- enable the model sandbox by default;
- connect or alter GHL;
- deploy infrastructure, WordPress, DNS, or production code;
- enable model tools or external writes.

## Exit gate

Sprint 003 is complete when the adapter and release manifest are
implementation-ready, the complete local suite passes, and a draft pull
request is approved. Provider connection remains a separate, explicit gate.
