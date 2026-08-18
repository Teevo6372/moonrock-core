# Moonrock 2.0 Staging Deployment Runbook

## Objective

Deploy the standalone `apps/moonrock-2-frontend` application to a Cloudflare Pages staging preview without changing Moonrock production DNS, WordPress, Elementor, or the existing temporary homepage.

## Current architecture

- Frontend: Cloudflare Pages
- Nova runtime: Railway
- CRM handoff: HighLevel
- Source of truth: GitHub

## GitHub staging environment

Create or use a GitHub Environment named `staging`.

Environment secrets:

- `CLOUDFLARE_API_TOKEN` — token with the minimum permissions required to deploy the Moonrock Pages project.
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account identifier used by Wrangler.

Environment variables:

- `CLOUDFLARE_PAGES_PROJECT` — the existing or newly created Cloudflare Pages project name for Moonrock 2.0.
- `NOVA_RAILWAY_ORIGIN` — the public HTTPS origin of the Nova Railway runtime, with no trailing slash.

No Cloudflare or Railway credentials belong in repository files.

## Railway CORS prerequisite

Before browser validation, add the Cloudflare staging origin to the Railway runtime `NOVA_ALLOWED_ORIGINS` value.

The runtime requires exact origins. Do not add paths or a trailing slash.

After the first Cloudflare staging deployment, use its branch alias origin, for example:

`https://staging.<pages-project>.pages.dev`

If `NOVA_ALLOWED_ORIGINS` already contains other approved origins, preserve them and append the staging origin as a comma-separated value.

## Deployment

Run the GitHub Actions workflow `Deploy Moonrock 2 Staging` and enter:

`DEPLOY-MOONROCK-2-STAGING`

The workflow:

1. Verifies the explicit staging confirmation.
2. Verifies the Pages project and Railway origin configuration.
3. Builds the frontend with `VITE_NOVA_API_BASE_URL` set to the Railway origin.
4. Deploys `dist` to the Cloudflare Pages `staging` branch.
5. Reports the Pages branch alias/deployment URL.

## Validation

Validate the staging URL only. Production DNS remains unchanged.

Acceptance checks:

1. Page renders at mobile and desktop widths.
2. Nova begins in the idle state before discovery starts.
3. Starting either business path shows processing then the first listening state.
4. Normal answers show thinking during the request, then speaking briefly, then listening for the next answer.
5. The final required answer shows diagnosis while the Flight Plan is generated.
6. Completed autonomous flows settle on recommendation.
7. Escalated flows settle on handoff.
8. Approved Nova video media loads; if a media request fails, the existing fallback remains usable.
9. Browser requests to Railway succeed without CORS errors.
10. No production WordPress, Elementor, DNS, payment, autonomous follow-up, or agreement behavior changes.

## Rollback

Cloudflare staging preview deployments are isolated from production. Roll back by redeploying the previous known-good commit to the `staging` branch or deleting the preview deployment. No production DNS rollback is required because this runbook does not authorize DNS cutover.
