# Phase 3: Price Watcher Schema

## Goal

Define the database tables for the price watcher. Generate and apply migrations. No service logic or UI yet — just the data model.

## Done When

- Four new schema files exist in `packages/core/src/schema/`
- Migration is generated and applied
- Tables are visible in Drizzle Studio
- Schema types are exported from the barrel

## Changes

### New: `packages/core/src/schema/price-products.ts`

Tracked products table:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer PK | auto-increment |
| `workspaceId` | integer FK | references workspaces |
| `name` | text | product name |
| `url` | text | product page URL |
| `retailer` | text | amazon, walmart, target, etc. |
| `imageUrl` | text, nullable | product image |
| `currentPrice` | real, nullable | last known price |
| `lowestPrice` | real, nullable | all-time low |
| `highestPrice` | real, nullable | all-time high |
| `targetPrice` | real, nullable | user's desired alert price |
| `currency` | text | default "USD" |
| `lastCheckedAt` | text, nullable | ISO timestamp |
| `status` | text | "active", "paused", "error" |
| `checkInterval` | integer | hours between checks, default 6 |
| `slug` | text, unique | URL-friendly identifier |
| `notes` | text, nullable | user notes |
| `createdAt` | text | ISO timestamp |
| `updatedAt` | text | ISO timestamp |
| `deletedAt` | text, nullable | soft delete |

Indexes: `workspaceId`, `retailer`, `status`, `slug`, `deletedAt`.

Relations: `workspace`, `priceHistory` (many), `alerts` (many).

### New: `packages/core/src/schema/price-history.ts`

Price snapshots table:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer PK | auto-increment |
| `productId` | integer FK | references price_products, cascade delete |
| `price` | real | price at check time |
| `currency` | text | default "USD" |
| `inStock` | integer | boolean (0/1) |
| `source` | text | "api", "scrape", "manual" |
| `checkedAt` | text | ISO timestamp |

Indexes: `productId`, `checkedAt`, composite `(productId, checkedAt)`.

Relation: `product` (one).

### New: `packages/core/src/schema/price-alerts.ts`

Alert rule table:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer PK | auto-increment |
| `productId` | integer FK | references price_products, cascade delete |
| `workspaceId` | integer FK | references workspaces |
| `type` | text | "price_drop", "target_reached", "back_in_stock", "any_change" |
| `threshold` | real, nullable | percentage or absolute depending on type |
| `enabled` | integer | boolean, default 1 |
| `lastTriggeredAt` | text, nullable | ISO timestamp |
| `createdAt` | text | ISO timestamp |
| `updatedAt` | text | ISO timestamp |

Indexes: `productId`, `workspaceId`, `enabled`.

Relations: `product` (one), `workspace` (one).

### New: `packages/core/src/schema/price-retailers.ts`

Retailer configuration table:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer PK | auto-increment |
| `name` | text | display name (e.g., "Amazon") |
| `slug` | text, unique | URL-friendly key |
| `domain` | text | e.g., "amazon.com" |
| `icon` | text, nullable | icon name |
| `scrapeConfig` | text, nullable | JSON: CSS selectors for price, title, image |
| `apiProvider` | text, nullable | "amazon_paapi", null for scrape-only |
| `enabled` | integer | boolean, default 1 |
| `createdAt` | text | ISO timestamp |
| `updatedAt` | text | ISO timestamp |

Indexes: `slug`, `domain`.

### Modify: `packages/core/src/schema/index.ts`

Export all new schema files from the barrel.

## Dependencies

None — schema can be created independently.

## Verification

1. `bun run db:generate` — migration file created
2. `bun run db:migrate` — migration applies cleanly
3. `bun run db:studio` — tables visible with correct columns
4. `bun run check` — types export correctly
