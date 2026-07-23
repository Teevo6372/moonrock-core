# Moonrock Commerce OS MVP Product Requirements

- Version: 0.1.0
- Status: Approved for implementation planning
- Owner: Moonrock Enterprises
- Initial operator: Stephen Tyler Jr.

## Problem

Moonrock evaluates resale opportunities using fragmented marketplace research, supplier data, fee estimates, shipping assumptions, and manual judgment. This makes decisions slow, inconsistent, difficult to audit, and hard to improve after a sale.

## MVP Goal

Create an internal application that converts a candidate MTG product into an explainable buy, watch, or reject recommendation using configurable profit, ROI, risk, and sell-through assumptions.

## Primary User

The initial user is a Moonrock operator sourcing and reselling Magic: The Gathering products on eBay and related channels.

## Core User Journey

1. Create or select a normalized product.
2. Enter a supplier offer and acquisition details.
3. Enter or import expected marketplace sale data.
4. Review landed cost, fees, shipping, net profit, ROI, break-even price, and risk flags.
5. Receive a Buy, Watch, or Reject recommendation with reasons and confidence.
6. Approve or override the recommendation with a recorded reason.
7. Track inventory, listing, sale, actual expenses, and realized outcome.
8. Compare estimated versus actual results.

## Functional Requirements

### Product Records

The system must store category, game, product type, set, name, identifiers, condition, language, edition, and notes. It must allow multiple supplier and marketplace records to map to one normalized product.

### Opportunity Intake

The system must support manual opportunity entry. Required inputs include source, unit cost, quantity, condition, source URL or evidence, expected sale price, expected shipping charged to buyer, and estimated days to sale.

### Profit Engine

The system must calculate:

- acquisition subtotal
- inbound shipping
- sales tax or acquisition tax
- packaging cost
- outbound shipping
- marketplace fee
- payment fee when separate
- promoted listing cost
- other variable cost
- total landed cost
- total selling cost
- expected revenue
- expected net profit
- ROI on cash invested
- margin on revenue
- break-even sale price
- minimum sale price required to satisfy configured thresholds

All assumptions and rates must be visible and configurable.

### Decision Engine

The system must return one of:

- Buy
- Watch
- Reject
- Insufficient Data

The recommendation must include reasons, failed thresholds, warnings, confidence, and a timestamp. Human approval is required before a purchase is recorded.

### Inventory and Outcomes

The system must track acquired quantity, storage location, acquisition date, listing status, listing channel, listing price, sale date, sale price, actual fees, actual shipping, actual profit, days held, and operator notes.

### Audit Trail

The system must record recommendation inputs, calculation version, overrides, material field changes, and operator identity.

## Initial Configurable Defaults

These are seeded values, not permanent universal rules:

- eBay fee assumption: 13 percent
- domestic outbound shipping assumption: 7 USD
- minimum target ROI: 30 percent
- minimum target net profit: configurable per opportunity class
- promoted listing rate: configurable from 0 to 30 percent
- currency: USD

## Nonfunctional Requirements

- Internal-only authentication for MVP
- Desktop and mobile-responsive interface
- Calculations reproducible from stored inputs
- No secrets in source control
- Database migrations under version control
- Automated unit tests for calculation and decision rules
- Clear distinction between estimates and actuals
- Exportable opportunity and outcome data

## Out of Scope

- Autonomous purchasing
- Autonomous price changes
- Automatic marketplace publishing without approval
- Customer-facing multi-vendor marketplace
- Broad non-MTG optimization
- Automated supplier scraping that violates source terms

## Success Criteria

The MVP is successful when an operator can evaluate an opportunity in under three minutes, reproduce every recommendation, and compare estimated net profit with realized net profit after sale.

## Acceptance Criteria

- A complete opportunity produces all required financial outputs.
- Missing critical data produces Insufficient Data rather than a fabricated recommendation.
- Fee, shipping, and promotion assumptions can be changed without code changes.
- Threshold failures are shown individually.
- Manual overrides require a reason.
- Estimated and actual results remain separately stored.
- Profit Engine unit tests cover normal, zero-profit, loss, free-shipping, buyer-paid shipping, promoted-listing, and multi-quantity cases.
