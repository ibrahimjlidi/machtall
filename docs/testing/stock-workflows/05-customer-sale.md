# 05 — Record a paid customer sale

**Result: PASS** · Executed 2026-11-02  
**Verification:** Authenticated API integration check against PostgreSQL

## Purpose

Verify that sale creation validates available stock and writes the sale and sale-out movement together.

## Project flow

```mermaid
flowchart LR
    subgraph FRONTEND["Frontend · React"]
        USER([Admin / Seller]) --> FORM["Sales screen<br/>src/App.jsx"]
        FORM --> CLIENT["API client<br/>src/api.js"]
        CLIENT --> REFRESH["Refresh sales and catalog"]
    end
    subgraph BACKEND["Backend · NestJS"]
        GUARD["JWT + role guards"] --> CTRL["SalesController"]
        CTRL --> SERVICE["SalesService<br/>aggregate lines + check stock"]
        SERVICE --> TX["Serializable transaction"]
        STOCK["stock.ts<br/>product and location balances"]
    end
    subgraph DATA["Database · PostgreSQL"]
        CUSTOMER[(Customer)]
        SALE[(Sale + SaleLine)]
        MOVEMENT[(InventoryMovement)]
    end
    CLIENT -->|"POST /api/sales"| GUARD
    SERVICE --> CUSTOMER
    SERVICE --> STOCK
    TX --> SALE
    TX -->|"SALE_OUT by location"| MOVEMENT
    MOVEMENT --> STOCK
    REFRESH -->|"GET products / sales / customers"| GUARD
    SALE --> RESULT["Sale recorded<br/>On hand: 24 → 22"]
    RESULT -.-> FORM
    classDef actor fill:#eef7ef,stroke:#2e7d32,color:#18351b
    classDef ui fill:#e8f5e9,stroke:#2e7d32,color:#18351b
    classDef api fill:#edf2ff,stroke:#6475bd,color:#202b4a
    classDef data fill:#fff7e6,stroke:#f9a825,color:#493500
    classDef result fill:#f4efe9,stroke:#8d6e63,color:#3d302b
    class USER actor
    class FORM,CLIENT,REFRESH ui
    class GUARD,CTRL,SERVICE,TX,STOCK api
    class CUSTOMER,SALE,MOVEMENT data
    class RESULT result
```

## Project touchpoints

| Layer | Location | Responsibility in this test |
|---|---|---|
| UI | [`src/App.jsx`](../../../src/App.jsx) | Sale form, quantity precheck, and submit handler |
| Route / rules | [`sales.controller.ts`](../../../apps/api/src/sales/sales.controller.ts), [`sales.service.ts`](../../../apps/api/src/sales/sales.service.ts) | Role enforcement, stock validation, transactional sale |
| Data model | [`schema.prisma`](../../../apps/api/prisma/schema.prisma) | `Sale`, `SaleLine`, `Customer`, and linked movements |
| Stock math | [`stock.ts`](../../../apps/api/src/common/stock.ts) | Validates total balance and finds location balances |

## Preconditions and test data

- Sign in with an Admin account (the Seller role is also authorized to create sales).
- Select an active seeded customer.
- Use the active test product at **24 units**.
- Sale line: quantity `2`; payment status `PAID`.

## Workflow

1. Open **Sales → New sale**.
2. Select the customer.
3. Add the test product with quantity `2`.
4. Select **Paid** and confirm the sale.
5. Check the created sale and reload the product catalog.

## Expected results

- Sale is created with the selected customer, line quantity, price, and payment status.
- A `SALE_OUT` movement is created and linked to the sale line.
- Quantity changes from `24` to `22`.

## Actual result

A paid sale was created successfully. Product stock decreased from **24 to 22**, and the sale and inventory movement were persisted together. **PASS.**

## Notes

Credit sales can be selected as well, but this scenario covers the paid path. Payment collection/settlement is not implemented in the demo.
