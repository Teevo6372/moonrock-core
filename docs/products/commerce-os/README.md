---
title: Moonrock Commerce OS
version: 0.1.0
status: MVP FOUNDATION
owner: Moonrock Enterprises
---

# Moonrock Commerce OS

## Product Vision

Moonrock Commerce OS is an AI-assisted operating system that helps Moonrock identify, evaluate, acquire, list, fulfill, and improve commerce opportunities across suppliers and marketplaces.

It should answer seven operational questions:

1. Should we buy this product?
2. What is the best acquisition source?
3. What is the true landed cost?
4. Where should it be sold?
5. What price and shipping model should be used?
6. What profit and ROI should be expected?
7. What happened after the sale, and what should improve next time?

## MVP Scope

The initial MVP is internal and focused on Magic: The Gathering arbitrage and resale operations.

Included:

- product and opportunity intake
- normalized product records
- supplier offer comparison
- acquisition cost tracking
- marketplace fee estimation
- shipping cost estimation
- expected profit and ROI calculation
- confidence and risk flags
- buy/no-buy recommendation
- listing preparation data
- inventory status
- realized outcome tracking

Not included in the first MVP:

- autonomous purchasing
- autonomous price changes
- unrestricted marketplace publishing
- customer-facing multi-vendor marketplace
- broad category optimization before MTG validation

## Core Modules

### Opportunity Engine

Captures potential products from manual entry, files, supplier sources, retail observations, or future integrations.

### Product Normalization

Creates a consistent product identity across supplier and marketplace records.

### Supplier Engine

Compares source, availability, unit cost, condition, quantity, shipping, tax, and acquisition constraints.

### Profit Engine

Calculates:

- landed cost
- marketplace fees
- payment fees
- promoted listing expense
- shipping expense
- packaging expense
- expected gross profit
- expected net profit
- ROI
- break-even price
- minimum acceptable sale price

### Decision Engine

Returns a recommendation with reasons, assumptions, confidence, and risk flags. Human approval remains required for purchases during MVP.

### Listing Engine

Prepares marketplace-ready titles, descriptions, attributes, images checklist, price guidance, shipping policy, and channel recommendations.

### Inventory and Outcome Engine

Tracks acquired quantity, location, listing status, sale outcome, actual expenses, realized profit, sell-through time, and lessons learned.

## Initial Decision Rules

The MVP should support configurable thresholds rather than hard-coded universal rules. Initial fields include:

- minimum net profit
- minimum ROI
- maximum capital exposure
- minimum confidence
- maximum acceptable days-to-sale
- condition requirements
- channel restrictions
- inventory concentration limits

## Data Principles

- preserve source evidence and timestamps
- distinguish estimates from actuals
- show calculation assumptions
- make recommendations explainable
- maintain an audit trail for manual overrides
- never store secrets in source control

## Human Approval Boundaries

Human approval is required for:

- purchases
- publishing listings during early MVP
- price changes outside configured ranges
- destructive inventory changes
- supplier credential changes
- marketplace credential changes

## MVP Success Metrics

- estimate accuracy versus realized profit
- opportunities reviewed per hour
- percentage of recommended buys that achieve threshold profit
- average days to sale
- inventory turnover
- listing preparation time
- capital at risk
- margin after all expenses

## Expansion Path

After the MTG workflow is validated, the platform may expand to:

- Pokémon
- Disney Lorcana
- sports cards
- electronics
- wholesale products
- retail arbitrage
- Moonrock-owned inventory
- Moonrock Marketplace catalog operations

## Implementation Sequence

1. Product requirements and glossary
2. Data model and calculation specification
3. Profit Engine with tests
4. Manual opportunity intake
5. Decision Engine
6. Inventory and outcome tracking
7. Supplier connectors
8. Marketplace connectors
9. AI-assisted listing preparation
10. controlled automation