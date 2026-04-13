# Phase 4: Price Watcher Services

## Goal

Build the domain service layer — repository, business logic, and price fetching providers. No tRPC routes or UI yet.

## Done When

- Product CRUD works via service methods
- At least one price provider (generic scraper) can fetch a price from a URL
- Alert evaluation logic checks conditions against price history
- Integration tests pass for core service methods

## Changes

### New: `packages/core/src/server/domains/price-watcher/`

**`repository.ts`** — Data access:

- `create(product)`, `findById(id, workspaceId)`, `findBySlug(slug, workspaceId)`
- `findAll(workspaceId, filters)`, `update(id, data, workspaceId)`, `softDelete(id, workspaceId)`
- `addPriceSnapshot(productId, snapshot)`, `getPriceHistory(productId, dateRange)`
- `createAlert(alert)`, `updateAlert(id, data)`, `deleteAlert(id)`
- `findAlertsByProduct(productId)`, `findActiveAlerts(workspaceId)`

**`product-service.ts`** — Business logic:

- `addProduct(url, workspaceId)` — detect retailer from domain, create product, fetch initial price
- `checkPrice(productId)` — fetch current price, store snapshot, update product stats (current/lowest/highest), evaluate alerts
- `checkAllDueProducts(workspaceId)` — find products where `lastCheckedAt + checkInterval < now`, check each
- `updateProduct(id, data, workspaceId)` — update target price, interval, status
- `deleteProduct(id, workspaceId)` — soft delete with cascade
- `getProductWithHistory(id, workspaceId)` — product + price history for detail view

**`alert-service.ts`** — Alert evaluation:

- `evaluateAlerts(productId, oldPrice, newPrice)` — check all enabled alerts for a product
- Conditions: price_drop (price decreased), target_reached (price <= targetPrice), back_in_stock (inStock changed to true), any_change (price differs)
- `triggerAlert(alert, product, priceChange)` — create notification via existing notification system
- `getRecentTriggers(workspaceId)` — recent alert trigger history

**`price-checker.ts`** — Orchestrator:

- `fetchPrice(product)` — route to the right provider based on retailer/apiProvider
- `detectRetailer(url)` — parse domain to identify retailer
- `extractProductInfo(url)` — fetch page, extract name/image/price

**`providers/generic-scraper.ts`** — HTML scraping:

- `fetchPage(url)` — HTTP fetch with proper headers (User-Agent, etc.)
- `extractPrice(html, selectors)` — use cheerio to extract price from CSS selectors
- `extractProductName(html, selectors)` — extract product title
- `extractImage(html, selectors)` — extract product image URL
- Default selectors for common patterns (meta tags, JSON-LD, Open Graph)

**`providers/amazon-provider.ts`** — Amazon API (stub):

- Placeholder for Amazon Product Advertising API integration
- Falls back to generic scraper if API keys not configured

### New: `apps/budget/tests/integration/price-watcher/`

**`product-service.test.ts`**:

- Create/read/update/delete product
- Price snapshot storage and retrieval
- Product stats calculation (lowest/highest price)

**`alert-service.test.ts`**:

- Alert evaluation for each type (price_drop, target_reached, back_in_stock, any_change)
- Threshold comparison
- Alert trigger recording

## Dependencies

Phase 3 (Schema) must be complete.

## Verification

1. `bun run check` — type check
2. `bun test tests/integration/price-watcher/` — service tests pass
3. Manual: call service methods from a test script to verify scraping works
