# Budget System Design

## Overview

This document outlines the comprehensive design for implementing a flexible budget system that supports multiple budget types, configurable enforcement levels, and seamless integration with existing accounts, categories, and schedules.

## Core Principles

- **User Control**: Users have ultimate control over budget behavior and configuration
- **Smart Defaults**: Sensible defaults that work out-of-the-box but can be customized
- **Flexibility**: Support multiple budget types and workflows
- **Integration**: Seamless integration with existing transaction, schedule, and account systems

## Budget Types

### 1. Account-Monthly
- Total spending limit per account per period
- Tracks all transactions within the account regardless of category
- Useful for overall account spending controls

### 2. Category-Envelope (YNAB-style)
- Allocation-based budgeting per category
- Supports rollover balances between periods
- Envelope metaphor: allocate money to categories, spend from envelopes

### 3. Goal-Based
- Target amount over custom date range
- Progress tracking toward financial goals
- Supports both spending goals (vacation fund) and savings goals (emergency fund)

### 4. Scheduled-Expense
- Tied to recurring schedules
- Pre-allocates funds for upcoming scheduled transactions
- Forecasts future spending based on schedule metadata

## Database Architecture

### Core Tables

#### budgets
```sql
budgets (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'account-monthly' | 'category-envelope' | 'goal-based' | 'scheduled-expense'
  scope TEXT NOT NULL, -- 'account' | 'category' | 'global' | 'mixed'
  status TEXT DEFAULT 'active', -- 'active' | 'inactive' | 'archived'
  enforcement_level TEXT DEFAULT 'warning', -- 'none' | 'warning' | 'strict'

  -- Type-specific settings (JSON including period defaults)
  metadata JSON,

  -- Audit fields
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
)
```

**Key Design Decisions:**
- **One-way relationship**: Templates reference budgets (not circular dependency)
- **Period defaults in metadata**: Basic period settings stored in budget.metadata JSON
- **Templates for active periods**: Templates created after budget exists for period management
- **Scope flexibility**: Support multi-scope budgets (not just account-level)
- **Mixed-scope support**: Specific categories across multiple accounts via junction tables

#### budget_groups
```sql
budget_groups (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_id INTEGER REFERENCES budget_groups(id),
  color TEXT,

  -- Optional group-level limits
  spending_limit REAL,
  inherit_parent_settings BOOLEAN DEFAULT true,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)
```

#### budget_period_templates
```sql
budget_period_templates (
  id INTEGER PRIMARY KEY,
  budget_id INTEGER REFERENCES budgets(id),
  type TEXT NOT NULL, -- 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
  interval_count INTEGER DEFAULT 1, -- every N weeks/months/etc

  -- Period-specific start configuration
  start_day_of_week INTEGER, -- 1=Monday, 7=Sunday (for weekly periods)
  start_day_of_month INTEGER, -- 1-31 (for monthly/quarterly/yearly periods)
  start_month INTEGER, -- 1-12 (for yearly periods)

  timezone TEXT,

  created_at TEXT NOT NULL
)
```

**Period Start Configuration Logic:**

- **Weekly periods**: Use `start_day_of_week` (1=Monday, 2=Tuesday, ..., 7=Sunday)
- **Monthly/Quarterly periods**: Use `start_day_of_month` (1-31, with month-end handling)
- **Yearly periods**: Use `start_day_of_month` + `start_month` (e.g., 15th of March)
- **Custom periods**: Use appropriate fields based on custom logic

**Examples:**
- Weekly budget starting Mondays: `start_day_of_week = 1`
- Monthly budget from 15th-14th: `start_day_of_month = 15`
- Yearly budget January-December: `start_month = 1, start_day_of_month = 1`

#### budget_period_instances
```sql
budget_period_instances (
  id INTEGER PRIMARY KEY,
  template_id INTEGER REFERENCES budget_period_templates(id),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  allocated_amount REAL NOT NULL,
  rollover_amount REAL DEFAULT 0,

  -- Progress tracking
  actual_amount REAL DEFAULT 0,
  last_calculated TEXT,

  created_at TEXT NOT NULL
)
```

### Junction Tables

#### budget_accounts
```sql
budget_accounts (
  id INTEGER PRIMARY KEY,
  budget_id INTEGER REFERENCES budgets(id),
  account_id INTEGER REFERENCES accounts(id),

  UNIQUE(budget_id, account_id)
)
```

#### budget_categories
```sql
budget_categories (
  id INTEGER PRIMARY KEY,
  budget_id INTEGER REFERENCES budgets(id),
  category_id INTEGER REFERENCES categories(id),

  UNIQUE(budget_id, category_id)
)
```

#### budget_transactions
```sql
budget_transactions (
  id INTEGER PRIMARY KEY,
  transaction_id INTEGER REFERENCES transactions(id),
  budget_id INTEGER REFERENCES budgets(id),
  allocated_amount REAL NOT NULL, -- See allocation rules below

  -- Assignment tracking
  auto_assigned BOOLEAN DEFAULT true,
  assigned_at TEXT NOT NULL,
  assigned_by TEXT, -- user_id if manually assigned

  created_at TEXT NOT NULL
)
```

**Budget Transaction Allocation Rules:**

**Sign Convention:**
- `allocated_amount` uses **source transaction sign** (negative for expenses, positive for income)
- Budget consumption = sum of negative `allocated_amount` values
- Budget credits = sum of positive `allocated_amount` values

**Allocation Constraints:**
```typescript
// Rule: Sum of allocations must equal source transaction amount
const allocations = await db.select().from(budgetTransactions)
  .where(eq(budgetTransactions.transactionId, transactionId));

const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.allocatedAmount, 0);
const sourceAmount = transaction.amount;

// MUST be true: totalAllocated === sourceAmount
```

**Partial Assignment Examples:**
```typescript
// Example 1: $100 grocery transaction split between budgets
// Source: transaction.amount = -100 (expense)
{
  transactionId: 123,
  budgetId: 1, // "Groceries"
  allocatedAmount: -75 // 75% of transaction
},
{
  transactionId: 123,
  budgetId: 2, // "Household Items"
  allocatedAmount: -25 // 25% of transaction
}
// Validation: -75 + -25 = -100 ✓

// Example 2: $50 income assigned to savings goal
// Source: transaction.amount = 50 (income)
{
  transactionId: 124,
  budgetId: 3, // "Emergency Fund Goal"
  allocatedAmount: 50 // Full income allocation
}
// Validation: 50 = 50 ✓
```

**Validation Rules:**
- **Sum constraint**: `ABS(SUM(allocated_amount)) <= ABS(transaction.amount)` for each transaction (partial allocations allowed)
- **Sign consistency**: Each `allocated_amount` must have the same sign as `transaction.amount`, or be zero
- **Zero allocations**: `allocated_amount = 0` is allowed for audit trail preservation and workflow flexibility
- **Currency consistency**: All amounts in same currency as source transaction
- **Full allocation check**: Transactions can be marked "fully allocated" when `ABS(SUM(allocated_amount)) = ABS(transaction.amount)`
- **Precision**: Use same decimal precision as source transactions

**Zero Allocation vs Deletion Workflow:**

The system supports two approaches for "removing" allocations, each serving different use cases:

1. **Set to Zero** (`allocated_amount = 0`):
   - **Use Case**: Preserves audit trail and allocation history
   - **When**: User wants to temporarily nullify an allocation or maintain record of the budget assignment
   - **Result**: Row remains in database with zero amount, visible in allocation history
   - **Example**: Temporarily removing an allocation during budget rebalancing, maintaining record of which budgets were previously considered

2. **Delete Row** (`deleteAllocation()`):
   - **Use Case**: Completely removes the allocation relationship
   - **When**: User decides the allocation was a mistake or no longer relevant
   - **Result**: Row is deleted from database, no trace of the allocation relationship
   - **Example**: User incorrectly allocated to wrong budget and wants clean removal

**Implementation Note**: UI components should clearly distinguish between "clear allocation" (sets to zero) and "remove allocation" (deletes row) to avoid user confusion.

**Enforcement Strategy:**

**SQLite Constraint Limitations:**
- SQLite does NOT support subqueries in CHECK constraints
- Database-level validation not possible for cross-table sum constraints
- Must rely on application-level validation and/or triggers

**Service-Level Validation (Primary Approach):**
```typescript
export class BudgetTransactionService {
  async isTransactionFullyAllocated(transactionId: number): Promise<boolean> {
    const allocations = await this.getAllocations(transactionId);
    const transaction = await this.getTransaction(transactionId);

    const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    return Math.abs(totalAllocated - transaction.amount) < 0.01; // Handle floating point precision
  }

  async validateProposedAllocation(
    transactionId: number,
    newAmount: number,
    excludeAllocationId?: number
  ): Promise<{
    isValid: boolean;
    wouldExceed: boolean;
    hasSignMismatch: boolean;
    remaining: number;
    errors: string[];
  }> {
    const allocations = await this.getAllocations(transactionId);
    const transaction = await this.getTransaction(transactionId);
    return this._validateProposedAllocationWithData(allocations, transaction, newAmount, excludeAllocationId);
  }

  // Transaction-aware variant that accepts pre-fetched data to maintain atomicity
  // WARNING: For multiple operations within the same transaction, caller must fetch fresh
  // allocation data before each validation call. Reusing stale allocation snapshots will
  // lead to incorrect validation results.
  private _validateProposedAllocationWithData(
    allocations: BudgetTransaction[],
    transaction: Transaction,
    newAmount: number,
    excludeAllocationId?: number
  ): {
    isValid: boolean;
    wouldExceed: boolean;
    hasSignMismatch: boolean;
    remaining: number;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate sign convention (zero is always allowed)
    let hasSignMismatch = false;
    if (newAmount !== 0) {
      const transactionIsPositive = transaction.amount > 0;
      const allocationIsPositive = newAmount > 0;

      if (transactionIsPositive !== allocationIsPositive) {
        hasSignMismatch = true;
        errors.push(
          `Allocation amount ${newAmount} has incorrect sign. ` +
          `${transaction.amount > 0 ? 'Income' : 'Expense'} transactions require ` +
          `${transaction.amount > 0 ? 'positive' : 'negative'} allocations.`
        );
      }
    }

    // Calculate existing allocations (excluding the one being updated if specified)
    const existingTotal = allocations
      .filter(a => a.id !== excludeAllocationId)
      .reduce((sum, a) => sum + a.allocatedAmount, 0);

    const proposedTotal = existingTotal + newAmount;
    const remaining = transaction.amount - proposedTotal;
    const wouldExceed = Math.abs(proposedTotal) > Math.abs(transaction.amount);

    if (wouldExceed) {
      errors.push(
        `Allocation amount ${newAmount} would exceed remaining transaction amount. ` +
        `Remaining: ${remaining}`
      );
    }

    const isValid = !wouldExceed && !hasSignMismatch;

    return {
      isValid,
      wouldExceed,
      hasSignMismatch,
      remaining,
      errors
    };
  }

  // IMPORTANT: When performing multiple allocation operations within a single transaction,
  // fresh data must be fetched before each validation call. Example:
  //
  // ❌ WRONG - Reusing stale allocation data:
  // const allocations = await tx.select().from(budgetTransactions)...;
  // this._validateProposedAllocationWithData(allocations, transaction, amount1);
  // await tx.insert(budgetTransactions).values(allocation1);
  // this._validateProposedAllocationWithData(allocations, transaction, amount2); // STALE DATA!
  //
  // ✅ CORRECT - Fresh data for each validation:
  // const allocations1 = await tx.select().from(budgetTransactions)...;
  // this._validateProposedAllocationWithData(allocations1, transaction, amount1);
  // await tx.insert(budgetTransactions).values(allocation1);
  // const allocations2 = await tx.select().from(budgetTransactions)...; // FRESH DATA
  // this._validateProposedAllocationWithData(allocations2, transaction, amount2);

  // Note: This helper provides comprehensive validation including both amount and sign checks,
  // making it suitable for preflight validation in UI components
  async createAllocation(allocation: NewBudgetTransaction): Promise<BudgetTransaction> {
    return await db.transaction(async (tx) => {
      // Fetch allocations and transaction within the transaction to maintain atomicity
      const allocations = await tx.select()
        .from(budgetTransactions)
        .where(eq(budgetTransactions.transactionId, allocation.transactionId));

      const transactionResult = await tx.select()
        .from(transactions)
        .where(eq(transactions.id, allocation.transactionId))
        .limit(1);

      if (!transactionResult.length) {
        throw new Error('Transaction not found');
      }

      const transaction = transactionResult[0];

      // Use transaction-aware validation to maintain atomicity
      const validation = this._validateProposedAllocationWithData(
        allocations,
        transaction,
        allocation.allocatedAmount
      );

      if (!validation.isValid) {
        throw new Error(validation.errors.join('; '));
      }

      // Create the allocation within the same transaction
      const insertResult = await tx.insert(budgetTransactions).values(allocation);

      // SQLite doesn't support RETURNING for INSERT, so re-query using lastInsertRowid
      const insertId = insertResult.lastInsertRowid as number;
      const result = await tx.select()
        .from(budgetTransactions)
        .where(eq(budgetTransactions.id, insertId))
        .limit(1);

      return result[0];
    });
  }

  async updateAllocation(id: number, updates: Partial<BudgetTransaction>): Promise<void> {
    await db.transaction(async (tx) => {
      // Fetch allocation within transaction to prevent race conditions
      const allocationResult = await tx.select()
        .from(budgetTransactions)
        .where(eq(budgetTransactions.id, id))
        .limit(1);

      if (!allocationResult.length) throw new Error('Allocation not found');
      const allocation = allocationResult[0];

      // If updating the amount, validate the new total within the transaction
      if (updates.allocatedAmount !== undefined) {
        // Fetch allocations and transaction within the transaction to maintain atomicity
        const allocations = await tx.select()
          .from(budgetTransactions)
          .where(eq(budgetTransactions.transactionId, allocation.transactionId));

        const transactionResult = await tx.select()
          .from(transactions)
          .where(eq(transactions.id, allocation.transactionId))
          .limit(1);

        if (!transactionResult.length) {
          throw new Error('Transaction not found');
        }

        const transaction = transactionResult[0];

        // Use transaction-aware validation to maintain atomicity
        const validation = this._validateProposedAllocationWithData(
          allocations,
          transaction,
          updates.allocatedAmount,
          id // Exclude current allocation from validation
        );

        if (!validation.isValid) {
          throw new Error(validation.errors.join('; '));
        }
      }

      // Perform the update within the same transaction
      await tx.update(budgetTransactions).set(updates).where(eq(budgetTransactions.id, id));
    });
  }

  async deleteAllocation(id: number): Promise<void> {
    // Note: Deleting allocations is allowed even if it leaves transaction partially allocated
    // This supports workflow where user removes incorrect allocations before adding correct ones
    await db.delete(budgetTransactions).where(eq(budgetTransactions.id, id));
  }

  // Utility method to check if transaction is fully allocated
  async isTransactionFullyAllocated(transactionId: number): Promise<boolean> {
    return await this.validateAllocationSum(transactionId);
  }

  // Get unallocated amount for a transaction
  async getUnallocatedAmount(transactionId: number): Promise<number> {
    const allocations = await this.getAllocations(transactionId);
    const transaction = await this.getTransaction(transactionId);

    const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    return transaction.amount - totalAllocated;
  }
}
```

#### Allocation Workflow Patterns

The budget allocation system supports both **partial** and **full** allocation workflows:

**Partial Allocation Workflow:**
```typescript
// User can allocate transactions incrementally
await budgetService.createAllocation({
  transactionId: 1,
  budgetId: 2,
  allocatedAmount: -50 // Partial allocation of -100 expense
});

// Check remaining unallocated amount
const remaining = await budgetService.getUnallocatedAmount(1); // Returns -50

// Add more allocations later
await budgetService.createAllocation({
  transactionId: 1,
  budgetId: 3,
  allocatedAmount: -30 // Additional partial allocation
});

// Two options for removing allocations:

// Option 1: Set to zero (preserves audit trail and allocation record)
await budgetService.updateAllocation(allocationId, {
  allocatedAmount: 0 // Nullify allocation but keep record for history
});

// Option 2: Delete the allocation entirely (removes record completely)
await budgetService.deleteAllocation(allocationId);
```

**Full Allocation Enforcement (Optional):**
```typescript
// UI can enforce full allocation before marking transactions complete
async function requireFullAllocation(transactionId: number) {
  const isFullyAllocated = await budgetService.isTransactionFullyAllocated(transactionId);
  if (!isFullyAllocated) {
    const remaining = await budgetService.getUnallocatedAmount(transactionId);
    throw new Error(`Transaction must be fully allocated. Remaining: ${remaining}`);
  }
}

// Use in UI workflow
await requireFullAllocation(transactionId);
await transactionService.markAsComplete(transactionId);
```

#### Transaction Integrity Notes

Both `createAllocation` and `updateAllocation` methods use database transactions to ensure data integrity:

- **Atomic Operations**: All validation and database updates occur within a single transaction
- **Race Condition Prevention**: All data fetching (including the target allocation in `updateAllocation`) occurs within the transaction to prevent race conditions
- **Concurrency Safety**: Fetching data within the transaction prevents scenarios where another process modifies or deletes allocations between reads and writes
- **Consistent State**: If validation fails, the entire transaction is rolled back, preventing partial updates
- **Comprehensive Validation**: Uses centralized `validateProposedAllocation` helper that enforces both amount constraints and sign conventions in a single operation
- **SQLite Compatibility**: Uses `lastInsertRowid` and re-query pattern instead of `RETURNING` clause for insert operations
- **Performance**: Transaction overhead is minimal compared to the data integrity benefits

This approach prevents scenarios where multiple concurrent allocation requests could exceed the transaction amount, eliminates race conditions where allocations could be modified between read and write operations, and ensures proper sign conventions are maintained while remaining compatible with SQLite's feature limitations.

**SQLite Trigger Alternative (Optional):**
```sql
-- Trigger to validate allocation sum on insert/update
CREATE TRIGGER validate_allocation_sum_insert
  BEFORE INSERT ON budget_transactions
  BEGIN
    SELECT CASE
      WHEN (
        SELECT ABS(
          (SELECT COALESCE(SUM(allocated_amount), 0) FROM budget_transactions
           WHERE transaction_id = NEW.transaction_id) + NEW.allocated_amount
        ) > ABS((SELECT amount FROM transactions WHERE id = NEW.transaction_id))
      ) THEN RAISE(ABORT, 'Allocation sum exceeds transaction amount')
    END;
  END;

CREATE TRIGGER validate_allocation_sum_update
  BEFORE UPDATE ON budget_transactions
  BEGIN
    SELECT CASE
      WHEN (
        SELECT ABS(
          (SELECT COALESCE(SUM(allocated_amount), 0) FROM budget_transactions
           WHERE transaction_id = NEW.transaction_id AND id != NEW.id) + NEW.allocated_amount
        ) > ABS((SELECT amount FROM transactions WHERE id = NEW.transaction_id))
      ) THEN RAISE(ABORT, 'Allocation sum exceeds transaction amount')
    END;
  END;
```

**Recommendation:** Use service-level validation as the primary approach for better error handling and business logic control. SQLite triggers can be added as a safety net if desired.

#### budget_group_memberships
```sql
budget_group_memberships (
  id INTEGER PRIMARY KEY,
  budget_id INTEGER REFERENCES budgets(id),
  group_id INTEGER REFERENCES budget_groups(id),

  UNIQUE(budget_id, group_id)
)
```

### Schedule Integration

Add `budget_id` to existing schedules table:
```sql
ALTER TABLE schedules ADD COLUMN budget_id INTEGER REFERENCES budgets(id);
```

## Period Boundary Management

### Integration with Existing Date Utilities

**Leverages existing infrastructure:**
- `src/lib/utils/dates.ts` - timezone handling, DateValue operations
- `src/lib/states/date-filters.svelte.ts` - filter state management
- `@internationalized/date` - consistent date handling across the app

### Period Calculation Strategy

```typescript
interface PeriodBoundary {
  start: DateValue;
  end: DateValue;
  timezone: string;
}

class BudgetPeriodCalculator {
  // Leverages existing timezone utilities
  static calculatePeriodBoundaries(
    template: BudgetPeriodTemplate,
    referenceDate: DateValue = currentDate
  ): PeriodBoundary {
    const tz = template.timezone || getLocalTimeZone();

    switch (template.type) {
      case 'weekly':
        return this.calculateWeeklyBoundary(
          referenceDate,
          template.start_day_of_week || 1, // Default: Monday
          tz
        );
      case 'monthly':
        return this.calculateMonthlyBoundary(
          referenceDate,
          template.start_day_of_month || 1, // Default: 1st of month
          tz
        );
      case 'yearly':
        return this.calculateYearlyBoundary(
          referenceDate,
          template.start_month || 1, // Default: January
          template.start_day_of_month || 1, // Default: 1st
          tz
        );
      // ... other period types
    }
  }

  private static calculateWeeklyBoundary(
    referenceDate: DateValue,
    startDayOfWeek: number, // 1=Monday, 7=Sunday
    timezone: string
  ): PeriodBoundary {
    // Implementation using @internationalized/date
  }

  private static calculateMonthlyBoundary(
    referenceDate: DateValue,
    startDayOfMonth: number, // 1-31
    timezone: string
  ): PeriodBoundary {
    // Implementation with month-end handling
  }
}
```

### Key Design Decisions

1. **Timezone Handling**: Use existing `getLocalTimeZone()` from dates.ts
2. **Partial Periods**: Support custom start dates (15th-14th cycles)
3. **Boundary Storage**: Store calculated boundaries in `budget_period_instances`
4. **Reset Cadence**: Configurable via period template metadata

### Budget Creation Flow (Avoiding Circular Dependencies)

The one-way relationship design enables clean insertion order:

```typescript
// 1. Create budget with period defaults in metadata
const budget = await db.insert(budgets).values({
  name: "Groceries Budget",
  type: "category-envelope",
  scope: "category",
  metadata: {
    defaultPeriod: { type: "monthly", startDay: 1 },
    allocatedAmount: 500
  }
});

// 2. Create period template referencing the budget
const template = await db.insert(budgetPeriodTemplates).values({
  budgetId: budget.id,
  type: "monthly",
  intervalCount: 1,
  startDayOfMonth: 1, // 1st of each month
  timezone: "America/New_York"
});

// 3. Create period instances as needed
const instance = await db.insert(budgetPeriodInstances).values({
  templateId: template.id,
  startDate: "2024-01-01",
  endDate: "2024-01-31",
  allocatedAmount: 500
});
```

**Additional Examples:**

```typescript
// Weekly budget starting on Wednesdays
const weeklyTemplate = await db.insert(budgetPeriodTemplates).values({
  budgetId: budget.id,
  type: "weekly",
  intervalCount: 1,
  startDayOfWeek: 3, // Wednesday (ISO: 1=Monday, 7=Sunday)
  timezone: "America/New_York"
});

// Yearly budget starting March 15th (fiscal year)
const yearlyTemplate = await db.insert(budgetPeriodTemplates).values({
  budgetId: budget.id,
  type: "yearly",
  intervalCount: 1,
  startMonth: 3, // March
  startDayOfMonth: 15, // 15th day
  timezone: "America/New_York"
});

// Mid-month budget (15th to 14th)
const midMonthTemplate = await db.insert(budgetPeriodTemplates).values({
  budgetId: budget.id,
  type: "monthly",
  intervalCount: 1,
  startDayOfMonth: 15, // 15th of each month
  timezone: "America/New_York"
});
```

**Benefits:**
- **No circular dependency**: Templates always reference existing budgets
- **Flexible defaults**: Basic period info in budget.metadata for immediate use
- **Structured periods**: Templates provide detailed period management when needed
- **Simple initial setup**: Budgets can function with just metadata defaults
- **Clear field usage**: Each period type uses appropriate start configuration fields

## Configuration Options

### Enforcement Levels
- **None**: No restrictions, tracking only
- **Warning**: Show alerts when approaching/exceeding limits
- **Strict**: Prevent transactions that would exceed budget

### Rollover Behavior (Category-Envelope budgets)
- **Indefinite**: Unused amounts roll forward indefinitely
- **Limited**: Roll forward for N periods, then expire
- **Reset**: No rollover, reset to allocated amount each period

### Goal Progress Calculation
- **Deposits Only**: Only positive transactions count toward progress
- **Net Activity**: Both positive and negative transactions affect progress
- **Investment Tracking**: Include market gains/losses in goal progress
- **Contributions Only**: Only manual contributions count (exclude market changes)

### Multi-Budget Assignment
- **Automatic**: System assigns based on transaction account/category
- **Proportional**: Split transaction across multiple budgets by percentage
- **Manual**: User chooses budget assignment for each transaction
- **Priority-Based**: Budgets have priority order for conflict resolution

## Service Layer Architecture

### Core Type Definitions

#### Budget Status vs. Budget Health (Clarification)

The budget system uses two distinct status concepts:

**1. Budget Lifecycle Status (`budgets.status` column)**
- **Purpose**: Persistent administrative state
- **Values**: `'active' | 'inactive' | 'archived'`
- **Usage**: Controls whether budget is operational and visible in UI
- **Examples**:
  - `active`: Budget is operational and tracking transactions
  - `inactive`: Budget temporarily disabled (preserves data)
  - `archived`: Budget permanently retired (historical reference)

**2. Budget Health Status (calculated `BudgetStatus` enum)**
- **Purpose**: Real-time consumption health indicator per period
- **Values**: `'on_track' | 'approaching' | 'over' | 'paused'`
- **Usage**: Visual warnings and enforcement decisions
- **Examples**:
  - `on_track`: < 80% consumed, plenty of budget remaining
  - `approaching`: >= 80% consumed OR >= 90% of period elapsed
  - `over`: > 100% allocated amount consumed
  - `paused`: Budget is inactive/archived (derived from lifecycle status)

#### Budget Health Calculation Logic
```typescript
// Budget status derived from consumption percentage
export enum BudgetStatus {
  ON_TRACK = 'on_track',       // < 80% of period elapsed, < 80% consumed
  APPROACHING = 'approaching', // >= 80% consumed OR >= 90% of period elapsed
  OVER = 'over',              // > 100% consumed
  PAUSED = 'paused'           // Budget inactive/archived
}

export interface BudgetStatusThresholds {
  approachingPercentage: number; // Default: 80
  periodWarningPercentage: number; // Default: 90
}

export function calculateBudgetStatus(
  consumed: number,
  allocated: number,
  periodElapsed: number,
  budgetLifecycleStatus: 'active' | 'inactive' | 'archived',
  thresholds: BudgetStatusThresholds = {
    approachingPercentage: 80,
    periodWarningPercentage: 90
  }
): BudgetStatus {
  // Lifecycle status overrides health calculation
  if (budgetLifecycleStatus !== 'active') return BudgetStatus.PAUSED;
  if (allocated <= 0) return BudgetStatus.PAUSED;

  const consumedPercentage = (consumed / allocated) * 100;

  if (consumedPercentage > 100) return BudgetStatus.OVER;
  if (consumedPercentage >= thresholds.approachingPercentage ||
      periodElapsed >= thresholds.periodWarningPercentage) {
    return BudgetStatus.APPROACHING;
  }

  return BudgetStatus.ON_TRACK;
}
```

#### Service Response Types
```typescript
export interface BudgetHistoryItem {
  date: string; // ISO date
  allocated: number;
  consumed: number;
  remaining: number;
  status: BudgetStatus;
}

export interface AccountBudgetSummary {
  accountId: number;
  accountName: string;
  budgets: Array<{
    id: number;
    name: string;
    type: BudgetType;
    allocated: number;
    consumed: number;
    remaining: number;
    status: BudgetStatus;
    periodStart: string;
    periodEnd: string;
  }>;
  totalAllocated: number;
  totalConsumed: number;
  overallStatus: BudgetStatus;
}

export interface BudgetActuals {
  budgetId: number;
  periodInstanceId: number;
  totalTransactions: number;
  totalAmount: number;
  categoryBreakdown: Array<{
    categoryId: number;
    categoryName: string;
    amount: number;
    transactionCount: number;
  }>;
  dailySpending: Array<{
    date: string;
    amount: number;
  }>;
}
```

### Performance Strategy for Budget Calculations

#### Critical Performance Requirements

**Target**: All `BudgetActuals` queries complete within 200ms for typical datasets

**Risk**: Complex aggregations across `budget_transactions`, `transactions`, `categories` tables could cause slowdowns in Phase 3+ with large transaction volumes.

#### Database Indexing Strategy

```sql
-- Core budget transaction queries
CREATE INDEX idx_budget_transactions_budget_period ON budget_transactions(budget_id, allocated_amount);
CREATE INDEX idx_budget_transactions_transaction ON budget_transactions(transaction_id, budget_id);

-- Transaction date/amount queries for period filtering
CREATE INDEX idx_transactions_date_amount ON transactions(date, amount, account_id);
CREATE INDEX idx_transactions_category_date ON transactions(category_id, date, amount);

-- Category breakdown queries
CREATE INDEX idx_transactions_category_budget ON transactions(category_id, date)
  WHERE deleted_at IS NULL;

-- Daily spending aggregations
CREATE INDEX idx_transactions_daily_spending ON transactions(date, amount, account_id)
  WHERE deleted_at IS NULL;
```

#### Query Optimization Patterns

**1. Period-Scoped Queries**
```typescript
// Leverage date indexes for period filtering
const budgetActuals = await db
  .select({
    totalAmount: sum(transactions.amount),
    transactionCount: count(transactions.id)
  })
  .from(budgetTransactions)
  .innerJoin(transactions, eq(budgetTransactions.transactionId, transactions.id))
  .where(
    and(
      eq(budgetTransactions.budgetId, budgetId),
      gte(transactions.date, periodStart),
      lte(transactions.date, periodEnd),
      isNull(transactions.deletedAt)
    )
  );
```

**2. Category Breakdown Optimization**
```typescript
// Single query with grouping instead of N+1 queries
const categoryBreakdown = await db
  .select({
    categoryId: transactions.categoryId,
    categoryName: categories.name,
    amount: sum(transactions.amount),
    transactionCount: count(transactions.id)
  })
  .from(budgetTransactions)
  .innerJoin(transactions, eq(budgetTransactions.transactionId, transactions.id))
  .leftJoin(categories, eq(transactions.categoryId, categories.id))
  .where(/* period and budget filters */)
  .groupBy(transactions.categoryId, categories.name);
```

**3. Daily Spending Aggregation**
```typescript
// Use database-level date truncation for efficiency
const dailySpending = await db
  .select({
    date: sql<string>`DATE(${transactions.date})`,
    amount: sum(transactions.amount)
  })
  .from(budgetTransactions)
  .innerJoin(transactions, eq(budgetTransactions.transactionId, transactions.id))
  .where(/* period and budget filters */)
  .groupBy(sql`DATE(${transactions.date})`)
  .orderBy(sql`DATE(${transactions.date})`);
```

#### Materialization Strategy (Phase 3+ Optimization)

**Budget Summary Cache Table** (optional for high-volume usage):
```sql
CREATE TABLE budget_summary_cache (
  budget_id INTEGER,
  period_start TEXT,
  period_end TEXT,
  total_allocated REAL,
  total_consumed REAL,
  transaction_count INTEGER,
  last_updated TEXT,

  PRIMARY KEY (budget_id, period_start, period_end)
);

CREATE INDEX idx_budget_summary_cache_updated ON budget_summary_cache(last_updated);
```

**Cache Invalidation Strategy**:
- Invalidate on transaction insert/update/delete
- Regenerate cache entries older than 5 minutes
- Background job for cache warming during off-peak hours

#### Performance Monitoring

**Key Metrics to Track**:
- `BudgetActuals` query duration (target: <200ms)
- Transaction aggregation query plans
- Index usage statistics
- Cache hit rates (if materialized views implemented)

**Query Performance Tests**:
```typescript
describe('Budget Performance', () => {
  test('BudgetActuals query under 200ms with 10k transactions', async () => {
    const start = performance.now();
    await BudgetCalculationService.calculateBudgetConsumption(budgetId, periodStart, periodEnd);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(200);
  });
});
```

### Domain Services

#### BudgetService (`src/lib/server/domains/budgets/services.ts`)
- CRUD operations for budgets and budget groups
- Budget calculation and period management using `calculateBudgetStatus()`
- Rollover processing with configurable rules
- Goal progress tracking with `BudgetActuals` aggregation

#### BudgetCalculationService
- Real-time budget consumption calculation returning `BudgetActuals`
- Period boundary handling with timezone awareness
- Multi-budget allocation logic with conflict resolution
- Performance optimization for large datasets

#### BudgetEnforcementService
- Transaction validation against budget limits
- Warning generation based on `BudgetStatus` thresholds
- Enforcement rule processing (none/warning/strict)

### Repository Layer

#### BudgetRepository (`src/lib/server/domains/budgets/repository.ts`)
- Database queries with proper joins
- Efficient aggregation queries
- Period-based filtering
- Performance indexing strategies

## tRPC API Design

### Routes (`src/lib/trpc/routes/budgets.ts`)

```typescript
budgetRoutes = {
  // CRUD
  create: procedure.input(CreateBudgetSchema).mutation(),
  update: procedure.input(UpdateBudgetSchema).mutation(),
  delete: procedure.input(DeleteBudgetSchema).mutation(),
  list: procedure.input(ListBudgetsSchema).query(),
  get: procedure.input(GetBudgetSchema).query(),

  // Groups
  createGroup: procedure.input(CreateBudgetGroupSchema).mutation(),
  updateGroup: procedure.input(UpdateBudgetGroupSchema).mutation(),
  listGroups: procedure.query(),

  // Analytics
  summary: procedure.input(BudgetSummarySchema).query(),
  progress: procedure.input(BudgetProgressSchema).query(),
  forecast: procedure.input(BudgetForecastSchema).query(),

  // Transaction integration
  assignTransaction: procedure.input(AssignTransactionSchema).mutation(),
  validateTransaction: procedure.input(ValidateTransactionSchema).query(),

  // Periods
  createPeriod: procedure.input(CreatePeriodSchema).mutation(),
  rolloverPeriod: procedure.input(RolloverPeriodSchema).mutation(),
}
```

## State Management

### BudgetState (`src/lib/states/budgets.svelte.ts`)

**Follows existing state patterns from the codebase:**

```typescript
import { getContext, setContext } from 'svelte';
import type { Budget, BudgetGroup, BudgetSummary, Transaction } from '$lib/schema';

const BUDGET_STATE_KEY = Symbol('budget_state');

export class BudgetState {
  budgets: Budget[] = $state([]);
  groups: BudgetGroup[] = $state([]);
  summaries: BudgetSummary[] = $state([]);

  constructor(initialBudgets: Budget[] = [], initialGroups: BudgetGroup[] = []) {
    this.budgets = initialBudgets;
    this.groups = initialGroups;
    setContext(BUDGET_STATE_KEY, this);
  }

  static get(): BudgetState {
    return getContext<BudgetState>(BUDGET_STATE_KEY);
  }

  // Getters (following existing patterns)
  get all(): Budget[] {
    return [...this.budgets];
  }

  get activeCount(): number {
    return this.budgets.filter(b => b.status === 'active').length;
  }

  // Derived values (computed properties)
  get activeBudgets(): Budget[] {
    return this.budgets.filter(b => b.status === 'active');
  }

  get budgetsByAccount(): Map<number, Budget[]> {
    const grouped = new Map<number, Budget[]>();
    for (const budget of this.budgets) {
      // Group by associated accounts via junction table
      // Implementation depends on how budget-account relationships are loaded
    }
    return grouped;
  }

  get budgetsByCategory(): Map<number, Budget[]> {
    const grouped = new Map<number, Budget[]>();
    for (const budget of this.budgets) {
      // Group by associated categories via junction table
      // Implementation depends on how budget-category relationships are loaded
    }
    return grouped;
  }

  // Find operations (following existing patterns)
  getBudgetById(id: number): Budget | undefined {
    return this.budgets.find(budget => budget.id === id);
  }

  getBudgetsForTransaction(transaction: Transaction): Budget[] {
    // Implementation depends on budget assignment logic
    // May involve checking account/category associations
    return this.budgets.filter(budget => {
      // Logic to determine which budgets apply to this transaction
      return budget.status === 'active';
    });
  }

  // State mutations (following existing patterns)
  addBudget(budget: Budget): void {
    this.budgets.push(budget);
  }

  updateBudget(id: number, updates: Partial<Budget>): void {
    const index = this.budgets.findIndex(b => b.id === id);
    if (index !== -1) {
      this.budgets[index] = { ...this.budgets[index], ...updates };
    }
  }

  removeBudget(id: number): void {
    this.budgets = this.budgets.filter(b => b.id !== id);
  }

  // Budget-specific operations
  calculateProgress(budgetId: number): BudgetProgress | undefined {
    const budget = this.getBudgetById(budgetId);
    if (!budget) return undefined;

    // Implementation would call BudgetCalculationService
    // Return calculated progress data
    return {
      budgetId,
      consumed: 0,
      allocated: 0,
      remaining: 0,
      status: 'on_track' as const
    };
  }
}

// Type for progress calculation result
interface BudgetProgress {
  budgetId: number;
  consumed: number;
  allocated: number;
  remaining: number;
  status: 'on_track' | 'approaching' | 'over' | 'paused';
}
```

### Query Layer (`src/lib/query/budgets.ts`)
```typescript
export const getBudgets = defineQuery({
  queryKey: ['budgets'],
  queryFn: () => trpc.budgets.list.query(),
});

export const getBudgetSummary = defineQuery({
  queryKey: ['budgets', 'summary'],
  queryFn: () => trpc.budgets.summary.query(),
});

export const validateBudgetTransaction = defineQuery({
  queryKey: ['budgets', 'validate'],
  queryFn: (transaction) => trpc.budgets.validateTransaction.query(transaction),
});
```

## UI Components

### Core Components (`src/lib/components/budgets/`)

#### BudgetProgress.svelte
- Visual progress bar/gauge for budget consumption
- Color-coded based on enforcement level and status
- Responsive design for different container sizes

#### BudgetSelector.svelte
- Reusable dropdown for budget selection
- Supports filtering by type, account, category
- Multi-select capability

#### BudgetPeriodPicker.svelte
- Date range picker for budget periods
- Supports preset periods and custom ranges
- Timezone-aware calculations

### Management UI (`src/routes/budgets/`)

#### +page.svelte (Budget List)
- Dashboard view of all budgets
- Health indicators and summary cards
- Quick actions (create, edit, archive)
- Filtering and sorting capabilities

#### create/+page.svelte (Budget Creation)
- Wizard-style multi-step form
- Type-specific configuration screens
- Smart defaults based on selected type
- Validation and preview

#### [id]/+page.svelte (Budget Detail)
- Detailed budget analytics
- Transaction history and allocation
- Period management
- Settings configuration

### Account Integration

#### Budget Tab (`src/routes/accounts/[id]/(components)/budgets/`)
- Account-scoped budget view
- Integration with existing transaction table
- Budget impact indicators
- Quick budget assignment

#### Transaction Table Integration
- Budget impact column showing affected budgets
- Visual indicators for budget warnings/violations
- Quick reassignment actions
- Bulk budget assignment

## Implementation Phases

### Phase 1: Foundation (Database & Core Services)
1. Create database schema files and migrations
2. Implement core domain services (BudgetService, BudgetRepository)
3. Basic tRPC routes for CRUD operations
4. Unit tests for business logic

### Phase 2: Basic UI (Account-Monthly Budgets)
1. Simple budget creation form
2. Budget list and detail pages
3. Basic progress tracking
4. Integration with transaction table

### Phase 3: Advanced Features (Category Envelopes)
1. Rollover logic implementation
2. Period management UI
3. Envelope-style budget interface
4. Advanced analytics and reporting

### Phase 4: Goals & Schedules
1. Goal-based budget implementation
2. Schedule integration and forecasting
3. Investment account tracking
4. Advanced progress calculations

### Phase 5: Polish & Optimization
1. Budget groups and hierarchy
2. Advanced enforcement options
3. Bulk operations and templates
4. Performance optimization
5. Mobile responsiveness

## Success Criteria

### Functional Requirements
- [ ] Support all four budget types with full configuration
- [ ] Seamless integration with existing transaction workflow
- [ ] Real-time budget updates with configurable refresh
- [ ] Flexible period management (weekly, monthly, custom)
- [ ] Multi-budget transaction assignment
- [ ] Budget enforcement with user-selectable levels
- [ ] Rollover and goal progress tracking
- [ ] Schedule integration for forecasting

### Performance Requirements
- [ ] Budget calculations complete within 200ms for typical datasets
- [ ] Real-time updates don't impact transaction entry performance
- [ ] Efficient queries for large numbers of budgets and transactions
- [ ] Responsive UI on mobile devices

### User Experience Requirements
- [ ] Intuitive budget creation workflow
- [ ] Clear visual progress indicators
- [ ] Helpful warnings and validation messages
- [ ] Consistent with existing application design patterns
- [ ] Accessible to users with disabilities

## Critical Gaps & Risk Mitigation

### Chart Integration Strategy

**Problem**: Original plan referenced non-existent "UnifiedChart" and "threshold" chart types.

**Solution**: Extend existing LayerChart infrastructure
- Use existing `ChartContainer` from `src/lib/components/ui/chart/chart-container.svelte`
- Extend analytics-chart-shell pattern for budget-specific charts
- Add budget progress bars using LayerChart's Bar component
- Create budget threshold overlays using existing chart composition patterns

### Transaction Aggregation

**Leverage existing patterns from accounts-server.ts:**
```typescript
// Reuse running balance logic for budget calculations
class BudgetCalculationService {
  static calculateBudgetConsumption(
    budgetId: number,
    periodStart: DateValue,
    periodEnd: DateValue
  ): Promise<BudgetActuals> {
    // Leverage existing transaction aggregation queries
    // Similar to getAccountTransactions but filtered by budget scope
  }
}
```

### Cache Invalidation Strategy

**Integration with existing query cache:**
```typescript
// src/lib/query/budgets.ts
export const budgetCacheKeys = {
  summary: (budgetId: number) => ['budgets', 'summary', budgetId],
  progress: (budgetId: number) => ['budgets', 'progress', budgetId],
  transactions: (budgetId: number) => ['budgets', 'transactions', budgetId],
} as const;

// Invalidate on transaction changes (similar to accountSummary pattern)
```

### Dialog Component Integration

**Follow existing dialog conventions:**
- Pattern: `ManageBudgetDialog` similar to `ManageCategoryForm`
- Location: `src/routes/budgets/(components)/manage-budget-dialog.svelte`
- State: Integrate with existing dialog state patterns
- Validation: Use existing Zod schema patterns

## Testing Strategy

### Critical Test Coverage

#### Data Migration Testing
```typescript
describe('Budget Migration', () => {
  test('should handle null budget defaults gracefully')
  test('should migrate existing accounts without breaking data')
  test('should provide reverse migration path')
})
```

#### Budget Calculation Edge Cases
```typescript
describe('Budget Calculations', () => {
  test('rollover calculations with partial periods')
  test('multi-currency budget handling (if relevant)')
  test('transaction assignment conflicts')
  test('period boundary edge cases (timezone changes, DST)')
})
```

#### Chart Threshold Rendering
```typescript
describe('Budget Chart Components', () => {
  test('progress bar renders correctly at different percentages')
  test('threshold lines display properly')
  test('empty state handling')
  test('real-time updates without performance degradation')
})
```

## Implementation Dependencies

### Infrastructure Requirements

**Alerting System (Future Scope)**
- **Dependency**: Notification service infrastructure
- **Blocker**: No email/push infrastructure exists today
- **Mitigation**: Phase as future enhancement, use in-app notifications only initially

**AI-Powered Suggestions (Exploratory)**
- **Status**: Aspirational feature requiring ML infrastructure
- **Dependencies**:
  - Transaction pattern analysis service
  - Recommendation engine
  - User preference storage
- **Timeline**: Post-MVP, requires architectural planning

### Migration Strategy

**Database Schema Changes**
```sql
-- Add budget_id to schedules (with proper defaults)
ALTER TABLE schedules ADD COLUMN budget_id INTEGER
  REFERENCES budgets(id) ON DELETE SET NULL;

-- Default values for existing accounts
UPDATE accounts SET monthly_budget = 0 WHERE monthly_budget IS NULL;
```

**Reverse Migration Path**
```sql
-- Remove budget system if needed
ALTER TABLE schedules DROP COLUMN budget_id;
DROP TABLE budget_transactions;
DROP TABLE budget_categories;
DROP TABLE budget_accounts;
DROP TABLE budget_period_instances;
DROP TABLE budget_period_templates;
DROP TABLE budget_group_memberships;
DROP TABLE budget_groups;
DROP TABLE budgets;
```

## Future Enhancements

### Phase 6+ Features (Optional Epics)

#### Advanced Budget Organization
- **Dependency**: Phase 1-3 complete
- Budget templates for quick setup
- Collaborative budgets (family/team sharing)
- Advanced reporting and analytics dashboard

#### External Integrations
- **Dependency**: API framework + user preferences
- Bank account synchronization
- Credit card spending limits
- Investment goal tracking
- Export/import capabilities

#### Automation & Intelligence
- **Dependency**: ML infrastructure + pattern analysis
- Smart budget suggestions based on spending patterns
- Automatic category assignment optimization
- Predictive spending alerts
- Smart rollover optimization

### Infrastructure Dependencies & Assumptions

#### Core MVP (Phases 1-5) - NO ADDITIONAL INFRASTRUCTURE REQUIRED

- **Database**: Uses existing SQLite + Drizzle setup
- **Authentication**: Uses existing Better Auth (no budget-specific auth)
- **UI Framework**: Uses existing SvelteKit + shadcn-svelte components
- **Charts**: Uses existing LayerChart infrastructure
- **Notifications**: IN-APP ONLY (toast messages, UI warnings)

#### Post-MVP Optional Epics (Phase 6+) - INFRASTRUCTURE DEPENDENCIES

- **Alerting System**: Requires email/push notification infrastructure (NOT IMPLEMENTED)
- **AI Suggestions**: Requires ML infrastructure + pattern analysis service (NOT IMPLEMENTED)
- **External Integrations**: Requires API framework + OAuth flows (NOT IMPLEMENTED)
- **Multi-User Budgets**: Requires user management + permissions system (NOT IMPLEMENTED)

#### Clear Scope Boundaries

**✅ INCLUDED IN CORE SCOPE:**

- Account-level budgets (Phase 1-2)
- Category envelope budgets (Phase 3)
- Goal tracking (Phase 4)
- Schedule integration (Phase 4)
- Budget groups/hierarchy (Phase 5)
- In-app warnings and visual indicators
- LayerChart-based progress visualization

**❌ EXPLICITLY DEFERRED (Post-MVP):**

- Email/SMS/push notifications
- AI-powered budget suggestions
- Bank account synchronization
- Multi-user collaborative budgets
- External API integrations
- Advanced reporting dashboards

### Sequencing Strategy

**Clear Epic Dependencies:**

1. **Core Foundation** (Phases 1-2): Database + basic UI
2. **Advanced Features** (Phases 3-4): Envelopes + goals + schedules
3. **Organization** (Phase 5): Groups + hierarchy + optimization
4. **Intelligence** (Phase 6+): **OPTIONAL EPICS** requiring additional infrastructure

**Success Gates:**

- Each phase must be fully functional before proceeding
- Performance benchmarks must be met
- User testing validation required for major features
- **Post-MVP features gated behind infrastructure planning**
