# 04 — Convert a production batch into sale-ready stock

**Result: PASS** · Executed 2026-11-02  
**Verification:** Authenticated API integration check against PostgreSQL

## Purpose

Verify that marking a batch ready posts only its surviving seedlings as a production-in movement, and that the transition is one-time.

## Project flow

```mermaid
flowchart LR
    subgraph FRONTEND["Frontend · React"]
        USER([Admin / Storekeeper]) --> FORM["Production screen<br/>src/App.jsx"]
        FORM --> CLIENT["API client<br/>src/api.js"]
        CLIENT --> READY["Mark batch ready"]
    end
    subgraph BACKEND["Backend · NestJS"]
        GUARD["JWT + role guards"] --> CTRL["ProductionController"]
        CTRL --> SERVICE["ProductionService"]
        SERVICE --> TX["Database transaction"]
        TX --> CHECK{"Batch already ready?"}
    end
    subgraph DATA["Database · PostgreSQL"]
        BATCH[(ProductionBatch)]
        MOVEMENT[(InventoryMovement)]
        STOCK["stock.ts<br/>derive on-hand quantity"]
    end
    CLIENT -->|"POST create / POST :id/ready"| GUARD
    SERVICE -->|"create sowing batch"| BATCH
    TX -->|"stage = READY"| BATCH
    TX -->|"PRODUCTION_IN: 6 − 1 = 5"| MOVEMENT
    MOVEMENT --> STOCK
    CHECK -->|"No"| RESULT["On hand: 19 → 24"]
    CHECK -->|"Yes · HTTP 409"| BLOCKED["No second stock entry"]
    RESULT -.-> FORM
    classDef actor fill:#eef7ef,stroke:#2e7d32,color:#18351b
    classDef ui fill:#e8f5e9,stroke:#2e7d32,color:#18351b
    classDef api fill:#edf2ff,stroke:#6475bd,color:#202b4a
    classDef data fill:#fff7e6,stroke:#f9a825,color:#493500
    classDef result fill:#f4efe9,stroke:#8d6e63,color:#3d302b
    class USER actor
    class FORM,CLIENT,READY ui
    class GUARD,CTRL,SERVICE,TX,CHECK api
    class BATCH,MOVEMENT,STOCK data
    class RESULT,BLOCKED result
```

## Project touchpoints

| Layer | Location | Responsibility in this test |
|---|---|---|
| UI | [`src/App.jsx`](../../../src/App.jsx) | Batch form and ready action |
| Route / rules | [`production.controller.ts`](../../../apps/api/src/production/production.controller.ts), [`production.service.ts`](../../../apps/api/src/production/production.service.ts) | Batch validation and one-time ready transaction |
| Data model | [`schema.prisma`](../../../apps/api/prisma/schema.prisma) | `ProductionBatch` and `InventoryMovement` |
| Stock math | [`stock.ts`](../../../apps/api/src/common/stock.ts) | `PRODUCTION_IN` is included in inventory balance |

## Preconditions and test data

- Sign in with an Admin account.
- Use the active test product at **19 units** and an active product lookup.
- Batch values: quantity sown `6`, quantity lost `1`, stage `SOWING`, expected ready date in the future.
- Expected ready quantity: `6 - 1 = 5`.

## Workflow

1. Open **Production** and create a batch linked to the test product.
2. Enter the seed type, sowing date, quantity sown, loss count, and expected-ready date.
3. Mark the batch **Ready**.
4. Read product quantity and movement history.
5. Attempt to mark the same batch ready again.

## Expected results

- Batch transitions to `READY`.
- A `PRODUCTION_IN` movement adds exactly 5 units.
- Quantity changes from `19` to `24`.
- A repeated ready transition is rejected without adding stock.

## Actual result

The ready action posted **5 plants**, taking stock from **19 to 24**. A repeated transition returned **HTTP 409 Conflict**. **PASS.**

## Notes

Ready conversion and its inventory movement are performed in one transaction. The batch cannot be edited or posted again after becoming ready.
