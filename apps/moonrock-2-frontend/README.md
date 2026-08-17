# Moonrock 2.0 Frontend

Standalone Moonrock 2.0 application frontend. This app intentionally has no WordPress or Elementor dependency.

## Architecture

- Higgsfield Supercomputer: visual design and creative asset generation
- GitHub: source of truth
- Cloudflare Pages: intended production frontend hosting
- Railway: Nova runtime and `/v1/discovery` API
- HighLevel: CRM, Nova sales pipeline, tags, notes, and later onboarding automation

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

The Railway runtime must allow the Cloudflare Pages preview/production origins before browser requests are enabled.

## Mission 20 scope

PR #112 establishes the independent frontend, responsive Moonrock design shell, two-path entry, typed Nova discovery API client, and environment contract. It intentionally does not cut DNS over from WordPress and does not enable autonomous closing, follow-up, agreements, or payments.
