# GHL Data and Tool Contract

## 1. Status and boundary

Version: `1.0.0-draft`

This document maps Nova Website Advisor business actions to GHL objects. It contains no location ID, pipeline ID, calendar ID, user ID, token, webhook secret, or production field identifier.

Implementation must use documented HighLevel APIs and a least-privilege private integration or approved OAuth installation. The final authentication choice and scopes require security and CRM-owner approval.

## 2. Ownership

| Record | System of record | Create authority | Final business authority |
|---|---|---|---|
| Contact | GHL | Runtime after consent | Relationship owner |
| Consent evidence | Approved GHL/custom consent record | Runtime after affirmative action | Privacy/CRM owner |
| Opportunity | GHL | Runtime only at approved entry gate | Sales/relationship owner |
| Opportunity stage | GHL | Runtime limited to intake stages | Sales owner |
| Appointment | GHL calendar | Runtime after explicit request and consent | Calendar owner |
| Follow-up task | GHL | Runtime after route authorization | Assigned human |
| Conversation summary | GHL approved note/custom object | Runtime after allowed retention decision | Relationship owner |
| Raw transcript | Separate approved store by default | Disabled until approved | Privacy/records owner |

## 3. Configuration registry

Implementation must resolve symbolic names through environment-specific configuration:

| Symbol | Required mapping |
|---|---|
| `GHL_LOCATION` | Approved sub-account/location |
| `PIPELINE_NEW_BUSINESS` | Approved new-business pipeline |
| `STAGE_NOVA_INTAKE` | New — Nova Intake |
| `STAGE_HUMAN_REVIEW` | Human Review Required |
| `STAGE_DISCOVERY_REQUESTED` | Discovery Requested |
| `STAGE_DISCOVERY_BOOKED` | Discovery Booked |
| `STAGE_NURTURE` | Nurture |
| `CALENDAR_FLIGHT_PLAN` | Approved Flight Plan calendar |
| `OWNER_GENERAL` | General relationship owner/queue |
| `OWNER_PRIVACY` | Privacy queue |
| `OWNER_SECURITY` | Security queue |
| `OWNER_BILLING` | Billing queue |

Production identifiers remain in protected configuration and are never placed in prompts or browser responses.

## 4. Contact field contract

Use native fields where supported; add a custom field only after field inventory and approval.

| Logical field | Type | Required condition | Source |
|---|---|---|---|
| `first_name` | string | Booking or named follow-up when required | Visitor |
| `last_name` | string | Optional | Visitor |
| `email` | email | Email follow-up/notification | Visitor |
| `phone` | E.164 string | SMS/phone follow-up | Visitor |
| `company_name` | string | Optional | Visitor |
| `website_domain` | hostname | Optional | Visitor |
| `service_area` | string | Eligibility requires it | Visitor |
| `preferred_channel` | enum | Follow-up | Visitor |
| `lead_source` | constant | Contact create/update | `Website — Nova Advisor` |
| `source_page_path` | string | Required | Runtime |
| `utm_*` | bounded string | When present | Browser allowlist |
| `nova_conversation_id` | opaque ID | Required | Runtime |
| `existing_client` | enum | When assessed | `yes/no/unknown` |
| `data_quality_status` | enum | Required | Runtime |
| `disclosure_version` | string | Required | Runtime |
| `latest_consent_at` | timestamp | Consent exists | Runtime |

Unknown values remain unknown. The runtime must not populate inferred personal, budget, authority, or protected-class values.

## 5. Duplicate contract

Candidate search order:

1. exact normalized email;
2. exact normalized E.164 phone;
3. exact approved external/contact ID;
4. company domain plus human review.

Outcomes:

- **Zero candidates:** create if consent and purpose allow.
- **One high-confidence candidate:** update only allowlisted fields; preserve history.
- **Multiple or conflicting candidates:** do not merge; create a human-review task with minimal safe evidence.
- **Provider search unavailable:** do not create a likely duplicate automatically; use manual fallback.

The model never chooses the duplicate outcome.

## 6. Opportunity contract

Opportunity creation requires:

- saved-contact consent and valid contact ID;
- approved primary intent;
- route that meets pipeline entry criteria;
- no blocking privacy/security/legal escalation;
- deterministic policy authorization;
- idempotency key;
- assigned owner or review queue.

Allowed runtime-created stages:

- New — Nova Intake
- Human Review Required
- Discovery Requested
- Discovery Booked, only after appointment receipt
- Nurture, only when policy permits and a human route remains

Prohibited runtime-created stages:

- Qualified
- Disqualified
- Proposal
- Won
- Lost
- Closed or equivalent binding/final stage

Monetary value remains unset unless an approved human or current authoritative pricing process supplies it.

## 7. Tool contracts

### `find_contact_candidates`

- Type: read
- Consent: not required only for exact duplicate protection after the visitor voluntarily supplied a contact value for an authorized action
- Retry: bounded safe retry
- Returns: candidate IDs and match class only; no broad record dump

### `create_contact`

- Type: write
- Consent: `save_contact=granted`
- Idempotency: `sessionId:contactConsentVersion`
- Retry: reconcile before retry
- Receipt: GHL contact ID plus response timestamp

### `update_contact_with_consent`

- Type: write
- Consent: appropriate granted categories
- Preconditions: single high-confidence candidate
- Restriction: allowlisted fields only
- Retry: reconcile before retry

### `create_opportunity_for_review`

- Type: write
- Consent: saved contact and service follow-up
- Preconditions: approved entry gate and contact ID
- Idempotency: `sessionId:opportunityIntentVersion`
- Restriction: intake stages only

### `create_follow_up_task`

- Type: write
- Consent: channel/purpose appropriate
- Required: owner/queue, due date, public-safe summary
- Idempotency: `sessionId:routeVersion`

### `list_approved_slots`

- Type: read
- Calendar: allowlisted symbolic calendar only
- Retry: bounded safe retry
- Output: public slot start/end and time zone only

### `request_appointment`

- Type: write
- Consent: notification-channel consent required
- Required: contact ID, calendar, slot, time zone, action ID
- Idempotency: `sessionId:calendarId:slotStart`
- Retry: reconcile before retry
- Success receipt: authoritative appointment ID, confirmed status, start, time zone

### `record_conversation_summary`

- Type: write
- Consent: saved-contact purpose; transcript consent is separate
- Content: Sprint 001 structured summary only
- Prohibited: chain-of-thought, raw secrets, unredacted sensitive data, invented approval

### `record_consent_evidence`

- Type: write
- Required: consent schema-valid affirmative action or withdrawal
- Idempotency: `sessionId:category:disclosureVersion:actionId`
- Consent cannot authorize itself before the affirmative event is validated.

### `record_escalation`

- Type: write
- Required: approved route, severity, safe reason code, owner/queue
- Content: minimum necessary
- Critical routing failure must alert the runtime owner outside the failed path.

## 8. Receipt and outcome rules

`confirmed` requires:

- successful provider response;
- required authoritative object ID;
- expected object state;
- correlation to the idempotency key;
- local audit event.

An HTTP timeout, connection reset, malformed response, or missing ID is `outcome_unknown`, not `failed`. The runtime must query/reconcile before repeating a write.

Nova may tell a visitor only:

- confirmed facts from a valid receipt;
- that an action is pending;
- that the outcome could not be confirmed and a human/manual path is available.

## 9. Webhook contract

Webhooks are optional for Release 1 and require separate activation approval.

If used:

- verify documented authenticity mechanism;
- validate location and event allowlist;
- prevent replay with event ID/timestamp;
- store event correlation;
- treat payload as untrusted data;
- do not let a webhook expand Nova authority;
- reconcile against GHL before material state transition.

## 10. Acceptance

- Field mapping is approved against the actual GHL location.
- No duplicate custom fields are created.
- Every write has consent, authority, idempotency, receipt, retry, and manual behavior.
- Synthetic sandbox contract tests pass.
- No production identifier or credential is committed.
- CRM, privacy, security, and sales owners approve before implementation.

