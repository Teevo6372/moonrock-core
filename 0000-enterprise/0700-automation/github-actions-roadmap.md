# GitHub Actions Roadmap

**Document ID:** MRE-AUT-GHA-RDM-001  
**Version:** 0.1.0  
**Status:** Implemented  
**Owner:** Moonrock Enterprises  
**Approved by:** Stephen Tyler Jr.  
**Effective date:** 2026-07-28

## Purpose

Define the staged introduction of GitHub Actions into MBOS while preserving human approval, repository safety, and auditable releases.

## Roadmap

### Stage 1 — Read-only validation

- Markdown and metadata validation
- Broken-link detection
- Duplicate Document ID detection
- Filename and numbering checks
- Secret scanning

### Stage 2 — Controlled reporting

- Repository health reports
- Capability and decision register consistency checks
- Release-readiness summaries
- Technical-debt aging reports

### Stage 3 — Approval-gated maintenance

- Draft changelog generation
- Release-note generation
- Governed index updates
- Template synchronization

### Stage 4 — Approved deployment support

- Environment-specific deployment workflows
- Required approvals and protected environments
- Rollback verification
- Post-deployment validation

## Controls

No workflow may commit directly to protected branches, expose secrets, perform destructive operations without explicit approval, or bypass required quality gates.