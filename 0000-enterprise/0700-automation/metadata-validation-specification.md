# Metadata Validation Specification

**Document ID:** MRE-AUT-MDV-SPC-001  
**Version:** 0.1.0  
**Status:** Implemented  
**Owner:** Moonrock Enterprises  
**Approved by:** Stephen Tyler Jr.  
**Effective date:** 2026-07-28

## Purpose

Specify deterministic checks for governed MBOS Markdown artifacts.

## Required checks

A validator must confirm:

- Document ID exists and is unique
- Version uses the approved semantic format
- Status is an approved lifecycle value
- Owner and approval authority are present
- Effective date uses ISO `YYYY-MM-DD`
- Filename uses lowercase kebab case
- Internal repository references resolve
- Required headings exist for the artifact type
- No credential-like values or prohibited secrets are committed

## Results

Validation results must identify the file, rule, severity, evidence, and recommended correction. Critical failures block release. Warnings require disposition before an artifact becomes Operational.

## Initial implementation boundary

Sprint 005 defines the specification only. Workflow code and enforcement activation require a later approved implementation sprint.