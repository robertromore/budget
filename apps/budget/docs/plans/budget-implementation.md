# Budget Implementation Plan

## Phase 1: Foundation
- **P1.1 Schema & Migrations**: Create core tables, junction tables, indexes, and migrations with rollback coverage.
- **P1.2 Repository Layer**: Implement `BudgetRepository` CRUD and association queries with composable Drizzle patterns.
- **P1.3 Period Engine**: Deliver `BudgetPeriodCalculator` with timezone support, unit tests for weekly/monthly/yearly/custom boundaries, and initial period seeding.
- **P1.4 Allocation Validation**: Build `BudgetTransactionService` enforcing sum/sign rules, zero-versus-delete flows, and transaction hooks.
- **P1.5 tRPC Base Routes**: Expose CRUD and period endpoints with Zod schemas, orchestration, and happy-path tests.

## Phase 2: Basic UI (Account-Monthly)
- **P2.1 Client State**: Stand up `BudgetState`, query wrappers, and optimistic mutation flows for account-scoped budgets.
- **P2.2 Core Components**: Implement `BudgetSelector`, `BudgetProgress`, and `BudgetPeriodPicker` MVPs using LayerChart and responsive design.
- **P2.3 Budget List Page**: Build `/budgets` dashboard with filtering, health indicators, and quick actions tied to live data.
- **P2.4 Creation Flow**: Add wizard for account-monthly budgets with metadata defaults, validation, and preview linked to tRPC.
- **P2.5 Transaction Touchpoint**: Surface budget column, warning badges, and manual assignment modal on the transaction table.

## Phase 3: Category Envelopes
- **P3.1 Rollover Logic**: Extend services for rollover modes, add balance tracking migrations, and unit tests.
- **P3.2 Envelope UI**: Create envelope view with remaining balances, transfer tools, and multi-budget selectors.
- **P3.3 Period Management**: Provide UI for period history, manual adjustments, and rollover previews via template APIs.
- **P3.4 Analytics Widgets**: Ship category breakdown charts and daily spend trends with performance safeguards.
- **P3.5 Validation Pass**: Expand enforcement checks for envelope budgeting and add integration tests for assignment scenarios.

## Phase 4: Goals & Schedules
- **P4.1 Goal Engine**: Implement goal progress calculators (deposits/net/investment) with metadata extensions and forecasts.
- **P4.2 Goal UI**: Add creation panels, progress visualizations, and milestone markers in detail views.
- **P4.3 Schedule Integration**: Connect recurring schedules to budgets, enable pre-allocation forecasting, and surface conflict warnings.
- **P4.4 Investment Tracking**: Support market data fields, display contributions versus market movement, and guard missing feeds.
- **P4.5 Scenario Tests**: Add end-to-end tests covering goal attainment, schedule changes, and enforcement interactions.

## Phase 5: Polish & Optimization
- **P5.1 Groups & Hierarchy**: Implement group CRUD, nesting UI, inheritance rules, and aggregated progress cards.
- **P5.2 Enforcement UX**: Finish strict-mode blockers, warning banners, undo flows, and enforcement settings surfaces.
- **P5.3 Templates & Bulk Ops**: Add reusable templates, multi-select bulk actions, and workflow tooling improvements.
- **P5.4 Performance Hardening**: Benchmark `BudgetActuals`, add cache tables if needed, instrument monitoring, and tune indexes.
- **P5.5 Mobile & Accessibility**: Audit responsive layouts, gestures, keyboard flows, and screen-reader coverage before release.

## Phase 6+: Optional Epics
- **P6.1 Advanced Organization**: Explore collaborative budgets, advanced reporting, and template libraries once core KPIs stabilize.
- **P6.2 External Integrations**: Plan API/OAuth groundwork for bank sync, export/import, and credit controls.
- **P6.3 Automation & Intelligence**: Prototype ML-driven suggestions, predictive alerts, and auto-categorization when infrastructure allows.

## Cross-Cutting Tracks
- **Testing**: Grow unit/integration suites in parallel, add performance coverage per phase, and guard regressions before promotion.
- **Documentation**: Update design notes, developer onboarding, and user help at each milestone; log rollout notes for support teams.
- **Release Gating**: Require functional/performance sign-off, stakeholder demos, and risk mitigation before advancing phases.
