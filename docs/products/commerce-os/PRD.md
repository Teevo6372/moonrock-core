---
title: Moonrock Commerce OS MVP Product Requirements
version: 0.1.0
status: APPROVED
owner: Moonrock Enterprises
---

# Moonrock Commerce OS MVP Product Requirements

## Objective

Build an internal decision-support application that helps Moonrock evaluate Magic: The Gathering resale opportunities before capital is committed, prepare accurate listings, track inventory, and compare expected results with actual outcomes.

## Primary User

The MVP is designed for a Moonrock operator who sources, evaluates, lists, ships, and reviews resale inventory. It is not customer-facing and does not make purchases or publish listings without human approval.

## Core User Journey

1. Create or import an opportunity.
2. Identify the product and its condition.
3. enter one or more supplier offers.
4. enter or retrieve expected marketplace prices.
5. calculate landed cost, fees, shipping, profit, ROI, and break-even price.
6. review confidence, risks, and the buy/no-buy recommendation.
7. approve, reject, or defer the opportunity.
8. convert an approved opportunity into inventory.
9. prepare a marketplace listing.
10. record the sale and actual expenses.
11. compare estimated and realized performance.

## Functional Requirements

### Opportunity Intake

The system must allow manual creation of an opportunity with:

- product name
- category
- set or release
- collector or catalog number when applicable
- condition
- language
- quantity
- source URL or source note
- source timestamp
- supporting evidence

### Product Identity

The system must maintain a normalized product record and permit multiple supplier offers and marketplace observations to reference the same product.

For MTG products, the model should support:

- card or sealed product
- set code
- collector number
- finish
- rarity
- condition
- language
- grading status

### Supplier Offers

Each offer must support:

- supplier
- unit price
- available quantity
- supplier shipping
- estimated tax
- discounts
- minimum order requirement
- condition
- evidence URL
- observed timestamp
- expiration timestamp when known

### Market Observations

Each observation must support:

- marketplace
- listing or sold-comparable type
- observed price
- shipping charged to buyer
- item condition
- quantity represented
- promoted-listing assumption
- evidence URL
- observed timestamp

### Profit Analysis

The system must calculate and display:

- acquisition subtotal
- inbound shipping allocation
- tax allocation
- packaging cost
- landed cost
- expected sale revenue
- marketplace fee
- payment-processing fee when separate
- promoted-listing expense
- outbound shipping cost
- other variable costs
- expected net profit
- ROI
- net margin
- break-even sale price
- minimum acceptable sale price

Every result must show its assumptions and distinguish estimates from actuals.

### Decision Support

The system must return one of:

- BUY
- REVIEW
- PASS

The recommendation must include:

- reason codes
- failed or passed thresholds
- confidence score
- risk flags
- required human action

The operator can override the recommendation but must record a reason.

### Inventory

Approved opportunities can create inventory lots. Each lot must track:

- product
- acquisition date
- acquired quantity
- remaining quantity
- actual landed cost
- storage location
- status
- linked listings
- linked sales

### Listing Preparation

The MVP must prepare, but not autonomously publish:

- listing title
- description draft
- product attributes
- condition notes
- required image checklist
- recommended price
- minimum price
- shipping policy recommendation
- promoted-listing recommendation

### Sales and Outcome Tracking

The system must record:

- sale price
- buyer-paid shipping
- actual marketplace fees
- actual promoted fee
- actual outbound shipping
- refunds or adjustments
- sale date
- quantity sold
- realized net profit
- realized ROI
- days to sale

## Configurable Business Rules

The operator must be able to configure:

- minimum net profit
- minimum ROI
- minimum net margin
- maximum capital exposure per opportunity
- maximum inventory concentration per product
- maximum target days to sale
- minimum confidence score
- default packaging cost
- default shipping cost or shipping profiles
- marketplace fee profiles
- promoted-listing rates

Initial Moonrock defaults may reflect current eBay assumptions, including a 13 percent fee, a 7 dollar shipping estimate, and a 30 percent ROI target, but these values must remain configurable and must not be hard-coded as universal rules.

## Non-Functional Requirements

- monetary calculations use decimal arithmetic, never binary floating point
- timestamps are stored in UTC and displayed in the operator's local timezone
- calculations are deterministic and testable
- every recommendation is explainable
- manual overrides are auditable
- secrets are stored outside source control
- external integrations degrade gracefully
- the first usable workflow must work with manual data entry

## Out of Scope

- autonomous purchasing
- autonomous repricing
- unrestricted marketplace publishing
- customer accounts
- multi-vendor marketplace functionality
- tax filing or accounting-system replacement
- broad-category optimization before MTG validation

## MVP Success Criteria

The MVP is successful when an operator can evaluate an MTG opportunity, understand every cost assumption, approve or reject it, convert it to inventory, prepare a listing, record a sale, and compare expected profit with realized profit without relying on a separate spreadsheet.
