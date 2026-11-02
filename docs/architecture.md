# Project structure and workflow architecture

This project uses a **modular monolith**: one React client, one NestJS API, and one PostgreSQL database. The modules are separated by business responsibility, while remaining deployable together.

## Request and data flow

```mermaid
flowchart LR
    U[Owner or staff member] --> UI[React UI<br/>src/App.jsx]
    UI --> CLIENT[API client<br/>src/api.js]
    CLIENT -->|same-origin /api + session cookie| PROXY[Nginx<br/>nginx.conf]
    PROXY --> API[NestJS API<br/>apps/api/src]
    API --> AUTH[Authentication and role guards]
    AUTH --> MODULE[Business module<br/>controller → service]
    MODULE --> PRISMA[Prisma service and ORM]
    PRISMA --> DB[(PostgreSQL)]
    DB --> PRISMA --> MODULE --> API --> CLIENT --> UI
```

## Repository map

| Path | Responsibility |
|---|---|
| [`src/App.jsx`](../src/App.jsx) | React screens, navigation, workflow forms, client-side alerts, and page composition |
| [`src/api.js`](../src/api.js) | Same-origin API requests, cookie-session marker, and API response normalization |
| [`apps/api/src/main.ts`](../apps/api/src/main.ts) | NestJS bootstrap, `/api` prefix, Helmet, and DTO validation |
| [`apps/api/src/app.module.ts`](../apps/api/src/app.module.ts) | Composition root that registers the domain modules |
| [`apps/api/src/auth/`](../apps/api/src/auth/) | Login/session authentication, JWT guard, roles decorator, and authorization guard |
| [`apps/api/src/products/`](../apps/api/src/products/) | Product catalog, opening balances, edits, and archive rules |
| [`apps/api/src/movements/`](../apps/api/src/movements/) | Inventory ledger movements, outbound validation, and transfers |
| [`apps/api/src/purchasing/`](../apps/api/src/purchasing/) | Suppliers' purchase orders and receiving |
| [`apps/api/src/production/`](../apps/api/src/production/) | Production batches and ready-to-stock conversion |
| [`apps/api/src/sales/`](../apps/api/src/sales/) | Sales, customer lookup/balances, and transactional stock-out |
| [`apps/api/src/dashboard/`](../apps/api/src/dashboard/) | Server-side summary metrics for the dashboard |
| [`apps/api/src/common/stock.ts`](../apps/api/src/common/stock.ts) | Shared ledger-to-stock and per-location balance calculations |
| [`apps/api/src/prisma/`](../apps/api/src/prisma/) | Database connection service shared by modules |
| [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma) | PostgreSQL entities, relationships, and enums |
| [`apps/api/prisma/migrations/`](../apps/api/prisma/migrations/) | Versioned schema changes applied by Prisma Migrate |
| [`compose.yaml`](../compose.yaml) | Docker services, networks, health checks, seed profile, and database volume |

## How to read a scenario diagram

Each workflow test includes a node-and-connector Mermaid flowchart and **Project touchpoints** table:

1. **Frontend** — the user, React page/form, and API client.
2. **Backend** — authentication/role guards, controller, and domain service.
3. **Data** — relevant PostgreSQL models and shared stock calculations.
4. **Result** — the returned quantity/status, rejection path, or UI-only behavior.

Inventory quantity is derived from `InventoryMovement` records. A successful business operation creates the related movement in the same transaction where indicated; the UI then reloads the relevant workspace data.

The flowcharts use color-coded nodes to distinguish frontend, backend, persistence, and result. Their left-to-right layout is intended to make the architecture and branch/validation paths legible in Markdown previews that support Mermaid.

## Module boundaries

- `AppModule` composes the modules; domain services should not be collapsed into a single global workflow service.
- Controllers handle HTTP routes and role restrictions; services handle business rules and database transactions.
- `common/stock.ts` is shared domain support for calculating stock from the movement ledger.
- Prisma schema/migrations define durable data structures; UI labels and display state are not the source of truth for inventory.
- Dashboard alerts and report presentation are partly computed/rendered in the frontend. A UI card is not automatically a server-side report or downloadable export.

See the [workflow test report](testing/stock-workflows/README.md) for what was exercised and the known demo-only behavior.
