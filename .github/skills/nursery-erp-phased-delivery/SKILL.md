---
name: nursery-erp-phased-delivery
description: "Use when planning or implementing nursery ERP roles, permissions, inventory, POS sales, purchasing, production, finance, customer/supplier portals, or when asked to work phase by phase. Guides safe, testable delivery of one agreed business phase."
---

# Nursery ERP phased delivery

Deliver a coherent, production-minded nursery-management system in small, reviewable phases. The actor/permission target is in [the nursery ERP instruction](../../instructions/nursery-erp.instructions.md); it is a desired specification, not the current feature set.

## Workflow

1. **Establish the request boundary.** If the user asks for an overview or plan, do not modify code. For implementation requests, identify the requested phase and list the in-scope behavior and explicit exclusions.
2. **Inspect current behavior.** Trace relevant UI, API routes, service logic, Prisma models/migrations, current role checks, and tests. Distinguish implemented behavior from target requirements.
3. **Resolve business decisions first.** Ask concise, structured questions when requirements affect permissions, financial treatment, approval, data visibility, irreversible actions, or workflow ownership. Do not invent discount/VAT policy, approval limits, external portals, or role equivalences.
4. **Plan only the next phase.** Define acceptance criteria, data/API/UI changes, authorization and data-scoping rules, migration/rollback implications, and focused tests. Do not implement later roadmap phases unless the user explicitly authorizes them.
5. **Implement end to end.** Enforce permissions server-side, reflect them in UI navigation and actions, preserve auditability and transaction safety, update directly related documentation, and add tests for allowed and rejected cases.
6. **Validate and stop at the phase boundary.** Run the focused tests after each logical change, then follow workspace regression instructions. Report exact commands/results and any unrun checks. Do not deploy or mutate a live/business database.
7. **Hand off the next phase.** Summarize what is complete, what remains, decisions made, and the next proposed phase. Wait for authorization before starting it.

## Suggested roadmap

Treat these as independent, shippable phases—not a commitment to implement them all in one task.

0. **Permission baseline and decisions:** map existing routes/UI to the target, resolve conflicting policies, write an approved role/action matrix, and add authorization/data-scope tests.
1. **Authorization foundation:** define agreed internal roles and least-privilege read/write access; scope personal views; align UI navigation/actions; migrate safely and test every role. Preserve or explicitly migrate existing user roles.
2. **Manager controls and auditability:** user/role administration, settings and approval rules, attributable approvals, append-only audit history, and manager reporting.
3. **Seller POS:** product/customer lookup, cart, stock availability, approved discount limits, configured tax totals, payment, invoice/receipt, own sales history, cash sessions, and controlled return/void workflows. Ensure completed sale and stock ledger update are atomic.
4. **Stock operations:** receipt against approved orders, quantity verification, damaged goods, internal issue, location transfers, physical counts, adjustment requests/approval, immutable movement history, alerts and exports.
5. **Purchasing:** supplier management, purchase requests, quotation comparison, approval, purchase orders and delivery status, with receiving performed by the approved role and supplier liabilities traceable.
6. **Nursery production:** planting/batch inputs, care and treatment logs, growth and daily tasks, recorded losses, harvest-ready proposals, stockkeeper verification and approved stock posting.
7. **Accounting:** expenses, supplier/customer payments and balances, cash reconciliation, configured VAT, financial statements and accounting exports; prevent accounting-only users from writing stock movements.
8. **External portals (optional):** customer and supplier authentication with narrowly scoped records and workflows, only when separately requested and threat-modeled.

## Non-negotiable quality gates

- A role is not secure because a button is hidden; API authorization and data scoping are authoritative.
- Test unauthorized access, validation/rejection, persistence, transaction behavior, and ownership boundaries—not just successful HTTP responses.
- Use isolated, disposable databases for mutating API tests; never point tests at production or operator data.
- For schema changes, inspect existing data and migration behavior; never use destructive volume resets as a migration strategy.
- Do not broaden permissions as a shortcut to make a workflow pass. Preserve least privilege and make approval states explicit.
- Follow the repository's focused-test and full-regression requirements in `.github/copilot-instructions.md`.
