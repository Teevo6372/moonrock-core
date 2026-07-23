# Moonrock Commerce OS Application

## Requirements

- Node.js 22 LTS or newer supported release
- npm 10 or newer

## Local setup

```bash
cd apps/commerce-os
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate -- --name foundation
npm run dev
```

Open `http://localhost:3000`. The health endpoint is `http://localhost:3000/api/health`.

## Validation

```bash
npm run check
```

The application is isolated from WordPress, Elementor, XStore, deployment, and rollback assets. It does not purchase products, publish listings, or change prices.
