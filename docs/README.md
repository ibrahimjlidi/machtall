# Mashtal Ezzahi documentation

This folder contains operational workflow documentation and test evidence for the nursery-management demo.

## Contents

- [Project structure and architecture](architecture.md) — request flow, monolith modules, and where each responsibility lives.
- [Stock workflow test index](testing/README.md) — scope, environment, and result summary.
- [Individual stock scenarios](testing/stock-workflows/README.md) — twelve reproducible workflows, each with its own setup, steps, expected behavior, observed result, and cleanup notes.
- [Application overview and deployment guide](../README.md) — architecture, Docker Compose, local development, access roles, and production limitations.

## Documentation status

The workflow results are a dated manual smoke-test record against the running demo, not a permanent automated test suite. Re-run them after material changes to inventory, purchasing, production, sales, or authorization behavior.
