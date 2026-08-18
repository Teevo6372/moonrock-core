# Moonrock 2 Production Cutover

## Decision

Moonrock 2.0 standalone frontend is the active production frontend path.

- Frontend: Cloudflare Pages
- Runtime/API: Railway
- CRM: HighLevel
- Source of truth: GitHub
- WordPress/Elementor/XStore: legacy rollback/reference only; do not continue feature implementation there.

This supersedes the prior WordPress/Elementor delivery path while preserving all legacy assets for rollback and historical reference.

## Known infrastructure

- Cloudflare Pages project origin previously established as `https://moonrock-2.pages.dev`.
- Nova Railway production origin previously established as `https://moonrock-core-production.up.railway.app`.
- Railway CORS policy requires exact allowed origins via `NOVA_ALLOWED_ORIGINS`.

Do not assume DNS cutover is complete merely because a Pages deployment succeeds.

## Production GitHub environment

Configure GitHub environment `production` with:

### Secrets

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

### Variables

- `CLOUDFLARE_PAGES_PROJECT` — expected project name for the existing Moonrock 2 Pages project.
- `NOVA_RAILWAY_ORIGIN` — the public Nova Railway HTTPS origin.

## Required pre-cutover validation

1. Deploy and validate the staging Pages branch.
2. Confirm both Startup and Existing Business paths complete in a real browser.
3. Confirm Nova visual states transition through Idle, Thinking, Speaking, Listening, Diagnosis, Recommendation/Handoff.
4. Confirm Nova media loads without identity drift or broken state playback.
5. Confirm the final Flight Plan renders.
6. Confirm controlled HighLevel handoff still works when the production gates permit it.
7. Confirm Railway `NOVA_ALLOWED_ORIGINS` contains the Pages production origin and intended custom domain origin before DNS cutover.
8. Confirm existing WordPress site backup/rollback assets remain intact.

## Production deploy

Run GitHub Actions workflow `Deploy Moonrock 2 Production` and enter:

`DEPLOY-MOONROCK-2-PRODUCTION`

The workflow builds `apps/moonrock-2-frontend` with the configured Railway origin and deploys `dist` to the Cloudflare Pages production branch (`main`).

## DNS cutover

After the production Pages deployment is validated on the Pages domain:

1. Attach/verify `moonrockmarketing.com` and the desired `www` hostname in Cloudflare Pages.
2. Update DNS so the public domain resolves to the Cloudflare Pages project.
3. Keep the prior WordPress hosting account and files intact during the observation window.
4. Re-test Nova discovery, media playback, contact capture, Flight Plan generation, and HighLevel handoff on the real domain.

DNS changes are an operator-controlled infrastructure action and are not performed by this repository workflow.

## Rollback

If cutover validation fails:

1. Restore DNS to the prior WordPress/FusionArc destination.
2. Leave the Cloudflare Pages deployment available for diagnosis.
3. Revert the offending Moonrock 2 commit or redeploy the last known-good Pages commit.
4. Do not delete WordPress/Elementor/XStore assets as part of rollback.

## Legacy policy

The existing `deploy-moonrock-homepage.yml` workflow and WordPress assets are retained only for emergency rollback/reference. New Moonrock 2 product work must target the standalone frontend and Railway runtime.