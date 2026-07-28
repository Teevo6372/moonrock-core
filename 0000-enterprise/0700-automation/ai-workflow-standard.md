# AI Workflow Standard

**Document ID:** MRE-AUT-AIW-STD-001  
**Version:** 1.0.0  
**Status:** Implemented  
**Owner:** Moonrock Enterprises  
**Approved by:** Stephen Tyler Jr.  
**Effective date:** 2026-07-28

## Purpose

Define minimum controls for AI-assisted work performed within MBOS.

## Requirements

Every governed AI workflow must define:

- business purpose and owner
- permitted inputs and outputs
- authoritative source systems
- approval points
- failure and escalation behavior
- logging and evidence requirements
- rollback or reversal method
- prohibited data and actions

## Human control

AI may draft, classify, validate, summarize, and recommend. Material financial, legal, client, production, security, architecture, and release decisions require explicit human approval unless a separately approved policy states otherwise.

## Data protection

Credentials, secrets, regulated data, executed private agreements, and unnecessary personal information must not be placed in prompts, logs, repositories, or generated artifacts.

## Reliability

AI output must be treated as unverified until checked against authoritative sources or deterministic validation. A workflow must fail safely when required evidence is unavailable.

## Auditability

Material AI-generated changes must identify the initiating request, affected artifacts, approval authority, repository commit or transaction reference, and validation result.