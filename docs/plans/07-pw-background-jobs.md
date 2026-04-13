# Phase 7: Background Price Checking

## Goal

Automate periodic price checks so users don't have to manually refresh. Evaluate alerts and send notifications when conditions are met.

## Done When

- Products are automatically checked based on their `checkInterval`
- Price snapshots are stored after each check
- Alerts fire when conditions are met (price drop, target reached, etc.)
- Notifications appear in the existing notification system
- Failed checks are retried with backoff and products marked as "error" after repeated failures

## Changes

### Price Check Scheduler

**Option A: SvelteKit server hook + setInterval**

- In `apps/budget/src/hooks.server.ts`, start a background interval on server init
- Every N minutes (e.g., 15), query for products where `lastCheckedAt + checkInterval < now`
- Process in batches, rate-limited per retailer
- Simple, no external dependencies

**Option B: Cron endpoint**

- Create `src/routes/api/cron/check-prices/+server.ts`
- Called by an external cron service (or Bun's built-in scheduler)
- Returns results as JSON
- More standard, easier to monitor

Recommend starting with **Option A** for simplicity, migrating to Option B if needed.

### Implementation

**`packages/core/src/server/domains/price-watcher/scheduler.ts`**:

- `processOverdueChecks(workspaceId?)` — find and check all overdue products
- Batch processing: group by retailer, apply rate limits (e.g., max 1 req/second per domain)
- Error handling: increment error count, pause product after 3 consecutive failures
- Logging: record check results for debugging

**`packages/core/src/server/domains/price-watcher/alert-service.ts`** (extend):

- After each price check, evaluate all enabled alerts for that product
- Create notification entries via the existing notification system
- Update `lastTriggeredAt` on alert
- Debounce: don't re-trigger the same alert within a cooldown period (e.g., 24 hours)

### Notification Integration

- Use the existing `NotificationPopover` and notification system
- New notification types: `price_drop`, `target_reached`, `back_in_stock`
- Notification links navigate to the product detail page
- Badge count in app rail for price watcher alerts

### Error Handling

- Network errors: retry with exponential backoff (1min, 5min, 30min)
- Parse errors: log and mark product as "error" with error message
- Rate limiting: respect retailer rate limits, queue excess requests
- Product status transitions: active → error (after 3 failures) → active (on manual retry)

## Dependencies

Phase 4 (Services) must be complete. Phase 6 (UI) is not required but notifications integration benefits from it.

## Verification

1. Start dev server, add a product, wait for scheduled check interval
2. Verify price snapshot is created in database
3. Set target price above current price, verify alert triggers
4. Verify notification appears in notification popover
5. Simulate fetch failure, verify error handling and retry
