# Scheduled-Expense Budget & Schedule Integration

## Overview
This document tracks the enhancement of scheduled-expense budgets to integrate with the schedules system, enabling automatic tracking and forecasting of recurring bills.

## ✅ Completed Work

### 1. Enhanced Budget Metadata Schema
**File:** `src/lib/schema/budgets.ts`

Added `scheduledExpense` metadata field to `BudgetMetadata` interface:
```typescript
scheduledExpense?: {
  linkedScheduleId?: number;      // Link to schedule record
  expectedAmount?: number;         // Expected payment amount
  frequency?: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';
  payeeId?: number;               // Associated payee
  autoTrack?: boolean;            // Auto-track scheduled transactions
};
```

### 2. Added Backend Service Methods
**File:** `src/lib/server/domains/budgets/services.ts`

#### BudgetService
- Added `linkScheduleToScheduledExpense(budgetId, scheduleId)` method (line 586)

#### GoalTrackingService
- Added `linkScheduleToScheduledExpense(budgetId, scheduleId)` implementation (lines 1397-1422)
- Validates budget is type "scheduled-expense"
- Stores schedule link in metadata
- Enables auto-tracking

### 3. Added tRPC API Route
**File:** `src/lib/trpc/routes/budgets.ts`

Added `linkScheduleToScheduledExpense` mutation (lines 968-979):
```typescript
linkScheduleToScheduledExpense: publicProcedure
  .input(z.object({
    budgetId: z.number().int().positive(),
    scheduleId: z.number().int().positive(),
  }))
  .mutation(async ({input}) => {
    try {
      return await budgetService.linkScheduleToScheduledExpense(
        input.budgetId,
        input.scheduleId
      );
    } catch (error) {
      throw translateDomainError(error);
    }
  })
```

### 4. Added Query Layer Mutation
**File:** `src/lib/query/budgets.ts`

Added `linkScheduleToScheduledExpense` mutation (lines 868-879):
- Proper cache invalidation
- Success/error toasts
- TanStack Query integration

### 5. Recommendation Metadata
**File:** `src/lib/server/domains/budgets/budget-analysis-service.ts`

Scheduled-expense recommendations already include:
- `payeeIds` - Which payee the expense is for
- `detectedFrequency` - weekly/monthly/etc.
- `predictability` - How consistent amounts are
- `intervalDays` - Days between occurrences
- `suggestedAmount` - Recommended budget amount

## 🚧 Remaining Work

### Phase 1: UI Integration

#### 1. Add Schedule Selector to Budget Form
**File:** `src/lib/components/forms/manage-budget-form.svelte`

**Changes needed:**
- Import `SchedulesState`
- Add schedule selector that shows when `type === "scheduled-expense"`
- Filter schedules to show only active ones without existing budget links
- Store `linkedScheduleId` in form metadata
- Display linked schedule info if editing existing budget

**UI Location:** After the account/category selectors, add:
```svelte
{#if selectedBudgetType === 'scheduled-expense'}
  <div class="space-y-2">
    <Label>Link to Schedule (Optional)</Label>
    <Select.Root
      type="single"
      value={linkedScheduleId?.toString() || ''}
      onValueChange={(value) => {
        linkedScheduleId = value ? parseInt(value) : undefined;
      }}>
      <Select.Trigger>
        {linkedScheduleName || 'Select a schedule...'}
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="">None</Select.Item>
        {#each availableSchedules as schedule}
          <Select.Item value={schedule.id.toString()}>
            {schedule.name} - {schedule.payee?.name} ({schedule.frequency})
          </Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </div>
{/if}
```

#### 2. Show Linked Schedule in Budget Detail Page
**File:** `src/routes/budgets/[slug]/+page.svelte`

**Changes needed:**
- Check if budget has `metadata.scheduledExpense.linkedScheduleId`
- Query and display linked schedule information
- Show next occurrence date
- Show expected amount vs actual
- Add "Unlink Schedule" button

#### 3. Update Recommendation Card
**File:** `src/lib/components/budgets/budget-recommendation-card.svelte`

**Changes needed:**
- For scheduled-expense recommendations, show:
  - Payee name
  - Detected frequency
  - "Will auto-create schedule" badge
  - Link to existing matching schedule if found

### Phase 2: Auto-Linking on Apply

#### 4. Enhance Recommendation Application
**File:** `src/lib/trpc/routes/budgets.ts` (applyRecommendation procedure)

**Logic flow:**
```typescript
async applyRecommendation(id: number) {
  const recommendation = await getRecommendation(id);

  if (recommendation.metadata.suggestedType === 'scheduled-expense') {
    // 1. Check if matching schedule exists
    const payeeId = recommendation.metadata.payeeIds?.[0];
    const frequency = recommendation.metadata.detectedFrequency;

    const matchingSchedule = await findSchedule({
      payeeId,
      frequency,
      budgetId: null // Not linked to any budget yet
    });

    // 2. Create budget
    const budget = await createBudget({
      type: 'scheduled-expense',
      name: recommendation.title,
      // ... other fields
      metadata: {
        scheduledExpense: {
          payeeId,
          frequency,
          expectedAmount: recommendation.metadata.suggestedAmount,
          autoTrack: true
        }
      }
    });

    // 3. Create or link schedule
    let scheduleId: number;
    if (matchingSchedule) {
      scheduleId = matchingSchedule.id;
    } else {
      const newSchedule = await createSchedule({
        name: `${payeeName} - Recurring`,
        payeeId,
        accountId: recommendation.accountId,
        categoryId: recommendation.categoryId,
        amount: recommendation.metadata.suggestedAmount,
        frequency,
        recurring: true,
        auto_add: false
      });
      scheduleId = newSchedule.id;
    }

    // 4. Link schedule to budget
    await linkScheduleToScheduledExpense(budget.id, scheduleId);

    // 5. Update schedule to reference budget
    await updateSchedule(scheduleId, { budgetId: budget.id });
  }
}
```

### Phase 3: Forecast Enhancement

#### 5. Update Budget Forecast Display
**File:** `src/lib/components/budgets/budget-forecast-display.svelte`

**Changes needed:**
- For scheduled-expense budgets with linked schedules:
  - Show schedule name and frequency
  - Display next N occurrences
  - Show budget allocation vs upcoming expenses
  - Warning if budget insufficient for upcoming payments

#### 6. Add Schedule Integration to Budget Analytics
**File:** `src/routes/budgets/[slug]/(components)/analytics/budget-analytics-dashboard.svelte`

**New features:**
- "Scheduled Expenses" section
- Timeline view of upcoming schedule occurrences
- Variance between scheduled amount and actual transactions
- Predictability score over time

## Database Considerations

### Current State
- `schedules.budgetId` - References budget (already exists)
- `budgets.metadata.scheduledExpense.linkedScheduleId` - References schedule (added)

### Bi-directional Link
Both tables can reference each other:
- Schedule → Budget: via `schedules.budgetId`
- Budget → Schedule: via `budgets.metadata.scheduledExpense.linkedScheduleId`

**Recommendation:** Keep both for flexibility:
- `schedules.budgetId` - For queries like "all schedules for this budget"
- `metadata.linkedScheduleId` - For budget-specific schedule relationship

## Testing Checklist

- [ ] Create scheduled-expense budget without schedule link
- [ ] Create scheduled-expense budget with schedule link
- [ ] Link schedule to existing budget
- [ ] Unlink schedule from budget
- [ ] Apply scheduled-expense recommendation (auto-create schedule)
- [ ] Apply scheduled-expense recommendation (link to existing schedule)
- [ ] Verify budget forecast shows schedule occurrences
- [ ] Verify schedule transactions are tracked against budget
- [ ] Test with multiple schedules linked to same budget
- [ ] Test schedule frequency changes propagate to budget

## Future Enhancements

1. **Smart Schedule Matching**
   - Use ML/pattern matching to suggest schedule links
   - Auto-link when confidence > 90%

2. **Budget Alerts**
   - Notify when scheduled payment exceeds budget
   - Warn when budget won't cover upcoming schedule occurrences

3. **Bulk Schedule Management**
   - Link multiple schedules to one budget
   - Batch create budgets for all unlinked schedules

4. **Schedule-Driven Budgeting**
   - Auto-adjust budget amount based on schedule changes
   - Suggest budget increases if schedule amount increases

## Implementation Priority

1. **High Priority** (Do First)
   - Auto-linking on recommendation apply
   - Schedule selector in budget form
   - Display linked schedule in budget detail

2. **Medium Priority** (Do Next)
   - Enhanced forecast display
   - Recommendation card improvements
   - Analytics integration

3. **Low Priority** (Nice to Have)
   - Smart schedule matching
   - Bulk operations
   - Schedule-driven auto-adjustments

## Notes

- The forecasting system (`BudgetForecastService`) already fetches schedules via `budgetId`
- Schedules can be created through the schedules page (`/schedules`)
- Schedule state is managed via `SchedulesState` in `src/lib/states/entities/schedules.svelte.ts`
- Budget recommendations already detect recurring patterns with high accuracy
