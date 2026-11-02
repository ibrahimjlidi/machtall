# 06 — Record a plant loss or mortality

**Result: PASS** · Executed 2026-11-02  
**Verification:** Authenticated API integration check against PostgreSQL

## Purpose

Verify that a loss movement records the reason and reduces on-hand inventory.

## Project flow

```mermaid
flowchart LR
    subgraph FRONTEND["Frontend · React"]
        USER([Admin / Storekeeper]) --> FORM["Loss movement form<br/>src/App.jsx"]
        FORM --> CLIENT["API client<br/>src/api.js"]
        CLIENT --> REFRESH["Refresh product and movement list"]
    end
    subgraph BACKEND["Backend · NestJS"]
        GUARD["JWT + role guards"] --> CTRL["MovementsController"]
        CTRL --> SERVICE["MovementsService<br/>validate available quantity"]
        SERVICE --> STOCK["stock.ts<br/>product + source-location balance"]
    end
    subgraph DATA["Database · PostgreSQL"]
        PRODUCT[(Product)]
        MOVEMENT[(InventoryMovement<br/>reason: disease)]
    end
    CLIENT -->|"POST /api/movements · LOSS_OUT"| GUARD
    SERVICE --> PRODUCT
    SERVICE --> STOCK
    SERVICE -->|"insert if stock is sufficient"| MOVEMENT
    MOVEMENT --> STOCK
    REFRESH -->|"GET /api/products + /api/movements"| GUARD
    STOCK --> RESULT["Loss −1<br/>On hand: 22 → 21"]
    RESULT -.-> FORM
    classDef actor fill:#eef7ef,stroke:#2e7d32,color:#18351b
    classDef ui fill:#e8f5e9,stroke:#2e7d32,color:#18351b
    classDef api fill:#edf2ff,stroke:#6475bd,color:#202b4a
    classDef data fill:#fff7e6,stroke:#f9a825,color:#493500
    classDef result fill:#f4efe9,stroke:#8d6e63,color:#3d302b
    class USER actor
    class FORM,CLIENT,REFRESH ui
    class GUARD,CTRL,SERVICE,STOCK api
    class PRODUCT,MOVEMENT data
    class RESULT result
```

## Project touchpoints

| Layer | Location | Responsibility in this test |
|---|---|---|
| UI | [`src/App.jsx`](../../../src/App.jsx) | Loss reason selector and movement submission |
| Route / rules | [`movements.controller.ts`](../../../apps/api/src/movements/movements.controller.ts), [`movements.service.ts`](../../../apps/api/src/movements/movements.service.ts) | Validates stock before inserting outbound movement |
| Data model | [`schema.prisma`](../../../apps/api/prisma/schema.prisma) | `InventoryMovement` stores type, reason, user, and location |
| Stock math | [`stock.ts`](../../../apps/api/src/common/stock.ts) | `LOSS_OUT` subtracts from product and source-location stock |

## Preconditions and test data

- Sign in with an Admin or Storekeeper account.
- Use the active test product at **22 units** in `مشتل 1`.
- Movement values: type `LOSS_OUT`, quantity `1`, reason `disease`.

## Workflow

1. Open **Stock Movements → New movement**.
2. Select the test product and **Loss OUT**.
3. Enter quantity `1`, select the source location, and choose a reason such as disease, frost, drought, or damage.
4. Save the movement.
5. Check product quantity and movement history.

## Expected results

- Request is accepted while available stock is sufficient at the selected location.
- A loss movement contains the selected reason and location.
- Quantity changes from `22` to `21`.

## Actual result

The disease-related loss was accepted. Stock decreased from **22 to 21**, and the movement was available in history. **PASS.**

## Notes

Loss reason is movement metadata; it does not change how much the ledger subtracts. The same outbound guard applies to all loss movements.
