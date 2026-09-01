# ADR 0005: Nova-Managed Website Platform

- Status: Proposed
- Date: 2026-09-01

## Decision

Moonrock will prototype a Nova-managed website delivery model in which customers request website changes conversationally through Nova, routine changes are implemented through a controlled coding-agent workflow, visual assets are generated through Higgsfield when needed, GitHub remains the versioned source of truth, and deployment is automated through a replaceable managed deployment provider.

The initial implementation engine will be Claude Code, integrated behind a Moonrock-owned `SiteChangeRequest` boundary rather than coupled directly to customer-facing conversation logic. Higgsfield SuperComputer will serve as the primary creative and visual-asset engine, not the authoritative code editor or production host.

Existing WordPress, Elementor, XStore, and production deployment assets remain intact during the pilot. This ADR authorizes a non-production proof of concept only; it does not authorize replacing the current production website or customer sites.

## Target Customer Experience

A customer should be able to tell Nova what they want changed without logging into a CMS or opening a support ticket.

Nova will classify the request by risk:

- **Routine / low-risk:** Nova may implement, validate, deploy, and report completion automatically.
- **Structural / moderate-risk:** Nova prepares a preview and requires customer approval before production deployment.
- **High-risk / exceptional:** Nova escalates to a Moonrock operator before production changes.

Every automated change must be attributable, reviewable, reversible, and recoverable through Git history and deployment rollback.

## Architecture

```text
Customer
   |
   v
Nova Runtime / Orchestrator
   |
   +--> SiteChangeRequest + policy/risk gate
   |
   +--> Claude Code adapter ------> repository changes / tests
   |
   +--> Higgsfield adapter -------> visual assets when required
   |
   +--> GitHub -------------------> version history / pull requests
   |
   +--> Deployment adapter -------> preview / production deployment
   |
   +--> GHL ----------------------> CRM / forms / lifecycle when applicable
```

## Responsibility Boundaries

### Nova

- customer-facing conversation
- business-context memory
- requirement gathering
- request classification
- approval routing
- orchestration
- customer-facing status and completion messages

### Claude Code

- inspect repository and existing components
- implement code/content/configuration changes
- run prescribed tests and validation
- produce a reviewable diff
- avoid direct customer communication

### Higgsfield SuperComputer

- brand-kit and creative support
- imagery and graphics
- reusable character/visual elements
- video and promotional assets
- other approved creative outputs

Higgsfield is not the canonical source of website code and is not assumed to be the production deployment provider.

### GitHub

- authoritative source for code and configuration
- immutable change history
- branch/PR workflow
- rollback source
- audit trail

### Deployment Provider

The deployment provider must be replaceable. Initial evaluation may include Vercel, Cloudflare Pages, Netlify, or another Git-connected managed platform. Provider selection is deferred until the pilot validates framework and operational requirements.

## Site Model

The pilot should prefer structured site data and reusable components over unconstrained one-off code generation. Common business facts such as phone, hours, locations, service areas, services, testimonials, FAQs, offers, and calls to action should exist in structured data so a single approved change updates every dependent component safely.

A Moonrock component library should constrain routine builds and edits while preserving design variety. Claude Code may extend components when required, but it should not regenerate an entire site for routine customer changes.

## Safety and Change Policy

The system must default to reversible actions.

Examples of low-risk autonomous changes include text edits, business hours, phone/contact information, approved images, testimonials, FAQs, service descriptions, announcements, and other bounded content updates.

Examples requiring preview or approval include major layout changes, new top-level pages, navigation restructuring, broad visual redesigns, and significant conversion-flow changes.

Examples requiring operator review include domain/DNS changes, payment configuration, destructive deletion, authentication/authorization, privacy/security settings, legal-policy changes, unknown third-party integrations, or any change that fails automated validation.

Production deployment must never occur after a failed test/build/validation stage.

## Rationale

- Removes the CMS dashboard from the normal customer experience.
- Reduces recurring manual fulfillment and maintenance work.
- Gives Nova a practical operational role rather than only an advisory role.
- Uses Claude Code for repository-aware engineering work and Higgsfield for specialized creative production.
- Preserves vendor flexibility by keeping Moonrock-owned request contracts and adapters.
- Keeps GitHub as the audit and rollback layer.
- Allows WordPress to remain available for projects that genuinely require it while creating a lower-maintenance default for standardized sites.

## Tradeoffs

- Requires disciplined component and data modeling before broad autonomy is safe.
- Coding-agent output still needs automated checks and risk gates.
- Some customer requests will require human review.
- Third-party coding, creative, and deployment providers create usage costs and availability dependencies.
- Initial setup is more technical than a conventional page-builder workflow.

## Rejected Alternatives

- **WordPress/Elementor as the universal default:** retains plugin, CMS, and manual-editing operational burden.
- **Higgsfield as the sole coding/deployment platform:** creative capabilities are strong, but current integration does not provide a dedicated production website deployment boundary suitable as the canonical host.
- **Build a proprietary Moonrock CMS first:** unnecessary complexity before validating demand and the conversational management model.
- **Hard-wire Nova directly to Claude-specific prompts:** creates avoidable vendor lock-in and makes future model replacement harder.
- **Unrestricted autonomous production edits:** unacceptable operational and customer risk.

## Pilot Acceptance Criteria

1. A non-production Moonrock reference site is stored in GitHub and deployed automatically to a preview environment.
2. Nova can create a typed `SiteChangeRequest` from a customer-style natural-language request.
3. A coding-agent adapter can implement at least one low-risk content change in a branch without direct operator editing.
4. Automated validation runs before deployment.
5. A successful change produces a preview or production-eligible artifact according to policy.
6. The workflow records the request, diff/commit, validation result, and deployment result.
7. A failed build/test blocks deployment and escalates cleanly.
8. Rollback to the previous known-good version is documented and tested.
9. At least one request requiring a new visual asset can route through Higgsfield and return the asset to the implementation workflow.
10. Existing WordPress/Elementor production assets are untouched throughout the pilot.

## Boundaries

This ADR does not authorize automatic production changes to `moonrockmarketing.com`, customer domains, DNS, payment systems, legal content, or existing WordPress/Elementor installations. Production activation requires a later explicit decision after the pilot evidence is reviewed.
