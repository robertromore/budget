# Code Duplication Review (apps/budget) — 2025-12-19

Scope: `apps/budget/**` (budget app). Focus is strictly code duplication (identical files, “copy then diverge”, and repeated helper logic).

Method:
- Identical-duplicate detection via SHA-256 content hashes over `apps/budget/src/**/*.{ts,js,svelte,svelte.ts}`.
- Repeated-filename inventory to find likely copy/paste divergence.
- Targeted diffs for high-impact duplicates (tables, dialogs/forms, accounts vs HSA).

---

## 1) Identical duplicates (byte-for-byte)

These files are exact duplicates today and should be consolidated:

### Category server load duplicated across routes
- `apps/budget/src/routes/categories/[slug]/analytics/+page.server.ts`
- `apps/budget/src/routes/categories/[slug]/edit/+page.server.ts`

### Calendar vs range-calendar shared modules duplicated
- `apps/budget/src/lib/components/ui/calendar/calendar-month.svelte`
- `apps/budget/src/lib/components/ui/range-calendar/range-calendar-month.svelte`

- `apps/budget/src/lib/components/ui/calendar/calendar-months.svelte`
- `apps/budget/src/lib/components/ui/range-calendar/range-calendar-months.svelte`

- `apps/budget/src/lib/components/ui/calendar/calendar-nav.svelte`
- `apps/budget/src/lib/components/ui/range-calendar/range-calendar-nav.svelte`

### Shared cell duplicated into a route-specific folder
- `apps/budget/src/lib/components/shared/data-table/cells/entity-status-cell.svelte`
- `apps/budget/src/routes/categories/(components)/(cells)/category-status-cell.svelte`

Recommendation:
- Keep one “source of truth” for each component/module in `src/lib/**`, and have routes import/re-export it.
- If you need two public component names/APIs, use a thin wrapper that forwards props rather than a copied file.

---

## 2) Repeated filenames that indicate “copy then diverge”

These are not identical, but they represent the same conceptual component/module implemented multiple times in parallel.

### Data table ecosystem is implemented in 3+ places

Same-named files exist in multiple component systems:

`data-table-column-header.svelte` (4 copies)
- `apps/budget/src/lib/components/shared/data-table/data-table-column-header.svelte`
- `apps/budget/src/lib/components/data-table/core/data-table-column-header.svelte`
- `apps/budget/src/routes/accounts/[slug]/(components)/data-table-column-header.svelte`
- `apps/budget/src/routes/hsa/[slug]/(components)/data-table-column-header.svelte`

`data-table-pagination.svelte` (3 copies)
- `apps/budget/src/lib/components/ui/data-table/data-table-pagination.svelte`
- `apps/budget/src/lib/components/data-table/core/data-table-pagination.svelte`
- `apps/budget/src/routes/accounts/[slug]/(components)/data-table-pagination.svelte`

`data-table.svelte` (2 copies)
- `apps/budget/src/lib/components/data-table/core/data-table.svelte`
- `apps/budget/src/routes/accounts/[slug]/(components)/data-table.svelte`

Recommendation:
- Pick one canonical table stack and deprecate the others:
  - Either standardize on `apps/budget/src/lib/components/ui/data-table/**` (shadcn-style),
  - Or standardize on `apps/budget/src/lib/components/data-table/core/**` (feature-specific).
- Route-local tables (`routes/accounts/**`, `routes/hsa/**`) should be wrappers that configure the canonical table, not independent implementations.

### “Add/Delete transaction” dialogs exist in multiple places

`add-transaction-dialog.svelte` (3 copies)
- `apps/budget/src/lib/components/dialogs/add-transaction-dialog.svelte`
- `apps/budget/src/routes/accounts/[slug]/(components)/add-transaction-dialog.svelte`
- `apps/budget/src/routes/accounts/[slug]/(dialogs)/add-transaction-dialog.svelte`

`delete-transaction-dialog.svelte` (2 copies)
- `apps/budget/src/lib/components/dialogs/delete-transaction-dialog.svelte`
- `apps/budget/src/routes/accounts/[slug]/(dialogs)/delete-transaction-dialog.svelte`

Recommendation:
- Keep the canonical dialogs in `src/lib/components/dialogs/**`.
- Make route variants be composition only (e.g., pass extra props, swap tabs, provide route-scoped defaults) rather than maintaining copied files.

### “Manage transaction form” exists twice (large divergence)

`manage-transaction-form.svelte` (2 copies)
- `apps/budget/src/lib/components/forms/manage-transaction-form.svelte`
- `apps/budget/src/routes/accounts/[slug]/(forms)/manage-transaction-form.svelte`

Recommendation:
- Extract a shared core form component (fields + validation + submission contracts), then have two thin shells:
  - one “simple/manual” shell,
  - one “wizard/guided” shell.

---

## 3) Accounts vs HSA: parallel feature implementations

The accounts and HSA routes contain parallel, similarly named components and `(data)` modules that are not identical:

### `apps/budget/src/routes/accounts/[slug]/(components)` vs `apps/budget/src/routes/hsa/[slug]/(components)`

These exist in both places and differ:
- `apps/budget/src/routes/accounts/[slug]/(components)/claim-management-sheet.svelte`
- `apps/budget/src/routes/hsa/[slug]/(components)/claim-management-sheet.svelte`

- `apps/budget/src/routes/accounts/[slug]/(components)/data-table-column-header.svelte`
- `apps/budget/src/routes/hsa/[slug]/(components)/data-table-column-header.svelte`

- `apps/budget/src/routes/accounts/[slug]/(components)/expense-*` (wizard, list, table, toolbar, etc.)
- `apps/budget/src/routes/hsa/[slug]/(components)/expense-*` (wizard, list, table, toolbar, etc.)

- `apps/budget/src/routes/accounts/[slug]/(components)/receipt-upload-widget.svelte`
- `apps/budget/src/routes/hsa/[slug]/(components)/receipt-upload-widget.svelte`

Example divergence pattern:
- Accounts version uses tRPC query “mutation options” objects; HSA version uses `rpc.*.execute(...)` directly (same UX, different plumbing).
- Both versions re-implement the same helpers (e.g., `formatFileSize`) inline.

### `apps/budget/src/routes/accounts/[slug]/(data)` vs `apps/budget/src/routes/hsa/[slug]/(data)`

These exist in both places and differ:
- `columns.svelte.ts`
- `filters.svelte.ts`
- `pagination.svelte.ts`
- `selection.svelte.ts`
- `visibility.svelte.ts`

Recommendation:
- Create a single “expenses module” under `apps/budget/src/lib/features/expenses/**`:
  - shared cells/components,
  - shared `(data)` state/builders,
  - configuration hooks to inject route-specific differences (account vs hsa).
- Keep `routes/accounts/**` and `routes/hsa/**` as thin composition layers (wiring + defaults + layout).

---

## 4) Utility/helper duplication

### `cn()` is defined twice and imported inconsistently

`cn` exists in both:
- `apps/budget/src/lib/utils/index.ts`
- `apps/budget/src/lib/utils/utils.ts`

And some components import from the “extra” file:
- `apps/budget/src/lib/components/ui/tree-view/tree-view.svelte`
- `apps/budget/src/lib/components/ui/tree-view/tree-view-folder.svelte`
- `apps/budget/src/lib/components/ui/tree-view/tree-view-file.svelte`

Recommendation:
- Keep `cn` only in `apps/budget/src/lib/utils/index.ts` (or only in a dedicated `cn.ts`), and update imports to use `$lib/utils`.
- Delete or repurpose `apps/budget/src/lib/utils/utils.ts` to avoid confusion (it currently duplicates part of `index.ts`).

### `formatFileSize()` appears in multiple places with different behavior

Instances:
- `apps/budget/src/routes/accounts/[slug]/(components)/receipt-upload-widget.svelte` (B/KB/MB)
- `apps/budget/src/routes/hsa/[slug]/(components)/receipt-upload-widget.svelte` (B/KB/MB)
- `apps/budget/src/lib/components/import/file-upload-dropzone.svelte` (Bytes/KB/MB/GB, 2 decimals)
- `apps/budget/src/lib/server/import/utils.ts` (Bytes/KB/MB/GB, 2 decimals)

Recommendation:
- Decide if you want one formatter (shared) or two (UI-friendly vs precise).
- Put shared formatters in `apps/budget/src/lib/utils/formatters.ts` (client-safe), and avoid duplicating small helpers inside components.

---

## 5) Suggested anti-regression checks

If you want to prevent duplication from creeping back in:
- Add a small CI script that reports identical duplicates (hash grouping) and fails if new duplicates are introduced outside an allowlist.
- Optional: add a token-based duplication tool (e.g. jscpd) if you’re willing to maintain it, but the hash-based check already catches the worst “copied file” cases.

