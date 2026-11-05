# Nursery production workflow

## Agreed boundaries

- Admin assigns tasks to active nursery workers. A task may reference a batch and have an optional due date.
- Workers see tasks assigned to them and batches they created or that are linked to tasks assigned to them. Workers advance their task status one step at a time and may add a task note.
- Care logs record type, date, and optional note only. They do not consume stock.
- Loss reports are dated, reasoned, append-only events. Reporting updates the batch's accumulated loss quantity transactionally but does not create an inventory movement.
- Batch growth advances one step at a time from sowing to germination to growing.
- Ready proposals are permitted only for growing batches. The stockkeeper verifies a proposal; the Gérant approves it and posts the ready quantity to the inventory ledger.

## Validation coverage

The API E2E scenario creates a batch and assigned tasks, checks admin-only task assignment and worker-only task progression, enforces task and batch ownership, records care and losses, rejects excess losses and invalid stage transitions, verifies that loss/care records do not post stock, and continues through the approved ready-stock posting flow.

The Playwright scenario stubs production APIs and exercises the manager task assignment UI plus worker task, care, loss, growth, and ready-proposal actions.

## Data and migration

The additive migration creates task, care-log, and loss-report records without rewriting existing production batches. Existing `quantityLost` values remain in place; only loss events recorded after migration have individual reason/date records. Care and loss histories are protected by database append-only triggers.

## Exclusions

Care logs do not deduct fertilizer or treatment materials from stock. This phase does not add watering amounts, chemical dosage, production costing, task reassignment, a separate task approval workflow, or external worker accounts.
