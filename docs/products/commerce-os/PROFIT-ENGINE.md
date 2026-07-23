# Commerce OS Profit Engine Specification

- Version: 0.1.0
- Status: Approved for implementation

## Purpose

Define deterministic, testable financial calculations for opportunity evaluation and realized outcome reporting.

## Input Variables

All money values use decimal currency types. Rates are stored as decimals, where 0.13 equals 13 percent.

- `unit_cost`
- `quantity`
- `inbound_shipping_total`
- `acquisition_tax_total`
- `other_acquisition_cost_total`
- `expected_unit_sale_price`
- `buyer_shipping_revenue_per_unit`
- `marketplace_fee_rate`
- `marketplace_fee_fixed_per_order`
- `payment_fee_rate`
- `payment_fee_fixed_per_order`
- `promoted_listing_rate`
- `outbound_shipping_per_order`
- `packaging_cost_per_order`
- `other_selling_cost_per_order`
- `expected_units_per_order`

For MVP, calculations may assume one unit per order unless the operator explicitly changes `expected_units_per_order`.

## Acquisition Calculations

```text
merchandise_cost = unit_cost * quantity
acquisition_total = merchandise_cost
                  + inbound_shipping_total
                  + acquisition_tax_total
                  + other_acquisition_cost_total
landed_cost_per_unit = acquisition_total / quantity
```

Quantity must be greater than zero.

## Per-Order Revenue

```text
units_in_order = min(expected_units_per_order, remaining_quantity)
item_revenue = expected_unit_sale_price * units_in_order
shipping_revenue = buyer_shipping_revenue_per_unit * units_in_order
order_gross_revenue = item_revenue + shipping_revenue
```

## Per-Order Selling Costs

```text
marketplace_variable_fee = order_gross_revenue * marketplace_fee_rate
payment_variable_fee = order_gross_revenue * payment_fee_rate
promoted_listing_cost = item_revenue * promoted_listing_rate

order_selling_cost = marketplace_variable_fee
                   + marketplace_fee_fixed_per_order
                   + payment_variable_fee
                   + payment_fee_fixed_per_order
                   + promoted_listing_cost
                   + outbound_shipping_per_order
                   + packaging_cost_per_order
                   + other_selling_cost_per_order
```

The marketplace adapter may later override the promoted-listing fee basis when a channel charges against a different amount.

## Expected Opportunity Results

The engine must model the expected number of orders and account for all units. For a one-unit-per-order MVP:

```text
expected_gross_revenue = (expected_unit_sale_price + buyer_shipping_revenue_per_unit) * quantity
expected_selling_cost = order_selling_cost * quantity
expected_net_profit = expected_gross_revenue - acquisition_total - expected_selling_cost
roi = expected_net_profit / acquisition_total
margin = expected_net_profit / expected_gross_revenue
```

When acquisition total or revenue is zero, the engine must return a defined validation state rather than divide by zero.

## Break-Even Price

Break-even must solve for the item sale price at which net profit equals zero while preserving shipping revenue and configured percentage fees.

For a one-unit order:

```text
percentage_rate = marketplace_fee_rate + payment_fee_rate + promoted_listing_rate
fixed_cost = landed_cost_per_unit
           + marketplace_fee_fixed_per_order
           + payment_fee_fixed_per_order
           + outbound_shipping_per_order
           + packaging_cost_per_order
           + other_selling_cost_per_order

break_even_item_price =
  (fixed_cost - buyer_shipping_revenue_per_unit * (1 - marketplace_fee_rate - payment_fee_rate))
  / (1 - percentage_rate)
```

Implementation must validate that the denominator is greater than zero. Channel-specific fee bases should be implemented through adapters rather than silently changing this core formula.

## Minimum Acceptable Sale Price

The engine must calculate the greater price required to satisfy both minimum net profit and minimum ROI.

```text
required_profit = max(minimum_net_profit, acquisition_cost_allocated_per_unit * minimum_roi)
minimum_acceptable_price = solve price where net profit equals required_profit
```

## Rounding

- Store intermediate calculations at no fewer than four decimal places.
- Display currency rounded to two decimal places.
- Do not round rates before completing the calculation.
- Persist both raw inputs and final displayed results.

## Validation Rules

Return validation errors for:

- quantity less than one
- negative costs or revenue values unless explicitly allowed by a credit/refund workflow
- percentage rates below zero or at/above one where mathematically invalid
- missing expected sale price
- unsupported currency combination
- denominator equal to or below zero

## Required Test Cases

1. Standard one-unit sale with seller-paid shipping.
2. Buyer-paid shipping.
3. Zero promoted listing rate.
4. Twenty and thirty percent promoted listing rates.
5. Sale at break-even.
6. Loss-making opportunity.
7. Multi-quantity acquisition.
8. Fixed marketplace fee.
9. Separate payment fee.
10. Zero acquisition cost validation.
11. Rounding boundary cases.
12. Estimated versus actual result reconciliation.

## Explainability Output

Every calculation response must include:

- formula version
- input snapshot
- assumption snapshot
- calculated values
- validation warnings
- timestamp
