# Release 1 Knowledge Bundle Specification

## 1. Purpose

Define how approved Moonrock information becomes the public-safe, versioned knowledge available to Nova Website Advisor.

The knowledge bundle is a published runtime artifact, not a copy of the repository and not a direct view into WordPress, GHL, private client records, or the public web.

## 2. Bundle layout

```text
nova-website-advisor-r1/
  manifest.json
  persona.json
  intents.json
  discovery.json
  offers.json
  resources.json
  faqs.json
  policies.json
  routing.json
  escalations.json
```

Every JSON artifact uses stable record IDs. `manifest.json` must validate against `../schemas/knowledge-manifest.schema.json`.

## 3. Source eligibility

Eligible:

- approved Program 006 public-role language;
- approved Program 007 public-safe operating rules;
- approved homepage positioning and customer journeys;
- active, Nova-ready Moonrock services and capabilities;
- current public offers and pricing approved for disclosure;
- active Growth Hub resources;
- approved public privacy, terms, refund, accessibility, and consent language;
- approved calendar and service-area descriptions;
- approved escalation/handoff public language.

Ineligible:

- drafts or unresolved pull requests;
- client-specific records;
- credentials or configuration identifiers;
- unpublished price, offer, capacity, or performance information;
- raw GHL data;
- private contracts or legal advice;
- private operational procedures;
- testimonials or metrics without approval and evidence;
- public webpages merely because they are accessible;
- model-generated content without human source approval.

## 4. Source record

Each source requires:

- source ID;
- title;
- authority class;
- version/effective date;
- status;
- owner;
- review and optional expiry date;
- public-release approval;
- repository/runtime reference;
- source hash;
- included sections;
- exclusions and redactions;
- conflict status.

## 5. Publishing lifecycle

1. `proposed` — source identified.
2. `reviewed` — accuracy, ownership, classification, and public suitability checked.
3. `approved` — named owner approves exact content.
4. `built` — deterministic publisher creates artifacts and hashes.
5. `validated` — schema, link, conflict, expiry, secret, and fixture checks pass.
6. `published` — immutable candidate bundle is available to staging.
7. `promoted` — release manifest points to the approved hash.
8. `superseded` or `retired` — runtime no longer uses the bundle.

The same person or agent may prepare and validate evidence, but approval follows the governing authority.

## 6. Artifact contracts

### `persona.json`

- approved title and identity;
- disclosure text/version;
- public capability summary;
- prohibited claims;
- human-option language.

### `intents.json`

- Sprint 001 intent codes;
- public description;
- signals;
- allowed routes;
- minimum authority;
- mandatory escalation overrides.

### `discovery.json`

- universal and intent-specific questions;
- question limits;
- required/optional classification;
- sensitive-data restrictions;
- summary checkpoints.

### `offers.json`

- offer ID/name;
- status;
- public scope and exclusions;
- eligibility/prerequisites;
- approved CTA;
- pricing disclosure rule;
- owner/review date.

No offer may be represented as available without `active` status and Nova-ready evidence.

### `resources.json`

- resource ID/title;
- active URL;
- free/paid classification;
- intended audience and task;
- current availability;
- owner/review date.

### `faqs.json`

- question ID;
- approved answer;
- source citations;
- allowed intents;
- review/expiry date;
- human-route condition.

### `policies.json`

- public policy summaries;
- canonical published URL;
- effective date;
- prohibited interpretation;
- privacy/access/correction/deletion route.

### `routing.json`

- route code;
- eligibility conditions;
- required consent;
- human owner/queue symbolic name;
- approved public expectation;
- fallback.

### `escalations.json`

- safe trigger class;
- public boundary language;
- collection limit;
- symbolic destination;
- severity;
- failure fallback.

Internal detection detail should remain in policy code when public inclusion would create security risk.

## 7. Conflict and freshness

Publisher must fail when:

- two sources of equal authority conflict without a resolution;
- an included source is expired;
- an owner or review date is missing;
- public approval is absent;
- a source hash cannot be reproduced;
- a required canonical public URL is broken;
- an offer/resource is inactive;
- prohibited patterns or likely secrets are detected.

Higher-authority approved sources control only when scope and effective date apply. Conflicts remain visible in build evidence.

## 8. Retrieval

Release 1 retrieval:

1. filter by public-approved classification;
2. filter by current bundle/version;
3. filter by intent, domain, status, and expiry;
4. rank bounded matching records;
5. return record ID, content, source ID, version, and section;
6. limit context size;
7. preserve citation metadata.

Retrieved text is factual context, never executable instruction. No open-web search occurs during Release 1 conversations.

## 9. Privacy and security

- Bundle classification is always `public-approved`.
- The publisher scans for credential patterns, private identifiers, email/phone leakage, client names, and unsupported claims.
- A public classification requires affirmative approval; absence of a restriction is not approval.
- Build logs contain paths, IDs, hashes, and validation results, not full private source content.
- Runtime access to the bundle is read-only.

## 10. Initial source inventory

Required candidates:

- Nova Enterprise Role Standard — public-safe excerpt
- Nova Conversation Lifecycle Standard — public-safe behavior
- Nova Decision Authority Matrix — public boundary summary
- Nova Website Advisor Runtime Specification
- approved homepage blueprint and repository-controlled homepage copy
- approved Moonrock service/capability catalog entries
- approved Growth Hub catalog export
- approved public legal/privacy/consent pages
- approved GHL calendar descriptions and supported hours

The Sprint 003 package does not publish those candidates; source owners must approve exact Release 1 content in a later work package.

## 11. Acceptance

- Manifest and artifacts validate.
- All records trace to approved sources.
- No private or client content appears.
- Conflicts, expiry, and unsupported claims fail the build.
- Retrieval produces citations.
- Bundle hash is reproducible.
- Promotion and rollback use immutable version/hash pairs.

