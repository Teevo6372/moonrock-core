---
title: Moonrock Commerce OS Profit Engine Specification
version: 0.1.0
status: APPROVED
owner: Moonrock Enterprises
---

# Moonrock Commerce OS Profit Engine

## Purpose

The Profit Engine produces deterministic, explainable commerce calculations from a selected supplier offer, target quantity, expected sale price, marketplace fee profile, shipping profile, and configurable Moonrock thresholds.

## Monetary Rules

- Use exact decimal arithmetic or integer minor units.
- Round displayed currency to two decimal places using half-up rounding.
- Preserve unrounded intermediate values when supported.
- Use one currency per analysis. Currency conversion is out of scope for the first MVP.
- Never silently substitute missing required costs with zero. Mark the analysis incomplete or apply an explicitly identified default.

## Input Definitions

- `quantity`: units acquired and evaluated
- `unit_cost`: supplier price per unit
- `inbound_shipping_total`: shipping paid to acquire the order
- `estimated_tax_total`: acquisition tax
- `discount_total`: discounts applied to acquisition
- `other_acquisition_cost`: other acquisition-level cost
- `expected_item_price`: expected selling price per unit
- `buyer_shipping_per_unit`: shipping charged to buyer
- `marketplace_percentage_fee`: marketplace percentage
- `marketplace_fixed_fee`: fixed fee per order or unit as configured
- `payment_percentage_fee`: separate payment processing percentage
- `payment_fixed_fee`: separate fixed processing fee
- `promoted_listing_rate`: advertising percentage
- `outbound_shipping_per_unit`: seller-paid shipping
- `packaging_per_unit`: packaging materials
- `other_variable_cost_per_unit`: other sale-related variable cost

## Core Formulas

### Acquisition Subtotal

`acquisition_subtotal = unit_cost × quantity`

### Landed Cost Total

`landed_cost_total = acquisition_subtotal + inbound_shipping_total + estimated_tax_total + other_acquisition_cost - discount_total`

### Landed Cost Per Unit

`landed_cost_per_unit = landed_cost_total ÷ quantity`

Quantity must be greater than zero.

### Gross Order Revenue Per Unit

`gross_order_revenue = expected_item_price + buyer_shipping_per_unit`

### Marketplace Fee

The fee base is configurable.

- item only: `expected_item_price`
- item plus shipping: `expected_item_price + buyer_shipping_per_unit`
- order total: same as item plus shipping in MVP unless taxes or other buyer charges are later modeled

`marketplace_fee = fee_base × marketplace_percentage_fee + marketplace_fixed_fee`

### Payment Fee

`payment_fee = gross_order_revenue × payment_percentage_fee + payment_fixed_fee`

Use zero only when the selected marketplace profile explicitly indicates payment processing is included in the marketplace fee.

### Promoted Listing Expense

`promoted_fee = promoted_fee_base × promoted_listing_rate`

The default promoted fee base is expected item price. Marketplace-specific profiles may override this.

### Expected Net Profit Per Unit

`expected_net_profit = gross_order_revenue - landed_cost_per_unit - marketplace_fee - payment_fee - promoted_fee - outbound_shipping_per_unit - packaging_per_unit - other_variable_cost_per_unit`

### ROI

`roi_percent = expected_net_profit ÷ landed_cost_per_unit × 100`

ROI is undefined when landed cost is zero or negative. Such records require review.

### Net Margin

`net_margin_percent = expected_net_profit ÷ gross_order_revenue × 100`

### Break-Even Price

Break-even price is the item price where expected net profit equals zero. Because percentage fees depend on revenue, calculate algebraically when the fee model is linear:

`break_even_item_price = fixed_costs_adjusted ÷ (1 - combined_revenue_fee_rate)`

The implementation must account for buyer-paid shipping and fee bases. When a fee profile is not linear, use a bounded numerical solver and document the method.

### Minimum Acceptable Sale Price

The minimum acceptable price is the higher of:

- the price needed to meet minimum net profit
- the price needed to meet minimum ROI
- the price needed to meet minimum net margin

The engine should solve each requirement and return the binding threshold.

## Recommendation Rules

### BUY

Return BUY when all required information is complete and all configured hard thresholds pass:

- expected net profit meets minimum
- ROI meets minimum
- net margin meets minimum
- capital exposure does not exceed limit
- confidence meets minimum
- inventory concentration does not exceed limit
- no blocking risk flag exists

### REVIEW

Return REVIEW when:

- a soft threshold fails
- evidence is stale or incomplete
- expected days to sale exceeds target but profit remains attractive
- confidence is below target but above the blocking floor
- market observations disagree materially
- the operator must confirm a fee, shipping, condition, or authenticity assumption

### PASS

Return PASS when:

- expected net profit is negative
- a hard minimum profit, ROI, or margin threshold fails
- capital exposure exceeds the configured maximum
- authenticity, condition, policy, or channel risk is blocking
- required data cannot support a responsible decision

## Reason Codes

Minimum supported codes:

- `PROFIT_THRESHOLD_MET`
- `PROFIT_THRESHOLD_FAILED`
- `ROI_THRESHOLD_MET`
- `ROI_THRESHOLD_FAILED`
- `MARGIN_THRESHOLD_FAILED`
- `CAPITAL_LIMIT_EXCEEDED`
- `LOW_CONFIDENCE`
- `STALE_MARKET_DATA`
- `INSUFFICIENT_COMPARABLES`
- `CONDITION_MISMATCH`
- `HIGH_INVENTORY_CONCENTRATION`
- `SHIPPING_ASSUMPTION_UNCONFIRMED`
- `FEE_PROFILE_UNCONFIRMED`
- `BLOCKING_POLICY_RISK`

## Confidence Model

MVP confidence is a transparent weighted score from 0 to 100 based on configurable factors such as:

- completeness of product identity
- number and freshness of sold comparables
- consistency of observed prices
- match between observed and offered condition
- confidence in shipping cost
- confidence in marketplace fee profile
- supplier reliability

The engine must expose factor scores. It must not present an opaque AI confidence score as fact.

## Validation Examples

At minimum, automated tests must cover:

1. profitable item with no promoted fee
2. profitable item with marketplace and promoted fees
3. buyer-paid shipping included in fee base
4. acquisition discount allocation
5. multiple-quantity inbound shipping allocation
6. negative profit
7. zero quantity rejection
8. zero landed-cost review state
9. threshold boundary equality
10. rounding behavior
11. missing shipping assumption
12. actual outcome calculation using recorded expenses

## Initial Configurable Defaults

For the current Moonrock eBay workflow, seed—but do not hard-code—the following editable values:

- marketplace percentage fee: 13 percent
- outbound shipping estimate: 7 dollars
- minimum ROI target: 30 percent

Promoted listing rates must be entered per analysis or selected from a configurable profile. The system must show how a 20 to 30 percent promoted rate materially affects profit before recommending its use.
