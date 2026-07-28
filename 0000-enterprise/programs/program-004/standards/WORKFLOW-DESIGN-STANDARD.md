# Workflow Design Standard

## Purpose
Establish the minimum design requirements for enterprise workflows before implementation approval.

## Required Design Elements
Every workflow specification must identify:
- Business objective and measurable outcome
- Workflow owner and accountable approver
- Trigger, inputs, actions, outputs, and terminal states
- Systems and data classifications involved
- Risk class and required human controls
- Dependencies, assumptions, and failure modes
- Audit, observability, retention, and rollback requirements

## Design Principles
1. Human authority remains explicit for material decisions.
2. Workflows must be deterministic where practical and explainable where judgment is involved.
3. Every external side effect requires a defined authorization boundary.
4. Reusable components are preferred over duplicated logic.
5. Sensitive data must be minimized and handled according to enterprise standards.
6. Failure must be visible, recoverable, and incapable of silently causing material harm.

## Design Review Gates
- Completeness review
- Risk and control review
- Architecture compatibility review
- Data and security review
- Testability review
- Implementation authorization

A workflow may not advance to build status until all applicable gates are approved and recorded.