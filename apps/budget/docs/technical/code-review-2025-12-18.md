# Budget App Code Review (apps/budget) — 2025-12-18

Scope: `apps/budget/**` (SvelteKit budget app). Per request, this review ignores the AI transaction parsing feature area.

This is a “static + tooling” review: code reading/spot checks, repo-wide searches, duplication detection, and running the existing app scripts `bun run lint` + `bun run check` to surface structural issues.

---

## Snapshot (size, hotspots, signals)

**File counts (src only)**
- Total code files (`*.ts`, `*.js`, `*.svelte`, `*.svelte.ts`): ~1072
- `*.svelte`: ~591
- `*.ts`: ~481
- `*.svelte.ts`: ~77
- Total LOC across `*.ts`/`*.svelte`/`*.svelte.ts`: ~171,519

**Largest files (LOC)**
- `apps/budget/src/lib/server/domains/payees/services.ts` (4384)
- `apps/budget/src/lib/server/domains/budgets/services.ts` (2226)
- `apps/budget/src/routes/import/+page.svelte` (2033)
- `apps/budget/src/lib/server/domains/payees/ml-coordinator.ts` (1910)
- `apps/budget/src/routes/accounts/[slug]/(components)/import-tab.svelte` (1813)
- `apps/budget/src/routes/budgets/[slug]/+page.svelte` (1783)

**Repo-wide signals (src only)**
- `console.*` calls: ~350 (see “Logging” below)
- `TODO|FIXME|HACK|XXX`: ~25
- `@ts-ignore|@ts-expect-error`: 1 (`apps/budget/src/lib/components/wizard/wizard-form-wrapper.svelte:170`)
- `as any` / `: any`: ~794 (typing gaps are widespread; see “Type safety”)
- `eslint-disable|prettier-ignore`: ~15

---

## High priority: build/lint health (tooling is currently broken)

### Prettier “lint” is failing with runtime errors

`apps/budget/package.json` defines `lint` as `bunx prettier --check .`, but this currently fails with Prettier runtime errors.

- Example failures:
  - `apps/budget/src/app.html` (Prettier HTML parser error)
  - Many `.svelte` files error with: `TypeError: getVisitorKeys is not a function`
- `bun run lint` ends with: “Error occurred when checking code style in 595 files.”
- Additional warning: `svelteBracketNewLine is deprecated` (from your `.prettierrc`)

**Likely root cause:** version skew / duplicate installs across the monorepo (multiple Prettier/plugin instances resolving differently). You have Prettier in both the root and the app, and you also have multiple `node_modules` trees (root + app), which increases the chance of mismatched plugin resolution.

**Recommendation**
- Unify Prettier + plugin versions across the workspace (single source of truth) and ensure only one `node_modules` tree is used for type tooling/linting.
- Fix/replace deprecated Prettier options in `.prettierrc`.
- Update `apps/budget/.prettierignore` to exclude generated artifacts you don’t want checked (e.g. `test-results/`, `drizzle/meta/`) to reduce noise once lint works again.

### `bun run check` reports 336 errors / 40 warnings

`bun run check` runs `svelte-kit sync` then `svelte-check`, and currently reports:
- “svelte-check found 336 errors and 40 warnings in 80 files”

There are two major classes of errors:

1) **Tooling/type resolution drift** (Vite types mismatch)
- First error points at `apps/budget/vite.config.ts:6:28` with “Two different types with this name exist, but they are unrelated.”
- This strongly suggests *two different `vite` installations* are being used in the type graph (e.g. root vs app), which is consistent with having both `node_modules/` at repo root and `apps/budget/node_modules/`.

2) **Tests and API types out of sync**
- Many errors are in `apps/budget/tests/**` (e.g. request shapes not matching current procedure inputs, invalid enum values, helpers expecting different function signatures).

**Recommendation**
- Decide on **one** dependency resolution strategy for the monorepo (prefer a single workspace-level install) and remove the extra `node_modules` tree that’s causing mismatched types.
- Once type resolution is fixed, address the failing tests/types:
  - Either update the tests to match the current tRPC API shapes, or
  - Move tests into a separate tsconfig/project reference with the right type assumptions (so app type-checking doesn’t get blocked by test drift).

---

## Duplication (identical and near-identical code)

### Identical duplicates (byte-for-byte)

The following files are identical duplicates (same content hash), which are good candidates to de-duplicate into shared modules/components:

- `apps/budget/src/routes/accounts/[slug]/(components)/expense-skeleton.svelte`
  and `apps/budget/src/routes/hsa/[slug]/(components)/expense-skeleton.svelte`
- `apps/budget/src/routes/accounts/[slug]/(components)/(cells)/editable-date-cell.svelte`
  and `apps/budget/src/routes/hsa/[slug]/(components)/(cells)/editable-date-cell.svelte`
- `apps/budget/src/routes/accounts/[slug]/(data)/expanded.svelte.ts`
  and `apps/budget/src/routes/hsa/[slug]/(data)/expanded.svelte.ts`
- `apps/budget/src/routes/accounts/[slug]/(data)/groups.svelte.ts`
  and `apps/budget/src/routes/hsa/[slug]/(data)/groups.svelte.ts`
- `apps/budget/src/routes/accounts/[slug]/(data)/pinning.svelte.ts`
  and `apps/budget/src/routes/hsa/[slug]/(data)/pinning.svelte.ts`
- `apps/budget/src/routes/accounts/[slug]/(data)/sorts.svelte.ts`
  and `apps/budget/src/routes/hsa/[slug]/(data)/sorts.svelte.ts`
- `apps/budget/src/routes/categories/[slug]/analytics/+page.server.ts`
  and `apps/budget/src/routes/categories/[slug]/edit/+page.server.ts`
- `apps/budget/src/routes/accounts/[slug]/(components)/(cells)/editable-expense-type-cell.svelte`
  and `apps/budget/src/routes/hsa/[slug]/(components)/(cells)/editable-expense-type-cell.svelte`
- `apps/budget/src/routes/accounts/[slug]/(components)/(cells)/editable-numeric-cell.svelte`
  and `apps/budget/src/routes/hsa/[slug]/(components)/(cells)/editable-numeric-cell.svelte`
- Calendar/range-calendar duplicates:
  - `apps/budget/src/lib/components/ui/calendar/calendar-month.svelte`
    and `apps/budget/src/lib/components/ui/range-calendar/range-calendar-month.svelte`
  - `apps/budget/src/lib/components/ui/calendar/calendar-months.svelte`
    and `apps/budget/src/lib/components/ui/range-calendar/range-calendar-months.svelte`
  - `apps/budget/src/lib/components/ui/calendar/calendar-nav.svelte`
    and `apps/budget/src/lib/components/ui/range-calendar/range-calendar-nav.svelte`
- `apps/budget/src/lib/components/shared/data-table/cells/entity-status-cell.svelte`
  and `apps/budget/src/routes/categories/(components)/(cells)/category-status-cell.svelte`
- `apps/budget/src/lib/components/ui/data-table/data-table-pagination.svelte`
  and `apps/budget/src/routes/accounts/[slug]/(components)/expense-table-pagination.svelte`

### Near-duplicates (diverged copies)

There are several cases where a “shared” component exists, but a route-specific copy has diverged:

- Data table pagination logic differs between:
  - `apps/budget/src/lib/components/ui/data-table/data-table-pagination.svelte`
  - `apps/budget/src/routes/accounts/[slug]/(components)/data-table-pagination.svelte`

**Recommendation**
- Treat route folders as “composition-only”: keep route-specific glue/wiring there, and push reusable UI + state logic down into `src/lib/components/**` and `src/lib/states/**`.
- For accounts vs HSA, consider a shared “expenses module” (components + `(data)` state files) parametrized by entity type/scope, instead of maintaining parallel folder trees.

---

## Logging and observability (inconsistent + one real API mismatch)

### Mixed logging approaches

You have a structured server-side logger:
- `apps/budget/src/lib/server/shared/logging.ts`

But there are still many direct `console.*` calls (including in server-only code). Example:
- `apps/budget/src/lib/server/import/matchers/schedule-matcher.ts:176` logs matches via `console.log(...)`

**Recommendation**
- On the server: standardize on `logger` and keep `console.*` for local scripts only (or guard behind a `NODE_ENV` check).

### `logger.error` is frequently called with the wrong argument order

`logger.error` is defined as:
- `apps/budget/src/lib/server/shared/logging.ts:33` → `error(message: string, error?: Error | unknown, context?: LogContext)`

But many call sites pass an object as the 2nd arg (intended as context), which then gets stored under the logger’s `error` field.

Examples:
- `apps/budget/src/lib/server/domains/budgets/recommendation-service.ts:71`
- `apps/budget/src/lib/server/domains/budgets/intelligence-service.ts:79`

This produces confusing logs (nested `error: { error: ..., data: ... }`) and can drop stack traces unless manually embedded (some call sites do that workaround, e.g. `apps/budget/src/lib/server/domains/budgets/budget-analysis-service.ts:144`).

**Recommendation**
- Make the logger API harder to misuse:
  - Option A: change signature to `error(message, context?, error?)` (or add overloads), and normalize internally.
  - Option B: require `logger.error({ message, error, context })` as a single object parameter.
- Then mechanically update call sites to be consistent.

### tRPC logger middleware appears unused and risky

- `apps/budget/src/lib/trpc/middleware/logger.ts:1` logs the entire `result` object.
- It does not appear to be referenced anywhere in tRPC setup, and would be easy to accidentally enable in production.

**Recommendation**
- Remove it if unused, or:
  - Make it opt-in (dev-only),
  - Redact sensitive fields,
  - Log only method, path, duration, and error summaries.

---

## Type safety gaps (lots of `any`, plus a formatter mismatch risk)

### `any` usage is widespread

The search count for `as any` / `: any` is ~794 in `apps/budget/src/**`. The heaviest files include:
- `apps/budget/src/lib/server/domains/payees/ml-coordinator.ts` (46)
- `apps/budget/src/lib/server/shared/database/base-repository.ts` (39)
- `apps/budget/src/lib/trpc/routes/medical-expenses.ts` (36)

**Recommendation**
- Prioritize tightening types in:
  - shared infrastructure (repository layer, tRPC routes),
  - table column definitions and filter meta objects,
  - domain “metadata” blobs (prefer `unknown` + schema validation over `any`).

### `currencyFormatter` is marked “legacy” but still heavily used

`apps/budget/src/lib/utils/formatters.ts` exports:
- `currencyFormatter` as a “Legacy export for compatibility”

But it is referenced widely across routes/components (hundreds of occurrences). `currencyFormatter` is a fallback formatter and does not incorporate user display preferences, while `formatCurrency()` does.

**Recommendation**
- Move call sites to `formatCurrency()` where user preferences should apply.
- If you need a drop-in migration path, change `currencyFormatter.format(x)` to delegate to `formatCurrency(x)` (careful: only safe if callers only use `.format()`).

---

## Configuration and environment (multiple competing systems)

You currently have multiple config/env systems, with some risk of “wrong import in the wrong place”:
- Generic env parsing: `apps/budget/src/lib/env.ts` (lives in shared `src/lib`, which increases accidental client import risk)
- Server DB env: `apps/budget/src/lib/server/db/index.ts` uses `$env/dynamic/private` (`apps/budget/src/lib/server/db/index.ts:10`)
- Unused/unclear type-safe config framework: `apps/budget/src/lib/config/type-safe-config.ts` (does not appear referenced outside exports)

Additionally, DB URL formats appear inconsistent:
- `apps/budget/.env.example` uses `DATABASE_URL=drizzle/db/sqlite.db`
- `apps/budget/src/lib/server/db/migrate.ts:6` defaults to `file:./drizzle/db/sqlite.db`

**Recommendation**
- Consolidate to one approach:
  - server-only env/config in `src/lib/server/**`, using SvelteKit `$env` where applicable,
  - keep shared `src/lib/**` free of `process.env` access where possible.
- Validate/standardize `DATABASE_URL` format (especially if using `@libsql/client` which commonly expects `file:` for local).

---

## Large-file risks (maintainability, reviewability)

There are multiple “mega modules” (1k–4k LOC) in both server and routes. Common symptoms in such files:
- mixed responsibilities (validation + DB + business logic + mapping),
- hard-to-review diffs,
- higher regression risk due to broad coupling.

**Recommendation**
- Split by responsibility, starting with the largest:
  - `apps/budget/src/lib/server/domains/payees/services.ts`
  - `apps/budget/src/lib/server/domains/budgets/services.ts`
  - `apps/budget/src/routes/import/+page.svelte`
  - `apps/budget/src/routes/budgets/[slug]/+page.svelte`
- A practical refactor approach is “extract-and-freeze”: extract cohesive helpers/services behind existing public methods without changing behavior, then iterate.

---

## Suggested execution plan (small PRs)

**PR 1: Tooling unbreak**
- Fix the duplicate dependency resolution (one Vite/Prettier instance), so `bun run check` and `bun run lint` can run reliably.
- Update `.prettierrc` deprecated options and `apps/budget/.prettierignore` for generated artifacts.

**PR 2: Logging correctness**
- Fix `logger.error` API and update call sites.
- Remove/guard direct `console.*` calls in server code.
- Remove/guard the unused tRPC logger middleware.

**PR 3: De-duplication of accounts/HSA**
- Extract identical “expenses” cells + `(data)` modules into shared locations and re-export from route folders.
- Remove duplicated pagination component variants; keep one canonical implementation.

**PR 4+: Type-safety + mega-file refactors**
- Replace `any` hotspots with schemas (`zod`/`drizzle-zod`) and typed domain objects.
- Split the top 2–3 mega files into smaller modules.

