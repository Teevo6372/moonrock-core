# Moonrock Numbering Convention (MNC)

**Document ID:** MRE-STD-MNC-001  
**Version:** 1.0.0  
**Status:** Implemented  
**Owner:** Moonrock Enterprises  
**Approved by:** Stephen Tyler Jr.  
**Effective date:** 2026-07-28

## Purpose

MNC provides stable identifiers for enterprise documents, programs, products, decisions, registers, templates, and client-delivery artifacts.

## Canonical format

`MRE-[DOMAIN]-[TYPE]-[SEQUENCE]`

Optional qualifiers may be inserted between domain and type when needed:

`MRE-[DOMAIN]-[QUALIFIER]-[TYPE]-[SEQUENCE]`

## Core codes

| Code | Meaning |
|---|---|
| MRE | Moonrock Enterprises |
| ENT | Enterprise |
| STD | Standard |
| GOV | Governance |
| ARC | Architecture |
| PRG | Program |
| SPR | Sprint |
| ADR | Architecture Decision Record |
| REG | Register |
| TPL | Template |
| RPT | Report |
| CAP | Capability |
| REL | Release |

## Sequence rules

- Use three-digit sequences beginning at `001`.
- Never reuse a retired identifier.
- Preserve an identifier when a document is renamed or moved.
- Create a new identifier when the artifact's purpose materially changes.

## Program and sprint identifiers

Programs use `P###`; sprints use `S###`. Example: `MRE-P002-S002-CHR-001`.

## File naming

Repository filenames use lowercase kebab case. The filename is descriptive; the Document ID remains the permanent identity.

## Governance

The Documentation Steward maintains the identifier registry. Duplicate or ambiguous identifiers block approval and release.
