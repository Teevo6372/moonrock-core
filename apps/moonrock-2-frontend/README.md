# Moonrock 2.0 Frontend

Standalone Moonrock 2.0 application frontend. This app intentionally has no WordPress or Elementor dependency.

## Architecture

- Higgsfield Supercomputer: visual design and creative asset generation
- GitHub: source of truth
- Cloudflare Pages: active production frontend target
- Railway: Nova runtime and `/v1/discovery` API
- HighLevel: CRM, Nova sales pipeline, tags, notes, and later onboarding automation
- WordPress/Elementor/XStore: legacy rollback/reference only

New Moonrock 2 product work must target this standalone frontend and the Railway runtime rather than the legacy WordPress/Elementor implementation.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `VITE_NOVA_API_BASE_URL` to the public Railway origin for the Nova runtime.

## Cloudflare Pages

Use `apps/moonrock-2-frontend` as the project root.

- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable: `VITE_NOVA_API_BASE_URL=<Nova Railway public origin>`

The Railway runtime must allow the Cloudflare Pages preview/production origins and the final Moonrock custom-domain origins before browser requests are enabled.

Repository-owned deployment workflows:

- `Deploy Moonrock 2 Staging` — manually gated Pages staging deployment.
- `Deploy Moonrock 2 Production` — manually gated Pages production deployment.

See `docs/moonrock-2-staging-deployment.md` and `docs/moonrock-2-production-cutover.md` for deployment, cutover, and rollback procedures.

## Migration status

The prior WordPress/Elementor delivery path is superseded. Legacy assets remain preserved for rollback/reference, but production migration now proceeds through Cloudflare Pages + Railway + HighLevel.

Autonomous closing, follow-up, agreements, payments, and onboarding remain separately gated capabilities and are not implied by the frontend hosting cutover.