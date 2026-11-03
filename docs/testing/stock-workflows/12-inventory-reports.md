# 12 — Review inventory, movements, and reports

**Historical result: PASS for viewing; exports had demo limitations** · Executed 2026-11-02
**Verification:** Authenticated API checks and Arabic browser UI

> This is a dated record of the 2026-11-02 demo. On 2026-11-03 the report page was changed to load persisted report data, download an Excel-compatible CSV, and open a printable PDF view. Those newer behaviors require a fresh verification after the database migration and deployment.

## Purpose

Confirm that inventory valuation and movement history are available for review, and distinguish implemented report views from presentation-only export controls at the time of this test.

## Project flow

```mermaid
flowchart LR
    subgraph FRONTEND["Frontend · React"]
        USER([Admin / Viewer]) --> PAGE["Dashboard + Reports<br/>src/App.jsx"]
        PAGE --> CLIENT["API client<br/>src/api.js"]
        PAGE --> SUMMARY["UI valuation table<br/>and report cards"]
        EXPORT["Excel / PDF buttons (as tested)"]
    end
    subgraph BACKEND["Backend · NestJS"]
        DASHBOARD["DashboardController"]
        PRODUCTS["ProductsController"]
        MOVEMENTS["MovementsController"]
        SALES["SalesController"]
        STOCK["stock.ts<br/>derive product balances"]
    end
    subgraph DATA["Database · PostgreSQL"]
        PRODUCT[(Product)]
        LEDGER[(InventoryMovement)]
        SALE[(Sale + SaleLine)]
    end
    CLIENT --> DASHBOARD
    CLIENT --> PRODUCTS
    CLIENT --> MOVEMENTS
    CLIENT --> SALES
    DASHBOARD --> PRODUCT
    DASHBOARD --> LEDGER
    PRODUCTS --> PRODUCT
    MOVEMENTS --> LEDGER
    SALES --> SALE
    LEDGER --> STOCK
    PRODUCT --> SUMMARY
    STOCK --> SUMMARY
    SALE --> SUMMARY
    EXPORT --> MOCK["Demo toast only<br/>as tested on 2026-11-02"]
    SUMMARY --> RESULT["Current inventory view<br/>not formal accounting"]
    classDef actor fill:#eef7ef,stroke:#2e7d32,color:#18351b
    classDef ui fill:#e8f5e9,stroke:#2e7d32,color:#18351b
    classDef api fill:#edf2ff,stroke:#6475bd,color:#202b4a
    classDef data fill:#fff7e6,stroke:#f9a825,color:#493500
    classDef result fill:#f4efe9,stroke:#8d6e63,color:#3d302b
    class USER actor
    class PAGE,CLIENT,SUMMARY,EXPORT ui
    class DASHBOARD,PRODUCTS,MOVEMENTS,SALES,STOCK api
    class PRODUCT,LEDGER,SALE data
    class MOCK,RESULT result
```

## Project touchpoints

| Layer | Location | Responsibility in this test |
|---|---|---|
| UI | [`src/App.jsx`](../../../src/App.jsx) | Displays the report page and export controls |
| API reads | [`reports.service.ts`](../../../apps/api/src/reports/reports.service.ts), dashboard, products/movements/sales services | Return persisted summary and date-filtered report inputs |
| Data model | [`schema.prisma`](../../../apps/api/prisma/schema.prisma) | Products, movements, sales, payments, and sale lines |
| Stock math | [`stock.ts`](../../../apps/api/src/common/stock.ts) | Converts movements to on-hand quantities |
| Architecture | [`architecture.md`](../../architecture.md) | Explains presentation versus API/data responsibilities |

## Preconditions

- Sign in as Admin.
- Seeded nursery data and scenario-generated test history are available.
- The tested primary product has a sale, loss, purchase, production, adjustment, and transfer history.

## Workflow

1. Read the dashboard summary and verify that stock value and low-stock values are numeric.
2. Open **Stock Movements** and inspect the tested product's movement list.
3. Open **Reports** and review the inventory valuation table and available summary cards.
4. Click **Export Excel**, then **Export PDF**, and observe the response.

## Expected results

- Dashboard summary loads successfully.
- Movement history shows the product's recorded stock operations.
- Reports page presents the current inventory valuation and report summaries.
- At the time of this dated test, any mock-only export behavior is identified rather than mistaken for a generated report.

## Actual result

The dashboard returned numeric valuation and alert metrics. History contained **13 movements** for the primary test product, including purchase, production, sale, loss, adjustment, and transfer. The browser rendered the inventory valuation table and report cards. Both export buttons displayed demo confirmation toasts. **PASS for viewing on the execution date.**

## Limitations

- On the execution date, Excel/PDF controls did **not** generate or download files; they only showed confirmation messages.
- Seasonal sales and some report summaries contain presentation/demo data and were not reconciled against formal accounting records.
- Do not use these views as official financial statements.
