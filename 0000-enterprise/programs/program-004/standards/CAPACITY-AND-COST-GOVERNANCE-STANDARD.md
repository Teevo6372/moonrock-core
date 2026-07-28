# Capacity and Cost Governance Standard

## Purpose
Control automation resource use, platform expense, vendor exposure, and scaling risk while preserving service reliability.

## Required Controls
Each automation must define:
- expected and maximum transaction volume
- concurrency, queue, rate, and execution-time limits
- storage, retention, compute, model, connector, and licensing assumptions
- approved monthly and per-transaction cost thresholds
- warning and stop-loss thresholds
- owner and approval authority for budget changes
- degraded-mode and demand-shedding behavior

## Forecasting
Capacity forecasts must account for normal demand, peak demand, retry storms, dependency latency, batch accumulation, growth assumptions, and incident recovery.

## Cost Attribution
Recurring and variable costs must be attributable to a workflow, product, program, or business capability. Shared-platform costs must use a documented allocation method.

## Threshold Response
Approaching a warning threshold requires owner review and corrective action. Exceeding a stop-loss threshold must suspend optional processing or require explicit human authorization to continue.

## Vendor and Platform Risk
Material price, quota, contract, or service changes require impact assessment before affected workflows are scaled or renewed.

## Review Cadence
Capacity and cost performance must be reviewed monthly during pilot and at least quarterly after stable operation.

## Prohibition
No automation may silently expand resource consumption, purchase capacity, increase paid usage, or commit Moonrock to a new recurring expense without authorized approval.