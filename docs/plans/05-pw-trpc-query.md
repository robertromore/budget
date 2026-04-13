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

Products:

- `listProducts` — input: `{ workspaceId, status?, retailer? }`, paginated
- `getProduct` — input: `{ slug }`, returns product with recent price history
- `addProduct` — input: `{ url, targetPrice?, checkInterval? }`, detects retailer, fetches initial price
- `updateProduct` — input: `{ id, data: { targetPrice?, checkInterval?, status?, notes? } }`
- `deleteProduct` — input: `{ id }`, soft delete

Price:

- `getPriceHistory` — input: `{ productId, dateFrom?, dateTo? }`, time-series data
- `checkPriceNow` — input: `{ productId }`, manual refresh, returns updated product

Alerts:

- `listAlerts` — input: `{ workspaceId, productId? }`
- `createAlert` — input: `{ productId, type, threshold?, enabled? }`
- `updateAlert` — input: `{ id, data: { type?, threshold?, enabled? } }`
- `deleteAlert` — input: `{ id }`
- `getRecentTriggers` — input: `{ workspaceId, limit? }`

Retailers:

- `listRetailers` — returns enabled retailers with their config

### Modify: `packages/core/src/trpc/router.ts`

Register `priceWatcherRoutes` in the main router.

### New: `packages/core/src/query/price-watcher.ts`

Query definitions (defineQuery):

- `listProducts(filters?)` — product list with staleTime
- `getProduct(slug)` — single product detail
- `getPriceHistory(productId, dateRange?)` — chart data
- `listAlerts(productId?)` — alert rules
- `getRecentTriggers()` — recent alert history
- `listRetailers()` — available retailers

Mutation definitions (defineMutation):

- `addProduct` — invalidates product list
- `updateProduct` — invalidates product detail + list
- `deleteProduct` — removes from cache, invalidates list
- `checkPriceNow` — invalidates product detail + price history
- `createAlert` / `updateAlert` / `deleteAlert` — invalidates alert list

### New: `apps/budget/src/lib/query/price-watcher.ts`

Re-export shim: `export * from "$core/query/price-watcher"`

### New: `apps/budget/tests/integration/trpc/price-watcher.test.ts`

- Add product via URL
- List products with filters
- Check price manually
- CRUD alert rules
- Price history retrieval

## Dependencies

Phase 4 (Services) must be complete.

## Verification

1. `bun run check` — type check
2. `bun test tests/integration/trpc/price-watcher.test.ts` — route tests pass
