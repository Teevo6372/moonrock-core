# Commerce OS Decision Engine Specification

- Version: 0.1.0
- Status: Approved for implementation

## Purpose

Convert validated Profit Engine output and risk inputs into an explainable recommendation. The engine advises; it does not purchase products.

## Recommendation States

- `buy` — all required thresholds pass and no blocking risk is present
- `watch` — potentially acceptable, but price, confidence, or timing requires monitoring
- `reject` — one or more blocking thresholds fail
- `insufficient_data` — required inputs or evidence are missing

## Required Inputs

- expected net profit
- ROI
- margin
- acquisition total
- expected days to sale
- opportunity data completeness
- source evidence age
- market evidence count
- condition confidence
- inventory concentration
- configured thresholds and restrictions

## Configurable Rules

- minimum net profit
- minimum ROI
- minimum margin
- maximum capital exposure per opportunity
- maximum total category exposure
- maximum expected days to sale
- minimum confidence score
- maximum source-evidence age
- minimum market-observation count
- allowed conditions
- allowed marketplaces

## Rule Precedence

1. Validation and missing-data checks
2. Channel and condition restrictions
3. Capital and concentration limits
4. Profit and ROI thresholds
5. Sell-through and evidence confidence
6. Advisory warnings

## Initial Logic

Return `insufficient_data` when critical price, cost, quantity, marketplace, or evidence inputs are missing.

Return `reject` when a blocking restriction fails, expected net profit is below zero, capital exposure exceeds the hard maximum, or minimum ROI and minimum net profit both fail materially.

Return `watch` when the opportunity is profitable but one soft threshold fails, evidence is stale or limited, expected days to sale are high, or the current acquisition price must fall to reach the minimum acceptable sale economics.

Return `buy` when all hard and soft thresholds pass and confidence meets the configured minimum.

## Confidence Score

Confidence is a 0–100 score derived from transparent components. Initial weighting:

- data completeness: 25
- market evidence quantity and recency: 25
- supplier evidence quality: 15
- product identity match: 15
- condition certainty: 10
- fee and shipping certainty: 10

The score must expose each component. AI-generated narrative must not alter the numeric recommendation.

## Risk Flags

Initial flags include:

- stale_market_data
- low_observation_count
- uncertain_condition
- supplier_stock_unverified
- high_capital_exposure
- inventory_concentration
- slow_expected_sell_through
- thin_profit_buffer
- high_promotion_dependency
- shipping_cost_uncertainty
- product_identity_mismatch

## Overrides

A human may approve, watch, or reject contrary to the recommendation. Every override requires a reason and records the acting user, original decision run, timestamp, and resulting action.

## Explainability Contract

Every decision response must include:

- recommendation
- confidence score and components
- passed rules
- failed rules
- risk flags
- assumptions
- linked calculation run
- ruleset version
- generated timestamp

## Required Tests

- complete profitable Buy case
- negative-profit Reject case
- missing-data Insufficient Data case
- profitable but stale-data Watch case
- capital-limit Reject case
- low-confidence Watch case
- configurable threshold changes
- deterministic repeat run
- override audit creation
