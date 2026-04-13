# Phase 6: Price Watcher UI

## Goal

Build the user-facing pages and components for the price watcher app.

## Done When

- Users can add a product by pasting a URL
- Product list shows all tracked products with current prices
- Product detail page shows price history chart
- Alert management lets users configure notifications
- Dashboard shows summary of tracked products

## Route Structure

All pages live under `(price-watcher)/price-watcher/` so URLs are prefixed with `/price-watcher/`:

```text
src/routes/(price-watcher)/price-watcher/
├── +page.svelte                          → /price-watcher (dashboard)
├── products/
│   ├── +page.svelte                      → /price-watcher/products
│   └── [slug]/
│       ├── +page.svelte                  → /price-watcher/products/acme-widget-abc123
│       └── +page.server.ts               → slug validation
├── alerts/
│   └── +page.svelte                      → /price-watcher/alerts
└── (components)/
    ├── add-product-dialog.svelte
    ├── product-card.svelte
    ├── price-history-chart.svelte
    └── alert-rule-card.svelte
```

## Implementation Steps

### Step 1: Product List + Add Dialog

**`(price-watcher)/price-watcher/products/+page.svelte`** — Product list:

- Grid of product cards
- Each card: product name, retailer, current price, target price, status badge
- "Add Product" button in header opens add dialog
- Empty state with guidance
- Uses `listProducts()` query

**`(price-watcher)/price-watcher/(components)/add-product-dialog.svelte`**:

- Input: paste product URL
- On submit: calls `addProduct` mutation (fetches name/image/price server-side)
- Loading state while fetching
- Optional: target price, check interval
- Error handling for invalid URLs or fetch failures
- On success: close dialog, product appears in list

**`(price-watcher)/price-watcher/(components)/product-card.svelte`**:

- Card showing: name, retailer, current price, target price (if set), status badge (active/paused/error)
- Error products show error message
- Click navigates to `/price-watcher/products/{slug}`

### Step 2: Product Detail + Chart

**`(price-watcher)/price-watcher/products/[slug]/+page.svelte`**:

- Product header: name, retailer, URL link (external), status
- Price overview cards: current, lowest, highest, target
- Price history chart (LayerChart line chart, reuse existing chart wrapper)
- Period filter (7d, 30d, 90d, 1y, all)
- "Check Now" button for manual refresh
- "Edit" button for target price/interval/status
- "Delete" button with confirmation
- Alert section: list alerts for this product, create new alert inline

**`(price-watcher)/price-watcher/products/[slug]/+page.server.ts`**:

- Validate product exists via tRPC caller, throw 404 if not found (same pattern as budget account/payee detail pages)

**`(price-watcher)/price-watcher/(components)/price-history-chart.svelte`**:

- LayerChart line chart
- X-axis: dates, Y-axis: price
- Target price as horizontal reference line (dashed)
- Uses `getPriceHistory()` query

### Step 3: Alerts Page

**`(price-watcher)/price-watcher/alerts/+page.svelte`**:

- List of all alert rules grouped by product
- Each alert shows: type badge, threshold, enabled toggle, lastTriggeredAt
- Create alert: select product + type + threshold
- Edit/delete inline
- Empty state when no alerts

**`(price-watcher)/price-watcher/(components)/alert-rule-card.svelte`**:

- Alert type badge (color-coded by type)
- Threshold display (percentage for price_drop)
- Enabled/disabled toggle (calls `updateAlert` mutation)
- Last triggered timestamp
- Delete button

### Step 4: Dashboard + Sidebar

**`(price-watcher)/price-watcher/+page.svelte`** — Dashboard (replaces placeholder):

- Summary cards: products tracked, active alerts, products with errors
- Recent price changes (query last N history entries across all products)
- Quick "Add Product" button
- Link to products list

**Update `price-watcher-sidebar.svelte`**:

- Add product count badge next to "Products" nav item
- Add active alert count badge next to "Alerts" nav item
- Uses `listProducts()` and `listAlerts()` queries for counts

## Dependencies

Phase 2 (Route Groups) and Phase 5 (tRPC + Query) must be complete.

## Verification

1. `bun run check` — type check
2. `bun run dev` — navigate to price watcher via app rail
3. `/price-watcher/products` — empty state shows, add a product URL
4. `/price-watcher/products/{slug}` — detail page with chart renders
5. `/price-watcher/alerts` — create and toggle alerts
6. `/price-watcher` — dashboard shows summary
7. Sidebar shows product/alert counts
8. Mobile: pages are responsive
