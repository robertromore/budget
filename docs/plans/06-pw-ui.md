# Phase 6: Price Watcher UI

## Goal

Build the user-facing pages and components for the price watcher app.

## Done When

- Users can add a product by pasting a URL
- Product list shows all tracked products with current prices and trends
- Product detail page shows price history chart
- Alert management page lets users configure notifications
- Dashboard shows summary of tracked products and recent activity

## Changes

### Pages

**`src/routes/(price-watcher)/+page.svelte`** — Dashboard:

- Summary cards: products tracked, active alerts, price drops this week
- Recent price changes list (product name, old price, new price, time)
- Quick "Add Product" button

**`src/routes/(price-watcher)/products/+page.svelte`** — Product list:

- Grid/list toggle view
- Each card: product image, name, retailer icon, current price, price trend arrow (up/down/flat), target price indicator
- Status badge (active, paused, error)
- "Add Product" button in header
- Filters: retailer, status, price range
- Sort: name, price, last checked, date added
- Empty state with guidance

**`src/routes/(price-watcher)/products/[slug]/+page.svelte`** — Product detail:

- Product header: image, name, retailer, URL link
- Price overview: current, lowest, highest, target
- Price history chart (LayerChart line chart, reuse existing chart infrastructure)
- Period filter (7d, 30d, 90d, 1y, all)
- Alert configuration section for this product
- "Check Now" button for manual refresh
- Price statistics: average, volatility, days since last drop

**`src/routes/(price-watcher)/products/[slug]/+page.server.ts`** — Slug validation:

- Validate product exists, throw 404 if not found (same pattern as budget/account detail pages)

**`src/routes/(price-watcher)/alerts/+page.svelte`** — Alert management:

- List of all alert rules grouped by product
- Toggle enabled/disabled per alert
- Recent trigger history with timestamps
- Create alert from this page (select product + configure)

### Components

**`src/routes/(price-watcher)/(components)/add-product-dialog.svelte`**:

- Input: paste product URL
- Auto-detect: retailer, product name, image, current price (loading state while fetching)
- Configure: target price, check interval, enable alerts
- Preview card before confirming
- Error handling for unsupported URLs or fetch failures

**`src/routes/(price-watcher)/(components)/product-card.svelte`**:

- Compact card for grid view: image, name, price, trend
- Click navigates to detail page

**`src/routes/(price-watcher)/(components)/price-history-chart.svelte`**:

- LayerChart line chart wrapping existing chart infrastructure
- X-axis: dates, Y-axis: price
- Target price horizontal reference line
- Lowest price annotation
- Period filtering

**`src/routes/(price-watcher)/(components)/alert-rule-card.svelte`**:

- Alert type badge, threshold display, enabled toggle
- Last triggered timestamp
- Edit/delete actions

### Sidebar

**`src/lib/components/layout/price-watcher-sidebar.svelte`** (created in Phase 2):

- Update with actual navigation links and product count badges
- Show active alert count

## Dependencies

Phase 2 (Route Groups) and Phase 5 (tRPC + Query) must be complete.

## Verification

1. `bun run check` — type check
2. `bun run dev` — navigate to price watcher via app rail
3. Add a product URL — verify it fetches name/price
4. View product detail — chart renders with price history
5. Create an alert — appears in alert list
6. Mobile: pages are responsive
