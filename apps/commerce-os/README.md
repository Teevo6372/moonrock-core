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
npm run db:push
npm run db:seed
npm run db:verify
npm run dev
```

Open `http://localhost:3000`. The health endpoint is `http://localhost:3000/api/health` and returns HTTP 503 until the configured database is reachable.

## Validation

```bash
npm run check
```

## Data boundaries

The relational model separates normalized products, supplier offers, market evidence, opportunities, immutable calculation and decision runs, approvals, inventory, listings, sales, and audit events. Seeded marketplace fees are editable assumptions.

`db:push` is used only for disposable local and CI bootstrap while the initial migration is prepared. Production must use reviewed migrations rather than schema push.

The application is isolated from WordPress, Elementor, XStore, deployment, and rollback assets. It does not purchase products, publish listings, or change prices.

## Profit Engine assumptions

The Profit Engine uses arbitrary-precision decimal arithmetic. `expectedUnitsPerOrder` defaults to one and controls how many times fixed marketplace, payment, shipping, packaging, and other per-order costs are applied. `minimumNetProfit` is a per-unit threshold when solving the minimum acceptable unit sale price.
