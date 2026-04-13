# Phase 3: Price Watcher Schema

## Goal

Define the database tables for the price watcher. Generate and apply migrations. No service logic or UI yet — just the data model.

## Done When

- Three new schema files exist in `packages/core/src/schema/`
- Migration is generated and applied
- Tables are visible in Drizzle Studio
- Schema types are exported from the barrel

## Changes

### New: `packages/core/src/schema/price-products.ts`

Tracked products table:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer PK | auto-increment |
| `seq` | integer, nullable | workspace-scoped sequential ID |
| `cuid` | text, unique | external-safe identifier (cuid2) |
| `workspaceId` | integer FK | references workspaces |
| `name` | text | product name |
| `url` | text | product page URL |
| `retailer` | text | amazon, walmart, target, etc. (free text, not FK) |
| `imageUrl` | text, nullable | product image |
| `currentPrice` | real, nullable | last known price |
| `lowestPrice` | real, nullable | all-time low |
| `highestPrice` | real, nullable | all-time high |
| `targetPrice` | real, nullable | user's desired alert price |
| `currency` | text | default "USD" |
| `lastCheckedAt` | text, nullable | ISO timestamp |
| `status` | text | "active", "paused", "error" |
| `errorMessage` | text, nullable | last error details when status is "error" |
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
| `inStock` | integer | boolean (0/1) |
| `source` | text | "api", "scrape", "manual" |
| `checkedAt` | text | ISO timestamp |

Indexes: `productId`, `checkedAt`, composite `(productId, checkedAt)`.

Relation: `product` (one).

Currency is inherited from the parent product, not stored per snapshot. Previous price is not stored — query the prior row by `(productId, checkedAt)` when needed.

### New: `packages/core/src/schema/price-alerts.ts`

Alert rule table:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer PK | auto-increment |
| `productId` | integer FK | references price_products, cascade delete |
| `workspaceId` | integer FK | references workspaces |
| `type` | text | "price_drop", "target_reached", "back_in_stock", "any_change" |
| `threshold` | real, nullable | percentage for price_drop (e.g., 10 = 10%), ignored for other types |
| `enabled` | integer | boolean, default 1 |
| `lastTriggeredAt` | text, nullable | ISO timestamp |
| `createdAt` | text | ISO timestamp |
| `updatedAt` | text | ISO timestamp |

Indexes: `productId`, `workspaceId`, `enabled`.

Relations: `product` (one), `workspace` (one).

### Deferred: `price-retailers.ts`

Retailer configuration (scrape selectors, API provider keys) is better as code-level config in the service layer (Phase 4). A database table adds complexity without a consumer at this stage. The `retailer` text field on products is sufficient — the service layer maps retailer strings to provider implementations.

### Modify: `packages/core/src/schema/index.ts`

Export all new schema files from the barrel.

## Dependencies

None — schema can be created independently.

## Verification

1. `bun run db:generate` — migration file created
2. `bun run db:migrate` — migration applies cleanly
3. `bun run db:studio` — tables visible with correct columns
4. `bun run check` — types export correctly
