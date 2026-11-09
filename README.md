# MyBricks

Real-estate portfolio management platform: properties, clients, rental contracts and short-stay reservations, finances and portfolio KPIs.

This is a monorepo (npm workspaces):

| Folder | What it is |
|---|---|
| [`app/`](app/README.md) | front-end: React 19, Vite, TanStack Router/Query |
| [`api/`](api/README.md) | back-end: Hono, Drizzle, SQLite (Cloudflare D1), Better Auth |

## Getting started

```bash
npm install          # one install for both packages
npm run db:migrate   # creates the local SQLite database (schema + reference data)
npm run dev:api      # API on http://localhost:3000
npm run dev          # front-end on http://localhost:5173 (proxies /api to the API)
```

Copy `api/.env.example` to `api/.env` first.

## Root scripts

| Script | What it does |
|---|---|
| `npm run dev` / `npm run dev:api` | front-end / API dev servers |
| `npm run build` | build the API, then the front-end |
| `npm run typecheck` | TypeScript check of both |
| `npm run lint` | oxlint (front-end) |
| `npm test` | API suite, then the front-end suite |
| `npm run api:types` | re-export the OpenAPI document and regenerate the front-end's typed client |

Deploy (Cloudflare Workers, D1 and R2): see [docs/deploy-passo-a-passo.md](docs/deploy-passo-a-passo.md). `npm run deploy -w api` / `-w app` publish production, `deploy:staging` the staging environment; GitHub Actions does it on push once `DEPLOY_ENABLED` is set.

Any workspace script is reachable with `npm run <script> -w app` or `-w api`.
