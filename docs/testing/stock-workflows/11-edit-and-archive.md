# 11 — Edit and archive a product safely

**Result: PASS** · Executed 2026-11-02  
**Verification:** Authenticated API integration check against PostgreSQL

## Purpose

Verify product edits persist, an Admin cannot archive an item with stock, and a zero-stock item can be soft-archived.

## Project flow

```mermaid
flowchart LR
    subgraph FRONTEND["Frontend · React"]
        USER([Admin]) --> PAGE["Product screen<br/>src/App.jsx"]
        PAGE --> CLIENT["API client<br/>src/api.js"]
    end
    subgraph BACKEND["Backend · NestJS"]
        GUARD["JWT + role guards"] --> CTRL["ProductsController"]
        CTRL --> SERVICE["ProductsService"]
        SERVICE --> STOCK["stock.ts<br/>calculate on-hand quantity"]
        STOCK --> CHECK{"Stock = 0?"}
    end
    subgraph DATA["Database · PostgreSQL"]
        PRODUCT[(Product)]
        MOVEMENT[(InventoryMovement)]
    end
    CLIENT -->|"PATCH edit / DELETE archive"| GUARD
    SERVICE -->|"edit fields"| PRODUCT
    SERVICE --> STOCK
    MOVEMENT --> STOCK
    CHECK -->|"No · HTTP 409"| BLOCKED["Keep product active<br/>stock still exists"]
    CHECK -->|"Yes"| ARCHIVE["Set active = false"]
    ARCHIVE --> PRODUCT
    PRODUCT --> RESULT["Hidden from active catalog<br/>history retained"]
    RESULT -.-> PAGE
    classDef actor fill:#eef7ef,stroke:#2e7d32,color:#18351b
    classDef ui fill:#e8f5e9,stroke:#2e7d32,color:#18351b
    classDef api fill:#edf2ff,stroke:#6475bd,color:#202b4a
    classDef data fill:#fff7e6,stroke:#f9a825,color:#493500
    classDef result fill:#f4efe9,stroke:#8d6e63,color:#3d302b
    class USER actor
    class PAGE,CLIENT ui
    class GUARD,CTRL,SERVICE,STOCK,CHECK,ARCHIVE api
    class PRODUCT,MOVEMENT data
    class BLOCKED,RESULT result
```

## Project touchpoints

| Layer | Location | Responsibility in this test |
|---|---|---|
| UI | [`src/App.jsx`](../../../src/App.jsx) | Edit form and confirmation before archive |
| Route / roles | [`products.controller.ts`](../../../apps/api/src/products/products.controller.ts) | Admin-only archive and Admin/Storekeeper edit routes |
| Business rules | [`products.service.ts`](../../../apps/api/src/products/products.service.ts) | Refuses archive while ledger stock is positive; soft-archives at zero |
| Data model | [`schema.prisma`](../../../apps/api/prisma/schema.prisma) | `Product.active` keeps archived products and history linked |
| Stock math | [`stock.ts`](../../../apps/api/src/common/stock.ts) | Supplies on-hand quantity for archive guard |

## Preconditions and test data

- Sign in with the Admin role; product archiving is Admin-only.
- Use one active product for the edit check.
- Create a separate active product with **1 unit** for the archive guard check.

## Workflow

1. Edit an active product's localized name or sale price and read it again.
2. Attempt to archive the separate product while its quantity is `1`.
3. Record a valid `LOSS_OUT` of `1` from its stocked location.
4. Retry the archive.
5. Refresh the active product catalog and inspect movement history.

## Expected results

- Product changes persist.
- Archive with positive stock returns a conflict and leaves the product active.
- Archive at zero succeeds and the product is removed from the active catalog.
- Existing movement history is retained (soft archive).

## Actual result

Edits persisted. Archiving with stock returned **HTTP 409 Conflict**. After a one-unit stock-out, archiving returned success and the item disappeared from the active catalog. **PASS.**

## Notes

Archiving does not delete the database row or its related ledger records. It marks the item inactive, preserving references and history.
