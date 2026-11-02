# Stock workflow test report

**Execution date:** 2026-11-02  
**Environment:** Docker Compose demo, Arabic browser UI at `http://localhost:18080`, PostgreSQL-backed API  
**Result:** **12/12 scenarios passed**  
**Test style:** Manual live API integration checks plus browser smoke checks; not an automated test suite

## Test setup

- Authenticated as the configured demo Admin. Credentials were read from the private local `.env`; no passwords or signing secrets are included in these docs.
- Used dedicated, uniquely named test products rather than changing the seeded catalog products.
- Used seeded categories, suppliers, customers, and other reference data.
- Compared product quantities and movement/order/batch/sale statuses before and after each operation.
- Checked browser behavior for transfer submission, low/out-of-stock alerts, report presentation, and export-button responses.

## Results

| # | Workflow | Result | Main verification |
|---|---|---|---|
| 01 | [Create and edit a product](01-product-opening-and-edit.md) | **PASS** | Created item with 10 opening units; edited details without changing stock |
| 02 | [Record incoming stock](02-direct-stock-in.md) | **PASS** | Quantity changed 10 → 15 after `PURCHASE_IN +5` |
| 03 | [Receive a supplier order](03-purchase-order-receipt.md) | **PASS** | Quantity changed 15 → 19; duplicate receipt returned HTTP 409 |
| 04 | [Make a production batch ready](04-production-ready.md) | **PASS** | 6 sown − 1 loss = 5 units received; duplicate ready returned HTTP 409 |
| 05 | [Record a customer sale](05-customer-sale.md) | **PASS** | Sale of 2 units changed quantity 24 → 22 |
| 06 | [Record a loss](06-loss-recording.md) | **PASS** | Disease loss of 1 changed quantity 22 → 21 |
| 07 | [Adjust stock](07-stock-adjustment.md) | **PASS** | Adjustment +3 and −2 changed quantity 21 → 22 |
| 08 | [Transfer between locations](08-location-transfer.md) | **PASS** | Transfer persisted source/destination; total stayed 2 |
| 09 | [Reject excessive stock-outs](09-reject-excess-stock-out.md) | **PASS** | Oversized loss and sale returned HTTP 400; stock unchanged |
| 10 | [Check low and out-of-stock alerts](10-stock-alerts.md) | **PASS** | Threshold and zero-stock alerts rendered in browser |
| 11 | [Edit and archive a product](11-edit-and-archive.md) | **PASS** | Archive with stock returned HTTP 409; zero-stock archive succeeded |
| 12 | [Review inventory and reports](12-inventory-reports.md) | **PASS with demo limitations** | UI and valuation table rendered; export controls are mocked |

## Findings and follow-up

- The transfer form did not reliably submit the destination location. It was corrected to require and submit both the source and destination; the frontend production build passed and the browser transfer check passed after the fix.
- Excel/PDF export buttons only show demo confirmation messages; they do not generate or download files.
- Seasonal sales visualizations and some report summaries are presentation/demo content, not verified accounting output.
- High-level workflow success does not replace dedicated tests for concurrent sales, concurrent receipt, or transaction retry behavior.

## Test data and cleanup

- Temporary test products were reduced to zero where required and soft-archived after verification.
- Test purchase order, production batch, sale, and stock movements remain in the database as ordinary related history. The seed data was not reset.
- The test products' archived status means they are absent from the active product catalog; their movement history remains by design.
- No production or real nursery records were intentionally edited.
