# 01 — Create a product with opening stock, then edit it

**Result: PASS** · Executed 2026-11-02  
**Verification:** Authenticated API integration check against PostgreSQL

## Purpose

Confirm that a newly created catalog item has its opening balance recorded in the stock ledger, and that changing descriptive/pricing fields does not overwrite that balance.

## Project flow

```mermaid
flowchart LR
    subgraph FRONTEND["Frontend · React"]
        USER([Admin / Storekeeper]) --> FORM["Product form<br/>src/App.jsx"]
        FORM --> CLIENT["API client<br/>src/api.js"]
    end
    subgraph BACKEND["Backend · NestJS"]
        GUARD["JWT + role guards"] --> CTRL["ProductsController"]
        CTRL --> SERVICE["ProductsService"]
    end
    subgraph DATA["Database · PostgreSQL"]
        PRODUCT[(Product)]
        MOVEMENT[(InventoryMovement)]
        LEDGER["stock.ts<br/>derive on-hand quantity"]
    end
    CLIENT -->|"POST create / PATCH edit"| GUARD
    SERVICE -->|"create item"| PRODUCT
    SERVICE -->|"opening balance only"| MOVEMENT
    PRODUCT --> LEDGER
    MOVEMENT --> LEDGER
    LEDGER --> RESULT["Quantity = 10<br/>edit leaves stock unchanged"]
    RESULT -.-> FORM
    classDef actor fill:#eef7ef,stroke:#2e7d32,color:#18351b
    classDef ui fill:#e8f5e9,stroke:#2e7d32,color:#18351b
    classDef api fill:#edf2ff,stroke:#6475bd,color:#202b4a
    classDef data fill:#fff7e6,stroke:#f9a825,color:#493500
    classDef result fill:#f4efe9,stroke:#8d6e63,color:#3d302b
    class USER actor
    class FORM,CLIENT ui
    class GUARD,CTRL,SERVICE api
    class PRODUCT,MOVEMENT,LEDGER data
    class RESULT result
```

## Project touchpoints

| Layer | Location | Responsibility in this test |
|---|---|---|
| UI | [`src/App.jsx`](../../../src/App.jsx) | Product form and save handler |
| API client | [`src/api.js`](../../../src/api.js) | Sends JSON requests and normalizes product fields |
| Route / rules | [`products.controller.ts`](../../../apps/api/src/products/products.controller.ts), [`products.service.ts`](../../../apps/api/src/products/products.service.ts) | Create/edit authorization and product rules |
| Data model | [`schema.prisma`](../../../apps/api/prisma/schema.prisma) | `Product`, `Category`, and `InventoryMovement` relations |
| Stock math | [`stock.ts`](../../../apps/api/src/common/stock.ts) | Computes quantity from movement ledger entries |

## Preconditions and test data

- Sign in with an Admin account.
- Use an existing category from the category lookup.
- Use a unique SKU/name to avoid conflicting with seeded products.
- Test values: size `1L`, purchase price `2.500 TND`, sale price `5.000 TND`, minimum `5`, location `مشتل 1`, opening quantity `10`.

## Workflow

1. Open **Products → Add product**.
2. Fill the required name, category, size, unit, prices, minimum stock, and location.
3. Enter `10` as the opening quantity and save.
4. Read the new product from the catalog and record its current quantity.
5. Edit the sale price to `5.500 TND` and update its minimum stock.
6. Read the item again.

## Expected results

- Product creation succeeds and the API returns the new item.
- Opening stock is represented as an inbound movement, not an independent editable quantity.
- Product quantity is `10` before and after the edit.
- The changed price/minimum values are returned by the product read.

## Actual result

The product was created and returned with **10 units**. Sale price/minimum edits were reflected, and the ledger-derived quantity remained **10**. **PASS.**

## Cleanup and notes

This test product was reused as the primary product in scenarios 02–07 and 09–10, then reduced to zero and archived. Its movement history remains for auditability.
