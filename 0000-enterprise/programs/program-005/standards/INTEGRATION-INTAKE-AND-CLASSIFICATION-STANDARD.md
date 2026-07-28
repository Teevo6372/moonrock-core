# Integration Intake and Classification Standard

## Purpose
Provide a controlled entry process for proposed integrations before design or implementation begins.

## Required Intake Fields
- Business purpose and expected outcome
- Accountable business and technical owners
- Source and destination systems
- Data and event categories
- Trigger and frequency
- Direction of exchange
- Customer, financial, legal, employment, or destructive impact
- Required credentials and permissions
- Failure consequences and manual fallback
- Estimated volume, cost, and service dependency

## Risk Classes
- Class I: internal, read-only, low sensitivity
- Class II: operational exchange with limited reversible writes
- Class III: sensitive data or material customer impact
- Class IV: financial, legal, employment, security-critical, destructive, or broadly irreversible action

## Decision Rules
Class III and IV proposals require documented human review, explicit approval boundaries, stronger evidence, and a controlled pilot. Class IV actions may not be autonomously authorized by this standard.

## Intake Outcomes
A proposal may be accepted for design, returned for clarification, deferred, rejected, or escalated for exception review.