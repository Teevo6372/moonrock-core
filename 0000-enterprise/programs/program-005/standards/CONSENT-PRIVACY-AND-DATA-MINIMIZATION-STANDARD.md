# Consent, Privacy, and Data Minimization Standard

## Purpose
Limit integrated data processing to approved, necessary, transparent, and legally supportable purposes.

## Core Controls
- Every integration must document the business purpose, data subjects, data categories, source, destination, and lawful or contractual basis.
- Only data necessary for the approved purpose may be collected, transferred, stored, or exposed.
- Sensitive and regulated data requires explicit classification and enhanced approval.
- Consent-dependent processing must preserve consent status, scope, timestamp, source, withdrawal, and downstream propagation requirements.
- Secondary use, enrichment, profiling, or onward transfer requires separate review.
- Interfaces must avoid exposing confidential fields through broad payloads, logs, errors, test fixtures, or analytics.
- Non-production data must be synthetic, masked, or otherwise approved.

## Privacy Review
A privacy review is required when an integration introduces new personal-data categories, new recipients, cross-border transfers, automated profiling, or materially changed purposes.

## Data Subject Controls
Where applicable, designs must support access, correction, deletion, restriction, portability, and consent withdrawal without breaking auditability.

## Evidence
Required evidence includes the data inventory, purpose statement, minimization decision, consent model, privacy review, field-level mapping, and approved exceptions.