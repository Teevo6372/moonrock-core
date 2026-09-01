# Nova-Managed Sites — Pilot Plan

Date: 2026-09-01
Status: Proposed

## Objective

Prove that a customer-style website change can move from natural-language request to a validated, reversible preview deployment with minimal operator involvement.

The pilot is deliberately narrow. It should validate the operating model before Moonrock invests in a proprietary CMS, broad customer automation, or production migration.

## Phase 1 — Reference Site Foundation

Create one non-production reference site using a reusable coded framework and structured business content.

Required characteristics:

- responsive
- component-based
- structured business profile/content
- no dependency on WordPress/Elementor
- local and CI build/test commands
- Git-connected preview deployment
- simple rollback path

Initial structured content should include:

- business name
- phone/email
- hours
- service areas
- services
- testimonials
- FAQs
- primary and secondary CTA
- social links

## Phase 2 — SiteChangeRequest Contract

Introduce a provider-neutral request contract between Nova and implementation workers.

Illustrative shape:

```ts
export type SiteChangeRisk = "low" | "moderate" | "high";
export type SiteChangeMode = "auto" | "preview_required" | "operator_review";

export interface SiteChangeRequest {
  id: string;
  siteId: string;
  requestedBy: string;
  customerMessage: string;
  intent: string;
  risk: SiteChangeRisk;
  mode: SiteChangeMode;
  requestedChanges: Array<{
    target: string;
    operation: "add" | "update" | "remove" | "reorder" | "replace_asset";
    value?: unknown;
  }>;
  assetRequests?: Array<{
    purpose: string;
    description: string;
  }>;
  createdAt: string;
}
```

The exact schema may evolve, but provider-specific Claude or Higgsfield fields must not leak into the customer-facing contract.

## Phase 3 — Policy and Risk Gate

Add deterministic policy before any implementation worker executes.

Initial rules:

- low-risk bounded content changes can become `auto`
- structural/layout changes become `preview_required`
- DNS, payments, auth/security, legal/policy, destructive operations, or unknown integrations become `operator_review`
- failed parsing or ambiguous targets must not default to autonomous execution

The policy result must be logged with the request.

## Phase 4 — Claude Code Adapter

Create a replaceable coding-agent adapter responsible for repository-aware implementation.

The adapter should receive:

- the approved `SiteChangeRequest`
- repository/site location
- Moonrock component conventions
- allowed paths or scope
- required test/build commands
- explicit forbidden operations

Expected result:

- implementation branch/change set
- diff or commit reference
- validation output
- machine-readable success/failure status

The adapter must not receive production secrets in source control.

## Phase 5 — Higgsfield Asset Adapter

Use Higgsfield only when the request needs new creative assets.

Examples:

- hero image replacement
- service image
- promotional graphic
- branded background

The adapter returns an asset reference and metadata to the implementation workflow. The coding worker then places/optimizes the asset in the site according to repository conventions.

## Phase 6 — Validation

Before deployment, run deterministic validation appropriate to the site stack.

Minimum checks:

- install succeeds
- typecheck/lint as applicable
- unit/component tests
- production build succeeds
- internal links/routes resolve
- required business data remains present
- no unexpected secret or credential files are introduced

Later checks may add screenshot regression, accessibility, performance budgets, and form smoke tests.

## Phase 7 — Preview Deployment

Connect GitHub to one managed preview provider.

Provider selection criteria:

- Git integration
- automatic preview URLs
- predictable low cost
- rollback/version support
- API/webhook surface suitable for Nova orchestration
- custom-domain support for later production use
- minimal operational maintenance

No customer production domain is required for the pilot.

## Phase 8 — Closed-Loop Demo

Demonstrate these scenarios end to end:

### Scenario A — Autonomous routine edit

Customer: "Change Saturday hours from 8–2 to 8–4."

Expected:

- Nova creates request
- risk = low
- implementation updates structured hours once
- tests/build pass
- preview is deployed
- change record contains request, commit, validation, deployment URL

### Scenario B — Visual asset request

Customer: "Replace the hero image with something that feels more premium and local."

Expected:

- Nova identifies asset need
- request routes to Higgsfield
- returned asset is incorporated by coding adapter
- validation succeeds
- preview is produced

### Scenario C — Structural request

Customer: "Redesign the homepage and move testimonials above About."

Expected:

- risk = moderate
- new version is generated
- preview is created
- no production publish occurs without explicit approval

### Scenario D — High-risk request

Customer: "Move my domain and change the payment account."

Expected:

- risk = high
- automation stops
- operator review is required
- no DNS/payment mutation occurs

### Scenario E — Failure

Implementation introduces a failing build.

Expected:

- deployment is blocked
- previous known-good site remains unaffected
- Nova reports that the change could not be safely published
- operator receives actionable failure evidence

## Operator Experience Goal

Routine success should not generate work for the operator.

The operator should primarily see:

- exceptions
- failed validation
- high-risk requests
- ambiguous customer intent
- unusual/custom development

The platform should not require daily manual checks of every customer site.

## Production Migration Gate

Do not replace the current Moonrock WordPress/Elementor production site until all of the following are true:

1. the non-production pilot succeeds
2. rollback is tested
3. deployment provider is selected
4. expected monthly infrastructure and model costs are understood
5. customer-data boundaries are documented
6. autonomous-change limits are documented
7. operator escalation is working
8. a separate production migration plan is approved

## First Implementation Slice

After this architecture PR is approved, the first executable slice should create:

1. `apps/nova-managed-site-reference/` (or an equivalent isolated reference app)
2. typed structured business content
3. a small reusable component set
4. `SiteChangeRequest` types and deterministic policy tests
5. local build/test scripts
6. GitHub Actions validation

Claude Code and Higgsfield provider calls should be introduced only after the provider-neutral request/policy layer exists and the reference app is stable.
