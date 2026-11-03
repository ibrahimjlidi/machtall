# Project coding and regression-testing rules

- After each logical code change or new feature, run the focused test that covers it before moving on. If no such test exists, add one with the change.
- Before finishing any code change, run the broad relevant regression suite: unit tests, API end-to-end tests, Playwright UI tests, and production builds. Report any suite that could not be run and why; never claim coverage that was not executed.
- Keep API end-to-end tests on an isolated, disposable database. Never run mutating tests against production or an operator's business database.
- Maintain end-to-end coverage across all API controllers and business workflows: authentication, dashboard, reference data, products, inventory movements, production, purchasing, sales/customer payments, reports, and users. Assert authorization, validation, persisted state changes, and important rejection paths, not only successful status codes.
- Maintain Playwright coverage for login/session behavior, role-sensitive navigation, and the principal inventory, production, purchasing, sales, reports, and user-management screens. Stub API responses for UI-only tests; use isolated API/database tests for backend workflows.
- CI must run the same unit, API end-to-end, UI, and build checks on pushes and pull requests.
