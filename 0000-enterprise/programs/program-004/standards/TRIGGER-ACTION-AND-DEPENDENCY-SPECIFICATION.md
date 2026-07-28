# Trigger, Action, and Dependency Specification

## Purpose
Provide a consistent contract for describing how workflows begin, execute, interact with systems, and terminate.

## Trigger Contract
Each trigger must define source, event or schedule, eligibility conditions, deduplication key, expected frequency, freshness tolerance, authentication boundary, and behavior when trigger data is incomplete.

## Action Contract
Each action must define purpose, inputs, outputs, target system, authorization level, side effects, timeout, retry eligibility, compensation behavior, logging requirements, and human approval requirements.

## Dependency Contract
Dependencies must identify owning system, criticality, interface, expected availability, data classification, failure behavior, substitute path, and escalation owner.

## Sequencing
Workflow steps must declare ordering, parallelism, preconditions, postconditions, and terminal conditions. Hidden dependencies are prohibited.

## Change Control
Changes to triggers, side effects, authorization, data classification, or critical dependencies require impact assessment and renewed approval proportional to risk.

## Acceptance Rule
A workflow is not implementation-ready until every trigger, action, and dependency has an explicit contract and unresolved assumptions are assigned to an owner.