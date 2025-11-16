# Credit Card Metrics Enhancement Plan

## Completed ✅

1. **Added `enabledMetrics` field to account schema**
   ([accounts.ts:58](src/lib/schema/accounts.ts#L58))
   - Stores JSON array of enabled metric IDs

2. **Created comprehensive metrics utility**
   ([credit-card-metrics.ts](src/lib/utils/credit-card-metrics.ts))
   - Defined 13 available metrics across 5 categories
   - Created calculation functions for all metrics
   - Added helper functions for metric availability checking

## Metrics Available

### Credit Health (3 metrics)

- ✅ Available Credit - Default enabled
- ✅ Credit Utilization - Default enabled
- ✅ Over Limit Warning - Default enabled

### Payment Info (4 metrics)

- ✅ Minimum Payment - Default enabled
- ⚪ Interest Rate (APR)
- ⚪ Payment Due Date
- ⚪ Days Until Due

### Balance Info (2 metrics)

- ⚪ Current Balance
- ⚪ Credit Limit

### Spending Metrics (2 metrics)

- ⚪ This Month's Spending
- ⚪ Transaction Count

### Financial Health (2 metrics)

- ⚪ Interest Charges This Month
- ⚪ Payoff Timeline

## Completed Steps ✅

### 1. ✅ Update Database Schema

- Ran `bun drizzle-kit push` to add `enabledMetrics` TEXT column to accounts
  table
- Migration successfully applied

### 2. ✅ Update debt-account-metrics.svelte Component

Refactored to:

- Use `calculateAllMetrics()` from credit-card-metrics.ts
- Read `enabledMetrics` from account using `getEnabledMetrics()`
- Render only enabled metrics dynamically
- Added "Configure Metrics" button (placeholder - functionality pending)
- Dynamic icon rendering from metric definitions
- Smart value formatting and color coding based on metric type

### 3. ✅ Create Metric Selection UI

Created
[configure-metrics-dialog.svelte](src/lib/components/accounts/configure-metrics-dialog.svelte)
with:

- Metrics organized by 5 categories with icons and descriptions
- Checkbox toggles for each metric
- Unavailable metrics disabled (missing required account fields)
- Reset to defaults button
- Save/Cancel actions

### 4. ✅ Add tRPC Mutation

Created `updateEnabledMetrics` mutation in
[accounts.ts](src/lib/trpc/routes/accounts.ts#L552-L590):

- Validates account exists and is not deleted
- Updates `enabledMetrics` JSON field in database
- Updates `updatedAt` timestamp
- Returns updated account

### 5. ✅ Wire Up UI

Connected in
[debt-account-metrics.svelte](src/lib/components/accounts/debt-account-metrics.svelte):

- "Configure Metrics" button opens dialog
- `handleSaveMetrics` calls tRPC mutation
- Updates local account state
- Shows success/error toasts via svelte-sonner

## Next Steps (TODO)

### 4. Add Monthly Spending Calculation

Enhance the metrics calculation to:

- Accept transaction data
- Calculate current month's spending
- Count transactions for the month

### 5. Integrate with Account Settings

Add "Customize Metrics" option in:

- Account dropdown menu
- Account edit page

## Implementation Priority

**Phase 1** (Do First):

1. Run database migration for `enabledMetrics` field
2. Update `debt-account-metrics.svelte` to use new system with defaults
3. Test that existing cards still work

**Phase 2** (Add UI):

1. Create metric selection dialog component
2. Add "Configure Metrics" button to metrics section
3. Wire up save functionality

**Phase 3** (Enhance Calculations):

1. Add monthly spending calculations
2. Add transaction count
3. Test all metric calculations

## Code Locations

- Schema: `src/lib/schema/accounts.ts`
- Metrics Utils: `src/lib/utils/credit-card-metrics.ts`
- Component: `src/lib/components/accounts/debt-account-metrics.svelte`
- Account Page: `src/routes/accounts/[slug]/+page.svelte`

## Testing Plan

1. Create credit card with only credit limit → Should show 3 default metrics
2. Add payment due day → Should make payment date metrics available
3. Configure to show all available metrics → Should display all cards
4. Configure to show only 2 metrics → Should show only those 2
5. Check other account types → Should not see metrics section

## Migration SQL

```sql
ALTER TABLE account ADD COLUMN enabled_metrics TEXT;
```

Default value will be NULL, which the code interprets as "use defaults".
