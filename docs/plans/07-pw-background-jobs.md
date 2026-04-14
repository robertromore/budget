# Phase 7: Background Price Checking

## Goal

Automate periodic price checks so users don't have to manually refresh each product.

## Done When

- A cron API endpoint processes overdue products
- Products are checked based on their `checkInterval`
- Failed checks mark the product as "error" after 3 consecutive failures
- Error count resets on successful check or manual retry

## Approach

**Cron endpoint** at `src/routes/api/cron/check-prices/+server.ts`. Called externally (cron job, Bun scheduler, or manual curl) on a fixed interval (e.g., every 15 minutes). Returns JSON with results. Stateless — each call queries for overdue products and processes them.

This avoids the complexity of server-side setInterval (SvelteKit has no clean server init hook) and client-side scheduling (only works when app is open).

## Schema Change

Add `errorCount` to price_products:

- `errorCount` integer, default 0 — consecutive failed checks
- Reset to 0 on successful check or manual "Check Now"
- Product paused automatically when `errorCount >= 3`

This requires a small migration.

## Changes

### Modify: `packages/core/src/schema/price-products.ts`

Add `errorCount: integer("error_count").notNull().default(0)` to the table.

### Modify: `packages/core/src/server/domains/price-watcher/product-service.ts`

Update `checkPrice`:

- On success: set `errorCount: 0`, `status: "active"`, clear `errorMessage`
- On failure: increment `errorCount`, set `errorMessage`. If `errorCount >= 3`, set `status: "error"`

### New: `packages/core/src/server/domains/price-watcher/scheduler.ts`

- `processOverdueChecks(workspaceId)` — query `findDueForCheck()`, process each product via `checkPrice()`, return summary (checked count, success count, error count)
- Rate limiting: sequential processing with a delay between requests to the same retailer domain (1 second between same-domain requests)
- Skip products already in "error" status (they need manual retry via "Check Now")

### New: `apps/budget/src/routes/api/cron/check-prices/+server.ts`

- GET endpoint, no auth required (secured by deployment config or API key in header)
- Calls `processOverdueChecks` for each active workspace
- Returns `{ checked: number, succeeded: number, failed: number }`
- Responds with 200 even on partial failures (individual product errors don't fail the batch)

## Deferred

- **Notification integration**: Creating notification entries when alerts fire. The `alertService.evaluateAlerts` already runs during `checkPrice` and marks `lastTriggeredAt`. Actual notification creation is deferred until the notification system is extended with price watcher notification types.
- **Exponential backoff**: Simple 3-strikes-and-pause is sufficient. Per-retry backoff adds complexity with no schema support for tracking retry timing.
- **App rail badge**: UI concern, not a backend job concern.

## Dependencies

Phase 4 (Services) must be complete. Phase 3 (Schema) for the migration.

## Verification

1. `bun run db:generate` and `bun run db:migrate` — migration for `errorCount`
2. `bun run check` — type check
3. `curl http://localhost:5173/api/cron/check-prices` — returns JSON summary
4. Add a product, wait past its check interval, hit the cron endpoint, verify new price snapshot
5. Add a product with an invalid URL, hit cron 3 times, verify it transitions to "error" status
