# Phase 2: Route Groups

## Goal

Reorganize routes so budget and price watcher have separate layout groups. Each group gets its own sidebar content while sharing the root layout (auth, header, app rail, global overlays).

## Done When

- All existing budget routes work at their current URLs (no breaking changes)
- Budget routes use a `(budget)` layout group with the budget sidebar
- Price watcher routes use a `(price-watcher)` layout group with a new sidebar
- Root layout only contains shared infrastructure (auth, header, app rail, overlays)
- `+layout.server.ts` conditionally loads budget entities only for budget routes

## Changes

### Move existing routes into `(budget)/` group

Move these directories into `src/routes/(budget)/`:

- `accounts/`, `budgets/`, `categories/`, `payees/`, `schedules/`
- `automation/`, `documents/`, `import/`, `intelligence/`, `subscriptions/`
- `goals/`, `hsa/`, `help/`, `settings/`, `workspaces/`
- `+page.svelte` (dashboard — becomes `(budget)/+page.svelte`)

SvelteKit route groups don't affect URLs, so `/accounts` stays `/accounts`.

### New: `src/routes/(budget)/+layout.svelte`

- Renders `Sidebar.Provider` + `AppSidebar` (budget navigation)
- Moves sidebar-specific code from root layout into here
- Initializes budget-specific entity states (accounts, payees, categories, etc.)

### New: `src/routes/(price-watcher)/+layout.svelte`

- Renders `Sidebar.Provider` + `PriceWatcherSidebar`
- Minimal entity state (no budget data loading)

### New: `src/lib/components/layout/price-watcher-sidebar.svelte`

- Sidebar navigation for price watcher:
  - Dashboard, Products, Alerts, History
- Follows same pattern as `app-sidebar.svelte`

### Modify: `src/routes/+layout.svelte`

- Remove sidebar-specific code (moved to group layouts)
- Keep: auth guards, header bar, app rail, global overlays, theme/font controls
- Keep: `QueryClientProvider`, `Tooltip.Provider`, `NuqsAdapter`

### Modify: `src/routes/+layout.server.ts`

- Conditionally load budget entities (accounts, payees, categories, schedules, budgets) only when the request path is in budget routes
- Price watcher routes skip budget entity loading

## Dependencies

Phase 1 (App Rail) must be complete.

## Verification

1. `bun run check` — type check
2. `bun run dev` — all existing budget pages work at same URLs
3. Navigate to `/accounts` — budget sidebar shows
4. Navigate to `/price-watcher` — price watcher sidebar shows
5. App rail highlights the correct app for each
6. Auth guards still work (unauthenticated users redirected to login)
