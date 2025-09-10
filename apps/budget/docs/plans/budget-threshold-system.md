# Budget Threshold System Implementation Plan

## Overview

This document outlines the comprehensive plan for implementing a budget threshold system that allows users to set spending limits for each account, with visual indicators, alerts, and performance tracking.

## Goals

- **Account-Level Budgets**: Set spending limits per account with flexible time periods
- **Visual Integration**: Show budget thresholds in charts with clear visual indicators
- **Proactive Alerts**: Warn users before and when they exceed budget limits
- **Performance Tracking**: Historical analysis of budget vs actual spending
- **Flexible Configuration**: Support weekly, monthly, quarterly, and yearly budget periods

## Phase 1: Database Schema & Core Infrastructure

### Database Schema Extensions

```sql
-- Add budget fields to accounts table
ALTER TABLE accounts ADD COLUMN monthly_budget DECIMAL(10,2);
ALTER TABLE accounts ADD COLUMN budget_period VARCHAR(20) DEFAULT 'monthly'; -- 'weekly', 'monthly', 'quarterly', 'yearly'
ALTER TABLE accounts ADD COLUMN budget_enabled BOOLEAN DEFAULT false;
ALTER TABLE accounts ADD COLUMN budget_alert_threshold DECIMAL(5,2) DEFAULT 0.80; -- Alert at 80%

-- Optional: Budget history table for tracking changes
CREATE TABLE budget_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  budget_amount DECIMAL(10,2) NOT NULL,
  budget_period VARCHAR(20) NOT NULL,
  effective_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);
```

### TypeScript Schema Updates

```typescript
// Update account schema
export const accountsTable = sqliteTable('accounts', {
  // ... existing fields
  monthlyBudget: real('monthly_budget'),
  budgetPeriod: text('budget_period').$type<'weekly' | 'monthly' | 'quarterly' | 'yearly'>().default('monthly'),
  budgetEnabled: integer('budget_enabled', { mode: 'boolean' }).default(false),
  budgetAlertThreshold: real('budget_alert_threshold').default(0.80),
});

export type BudgetPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type BudgetStatus = 'under' | 'approaching' | 'over' | 'critical';
```

## Phase 2: Backend Services & API

### Budget Calculation Service

```typescript
// src/lib/server/services/budget-service.ts
export class BudgetService {
  // Calculate current period spending vs budget
  async getBudgetStatus(accountId: number): Promise<{
    budget: number;
    spent: number;
    remaining: number;
    percentage: number;
    status: BudgetStatus;
    periodStart: Date;
    periodEnd: Date;
  }>

  // Get budget performance over time
  async getBudgetHistory(accountId: number, months: number): Promise<BudgetHistoryItem[]>
  
  // Check if any accounts are over budget (for alerts)
  async getAccountsOverBudget(): Promise<AccountBudgetSummary[]>
}
```

### tRPC API Endpoints

```typescript
// src/lib/trpc/routes/budgets.ts
export const budgetsRouter = router({
  updateAccountBudget: protectedProcedure
    .input(z.object({
      accountId: z.number(),
      budget: z.number().positive(),
      period: z.enum(['weekly', 'monthly', 'quarterly', 'yearly'])
    }))
    .mutation(async ({ input }) => { /* Update account budget */ }),

  getBudgetStatus: protectedProcedure
    .input(z.object({ accountId: z.number() }))
    .query(async ({ input }) => { /* Get current budget status */ }),

  getBudgetOverview: protectedProcedure
    .query(async () => { /* Get all account budget statuses */ })
});
```

## Phase 3: Frontend Components & UI

### Budget Configuration UI

```typescript
// New component: BudgetSettingsDialog.svelte
- Budget amount input with currency formatting
- Period selection (weekly/monthly/quarterly/yearly)  
- Alert threshold slider (50%-95%)
- Enable/disable budget tracking toggle
- Budget history preview
```

### Budget Status Components

```typescript
// BudgetStatusCard.svelte - Shows current budget status
// BudgetProgressBar.svelte - Visual progress indicator
// BudgetAlertBanner.svelte - Warning when over budget
```

### Enhanced Chart Integration

```typescript
// Update monthly-spending-chart to include threshold line
<UnifiedChart
  data={chartData}
  type="threshold"  // New chart type!
  styling={{ 
    colors: 'auto',
    thresholdLine: {
      value: budgetAmount,
      color: 'hsl(var(--destructive))',
      label: 'Budget Limit'
    }
  }}
  // ... other config
/>
```

## Phase 4: Dashboard Integration

### Widget Enhancements

- **Budget Status Widget**: Shows all account budget statuses
- **Budget Alert Widget**: Highlights accounts over budget
- **Budget Trend Widget**: Shows budget performance over time

### Account Page Integration

- Budget status banner at top of account page
- Budget configuration in account settings
- Enhanced spending charts with budget thresholds
- Budget performance analytics

## Phase 5: Advanced Features

### Smart Budget Suggestions

```typescript
// AI-powered budget recommendations based on:
- Historical spending patterns
- Seasonal variations
- Income analysis  
- Category-based budgeting
```

### Budget Categories

```typescript
// Optional: Category-level budgets within accounts
- Groceries: $400/month
- Transportation: $150/month  
- Entertainment: $100/month
```

### Budget Alerts & Notifications

- Email notifications when approaching budget limit
- Push notifications for mobile users
- Weekly/monthly budget summaries
- Overspend alerts

## Implementation Priority

### Phase 1: Foundation (Week 1)

1. Database schema migration
2. Basic budget service
3. tRPC endpoints

### Phase 2: Core UI (Week 2)

1. Budget settings dialog
2. Budget status components
3. Threshold chart integration

### Phase 3: Integration (Week 3)

1. Account page integration
2. Dashboard widgets
3. Alert system

### Phase 4: Polish (Week 4)

1. Smart suggestions
2. Advanced analytics
3. Mobile optimization

## Key Benefits

✅ **Visual Budget Tracking**: See spending vs budget in real-time charts
✅ **Proactive Alerts**: Get warned before overspending
✅ **Historical Analysis**: Track budget performance over time  
✅ **Flexible Periods**: Support weekly, monthly, quarterly, yearly budgets
✅ **Account-Specific**: Each account can have its own budget rules
✅ **Integration Ready**: Works seamlessly with existing chart system

## Technical Considerations

### Chart Integration

The budget threshold system will leverage the existing UnifiedChart system:

- **Threshold Chart Type**: Add support for horizontal threshold lines
- **Color Coding**: Red/green indicators based on budget status
- **Interactive Elements**: Click threshold line to edit budget
- **Multiple Thresholds**: Support warning (80%) and critical (100%) lines

### Performance Considerations

- **Caching**: Cache budget calculations for frequently accessed accounts
- **Real-time Updates**: Update budget status when transactions are added
- **Batch Processing**: Process budget alerts in batches for performance

### User Experience

- **Progressive Disclosure**: Simple setup flow with advanced options hidden
- **Smart Defaults**: Suggest budget amounts based on historical data
- **Visual Feedback**: Clear status indicators and progress bars
- **Mobile Optimization**: Touch-friendly budget configuration interface

## Future Enhancements

### Advanced Analytics

- Budget variance analysis
- Spending pattern predictions
- Category-wise budget breakdowns
- Goal-based budgeting (saving for specific targets)

### Integration Opportunities

- Bank account integration for automatic budget suggestions
- Calendar integration for event-based budget adjustments
- External API integration for inflation-adjusted budgeting
- Machine learning for personalized budget recommendations

---

**Created**: 2025-09-06  
**Status**: Planning Phase  
**Priority**: Medium  
**Dependencies**: UnifiedChart system (Phase 1 complete)