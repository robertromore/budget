# Automatic Schedule Detection Plan

## Overview

This feature will analyze existing transactions to detect recurring patterns and automatically suggest schedules to the user. The system will identify patterns based on similarities in amount, payee, category, and time intervals, then present intelligent suggestions with confidence scores.

## Authentication Status

**IMPORTANT**: This application is currently single-user and does not have multi-user authentication implemented. The plan below includes `userId` parameters and ownership validation logic in preparation for future multi-user support, but these are **commented out** or made **optional** in the implementation.

**Current State**:

- Single-user application
- No `userId` column on `accounts` table
- No authentication/authorization enforcement
- All users can access all data

**Future Multi-User Migration**:

When authentication is added, you will need to:

1. Add `userId` column to `accounts` table (see Phase 2 for migration SQL)
2. Uncomment authentication checks in tRPC routes
3. Make `userId` parameters required (not optional) in repository and service methods
4. Enable ownership validation in service layer
5. Update existing accounts to have valid `userId` values

The plan documents both the current single-user implementation and the future multi-user implementation for easy migration.

## Phase 1: Database Schema & Pattern Storage

### Drizzle Schema

**`src/lib/schema/detected-patterns.ts`**

```typescript
import { relations, sql } from "drizzle-orm";
import { sqliteTable, integer, text, real, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { accounts } from "./accounts";
import { payees } from "./payees";
import { categories } from "./categories";

export const detectedPatterns = sqliteTable(
  "detected_patterns",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    patternType: text("pattern_type", {
      enum: ["daily", "weekly", "monthly", "yearly"]
    }).notNull(),
    confidenceScore: real("confidence_score").notNull(),
    sampleTransactionIds: text("sample_transaction_ids", { mode: "json" })
      .notNull()
      .$type<number[]>(),
    payeeId: integer("payee_id").references(() => payees.id, { onDelete: 'set null' }),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: 'set null' }),
    amountMin: real("amount_min"),
    amountMax: real("amount_max"),
    amountAvg: real("amount_avg"),
    intervalDays: integer("interval_days"),
    status: text("status", {
      enum: ["pending", "accepted", "dismissed", "converted"]
    }).default("pending"),
    suggestedScheduleConfig: text("suggested_schedule_config", { mode: "json" })
      .$type<SuggestedScheduleConfig>(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastOccurrence: text("last_occurrence"),
    nextExpected: text("next_expected"),
  },
  (table) => [
    index("idx_detected_patterns_account").on(table.accountId),
    index("idx_detected_patterns_status").on(table.status),
    index("idx_detected_patterns_confidence").on(table.confidenceScore),
  ]
);

export const detectedPatternsRelations = relations(detectedPatterns, ({ one }) => ({
  account: one(accounts, {
    fields: [detectedPatterns.accountId],
    references: [accounts.id],
  }),
  payee: one(payees, {
    fields: [detectedPatterns.payeeId],
    references: [payees.id],
  }),
  category: one(categories, {
    fields: [detectedPatterns.categoryId],
    references: [categories.id],
  }),
}));

export const selectDetectedPatternSchema = createSelectSchema(detectedPatterns);
export const insertDetectedPatternSchema = createInsertSchema(detectedPatterns);

export type DetectedPattern = typeof detectedPatterns.$inferSelect;
export type NewDetectedPattern = typeof detectedPatterns.$inferInsert;
```

### Migration

`src/lib/server/db/migrations/00XX_add_pattern_detection.ts`

## Phase 2: Pattern Detection Algorithm

### Repository Layer

**`src/lib/server/domains/patterns/repository.ts`**

**IMPORTANT**: The current application does not have multi-user authentication implemented. The repository methods below include `userId` parameters in preparation for future multi-user support, but they are currently **not implemented** and should be added when authentication is added to the application.

**Prerequisites for Multi-User Support**:

1. Add `userId` column to `accounts` table:

```sql
-- Migration to add userId to accounts
ALTER TABLE account ADD COLUMN user_id TEXT NOT NULL DEFAULT 'default-user';
CREATE INDEX idx_account_user_id ON account(user_id);
```

2. Update accounts schema (`src/lib/schema/accounts.ts`):

```typescript
export const accounts = sqliteTable("account", {
  // ... existing fields ...
  userId: text("user_id").notNull(), // Add this field
  // ... rest of fields ...
});
```

**Repository Implementation** (ready for when authentication is added):

```typescript
export class PatternRepository {
  // Find patterns - if accountId provided, filter to that account; otherwise return all patterns
  // NOTE: Single-user mode - userId validation not yet implemented
  async findByAccount(accountId: number | undefined, userId?: string, status?: string): Promise<DetectedPattern[]> {
    // Build where conditions array, filtering out undefined values
    const conditions = [];

    if (accountId !== undefined) {
      conditions.push(eq(detectedPatterns.accountId, accountId));
    }

    if (status) {
      conditions.push(eq(detectedPatterns.status, status));
    }

    return await db.query.detectedPatterns.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(detectedPatterns.confidenceScore), desc(detectedPatterns.createdAt)]
    });
  }

  async findById(patternId: number, userId?: string): Promise<DetectedPattern | null> {
    return await db.query.detectedPatterns.findFirst({
      where: eq(detectedPatterns.id, patternId)
    });
  }

  async create(pattern: Omit<DetectedPattern, 'id' | 'createdAt'>, userId?: string): Promise<number> {
    const [result] = await db.insert(detectedPatterns).values(pattern).returning({ id: detectedPatterns.id });
    return result.id;
  }

  async updateStatus(patternId: number, userId?: string, status: string): Promise<void> {
    await db.update(detectedPatterns)
      .set({ status })
      .where(eq(detectedPatterns.id, patternId));
  }

  async delete(patternId: number, userId?: string): Promise<void> {
    await db.delete(detectedPatterns).where(eq(detectedPatterns.id, patternId));
  }

  async expireStalePatterns(daysSinceLastMatch: number, userId?: string): Promise<number> {
    // Implementation for expiring old patterns
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastMatch);

    const result = await db.delete(detectedPatterns)
      .where(lt(detectedPatterns.lastOccurrence, cutoffDate.toISOString()));

    return result.changes;
  }

  // These methods will be implemented when multi-user support is added:
  // They require the accounts table to have a userId column
  // async validateAccountOwnership(accountId: number, userId: string): Promise<boolean>
  // async validatePatternOwnership(patternId: number, userId: string): Promise<boolean>
}
```

**When Multi-User Support is Added** (update repository to):

```typescript
export class PatternRepository {
  async findByAccount(accountId: number | undefined, userId: string, status?: string): Promise<DetectedPattern[]> {
    // Build where conditions array, filtering out undefined values
    const conditions = [];

    // Filter by specific account or all user's accounts
    if (accountId !== undefined) {
      conditions.push(eq(detectedPatterns.accountId, accountId));
    } else {
      // Get all patterns for user's accounts
      const userAccountIds = await this.findUserAccountIds(userId);
      if (userAccountIds.length > 0) {
        conditions.push(inArray(detectedPatterns.accountId, userAccountIds));
      }
    }

    if (status) {
      conditions.push(eq(detectedPatterns.status, status));
    }

    return await db.query.detectedPatterns.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(detectedPatterns.confidenceScore), desc(detectedPatterns.createdAt)]
    });
  }

  async findUserAccountIds(userId: string): Promise<number[]> {
    const accounts = await db.query.accounts.findMany({
      where: eq(accounts.userId, userId),
      columns: { id: true }
    });
    return accounts.map(a => a.id);
  }

  async validateAccountOwnership(accountId: number, userId: string): Promise<boolean> {
    const account = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.id, accountId),
        eq(accounts.userId, userId)
      )
    });
    return !!account;
  }

  async validatePatternOwnership(patternId: number, userId: string): Promise<boolean> {
    const pattern = await db.query.detectedPatterns.findFirst({
      where: eq(detectedPatterns.id, patternId)
    });

    if (!pattern) return false;

    // Validate that the pattern's account belongs to the user
    return await this.validateAccountOwnership(pattern.accountId, userId);
  }
}
```

**Current State**: Single-user application - userId parameters are optional and not validated.
**Future State**: Multi-user with full ownership validation once authentication system is implemented.

### Detection Service

**`src/lib/server/domains/patterns/services.ts`**

#### Core Detection Logic

**Algorithm Steps:**

1. **Filter Candidates**: Exclude soft-deleted, transfer, and schedule-linked transactions
   - `deletedAt IS NULL` - Only active transactions
   - `isTransfer = false` - Exclude transfer transactions
   - `scheduleId IS NULL` - Exclude schedule-linked transactions
2. **Group Candidates**: Group remaining transactions by similar payee, category, and amount range (±10%)
3. **Detect Intervals**: For each group, calculate date differences between consecutive transactions
4. **Pattern Matching**: Identify consistent intervals (daily ±1 day, weekly ±2 days, monthly ±3 days, yearly ±7 days)
5. **Confidence Scoring**: Calculate confidence based on:
   - Number of occurrences (minimum 3)
   - Consistency of interval (variance)
   - Amount consistency
   - Recency (newer patterns score higher)
6. **Batch Processing**: Process in chunks of 1000 transactions for performance

```typescript
interface DetectionCriteria {
  minOccurrences: number; // Default: 3
  amountVariancePercent: number; // Default: 10%
  intervalToleranceDays: {
    daily: number; // ±1 day
    weekly: number; // ±2 days
    monthly: number; // ±3 days
    yearly: number; // ±7 days
  };
  minConfidenceScore: number; // Default: 70
  lookbackMonths: number; // Default: 12 months
  batchSize: number; // Default: 1000 transactions
}

interface SuggestedScheduleConfig {
  // Core schedule fields
  name: string;
  amountType: 'exact' | 'approximate' | 'range';
  amount: number;
  amount2?: number;
  autoAdd: boolean;
  recurring: boolean;

  // Schedule date fields
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  startDate: string;
  endDate?: string;

  // Advanced options (Phase 4)
  on?: boolean;
  onType?: 'day' | 'the';
  days?: number[];
  weekDays?: number[];
  weeks?: number[];
  weeksDays?: number[];
  moveWeekends?: 'none' | 'next_weekday' | 'previous_weekday';
  moveHolidays?: 'none' | 'next_weekday' | 'previous_weekday';
}

interface DetectedPatternData {
  accountId: number;
  patternType: 'daily' | 'weekly' | 'monthly' | 'yearly';
  confidenceScore: number;
  sampleTransactionIds: number[];
  payeeId: number | null;
  categoryId: number | null;
  amountMin: number;
  amountMax: number;
  amountAvg: number;
  intervalDays: number;
  lastOccurrence: string;
  nextExpected: string;
  suggestedScheduleConfig: SuggestedScheduleConfig;
}
```

### Service Methods

```typescript
class PatternDetectionService {
  constructor(private repository = new PatternRepository()) {}

  async detectPatternsForAccount(
    accountId: number,
    userId?: string,
    criteria?: Partial<DetectionCriteria>
  ): Promise<DetectedPatternData[]>

  async detectPatternsForUserAccounts(
    userId?: string,
    criteria?: Partial<DetectionCriteria>
  ): Promise<DetectedPatternData[]>

  async saveDetectedPattern(
    pattern: DetectedPatternData,
    userId?: string
  ): Promise<number>

  async getDetectedPatterns(
    userId?: string,
    accountId?: number,
    status?: string
  ): Promise<DetectedPattern[]> {
    // NOTE: Single-user mode - ownership validation not yet implemented
    // When multi-user support is added, uncomment this:
    // if (userId && accountId !== undefined) {
    //   const hasAccess = await this.repository.validateAccountOwnership(accountId, userId);
    //   if (!hasAccess) {
    //     const error: any = new Error('Access denied to this account');
    //     error.statusCode = 403;
    //     throw error;
    //   }
    // }

    return await this.repository.findByAccount(accountId, userId, status);
  }

  async updatePatternStatus(
    patternId: number,
    userId?: string,
    status?: 'accepted' | 'dismissed' | 'converted'
  ): Promise<void>

  async convertPatternToSchedule(
    patternId: number,
    userId?: string
  ): Promise<number>

  async dismissPattern(
    patternId: number,
    userId?: string
  ): Promise<void>

  async expireStalePatterns(
    userId?: string,
    daysSinceLastMatch?: number
  ): Promise<number>

  async checkForManualScheduleCreation(
    patternId: number,
    userId?: string
  ): Promise<void>

  private filterCandidateTransactions(transactions: Transaction[]): Transaction[]

  private groupSimilarTransactions(transactions: Transaction[]): TransactionGroup[]

  private calculateIntervalConsistency(dates: string[]): { avgDays: number; variance: number }

  private calculateConfidenceScore(group: TransactionGroup): number

  private detectPatternType(
    intervalDays: number,
    variance: number
  ): 'daily' | 'weekly' | 'monthly' | 'yearly' | null

  private buildSuggestedScheduleConfig(group: TransactionGroup): SuggestedScheduleConfig
}
```

## Phase 3: Backend Integration

### tRPC Routes

**`src/lib/trpc/routes/patterns.ts`**

**NOTE**: This implementation works in single-user mode (no authentication). When multi-user support is added, uncomment the authentication checks.

```typescript
import { z } from "zod";
import { publicProcedure, rateLimitedProcedure, t } from "$lib/trpc";
import { TRPCError } from "@trpc/server";
import { PatternDetectionService } from "$lib/server/domains/patterns";

const patternService = new PatternDetectionService();

const detectionCriteriaSchema = z.object({
  minOccurrences: z.number().min(2).optional(),
  amountVariancePercent: z.number().min(0).max(100).optional(),
  minConfidenceScore: z.number().min(0).max(100).optional(),
  lookbackMonths: z.number().min(1).max(24).optional(),
});

export const patternRoutes = t.router({
  // Run detection for specific account (or all accounts if no accountId)
  detect: rateLimitedProcedure
    .input(z.object({
      accountId: z.number().positive().optional(),
      criteria: detectionCriteriaSchema.optional()
    }))
    .mutation(async ({ input, ctx }) => {
      // NOTE: Single-user mode - authentication not yet implemented
      // When multi-user support is added, uncomment this:
      // if (!ctx.user?.id) {
      //   throw new TRPCError({
      //     code: "UNAUTHORIZED",
      //     message: "Authentication required",
      //   });
      // }

      try {
        if (input.accountId) {
          // Single account detection
          return await patternService.detectPatternsForAccount(
            input.accountId,
            ctx.user?.id, // Will be undefined in single-user mode
            input.criteria
          );
        } else {
          // Detect patterns for all accounts
          return await patternService.detectPatternsForUserAccounts(
            ctx.user?.id, // Will be undefined in single-user mode
            input.criteria
          );
        }
      } catch (error: any) {
        // Multi-user error handling (ready for when auth is added)
        if (error.statusCode === 403) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: error.message || "Access denied",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to detect patterns",
        });
      }
    }),

  // Get detected patterns
  list: rateLimitedProcedure
    .input(z.object({
      accountId: z.number().positive().optional(),
      status: z.enum(['pending', 'accepted', 'dismissed', 'converted']).optional()
    }))
    .query(async ({ input, ctx }) => {
      // NOTE: Single-user mode - authentication not yet implemented
      // When multi-user support is added, uncomment this:
      // if (!ctx.user?.id) {
      //   throw new TRPCError({
      //     code: "UNAUTHORIZED",
      //     message: "Authentication required",
      //   });
      // }

      try {
        return await patternService.getDetectedPatterns(
          ctx.user?.id, // Will be undefined in single-user mode
          input.accountId,
          input.status
        );
      } catch (error: any) {
        // Multi-user error handling (ready for when auth is added)
        if (error.statusCode === 403) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: error.message || "Access denied",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch patterns",
        });
      }
    }),

  // Convert pattern to schedule
  convertToSchedule: rateLimitedProcedure
    .input(z.object({ patternId: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      // NOTE: Single-user mode - authentication not yet implemented
      // When multi-user support is added, uncomment this:
      // if (!ctx.user?.id) {
      //   throw new TRPCError({
      //     code: "UNAUTHORIZED",
      //     message: "Authentication required",
      //   });
      // }

      try {
        return await patternService.convertPatternToSchedule(
          input.patternId,
          ctx.user?.id // Will be undefined in single-user mode
        );
      } catch (error: any) {
        if (error.statusCode === 404) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        // Multi-user error handling (ready for when auth is added)
        if (error.statusCode === 403) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: error.message || "Access denied",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create schedule",
        });
      }
    }),

  // Dismiss pattern
  dismiss: rateLimitedProcedure
    .input(z.object({ patternId: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      // NOTE: Single-user mode - authentication not yet implemented
      // When multi-user support is added, uncomment this:
      // if (!ctx.user?.id) {
      //   throw new TRPCError({
      //     code: "UNAUTHORIZED",
      //     message: "Authentication required",
      //   });
      // }

      try {
        await patternService.dismissPattern(
          input.patternId,
          ctx.user?.id // Will be undefined in single-user mode
        );
        return { success: true };
      } catch (error: any) {
        // Multi-user error handling (ready for when auth is added)
        if (error.statusCode === 403) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: error.message || "Access denied",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to dismiss pattern",
        });
      }
    }),

  // Expire stale patterns
  expireStale: rateLimitedProcedure
    .input(z.object({
      daysSinceLastMatch: z.number().min(1).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      // NOTE: Single-user mode - authentication not yet implemented
      // When multi-user support is added, uncomment this:
      // if (!ctx.user?.id) {
      //   throw new TRPCError({
      //     code: "UNAUTHORIZED",
      //     message: "Authentication required",
      //   });
      // }

      try {
        const count = await patternService.expireStalePatterns(
          ctx.user?.id, // Will be undefined in single-user mode
          input.daysSinceLastMatch
        );
        return { count };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to expire patterns",
        });
      }
    }),
});
```

Add to `src/lib/trpc/routes/index.ts`:

```typescript
import { patternRoutes } from './patterns';

export const appRouter = t.router({
  // ... existing routes
  patterns: patternRoutes,
});
```

### Query Layer

**`src/lib/query/patterns.ts`**

```typescript
import { defineQuery, defineMutation, createQueryKeys } from "./_factory";
import { cachePatterns } from "./_client";
import { trpc } from "$lib/trpc/client";

export const patternKeys = createQueryKeys("patterns", {
  lists: () => ["patterns", "list"] as const,
  list: (accountId?: number, status?: string) =>
    ["patterns", "list", { accountId, status }] as const,
  details: () => ["patterns", "detail"] as const,
  detail: (id: number) => ["patterns", "detail", id] as const,
});

export const getDetectedPatterns = (accountId?: number, status?: string) => {
  return defineQuery({
    queryKey: patternKeys.list(accountId, status),
    queryFn: () => trpc.patterns.list.query({ accountId, status }),
    options: { staleTime: 30 * 1000 }
  });
};

export const detectPatterns = defineMutation({
  mutationFn: (params: { accountId?: number; criteria?: any }) =>
    trpc.patterns.detect.mutate({
      accountId: params.accountId,
      criteria: params.criteria
    }),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(patternKeys.lists());
  },
  successMessage: 'Pattern detection complete',
  errorMessage: 'Failed to detect patterns'
});

export const convertPatternToSchedule = defineMutation({
  mutationFn: (patternId: number) =>
    trpc.patterns.convertToSchedule.mutate({ patternId }),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(patternKeys.lists());
    cachePatterns.invalidatePrefix(['schedules']);
  },
  successMessage: 'Schedule created successfully',
  errorMessage: 'Failed to create schedule'
});

export const dismissPattern = defineMutation({
  mutationFn: (patternId: number) =>
    trpc.patterns.dismiss.mutate({ patternId }),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(patternKeys.lists());
  },
  successMessage: 'Pattern dismissed',
  errorMessage: 'Failed to dismiss pattern'
});

export const expireStalePatterns = defineMutation({
  mutationFn: (daysSinceLastMatch?: number) =>
    trpc.patterns.expireStale.mutate({ daysSinceLastMatch }),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(patternKeys.lists());
  },
  successMessage: (result) => `${result.count} stale patterns expired`,
  errorMessage: 'Failed to expire stale patterns'
});
```

## Phase 4: UI Components

### Pattern List View

**`src/lib/components/patterns/pattern-list.svelte`**

Simple table/list view displaying:

- Pattern confidence score
- Frequency type (monthly, weekly, etc.)
- Number of matching transactions
- Suggested payee and category
- Actions: "Create Schedule", "Dismiss"

### Pattern Detail Dialog

**`src/lib/components/patterns/pattern-detail-dialog.svelte`**

Shows comprehensive pattern information:

- All matching transactions in a table
- Interval analysis visualization (timeline)
- Amount variation chart
- Confidence breakdown explanation
- Editable schedule configuration before creation

### Detection Status Component

**`src/lib/components/patterns/detection-status.svelte`**

Shows detection progress:

- Loading state during detection
- Results summary (X patterns found)
- Option to run detection manually
- Last detection timestamp

### Integration Points

**Schedules Page** (`src/routes/schedules/+page.svelte`)

- Add "Detect Patterns" button
- Show basic pattern list view
- Individual pattern actions

## Phase 5: User Workflows

### Workflow 1: Manual Detection

1. User clicks "Detect Patterns" on schedules page
2. System runs detection across all of the user's accounts (filtered to current user)
3. Results shown in pattern list view
4. User can accept, dismiss, or view details for each suggestion

### Workflow 2: Automatic Background Detection

1. Run detection nightly via cron/background job
2. Store results in `detected_patterns` table
3. Show notification badge when new patterns found
4. User reviews suggestions at their convenience

### Workflow 3: Pattern Conversion

1. User clicks "Create Schedule" on a pattern
2. System pre-fills schedule creation form with pattern data
3. User can adjust settings before confirming
4. Schedule created and pattern marked as "converted"
5. Cache invalidation updates schedule lists

## Phase 6: Advanced Features

### Smart Filtering

- Ignore one-time transactions (transfers already filtered)
- Detect seasonal patterns (quarterly, semi-annual)
- Learn from user dismissals to improve future suggestions

### Pattern Confidence Breakdown

Show users why a pattern has a certain confidence score:

- Consistent amount (±5%)
- Regular interval (monthly ±2 days)
- 6 occurrences found
- Amount varies significantly (-15% variance)

### Historical Tracking

- Track pattern suggestion acceptance rate
- Show pattern evolution over time
- Alert when expected pattern breaks (missing transaction)

### Account Dashboard Integration

**Account Dashboard** (`src/routes/accounts/[slug]/+page.svelte`)

- Add "Suggest Schedules" button to trigger detection for specific account
- Display pattern suggestions card when patterns are available
- Badge indicator showing pending suggestion count

## Implementation Priorities

### Priority 1 (MVP)

- Database schema with Drizzle definitions
- Repository layer following existing patterns
- Core detection algorithm for monthly patterns only
- Basic service methods (detect, save, list, dismiss)
- tRPC endpoints with proper error handling
- Query layer integration with cache invalidation
- Simple pattern list view (table format, no fancy UI)
- Manual "Detect Patterns" button on schedules page

### Priority 2

- All frequency types (daily, weekly, yearly)
- Pattern detail dialog with transaction list
- Account-specific detection from account dashboard
- Enhanced pattern list with confidence indicators

### Priority 3

- Background detection job
- Notification system
- Stale pattern expiration
- Bulk actions (Accept all, Dismiss all)
- Advanced filtering

### Priority 4

- Confidence breakdown explanations with visual indicators
- Pattern evolution tracking
- Machine learning improvements
- Seasonal pattern detection

## Error Handling

### Detection Failures

- **Insufficient data**: Show friendly message "Need at least 3 months of transactions"
- **No patterns found**: Provide helpful tips on what makes a good pattern
- **Database errors**: Log error details and show generic message to user
- **Performance issues**: Implement timeout protection and partial result handling

### Conversion Failures

- **Invalid schedule data**: Pre-validate before showing conversion dialog
- **Constraint violations**: Handle payee/category/account deletion gracefully
- **Concurrent modifications**: Implement optimistic locking or retry logic
- **Schedule creation errors**: Show specific error message and allow retry

### Edge Cases

- **Deleted payee/category**: Pattern remains valid but shows "Unknown Payee/Category"
- **Manual schedule creation**: Auto-mark pattern as "converted" if matching schedule created
- **Pattern expiration**: Auto-dismiss patterns with no matches for 90+ days
- **Duplicate patterns**: Merge or deduplicate before presenting to user

## Testing Strategy

### Unit Tests

- Pattern grouping algorithm
- Interval calculation and variance detection
- Confidence score calculation with various scenarios
- Pattern type detection logic (daily, weekly, monthly, yearly)
- Soft-delete filtering (`deletedAt IS NULL`)
- Transfer transaction filtering (`isTransfer = false`)
- Schedule-linked transaction filtering (`scheduleId IS NULL`)

### Integration Tests

- Full detection flow from transactions to patterns
- Pattern to schedule conversion with database operations
- Cache invalidation on pattern operations
- Repository layer database operations

### E2E Tests

- Manual detection trigger workflow
- Pattern acceptance and schedule creation
- Pattern dismissal and cleanup
- Stale pattern expiration

## Performance Optimization

### Database Optimization

- Index on `transactions.date` for efficient date range queries
- Index on `transactions.isTransfer` for quick filtering
- Index on `transactions.scheduleId` for schedule-linked filtering
- Batch processing for large transaction sets (1000 per batch)

### Query Optimization

- Limit lookback period to 12-24 months by default
- Option to run detection for specific date ranges
- Use prepared statements for repeated queries
- Connection pooling for concurrent detection runs

### Caching Strategy

- Cache detection results for 24 hours
- Invalidate cache when new transactions added
- Per-account cache keys for granular invalidation

## Metrics and Analytics

### Pattern Detection Metrics

- Pattern detection success rate (patterns found / accounts analyzed)
- Average number of patterns per account
- Pattern distribution by frequency type
- Detection processing time per account

### User Interaction Metrics

- User acceptance rate (patterns converted / patterns suggested)
- User dismissal rate (patterns dismissed / patterns suggested)
- False positive rate (dismissed patterns with high confidence)
- Average confidence score of accepted vs dismissed patterns

### System Health Metrics

- Detection job failures and success rate
- Average detection time per account
- Database query performance
- Cache hit/miss ratios

Use these metrics to continuously improve the detection algorithm and user experience.

## Technical Considerations

### Security

**Current State: Single-User Application**

This application is currently single-user with **no authentication system implemented**. All security checks are commented out and will be enabled when multi-user support is added.

**Current Implementation**:
- ✅ All endpoints work without authentication
- ✅ `ctx.user?.id` is `undefined` - passed through but not used
- ✅ Service methods accept optional `userId?: string`
- ✅ Repository methods work without user scoping
- ✅ No ownership validation is performed

**Current Security Limitations**:
- ⚠️ Single-user only - all data accessible to the one user
- ⚠️ No cross-user protection (not needed in single-user mode)
- ⚠️ No authentication required for any operations

**Future Multi-User Migration**

When authentication is implemented, follow this pattern:

```typescript
// 1. Add userId column to accounts table
ALTER TABLE account ADD COLUMN user_id TEXT NOT NULL DEFAULT 'default-user';
CREATE INDEX idx_account_user_id ON account(user_id);

// 2. Uncomment authentication in tRPC routes
async ({ input, ctx }) => {
  if (!ctx.user?.id) {  // Uncomment this check
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return await service.method(input.id, ctx.user.id);
}

// 3. Enable ownership validation in services
async method(id: number, userId: string) {
  const hasAccess = await this.repository.validateOwnership(id, userId);
  if (!hasAccess) {
    const error: any = new Error('Access denied');
    error.statusCode = 403;
    throw error;
  }
  // Proceed with operation
}

// 4. Update repository to filter by userId
async validateAccountOwnership(accountId: number, userId: string) {
  const account = await db.query.accounts.findFirst({
    where: and(
      eq(accounts.id, accountId),
      eq(accounts.userId, userId) // Critical ownership check
    )
  });
  return !!account;
}
```

**Future Security Guarantees** (when auth is enabled):
- No cross-user data leakage
- All queries filtered by userId at database level
- Pattern operations validate ownership before execution
- Forbidden (403) errors for unauthorized access attempts
- UNAUTHORIZED (401) errors for missing authentication

### Performance

- Run detection asynchronously to avoid blocking UI
- Limit lookback period to 12-24 months by default
- Index database properly for efficient queries
- Cache detection results for 24 hours
- Batch processing for large transaction sets

### Data Privacy

- No external API calls - all detection runs locally
- Pattern data deleted when dismissed
- User has full control over detection and suggestions
- No personally identifiable information in logs

### Accuracy

- Require minimum 3 occurrences for pattern validity
- Use tolerance ranges for intervals and amounts
- Higher confidence scores for more consistent patterns
- Learn from user feedback to improve detection
- Exclude soft-deleted transactions (`deletedAt IS NULL`)
- Exclude transfer transactions (`isTransfer = false`)
- Exclude schedule-linked transactions (`scheduleId IS NULL`)

## Summary

This plan provides a comprehensive approach to automatic schedule detection based on existing transactions. The system will:

1. Analyze transaction history to identify recurring patterns
2. Calculate confidence scores based on consistency and frequency
3. Present intelligent suggestions to users with clear explanations
4. Allow users to accept, dismiss, or modify detected patterns
5. Convert patterns to schedules with pre-filled configuration
6. Run detection manually or automatically in the background

The implementation is broken into prioritized phases, starting with a focused MVP that delivers core value and expanding to advanced features based on user feedback and adoption.

Key improvements in this revised plan:

- Drizzle schema definition matching project patterns
- Repository layer for data access
- Transfer transaction exclusion
- Proper schedule configuration structure
- Comprehensive error handling
- Testing strategy
- Performance optimization guidelines
- Metrics and analytics tracking
