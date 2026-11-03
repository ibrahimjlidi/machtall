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

This is intentionally a **modular monolith**, not a collection of premature microservices. Domain modules own their controllers/services and share only the database and small common ledger helpers. The PostgreSQL movement ledger is the source of truth for inventory; the app does not maintain a separately editable stock count. Sales, customer-payment allocation, purchase receiving, and batch readiness persist their related records atomically.

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

The API and database have no host-published ports; the browser reaches the API through Nginx at `/api`. The web port binds to loopback so a host reverse proxy can serve it without exposing the app directly. Set `APP_PORT` to a free port if needed. PostgreSQL data is stored in the `postgres_data` named volume. `docker compose logs -f api` shows API/migration logs, and `GET /api/health` checks application-to-database connectivity.

For an internet-facing deployment, configure a trusted reverse proxy with HTTPS and forward it to `127.0.0.1:${APP_PORT}`. Set `COOKIE_SECURE=true`, allow public ingress only on the TLS proxy ports, replace every example secret with unique random values, and rotate any credentials that have ever been shared or used as placeholders. The API now refuses placeholder JWT/database credentials; the demo seed also refuses placeholder admin passwords. Local Compose sets `COOKIE_SECURE=false` solely because localhost is plain HTTP.

### Backups and restore checks

Take regular PostgreSQL backups and copy them off the VPS using encrypted storage. Restrict local backup-file permissions and test restore into a separate, empty database before relying on a backup:

```sh
mkdir -p backups
chmod 700 backups
docker compose exec -T db sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip > "backups/mashtal-$(date -u +%F-%H%M%S).sql.gz"
```

Keep the backup encryption key separate from the server. A restore replaces data in its target database; use a separate database/volume for restore drills, and never test restoration over the live nursery database.

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

### Tests

```sh
npm run test:unit
npx playwright install --with-deps chromium
npm run test:ui
```

The unit tests use Node's test runner. Playwright starts Vite and stubs the login API, so UI tests do not need a database or real user credentials.

The API end-to-end suite exercises every API module: authentication and session handling, dashboard, categories/suppliers, product creation/update/archive, movements and transfers, production batches, purchase-order send/receive, sales/customer payments, reports, and user administration. It checks role restrictions, validation failures, duplicate transitions, and persisted outcomes. It **mutates data** and must only be run against a separate, disposable, migrated, seeded test database. For isolation, start one with the test-only Compose override:

```sh
export POSTGRES_DB=mashtal_e2e
export POSTGRES_USER=mashtal_e2e
export POSTGRES_PASSWORD="$(openssl rand -hex 24)"
export JWT_ACCESS_SECRET="$(openssl rand -hex 48)"
export SEED_ADMIN_EMAIL=owner@e2e.test
export SEED_ADMIN_PASSWORD="$(openssl rand -hex 12)"
export COOKIE_SECURE=false
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:15432/${POSTGRES_DB}?schema=public"
docker compose -p mashtal-e2e -f compose.yaml -f compose.test.yaml up -d db
npm run db:migrate
npm run db:seed

# In a second terminal, set the same DATABASE_URL and JWT_ACCESS_SECRET values:
npm run api:dev

ALLOW_TEST_DATA_MUTATION=true \
API_BASE_URL=http://localhost:3000/api \
TEST_ADMIN_EMAIL="$SEED_ADMIN_EMAIL" \
TEST_ADMIN_PASSWORD="$SEED_ADMIN_PASSWORD" \
npm run test:e2e

docker compose -p mashtal-e2e -f compose.yaml -f compose.test.yaml down --volumes --remove-orphans
```

Never point this test at production or a database containing business data. The test refuses to run unless `ALLOW_TEST_DATA_MUTATION=true` is set explicitly.

GitHub Actions runs unit tests, the API end-to-end suite, both production builds, and Playwright UI tests on pushes to `main` and pull requests targeting `main`. The Playwright suite checks login errors, admin navigation through all application sections, logout, and role-sensitive navigation; its API responses are stubbed so it does not depend on database contents.

To prevent a pull request from merging when any CI check fails, configure GitHub branch protection for `main`:

1. Open **Settings → Branches → Add branch protection rule** (or create a repository ruleset targeting `main`).
2. Enable **Require a pull request before merging**.
3. Enable **Require status checks to pass before merging** and select **Regression tests**.
4. If the policy must apply to administrators too, do not enable an administrator bypass.

The workflow runs on pull requests targeting `main` and on pushes to `main`. GitHub branch protection is a repository setting; adding the workflow alone does not block merges.

## API and access control

All routes except `POST /api/auth/login` and `GET /api/health` require an active authenticated session. Login issues an HTTP-only, SameSite=Strict cookie scoped to `/api`; logout clears it. The API checks that a user remains active and that the token has not been invalidated on every request. Passwords are bcrypt-hashed. DTO validation rejects unknown fields and malformed quantities.

| Capability | Admin | Storekeeper | Seller | Viewer |
|---|---:|---:|---:|---:|
| Read nursery data | Yes | Yes | Yes | Yes |
| Manage products, stock, production, purchase orders | Yes | Yes | No | No |
| Create sales | Yes | No | Yes | No |
| Archive products | Yes | No | No | No |

Roles are enforced by the API, not just hidden in the UI. Admins can add users, change roles, disable accounts, and reset passwords. There is no email delivery or self-service forgotten-password flow: admins provide initial/reset passwords through a separate secure channel. Customer payments are recorded against outstanding balances; they are allocated to opening credit first, then to the customer's oldest unpaid credit sales.

## Production notes and next steps

- Commit every Prisma schema change together with a reviewed migration; production startup runs `prisma migrate deploy`, never `migrate dev`.
- Demo seed data is for presentations and must not be used as live nursery data. The seed owner password is explicitly supplied through environment configuration.
- Reports are based on persisted inventory, sales, customer, and loss data. The inventory CSV opens in Excel; PDF output uses the browser's print/save-as-PDF dialog. These are operational reports, not audited accounting statements.
- Before handling real business data, complete an isolated backup/restore drill, configure TLS and secure cookies, rotate VPS secrets, and add monitoring/alerting and automated PostgreSQL integration tests for concurrent sales/payments, authorization, and duplicate receiving.
- The app is designed as a single-nursery deployment. If multi-branch or multi-customer hosting becomes a requirement, add a tenant/organization boundary to every business record and authorization query before onboarding those customers.

# machtall
