# Commerce OS MVP Data Model

- Version: 0.1.0
- Status: Approved for implementation planning

## Design Principles

- Use stable internal identifiers.
- Preserve source evidence and timestamps.
- Separate normalized products from channel-specific records.
- Separate estimates from actual financial outcomes.
- Record calculation and decision versions.
- Keep all operator overrides auditable.

## Core Entities

### users

- id
- email
- display_name
- role
- status
- created_at
- updated_at

Initial roles: owner, operator, viewer.

### products

- id
- category
- game
- product_type
- name
- set_name
- manufacturer
- language
- edition
- condition_default
- release_date
- notes
- created_at
- updated_at

### product_identifiers

- id
- product_id
- identifier_type
- identifier_value
- source
- created_at

Examples: TCGplayer product ID, UPC, SKU, set code, collector number.

### suppliers

- id
- name
- supplier_type
- website_url
- status
- notes
- created_at
- updated_at

### supplier_offers

- id
- product_id
- supplier_id
- external_offer_id
- source_url
- condition
- unit_cost
- available_quantity
- minimum_quantity
- inbound_shipping_total
- estimated_tax_total
- other_cost_total
- currency
- observed_at
- expires_at
- evidence_reference
- created_at
- updated_at

### marketplaces

- id
- name
- channel_type
- status
- fee_profile_id
- created_at
- updated_at

### fee_profiles

- id
- name
- marketplace_fee_rate
- marketplace_fee_fixed
- payment_fee_rate
- payment_fee_fixed
- promoted_listing_rate_default
- fee_basis_notes
- effective_from
- effective_to
- created_at

### market_observations

- id
- product_id
- marketplace_id
- listing_type
- condition
- observed_price
- shipping_price
- sold_status
- sold_date
- source_url
- observed_at
- evidence_reference
- created_at

### opportunities

- id
- product_id
- supplier_offer_id
- target_marketplace_id
- status
- quantity
- expected_unit_sale_price
- buyer_shipping_revenue_per_unit
- outbound_shipping_per_order
- packaging_cost_per_order
- other_selling_cost_per_order
- estimated_days_to_sale
- capital_exposure
- created_by
- created_at
- updated_at

Statuses: draft, evaluated, approved, rejected, purchased, closed.

### calculation_runs

- id
- opportunity_id
- formula_version
- input_snapshot_json
- assumption_snapshot_json
- acquisition_total
- landed_cost_per_unit
- expected_gross_revenue
- expected_selling_cost
- expected_net_profit
- roi
- margin
- break_even_price
- minimum_acceptable_price
- warnings_json
- created_at

### decision_runs

- id
- opportunity_id
- calculation_run_id
- ruleset_version
- recommendation
- confidence
- reasons_json
- failed_thresholds_json
- risk_flags_json
- created_at

Recommendations: buy, watch, reject, insufficient_data.

### approvals

- id
- opportunity_id
- decision_run_id
- action
- override_flag
- override_reason
- approved_by
- created_at

### inventory_lots

- id
- opportunity_id
- product_id
- acquired_quantity
- available_quantity
- unit_landed_cost
- storage_location
- acquired_at
- status
- created_at
- updated_at

### listings

- id
- inventory_lot_id
- marketplace_id
- external_listing_id
- listing_url
- title
- listed_quantity
- listing_price
- shipping_price
- promoted_listing_rate
- status
- listed_at
- ended_at
- created_at
- updated_at

### sales

- id
- listing_id
- inventory_lot_id
- quantity
- sold_at
- item_revenue
- shipping_revenue
- marketplace_fee_actual
- payment_fee_actual
- promotion_cost_actual
- outbound_shipping_actual
- packaging_cost_actual
- other_cost_actual
- net_profit_actual
- currency
- created_at

### audit_events

- id
- actor_user_id
- entity_type
- entity_id
- action
- before_json
- after_json
- reason
- created_at

## Key Relationships

- A product has many identifiers, supplier offers, market observations, opportunities, and inventory lots.
- An opportunity references one product, an optional supplier offer, and one target marketplace.
- An opportunity has many calculation and decision runs.
- An approval references the exact decision run acted upon.
- An approved and purchased opportunity may create one or more inventory lots.
- Inventory lots may produce many listings and sales.

## Indexes and Constraints

- Unique composite index on identifier type and value where appropriate.
- Index supplier offers by product, supplier, observed date, and expiration.
- Index market observations by product, marketplace, sold status, and observed date.
- Index opportunities by status and created date.
- Index listings by marketplace, external listing ID, and status.
- Index sales by sold date and inventory lot.
- Foreign keys must prevent orphaned financial and audit records.

## Data Retention

MVP records are retained unless manually archived. Calculation runs, decision runs, approvals, and audit events are immutable after creation; corrections are represented by new records.
