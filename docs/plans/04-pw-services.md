# Phase 4: Price Watcher Services

## Goal

Build the domain service layer — repositories, business logic, and price fetching. No tRPC routes or UI yet.

## Done When

- Product CRUD works via service methods
- Price fetching extracts product info from a URL (JSON-LD, Open Graph, meta tags)
- Alert evaluation logic checks conditions against price data
- Integration tests pass for core service methods

## Changes

### New: `packages/core/src/server/domains/price-watcher/`

**`product-repository.ts`** — Product data access:

- `create(product, workspaceId)` — insert with slug generation
- `findById(id, workspaceId)`, `findBySlug(slug, workspaceId)`
- `findAll(workspaceId, filters?)` — with optional status/retailer filters
- `update(id, data, workspaceId)` — partial update
- `softDelete(id, workspaceId)`
- `findDueForCheck(workspaceId)` — products where `lastCheckedAt + checkInterval < now` (used by Phase 7 scheduler, but the query lives here)

**`history-repository.ts`** — Price history data access:

- `addSnapshot(productId, snapshot)` — insert price record
- `getHistory(productId, dateRange?)` — time-series query ordered by checkedAt
- `getLatest(productId)` — most recent snapshot (for previous price comparison)
- `getPreviousPrice(productId)` — second-most-recent price (for change detection)

**`alert-repository.ts`** — Alert data access:

- `create(alert)`, `update(id, data)`, `delete(id)`
- `findByProduct(productId)` — all alerts for a product
- `findEnabled(productId)` — only enabled alerts for evaluation
- `findAllByWorkspace(workspaceId)` — all alerts for management UI

**`product-service.ts`** — Business logic:

- `addProduct(url, workspaceId)` — detect retailer from URL domain, fetch product info (name, image, price), generate slug, create product record, store initial price snapshot
- `checkPrice(productId, workspaceId)` — flow: (1) get previous price via `historyRepository.getLatest()`, (2) fetch current price from URL, (3) store new snapshot, (4) update product stats (currentPrice, lowestPrice, highestPrice, lastCheckedAt), (5) evaluate alerts with old vs new price, (6) clear error status on success or set error status/message on failure
- `updateProduct(id, data, workspaceId)` — update target price, check interval, status, notes
- `deleteProduct(id, workspaceId)` — soft delete (cascade handles history + alerts)
- `getProductWithHistory(slug, workspaceId)` — product + price history for detail view

Slug generation: use the existing `normalize` utility from `$core/utils/string-utilities` to slugify the product name, appending a short random suffix for uniqueness.

**`alert-service.ts`** — Alert evaluation:

- `evaluateAlerts(productId, oldPrice, newPrice, inStock, wasInStock)` — check all enabled alerts for a product:
  - `price_drop`: price decreased by more than threshold percentage
  - `target_reached`: price <= product's targetPrice
  - `back_in_stock`: wasInStock=false, inStock=true
  - `any_change`: price differs from previous
- `triggerAlert(alert, product, context)` — create notification via existing notification system (notifications table + NotificationPopover)
- Update `lastTriggeredAt` on the alert after triggering

No separate trigger history table — triggered alerts are recorded as notifications in the existing notification system.

**`price-checker.ts`** — Price fetching:

- `fetchProductInfo(url)` — fetch the page HTML via `fetch()` with browser-like headers, extract structured data in priority order:
  1. JSON-LD (`<script type="application/ld+json">`) — most reliable, contains price, name, image, availability
  2. Open Graph meta tags (`og:title`, `og:image`, `product:price:amount`)
  3. Standard meta tags (`<title>`, `meta[name="description"]`)
- `detectRetailer(url)` — parse URL hostname to identify retailer (amazon.com, walmart.com, target.com, etc.)
- `parsePrice(input)` — normalize price from string or number to `number | null`. Handles "$12.99", "12,99 EUR", raw numbers from JSON-LD, and returns null for unparseable values

No cheerio dependency — use regex and string parsing on the raw HTML for structured data extraction. JSON-LD is valid JSON and can be parsed with `JSON.parse`. Meta tags can be extracted with simple regex patterns. CSS selector-based scraping is deferred to a future phase.

### New: `packages/core/src/server/domains/price-watcher/index.ts`

Barrel export for the domain (matches existing pattern).

### New: `apps/budget/tests/integration/price-watcher/`

**`product-service.test.ts`**:

- Create product with slug generation
- Read by ID and slug
- Update target price and check interval
- Soft delete
- Price snapshot storage and retrieval
- Product stats update (lowest/highest price tracking)

**`price-checker.test.ts`**:

- Extract product info from HTML with JSON-LD structured data
- Extract product info from HTML with Open Graph meta tags
- Fall back to title tag when no structured data
- Parse price from various formats ("$12.99", "12,99", raw number)
- Return null for unparseable prices
- Detect retailer from URL hostname

**`alert-service.test.ts`**:

- Alert evaluation for price_drop with threshold
- Alert evaluation for target_reached
- Alert evaluation for back_in_stock
- Alert evaluation for any_change
- Disabled alerts are skipped
- lastTriggeredAt is updated after trigger

## Dependencies

Phase 3 (Schema) must be complete.

## Verification

1. `bun run check` — type check
2. `bun test tests/integration/price-watcher/` — service tests pass
3. Manual: call `fetchProductInfo` with a real product URL to verify extraction works
