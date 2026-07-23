---
title: Moonrock Commerce OS MVP Data Model
version: 0.1.0
status: APPROVED
owner: Moonrock Enterprises
---

# Moonrock Commerce OS MVP Data Model

## Principles

- Product identity is separate from supplier offers and market observations.
- Estimates are separate from actual transactions.
- Money is stored as integer minor units or exact decimal values with an ISO currency code.
- Source evidence, timestamps, and calculation versions are preserved.
- Records use stable IDs and soft deletion where audit history matters.

## Core Entities

### Product

Represents the normalized item.

Required fields:

- id
- product_type: `single_card | sealed_product | accessory | other`
- name
- category
- condition
- language
- created_at
- updated_at

MTG extension fields:

- set_name
- set_code
- collector_number
- finish
- rarity
- grading_company
- grade

A unique identity key should be derived from the material identity fields rather than the display name alone.

### Opportunity

Represents a possible acquisition decision.

Fields:

- id
- product_id
- status: `draft | evaluating | approved | rejected | deferred | acquired | closed`
- target_quantity
- source_note
- recommendation
- confidence_score
- operator_decision
- override_reason
- created_at
- evaluated_at
- decided_at

### Supplier

Fields:

- id
- name
- supplier_type
- website
- active

### SupplierOffer

Fields:

- id
- opportunity_id
- supplier_id
- unit_price
- quantity_available
- inbound_shipping_total
- estimated_tax_total
- discount_total
- other_acquisition_cost
- minimum_order_value
- condition
- evidence_url
- observed_at
- expires_at
- currency

### Marketplace

Fields:

- id
- name
- fee_profile_id
- active

### MarketObservation

Fields:

- id
- product_id
- marketplace_id
- observation_type: `active_listing | sold_comparable | price_guide | manual_estimate`
- item_price
- buyer_shipping
- quantity
- condition
- evidence_url
- observed_at
- confidence

### FeeProfile

Fields:

- id
- marketplace_id
- name
- percentage_fee
- fixed_fee
- fee_base: `item_only | item_plus_shipping | order_total`
- payment_percentage
- payment_fixed_fee
- effective_from
- effective_to

### ShippingProfile

Fields:

- id
- name
- carrier
- service
- estimated_cost
- packaging_cost
- maximum_weight
- domestic_only

### Analysis

An immutable snapshot of a calculation.

Fields:

- id
- opportunity_id
- calculation_version
- selected_supplier_offer_id
- selected_market_observation_id
- assumptions_json
- acquisition_subtotal
- inbound_shipping
- tax
- discount
- packaging
- landed_cost
- expected_item_revenue
- expected_buyer_shipping
- marketplace_fee
- payment_fee
- promoted_fee
- outbound_shipping
- other_variable_cost
- expected_net_profit
- roi_percent
- net_margin_percent
- break_even_price
- minimum_acceptable_price
- recommendation
- reason_codes
- risk_flags
- confidence_score
- created_at

### InventoryLot

Fields:

- id
- product_id
- source_opportunity_id
- acquired_at
- quantity_acquired
- quantity_available
- actual_acquisition_subtotal
- actual_inbound_shipping
- actual_tax
- actual_discount
- actual_landed_cost
- storage_location
- status

### ListingDraft

Fields:

- id
- inventory_lot_id
- marketplace_id
- title
- description
- attributes_json
- condition_notes
- image_checklist_json
- recommended_price
- minimum_price
- buyer_shipping
- promoted_rate
- status: `draft | approved | published | retired`
- external_listing_id

### Sale

Fields:

- id
- inventory_lot_id
- listing_draft_id
- marketplace_id
- quantity
- sold_at
- item_revenue
- buyer_shipping
- marketplace_fee
- payment_fee
- promoted_fee
- outbound_shipping
- packaging
- refund_amount
- other_adjustment
- realized_net_profit
- realized_roi_percent
- days_to_sale

### DecisionOverride

Fields:

- id
- opportunity_id
- original_recommendation
- operator_decision
- reason
- created_at
- created_by

## Relationships

- Product has many Opportunities.
- Opportunity has many SupplierOffers and Analyses.
- Product has many MarketObservations.
- An approved Opportunity may create one or more InventoryLots.
- InventoryLot has many ListingDrafts and Sales.
- FeeProfile and ShippingProfile are versioned configuration inputs.

## Suggested MVP Persistence

Use a relational database with migrations. PostgreSQL is preferred for production. SQLite may be used for local prototyping only when the application layer avoids database-specific assumptions.

## Audit Requirements

The system must retain:

- the calculation version
- the exact assumptions used
- source timestamps and URLs
- recommendation reason codes
- operator overrides
- expected versus actual amounts

No historical Analysis should be modified after creation. Recalculation creates a new Analysis record.
