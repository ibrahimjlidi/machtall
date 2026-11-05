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
- `apps/api/src/production` — assigned nursery tasks, care and loss history, batch growth, and atomic ready-to-stock conversion.
- `apps/api/src/purchasing` — suppliers' purchase orders and atomic receiving.
- `apps/api/src/sales` — POS sales, cash sessions, customer balances, credit approvals, and controlled returns.
- `apps/api/src/accounting` — expenses and approvals, supplier/customer payments, cash reconciliation, VAT-rate setup, and operational financial summaries.
- `apps/api/src/dashboard`, `reference`, `health` — read models, lookups, and readiness.
- `apps/api/prisma` — relational schema, migrations, and idempotent demo seed.

This is intentionally a **modular monolith**, not a collection of premature microservices. Domain modules own their controllers/services and share only the database and small common ledger helpers. The PostgreSQL movement ledger is the source of truth for inventory; physical counts are immutable evidence, and discrepancies become approved ledger adjustments rather than editable balances. Sales, customer-payment allocation, purchase receiving, and batch readiness persist their related records atomically.

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
# Set DATABASE_URL to the PostgreSQL instance reachable from this host, and
# JWT_ACCESS_SECRET (at least 32 characters) in your shell.
# Example: postgresql://mashtal:<url-encoded-password>@127.0.0.1:5432/mashtal?schema=public
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

The API end-to-end suite exercises every API module: authentication and session handling, dashboard, categories/supplier management and quotations, product creation/update/archive, movements and transfers, production task assignment/status and worker scoping, care logs, dated loss reports, growth-stage progression and ready-proposal verification/approval, purchase-order approval/rejection/send and quote-price snapshots, partial and damaged-goods receipts, supplier invoices and manager-reviewed return requests, physical counts with manager-approved adjustments, immutable inventory and production history, append-only audit history, sales and customer payments, POS cash sessions, credit-sale approvals, returns, expenses and approvals, supplier payments and balances, non-cash collections, cash-session review/variance approval, inactive VAT-rate configuration, operational financial reports, and user administration. It checks role restrictions, validation failures, overpayments, insufficient drawer funds, duplicate transitions, and persisted outcomes. It **mutates data** and must only be run against a separate, disposable, migrated, seeded test database. For isolation, start one with the test-only Compose override:

```sh
export POSTGRES_DB=mashtal_e2e
export POSTGRES_USER=mashtal_e2e
export POSTGRES_PASSWORD="$(openssl rand -hex 24)"
export JWT_ACCESS_SECRET="$(openssl rand -hex 48)"
export SEED_ADMIN_EMAIL=owner@e2e.test
export SEED_ADMIN_PASSWORD="$(openssl rand -hex 12)"
export SEED_VIEWER_EMAIL=viewer@e2e.test
export SEED_VIEWER_PASSWORD="$(openssl rand -hex 12)"
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
TEST_VIEWER_EMAIL="$SEED_VIEWER_EMAIL" \
TEST_VIEWER_PASSWORD="$SEED_VIEWER_PASSWORD" \
npm run test:e2e

docker compose -p mashtal-e2e -f compose.yaml -f compose.test.yaml down --volumes --remove-orphans
```

Never point this test at production or a database containing business data. The test refuses to run unless `ALLOW_TEST_DATA_MUTATION=true` is set explicitly. The optional `SEED_VIEWER_EMAIL` and `SEED_VIEWER_PASSWORD` seed a legacy read-only viewer fixture for role tests; set both together only in a disposable test environment.

GitHub Actions runs unit tests, the API end-to-end suite, both production builds, and Playwright UI tests on pushes to `main` and pull requests targeting `main`. The Playwright suite checks login errors, admin navigation through all application sections, logout, role-sensitive navigation, the supplier/quote/order purchasing screen, manager production-task assignment, and worker task, care, loss, growth, and ready-proposal actions. Its API responses are stubbed so UI tests do not depend on database contents.

To prevent a pull request from merging when any CI check fails, configure GitHub branch protection for `main`:

1. Open **Settings → Branches → Add branch protection rule** (or create a repository ruleset targeting `main`).
2. Enable **Require a pull request before merging**.
3. Enable **Require status checks to pass before merging** and select **Regression tests**.
4. If the policy must apply to administrators too, do not enable an administrator bypass.

The workflow runs on pull requests targeting `main` and on pushes to `main`. GitHub branch protection is a repository setting; adding the workflow alone does not block merges.

## API and access control

All routes except `POST /api/auth/login` and `GET /api/health` require an active authenticated session. Login issues an HTTP-only, SameSite=Strict cookie scoped to `/api`; logout clears it. The API checks that a user remains active and that the token has not been invalidated on every request. Passwords are bcrypt-hashed. DTO validation rejects unknown fields and malformed quantities.

| Capability | Admin | Storekeeper | Seller | Purchasing | Nursery worker | Accountant | Viewer |
|---|---:|---:|---:|---:|---:|---:|---:|
| Read product catalog | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Administer products and categories | Yes | No | No | No | No | No | No |
| Record stock movements | Yes | Yes | Sale deduction only | No | No | No | No |
| Create sales / POS | Yes | No | Yes | No | No | No | No |
| Record customer payments | Yes | No | Own customers | No | No | Yes | No |
| Read financial reports | All | No | No | No | No | Yes | No |
| Manage purchasing records | Approve/oversight | Receive orders | No | Create and track | No | Read-only | No |
| Work with production | Oversight/approval | Verify ready stock | No | No | Own or assigned batches | Read-only | No |
| Manage users, roles, and audit history | Yes | No | No | No | No | No | No |

Roles are enforced by the API, not just hidden in the UI. Admins can add users, change roles, disable accounts, and reset passwords. There is no email delivery or self-service forgotten-password flow: admins provide initial/reset passwords through a separate secure channel. Customer payments are recorded against outstanding balances; they are allocated to opening credit first, then to the customer's oldest unpaid credit sales.

### Seller POS boundary (Phase 3)

- Cash is the only supported immediate payment method. A seller must open a cash session with an opening float before completing a cash sale; closing records expected cash, counted cash, and variance. Cash ledger entries are append-only.
- Credit sales remain pending and do not change stock or customer balances until a manager approves them. A rejected or pending sale does not post inventory movements.
- Sellers can request returns for their own sales. A manager approves or rejects the request; a stockkeeper records the quantity accepted back into stock. Approved refunds use the original cash method and are recorded against an open manager cash session.
- The UI provides printable receipts and invoices. VAT and discounts are intentionally not applied until their rules and limits are configured; printed totals are tax-free and are not a claim of jurisdiction-specific invoice compliance.
- Confirmed sales are not deleted. Corrections use the return workflow; no direct sale-void workflow is included in this phase.

### Stock operations (Phase 4)

- A stockkeeper records receipts against sent purchase orders, including multiple partial deliveries. The order remains open until received quantities account for every ordered unit; over-receipts are rejected.
- Each receipt posts the full delivered quantity as `PURCHASE_IN`; damaged units are recorded as linked `LOSS_OUT`, so only undamaged units remain available. Receipt details and movements are transactional and append-only.
- Stockkeepers submit physical counts. The server captures the ledger quantity at that location; an exact count is recorded without changing stock, while a discrepancy creates a pending adjustment for manager review. Approval is blocked if ledger stock has changed since the count.
- Internal consumption is recorded separately as a reasoned `INTERNAL_ISSUE_OUT`. Transfers remain reasoned source-to-destination movements. Stock movement history can be exported as CSV.
- Stock corrections and receipts are never edited or deleted; corrections use a new approved movement or a new receipt.

### Purchasing (Phase 5)

- Supplier records can be created and updated by purchasing staff or the manager; archiving is used instead of deleting referenced suppliers.
- The purchasing screen surfaces products at or below their minimum stock levels and can export loaded orders, quotes, invoice references, and return statuses as CSV.
- Quotations are optional. Purchasing records supplier-specific product prices and validity dates for comparison. Purchase-order lines may select an unexpired quote line from the same supplier; the selected price is snapshotted. Without a selected quote, the current product purchase price is snapshotted.
- Purchase requests continue to require manager approval before the purchasing role can send the order. The stockkeeper remains the only staff role that posts receiving movements.
- Supplier invoices are recorded and reviewed as reference metadata only. Amounts, payments, payable balances, and accounting postings are deferred.
- Purchasing can submit supplier-return requests with product quantities and a reason. The manager approves or rejects the request; this phase records the decision only and does not change stock or post an accounting entry.
- See [the purchasing workflow test scenario](docs/testing/purchasing-workflows/01-quotes-supplier-lifecycle.md).

### Nursery production (Phase 6)

- The manager assigns tasks to active nursery workers. Workers advance their own assigned tasks and see only batches they created or batches linked to tasks assigned to them.
- Workers record care logs and dated, reasoned plant-loss events. These records are append-only; care does not consume stock, and losses update the batch's lost quantity without posting inventory movements.
- Batch growth advances through sowing, germination, and growing. Workers can propose a sale-ready quantity only from the growing stage; stock remains unchanged until stockkeeper verification and manager approval.
- See [the nursery production workflow test scenario](docs/testing/production-workflows/01-nursery-production.md).

## Production notes and next steps

- Commit every Prisma schema change together with a reviewed migration; production startup runs `prisma migrate deploy`, never `migrate dev`.
- Docker Compose constructs `DATABASE_URL` for the API and migration service using the internal hostname `db`, port `5432`, and `POSTGRES_DB`/`POSTGRES_USER`/`POSTGRES_PASSWORD`. Do not use `localhost` from inside those containers. Keep `POSTGRES_PASSWORD` URL-safe (for example, generate it with `openssl rand -hex 32`); the URL is assembled from it without percent-encoding.
- PostgreSQL applies `POSTGRES_USER` and `POSTGRES_PASSWORD` only when its data volume is initialized. Editing `.env` later does not change the password stored in an existing volume. If the API reports a database authentication failure after rotating the `.env` password, set the existing role password to the configured value without deleting the data volume:

  ```sh
  docker compose exec db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
  ```

  At the `psql` prompt, run `\password` and enter the value of `POSTGRES_PASSWORD` from `.env` twice (the input is hidden), then run `\q`. This changes the password for the exact `POSTGRES_USER` role without putting the secret in shell history or process arguments. Then:

  ```sh
  docker compose restart api
  curl -fsS http://127.0.0.1:8080/api/health
  ```

  The role name must match `POSTGRES_USER` exactly. The health endpoint must return `{"status":"ok","database":"ok",...}`; database readiness alone does not confirm API authentication.
- Demo seed data is for presentations and must not be used as live nursery data. The seed owner password is explicitly supplied through environment configuration.
- Reports are based on persisted inventory, sales, customer, and loss data. The inventory CSV opens in Excel; PDF output uses the browser's print/save-as-PDF dialog. These are operational reports, not audited accounting statements.
- Before handling real business data, complete an isolated backup/restore drill, configure TLS and secure cookies, rotate VPS secrets, and add monitoring/alerting and automated PostgreSQL integration tests for concurrent sales/payments, authorization, and duplicate receiving.
- The app is designed as a single-nursery deployment. If multi-branch or multi-customer hosting becomes a requirement, add a tenant/organization boundary to every business record and authorization query before onboarding those customers.

# machtall
