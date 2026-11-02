# Workflow testing

## Stock-management scenarios

Start with [project structure and architecture](../architecture.md) for the UI → API → module → database request path. The [stock workflow test index](stock-workflows/README.md) summarizes twelve live scenarios executed against the Docker Compose demo. Each workflow has a separate Markdown record with:

- Preconditions and test data
- User workflow and verification steps
- Expected behavior
- Actual result and status
- Cleanup and known limitations
- A color-coded, node-and-connector Mermaid flowchart showing how that workflow maps to the project

The scenarios include product setup, incoming and outgoing ledger movements, purchase receipt, production readiness, sales, losses, adjustments, location transfers, stock guards, low-stock alerts, archiving, and inventory reports.

## Scope and interpretation

Results were checked against persisted API responses and, for selected flows, the running Arabic browser UI. This is manual integration/smoke-test evidence; it does not replace automated unit or integration tests. Demo-only features (including spreadsheet/PDF exports and some seasonal report content) are identified in the relevant scenario.
