# Moonrock Client Identification Standard (MCIS)

**Document ID:** MRE-STD-MCIS-001  
**Version:** 1.0.0  
**Status:** Implemented  
**Owner:** Moonrock Enterprises  
**Approved by:** Stephen Tyler Jr.  
**Effective date:** 2026-07-28  
**Repository path:** `0000-enterprise/0300-standards/moonrock-client-identification-standard.md`

## Purpose

Define stable, unique, privacy-conscious identifiers for Moonrock clients and client workspaces.

## Canonical format

`MRC-YYYY-NNNN`

- `MRC` identifies a Moonrock client record.
- `YYYY` is the year the client record is established.
- `NNNN` is a four-digit sequential number beginning at `0001` each year.

Example: `MRC-2026-0001`.

## Rules

- Client IDs are permanent and may not be reassigned.
- Legal names, personal names, email addresses, and phone numbers must not be embedded in the identifier.
- A client with multiple engagements retains one Client ID unless governance approves a separate legal-account relationship.
- Engagements, projects, and workspaces reference the Client ID rather than creating competing client identifiers.
- Retired client records remain reserved and are marked inactive or archived rather than deleted.

## Related identifiers

Engagements use `MRC-YYYY-NNNN-ENG-NNN`. Projects use `MRC-YYYY-NNNN-PRJ-NNN`. Workspaces use the Client ID as the root directory identity and may add a non-sensitive display slug.

## Control register

The authoritative Client ID Register must record the Client ID, lifecycle status, record owner, creation date, and linked engagement identifiers. Sensitive client details belong in approved systems, not in the public repository.

## Acceptance criteria

An identifier is MCIS-compliant when it is unique, correctly formatted, permanently reserved, linked to an owner, and contains no unnecessary personal information.
