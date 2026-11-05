---
description: "Use when changing nursery inventory workflows, business roles, RBAC, authorization, purchasing, POS sales, production, accounting, or customer and supplier access. This is the target specification, not a claim that these features are implemented."
applyTo: ["apps/api/**/*.ts", "apps/api/prisma/**", "src/**", "tests/**"]
---

# Nursery ERP actors and target permissions

This document records the desired business model. Before implementing a workflow, use [the phased-delivery skill](../skills/nursery-erp-phased-delivery/SKILL.md), inspect the current API and UI, and agree on the specific phase. Do not treat this target as already implemented.

## Actors

| Actor | Intended responsibility | Important boundaries |
|---|---|---|
| Gérant (manager) | Overall operations, users and roles, products and categories, prices and discount limits, approvals, expenses oversight, returns and inventory corrections, production oversight, reports, settings, audit history, and staff performance | Sensitive or irreversible actions should be permission-checked, attributable, and auditable. |
| Responsable Stock (stockkeeper) | Product and stock visibility; receipts; internal issues; transfers; physical counts; damaged-stock records; low-stock alerts; movement history and stock reports | Must not edit or delete historical movements. Corrections are new, reasoned adjustments and may require manager approval. |
| Vendeur / Caissier (seller/cashier) | Product search and availability; cart; customer selection/creation if approved; sales; permitted discounts; payment; receipts; own sales history; cash-session open/close; return requests | Cannot change base prices or stock directly, exceed discount authority, or erase confirmed invoices. Stock decreases atomically with a completed sale. |
| Responsable Achats (purchasing) | Supplier records; low-stock review; purchase requests; quotations; supplier comparison; purchase orders; delivery follow-up; supplier invoices/returns and purchasing reports | Can prepare and submit orders for approval. Must not independently approve their own orders or confirm stock receipt unless explicitly authorized. |
| Jardinier / Ouvrier (nursery worker) | Planting and batch records; watering, treatment, pruning and care logs; growth stages; assigned daily tasks; losses and harvest-ready proposals | Reporting a loss or ready quantity does not itself post stock. Stockkeeper verifies and manager approval is applied where required. |
| Comptable (accountant) | Sales and purchase invoices, payment tracking, customer/supplier balances, expenses, cash review, VAT, financial reports and accounting exports | May record authorized financial entries but cannot directly change inventory quantities or create stock movements. |
| Client (external) | Optional self-service catalogue, search, cart, order/payment, invoices/history, complaints and return requests | Not an internal staff role. Build a separate, explicitly scoped portal only if requested. |
| Fournisseur (external) | Optional quotation and purchase-order responses, delivery/invoice documents, payment status and return responses | Not an internal staff role. Build a separate, explicitly scoped portal only if requested. |

## Target access principles

- Enforce authorization in API controllers/services; hiding a UI control is not security. Apply least privilege to read routes as well as write routes.
- Scope personal dashboards and seller history to the signed-in actor. Never expose all employees' data through a personal view unless an approved role permits it.
- Keep high-impact operations explicit and traceable: purchase approval, stock adjustment, stock receipt, plant disposal, discounts beyond a limit, returns, invoice voids/credit notes, cash closing, expenses, and role changes.
- Preserve immutable business history. Correct records with linked reversal/adjustment documents rather than silently editing or deleting completed transactions.
- Treat stock as a ledger: validate availability and apply sale deductions, receipts, transfers, losses and adjustments transactionally. A production-ready proposal is not available stock until verified/approved and posted.
- External accounts, role labels, approval limits, discount thresholds, tax rules, cash-drawer behavior, and document numbering require product decisions; do not invent them.

## Current implementation boundary

The Prisma enum defines `ADMIN`, `STOREKEEPER`, `SELLER`, `PURCHASING`, `NURSERY_WORKER`, `ACCOUNTANT`, and the temporary legacy `VIEWER`. Phase 1 establishes their API/UI access boundaries. Phase 2 adds manager approval workflows for purchases, stock adjustment requests, production-ready proposals, and privileged-action audit history. Phase 3 adds the seller POS workflows listed below. These implementations do not mean every target feature above is complete. Inspect controller decorators, service-level data scoping, frontend navigation/actions, schema and tests for each subsequent phase.

### Phase 3 — Seller POS decisions and boundaries

- Cash is the only supported immediate payment method. Sellers must open and close cash sessions; the system records opening float, cash sales/payments/refunds, expected and counted cash, and variance. Cash ledger entries are append-only.
- Discounts and VAT are deferred. Do not apply a discount or tax until a policy and configuration have been approved.
- Credit sales remain pending until manager approval. Pending/rejected credit sales do not post stock movements or affect customer balances.
- Sellers may request returns only for their own sales. Managers approve/reject; stockkeepers verify the quantity that can be restocked. Refunds use the original cash method and require an open manager cash session.
- Printable receipts and invoices are available. Confirmed sales are never deleted; this phase does not implement a separate void operation.

The source specification has potentially conflicting requirements: dashboard-global versus dashboard-personal access; whether a stockkeeper or manager confirms receiving; whether purchasing may receive; and who may read sales, customer balances, suppliers, production, and financial reports. Resolve such conflicts with the user before changing those permissions.

## Agreed Phase 0 decisions

- Implement the six internal roles as distinct roles: `ADMIN` (Gérant), `STOREKEEPER` (Responsable Stock), `SELLER` (Vendeur/Caissier), plus dedicated purchasing, nursery-worker, and accountant roles. Do not equate these roles or grant permissions by UI convention.
- Keep existing `VIEWER` accounts during migration as a temporary, read-only compatibility role. Do not create new viewer accounts. Until each existing account is reassigned, restrict it to dashboard, product, and stock read access; it must not read sales, customer balances, purchases, supplier, production, or financial data.
- Only the Gérant sees global business indicators. Other staff dashboards and reports are scoped to their approved role and, where applicable, their own records.
- Sellers may access customers associated with their own sales and only balances attributable to those sales. Seller payments must be allocated only to eligible seller-owned outstanding sales; do not expose a shared customer's other sellers' transactions or full balance as a shortcut.
- Purchasing prepares and submits purchase requests/orders. The Gérant approves them. After approval, the purchasing role may send and track the order; the stockkeeper verifies delivery and posts received stock. The requester cannot approve their own request; neither purchasing nor accounting can independently post stock receipt.
- The stockkeeper performs counts and records discrepancies as adjustment requests. The Gérant approves adjustments; approved changes are new, reasoned ledger entries, never edits/deletes of historical movements.
- Nursery workers record planting/care, losses, and ready-for-sale proposals. A proposal does not affect available stock; stockkeeper verification and required Gérant approval precede posting.
- The six-role target does not include customer or supplier logins. Any external portal is a separate, optional future phase.

## Approved permission baseline for implementation

| Capability | Gérant | Stockkeeper | Seller/Cashier | Purchasing | Nursery worker | Accountant | Legacy Viewer |
|---|---|---|---|---|---|---|---|
| Global dashboard and all reports | All | No | No | No | No | Financial only | No |
| Personal/role-scoped dashboard | Yes | Yes | Yes | Yes | Yes | Yes | Read-only dashboard |
| Products and stock visibility | All | Yes | Yes | Yes | Relevant materials | Read-only | Read-only |
| Product/category/pricing administration | Yes | No | No | No | No | No | No |
| Stock receipts, issues, transfers | Approve/oversight | Verify and post authorized operations | Sale deduction is automatic | No | No | No | No |
| Physical counts and adjustments | Approve adjustments | Count and request adjustments | No direct changes | No | Report losses only | Read-only where needed | No |
| Sales, customer data, and payments | All | No by default | Own sales/customers and attributable balances only | No | No | Read/record authorized financial entries | No |
| Purchasing and suppliers | Approve/oversight | Verify receipt; relevant read access | No | Create, submit, send approved orders; no approval/receiving | No | Relevant financial read access | No |
| Production and nursery-care records | Oversight | Read/verify stock posting | No | No | Record assigned work and proposals | Relevant read access | No |
| Expenses, cash review, and financial reports | Approve/oversight | No | Own cash-session actions; own sales history | Submit purchase-related requests only | No | Authorized financial operations | No |
| Users, roles, settings, audit administration | Yes | No | No | No | No | No | No |
| Returns | Approve/oversight | Verify stock disposition | Submit request; no approval | Supplier-return request | Report loss/damage | Financial review | No |

This is the approved target for subsequent phases, not a statement that all target behavior is shipped. Each next phase must inspect every relevant controller/service and UI action against this matrix, add explicit API read/write and ownership tests, and plan non-destructive migrations that preserve existing data. Any new high-impact flow must still receive its detailed validation, approval, and audit rules before implementation. Do not invent tax, discount, or other numeric approval settings without an explicit business decision.

## Phase 5 purchasing decisions

- Supplier quotations are optional. Purchasing can submit an order with or without a recorded quote.
- A purchase-order line may use a selected, unexpired quote line from that order's supplier. Its quoted unit price is snapshotted on the order line. If no quote line is selected, snapshot the product's current purchase price.
- During Phase 5, supplier invoices were reference metadata only; Phase 7 adds explicit amounts for new invoices and payment tracking. Historic invoices keep an unknown amount and must not be assigned a fabricated balance.
- Purchasing may submit a supplier-return request with product quantities and a reason; the Gérant approves or rejects it. Approval records the decision only and does not change stock or post an accounting entry.

## Phase 6 nursery production decisions

- The Gérant assigns production tasks to active nursery workers. A task may reference a production batch and an optional due date; workers alone advance their assigned task from open to in-progress to completed and may record a task note.
- Nursery workers can read and update only batches they created or batches linked to tasks assigned to them. They may record care/treatment logs with a type, date, and optional note; these logs do not consume inventory.
- Growth stages advance one step at a time from sowing to germination to growing. The ready stage remains reserved for the existing stockkeeper-verification and Gérant-approval workflow.
- Nursery workers record dated, reasoned plant-loss events. Loss records are append-only and increase the batch loss total transactionally; losses do not change sellable inventory. Losses cannot exceed surviving batch quantity, nor be entered while a ready proposal is under review or after stock posting.
- A ready proposal can only be submitted from the growing stage. Stock remains unchanged until the stockkeeper verifies the proposal and the Gérant approves the posting.

## Phase 7 accounting decisions

- The Comptable records expenses as pending; only the Gérant may approve or reject them. Rejected and pending expenses cannot be paid or counted in approved-expense reports. Approved expenses may be settled through separate partial/full payment records.
- New supplier invoices require a recorded total amount. Only reviewed amount-bearing invoices can be paid; historical invoices with an unknown amount remain visible but are excluded from invented payables and cannot be paid through the ledger.
- Customer, supplier, and expense payments support cash, bank transfer, and cheque. Bank transfers and cheques require a reference and never affect a cash drawer. Cash payments require a selected open cashier session; cash outflows are append-only and cannot exceed its expected drawer balance.
- Sellers close their own cash sessions. The Comptable reviews closed sessions; only the Gérant can approve a non-zero variance, after review. Session close, review, and variance approval are attributed and audited.
- The Gérant may configure named VAT percentages with effective dates. VAT application stays disabled until tax rates and HT/TTC pricing rules are supplied; receipts remain untaxed.
- Operational reports include sales, collections, approved expenses, balances/payables, and cash flows. They are not statutory statements and must not claim profit until an inventory costing/COGS method exists.
- Accounting users can record financial entries but cannot post inventory movements. External customer and supplier portals remain out of scope.
