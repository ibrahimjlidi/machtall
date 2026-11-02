# Mashtal Ezzahi

Inventory, production, purchasing, and sales management for a Tunisian plant nursery. The repository is a small monorepo: a React/Vite client and a NestJS modular-monolith API backed by PostgreSQL and Prisma.

## Architecture

```text
Browser ── same-origin HTTP-only session cookie ── Nginx (web)
                                                    ├── static React app
                                                    └── /api/* → NestJS API ── PostgreSQL
```

- `src/` — React presentation, forms, charts, and the typed-by-contract HTTP client.
- `apps/api/src/auth` — login, session cookies, JWT validation, and role guards.
- `apps/api/src/products` — catalog and stock-derived product quantities.
- `apps/api/src/movements` — append-only inventory ledger and location transfers.
- `apps/api/src/production` — batches and atomic ready-to-stock conversion.
- `apps/api/src/purchasing` — suppliers' purchase orders and atomic receiving.
- `apps/api/src/sales` — customer balances and atomic sales/stock-out movements.
- `apps/api/src/dashboard`, `reference`, `health` — read models, lookups, and readiness.
- `apps/api/prisma` — relational schema, migrations, and idempotent demo seed.

This is intentionally a **modular monolith**, not a collection of premature microservices. Domain modules own their controllers/services and share only the database and small common ledger helpers. The PostgreSQL movement ledger is the source of truth for inventory; the app does not maintain a separately editable stock count. Sales, purchase receiving, and batch readiness create their ledger entries in the same database transaction as the business record.

## Documentation

Browse the [documentation index](docs/README.md) for workflow references and the detailed [stock scenario test report](docs/testing/stock-workflows/README.md).

## Run with Docker Compose

Requirements: Docker Engine with Compose v2.

1. Copy `.env.example` to `.env`.
2. Replace the three placeholder values with unique values. Generate URL-safe database and admin passwords with `openssl rand -hex 24`; generate a JWT signing secret with `openssl rand -hex 48`. Keep `.env` private and outside version control.
3. Start the stack:

   ```sh
   docker compose up --build -d
   ```

   The API waits for PostgreSQL, applies committed migrations, and starts only after the database is healthy.
4. Load the realistic nursery demo data and create/update the owner account:

   ```sh
   docker compose --profile demo run --rm seed
   ```

   The seed is idempotent. It requires `SEED_ADMIN_PASSWORD` (minimum 12 characters) and sets the owner login from `SEED_ADMIN_EMAIL`.
5. Open `http://localhost:8080`. Use the owner email/password from `.env`.

The API and database have no host-published ports; the browser reaches the API through Nginx at `/api`. PostgreSQL data is stored in the `postgres_data` named volume. `docker compose logs -f api` shows API/migration logs, and `GET /api/health` checks application-to-database connectivity.

For a real internet-facing deployment, terminate TLS at a trusted reverse proxy/load balancer, set `COOKIE_SECURE=true`, restrict network ingress to that proxy, use managed/rotated secrets, and configure encrypted off-host PostgreSQL backups. Local Compose sets `COOKIE_SECURE=false` solely because localhost is plain HTTP.

## Local development

Requirements: Node.js 22+, npm, and PostgreSQL 16+.

```sh
npm ci
# Set DATABASE_URL and JWT_ACCESS_SECRET (at least 32 characters) in your shell.
npm run db:generate
npm run db:migrate
npm run db:seed
```

In separate terminals:

```sh
npm run api:dev
npm run dev
```

Vite proxies `/api` to `http://localhost:3000` (override with `API_PROXY_TARGET` if necessary). The demo seed also requires `SEED_ADMIN_PASSWORD`; set `SEED_ADMIN_EMAIL` if you want a different owner login.

## API and access control

All routes except `POST /api/auth/login` and `GET /api/health` require an active authenticated session. Login issues an HTTP-only, SameSite=Strict cookie scoped to `/api`; logout clears it. Passwords are bcrypt-hashed. DTO validation rejects unknown fields and malformed quantities.

| Capability | Admin | Storekeeper | Seller | Viewer |
|---|---:|---:|---:|---:|
| Read nursery data | Yes | Yes | Yes | Yes |
| Manage products, stock, production, purchase orders | Yes | Yes | No | No |
| Create sales | Yes | No | Yes | No |
| Archive products | Yes | No | No | No |

Roles are enforced by the API, not just hidden in the UI. User management is currently a UI-only roles matrix; admin invitation/password-reset workflows are a follow-up module.

## Production notes and next steps

- Commit every Prisma schema change together with a reviewed migration; production startup runs `prisma migrate deploy`, never `migrate dev`.
- Demo seed data is for presentations and must not be used as live nursery data. The seed owner password is explicitly supplied through environment configuration.
- Reports/export buttons remain presentation demos. Add server-generated CSV/XLSX/PDF reports and audit/backup workflows before operational rollout.
- Add automated integration tests against PostgreSQL (ledger invariants, concurrent sales, authorization, duplicate receiving), CI image scanning, TLS, observability, and a documented backup-restore drill before handling real business data.
- The app is designed as a single-nursery deployment. If multi-branch or multi-customer hosting becomes a requirement, add a tenant/organization boundary to every business record and authorization query before onboarding those customers.

# machtall
