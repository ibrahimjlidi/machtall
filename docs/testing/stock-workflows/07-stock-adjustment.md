# 07 — Count stock and request an approved adjustment

**Scenario status:** Phase 4 API regression coverage added; execute only against a disposable migrated database.

## Purpose

Verify that stockkeepers record a physical count, the server captures the ledger balance for the location, and only a manager-approved discrepancy changes stock.

## Project flow

```mermaid
flowchart LR
    subgraph FRONTEND["Frontend · React"]
        USER([Storekeeper]) --> FORM["Physical count form<br/>src/App.jsx"]
        FORM --> CLIENT["API client<br/>src/api.js"]
        CLIENT --> COUNT["POST /stock-counts"]
        COUNT --> COMPARE["Compare actual count<br/>with ledger quantity"]
        COMPARE --> IN["Create pending adjustment"]
    end
    subgraph BACKEND["Backend · NestJS"]
        GUARD["JWT + role guards"] --> CTRL["StockCountsController"]
        CTRL --> SERVICE["AdjustmentsService"]
        SERVICE --> VALIDATE["Record immutable count<br/>and create request if different"]
        REVIEW["Admin approval"] --> STALE["Reject approval if stock<br/>changed since the count"]
    end
    subgraph DATA["Database · PostgreSQL"]
        COUNTROW[(StockCount<br/>system + counted quantities)]
        REQUEST[(AdjustmentRequest)]
        INROW[(Approved adjustment movement)]
        STOCK["stock.ts<br/>sum signed movements"]
    end
    COUNT --> GUARD
    SERVICE --> COUNTROW
    SERVICE -->|"difference only"| REQUEST
    REQUEST --> REVIEW
    REVIEW --> STALE
    STALE -->|"unchanged"| INROW
    INROW --> STOCK
    STOCK --> RESULT["Exact count: no movement<br/>Difference: approved ledger entry"]
    RESULT -.-> FORM
    classDef actor fill:#eef7ef,stroke:#2e7d32,color:#18351b
    classDef ui fill:#e8f5e9,stroke:#2e7d32,color:#18351b
    classDef api fill:#edf2ff,stroke:#6475bd,color:#202b4a
    classDef data fill:#fff7e6,stroke:#f9a825,color:#493500
    classDef result fill:#f4efe9,stroke:#8d6e63,color:#3d302b
    class USER actor
    class FORM,CLIENT,COUNT,REVIEW ui
    class GUARD,CTRL,SERVICE,VALIDATE,STALE api
    class COUNTROW,REQUEST,INROW,STOCK data
    class RESULT result
```

## Project touchpoints

| Layer | Location | Responsibility in this test |
|---|---|---|
| UI | [`src/App.jsx`](../../../src/App.jsx) | Physical count form and manager review actions |
| Route / rules | [`adjustments.controller.ts`](../../../apps/api/src/movements/adjustments.controller.ts), [`adjustments.service.ts`](../../../apps/api/src/movements/adjustments.service.ts) | Count capture, discrepancy request, stale-count rejection, and approval |
| Data model | [`schema.prisma`](../../../apps/api/prisma/schema.prisma) | Immutable `StockCount`, linked `AdjustmentRequest`, and ledger movements |
| Stock math | [`stock.ts`](../../../apps/api/src/common/stock.ts) | Per-location balances and signed ledger calculations |

## Preconditions and test data

- Sign in as a Storekeeper and select an active test product at a known location.
- Submit an exact count and confirm that it creates history but no adjustment request.
- Submit a discrepant count and confirm stock does not change until an Admin approves it.

## Workflow

1. Open **Stock Movements → Physical count** and enter the product, location, counted quantity, and reason.
2. Verify the count stores both the system and counted quantities.
3. If they differ, verify a pending adjustment request is linked to the count and stock is unchanged.
4. Approve as a different Admin user and verify one reasoned movement is posted.
5. Change stock after another count and verify its stale adjustment cannot be approved.

## Expected results

- Exact counts are retained as immutable evidence and do not post movements.
- A discrepancy creates a manager-reviewed request linked to its count.
- Approval is rejected if the ledger balance at that location changed since the count.
- Approved adjustments create append-only inbound or outbound ledger movements.

## Automated coverage

Focused API regression coverage verifies exact counts, both discrepancy directions, approval/rejection, unchanged stock while pending, stale-count rejection, role restrictions, and audit events. The mutation-enabled API suite must run only on a disposable migrated database.

## Notes

Stockkeepers cannot submit arbitrary adjustment quantities or write adjustment movements directly. They report the physical count; the server computes the difference, and the manager approves or rejects the resulting request.
