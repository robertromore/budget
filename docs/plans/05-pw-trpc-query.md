# Phase 5: Price Watcher tRPC Routes + Query Layer

## Goal

Expose the price watcher services via tRPC endpoints and create TanStack Query definitions for the UI to consume.

## Done When

- All CRUD operations available via tRPC
- Price check can be triggered via API
- Query layer provides reactive data fetching with cache invalidation
- Integration tests pass for tRPC routes

## Changes

### New: `packages/core/src/trpc/routes/price-watcher.ts`

All routes use `ctx.workspaceId` from the tRPC context — no workspaceId in inputs.

Products:

- `listProducts` — input: `{ status?, retailer? }`, returns filtered product list
- `getProduct` — input: `{ slug }`, returns single product
- `addProduct` — input: `{ url, targetPrice?, checkInterval? }`, detects retailer, fetches initial price
- `updateProduct` — input: `{ id, data: { targetPrice?, checkInterval?, status?, notes?, name? } }`
- `deleteProduct` — input: `{ id }`, soft delete

Price:

- `getPriceHistory` — input: `{ productId, dateFrom?, dateTo? }`, time-series data
- `checkPriceNow` — input: `{ productId }`, manual refresh, returns updated product

Alerts:

- `listAlerts` — input: `{ productId? }`, returns alerts (all or filtered by product)
- `createAlert` — input: `{ productId, type, threshold?, enabled? }`
- `updateAlert` — input: `{ id, data: { type?, threshold?, enabled? } }`
- `deleteAlert` — input: `{ id }`

Each input validated with Zod schemas defined at the top of the file (matching the pattern in other route files like `transactions.ts`).

Removed from original plan:

- `getRecentTriggers` — no backing implementation; triggers are notifications, not a separate query
- `listRetailers` — retailers table was dropped in Phase 3; retailer list is code-level config in `detectRetailer`

### Modify: `packages/core/src/trpc/router.ts`

Register `priceWatcherRoutes` in the main router.

### New: `packages/core/src/query/price-watcher.ts`

Query definitions (defineQuery):

- `listProducts(filters?)` — product list with staleTime
- `getProduct(slug)` — single product detail
- `getPriceHistory(productId, dateRange?)` — chart data
- `listAlerts(productId?)` — alert rules

Mutation definitions (defineMutation):

- `addProduct` — invalidates product list
- `updateProduct` — invalidates product detail + list
- `deleteProduct` — removes from cache, invalidates list
- `checkPriceNow` — invalidates product detail + price history
- `createAlert` / `updateAlert` / `deleteAlert` — invalidates alert list

### New: `apps/budget/src/lib/query/price-watcher.ts`

Re-export shim: `export * from "$core/query/price-watcher"`

### New: `apps/budget/tests/integration/trpc/price-watcher.test.ts`

Tests use the tRPC caller pattern (same as `transactions.test.ts`). Routes that call `fetchProductInfo` (addProduct, checkPriceNow) are tested with a pre-seeded product to avoid network calls — create the product record directly in the DB, then test routes that operate on it (list, get, update, delete, history, alerts).

Test cases:

- List products (empty, then with seeded data)
- Get product by slug
- Update product (target price, status, name)
- Delete product (soft delete, verify not in list)
- Get price history (with seeded snapshots)
- CRUD alerts (create, list, update enabled, delete)
- Validate bad inputs (missing slug, invalid ID, etc.)

## Dependencies

Phase 4 (Services) must be complete.

## Verification

1. `bun run check` — type check
2. `bun test tests/integration/trpc/price-watcher.test.ts` — route tests pass
