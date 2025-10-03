# Category Enhancement Plan

**Date**: 2025-09-29
**Status**: Planning
**Goal**: Enhance categories entity with abstracted patterns from accounts and payees

---

## Executive Summary

The categories entity currently has minimal functionality compared to accounts and payees. This plan identifies common patterns across all three entities and proposes a phased approach to enhance categories with visual customization, type classification, and analytics capabilities.

**Note**: Budget integration (originally Phase 3) has been removed from this plan as it duplicates the existing envelope allocations system. Budget data should be accessed via query-layer joins to `envelopeAllocations` and `budgetCategories` tables.

---

## Analysis Summary

### Current Entity Comparison

#### Categories (Current State)
```typescript
{
  id: integer
  parentId: integer (self-reference)
  name: text
  notes: text
  dateCreated: text
  createdAt: text
  updatedAt: text
  deletedAt: text
}
```

**Features**: Basic name/notes, hierarchical structure (parent/child)
**Missing**: Visual customization, status management, type classification, budget integration, analytics

#### Accounts (Reference Implementation)
```typescript
{
  // Core fields
  id, cuid, name, slug, closed, notes

  // Visual customization
  accountIcon: text
  accountColor: text

  // Type classification
  accountType: enum (checking, savings, investment, credit_card, loan, cash, other)

  // Institution info
  institution: text
  accountNumberLast4: text
  initialBalance: real

  // Timestamps
  dateOpened, createdAt, updatedAt, deletedAt
}
```

**Strengths**: Rich visual customization, clear type system, institution tracking

#### Payees (Reference Implementation)
```typescript
{
  // Core fields
  id, name, notes

  // Budget integration
  defaultCategoryId: integer
  defaultBudgetId: integer
  payeeType: enum

  // Transaction automation
  avgAmount: real
  paymentFrequency: enum
  lastTransactionDate: text

  // Analytics
  taxRelevant: boolean
  isActive: boolean
  alertThreshold: real  // Monetary amount ($) for transaction alerts
  isSeasonal: boolean

  // Contact info
  website, phone, email, address

  // Advanced features
  subscriptionInfo: json
  tags: text
  merchantCategoryCode: text

  // Timestamps
  dateCreated, createdAt, updatedAt, deletedAt
}
```

**Strengths**: Comprehensive analytics, budget integration, automation support, status management

---

## Abstraction Patterns Identified

### 1. Visual Customization Pattern
**Current**: Accounts (implemented) | Payees (missing) | Categories (missing)

**Pattern**: Icon + color for visual identification
- Improves scanning and recognition
- Consistent with design system
- Reduces cognitive load

**Proposal for Categories**:
```typescript
categoryIcon: text        // Lucide icon name
categoryColor: text       // Hex color code (#RRGGBB)
```

---

### 2. Status Management Pattern
**Current**: Accounts (`closed`) | Payees (`isActive`) | Categories (missing)

**Issue**: Inconsistent naming (`closed` vs `isActive`)

**Standardized Proposal**:
```typescript
isActive: boolean  // Standardize across all entities
```

**Benefits**:
- Consistent API surface
- Archive without deletion
- Filter active vs inactive

---

### 3. Type Classification Pattern
**Current**: All entities have type enums but different approaches

**Accounts**:
```typescript
accountType: "checking" | "savings" | "investment" | "credit_card" | "loan" | "cash" | "other"
```

**Payees**:
```typescript
payeeType: "merchant" | "utility" | "employer" | "financial_institution" | "government" | "individual" | "other"
```

**Categories** (MISSING):
```typescript
categoryType: "income" | "expense" | "transfer" | "savings"
```

**Why This Matters**:
- Proper income vs expense separation
- Transfer handling (don't count as income/expense)
- Savings goals tracking
- Better reporting and analytics

---

### 4. Budget Integration Pattern
**Current**: Payees (implemented) | Accounts (missing) | Categories (missing)

**Pattern from Payees**:
```typescript
defaultBudgetId: integer
alertThreshold: real  // Monetary amount (e.g., $50) - alert when transaction exceeds this dollar value
```

**Proposal for Categories**:
**REMOVED** - Budget integration is handled by the existing envelope allocations system (`src/lib/schema/budgets/envelope-allocations.ts`).

**Why Removed**:
- Duplicates `envelopeAllocations` table functionality (allocatedAmount, rolloverMode, rolloverAmount, metadata)
- Creates stale data and synchronization issues
- Envelope system already provides per-period allocations, rollover tracking, and alert thresholds
- Budget relationships already exist via `budgetCategories` junction table

**Semantic Drift Warning**:
- Payees use `alertThreshold` as a **monetary amount** (e.g., $50)
- Categories would need `alertThreshold` as a **percentage** (e.g., 80% of budget)
- Sharing the same field name with different units breaks shared validation, UX components, and creates confusion
- Alert functionality for categories should come from `envelopeAllocations.metadata` instead

**For budget integration**: Use query-layer joins to display envelope allocation data alongside categories.

---

### 5. Analytics & Intelligence Pattern
**Current**: Payees (implemented) | Accounts (missing) | Categories (missing)

**Pattern from Payees**:
```typescript
taxRelevant: boolean
isSeasonal: boolean
avgAmount: real
lastTransactionDate: text
```

**Proposal for Categories**:
```typescript
// Tax tracking
isTaxDeductible: boolean
taxCategory: text                  // IRS category mapping
deductiblePercentage: integer      // Partial deductibility (0-100)

// Spending patterns
isSeasonal: boolean
seasonalMonths: json               // [1,2,12] for winter months
expectedMonthlyMin: real           // Normal spending range
expectedMonthlyMax: real
spendingPriority: text             // "essential" | "important" | "discretionary" | "luxury"
```

**Benefits**:
- Tax reporting capabilities
- Seasonal budget adjustments
- Spending pattern recognition
- Financial planning support

---

## Phased Implementation Plan

### Phase 1: Visual Customization & Status Management
**Priority**: HIGH
**Estimated Time**: 2 hours
**Goal**: Add icon, color, and status management to categories

#### Database Schema Changes
```typescript
// Add to categories table
categoryIcon: text("category_icon")
categoryColor: text("category_color")
isActive: integer("is_active", {mode: "boolean"}).default(true).notNull()
displayOrder: integer("display_order").default(0)

// Add indexes
index("category_icon_idx").on(table.categoryIcon)
index("category_is_active_idx").on(table.isActive)
index("category_display_order_idx").on(table.displayOrder)
```

#### Validation Updates
```typescript
categoryIcon: z.string()
  .refine((val) => !val || isValidIconName(val), "Invalid icon selection")
  .optional()
  .nullable()

categoryColor: z.string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code")
  .optional()
  .nullable()

isActive: z.boolean().default(true)

displayOrder: z.number().default(0)
```

#### UI Components to Update
- `ManageCategoryForm.svelte` - Add icon picker and color picker
- Category cards - Display icon with color background
- Sidebar - Show icon/color like accounts
- Search filters - Add active/inactive filter

---

### Phase 2: Type Classification System
**Priority**: HIGH
**Estimated Time**: 3 hours
**Goal**: Classify categories as income, expense, transfer, or savings

#### Database Schema
```typescript
export const categoryTypeEnum = [
  "income",      // Salary, freelance, investments, gifts received
  "expense",     // Most categories (default)
  "transfer",    // Between accounts (not counted in income/expense)
  "savings"      // Goal-based savings categories
] as const;

export type CategoryType = typeof categoryTypeEnum[number];

// Add to table
categoryType: text("category_type", {enum: categoryTypeEnum}).default("expense")

// Add index
index("category_type_idx").on(table.categoryType)
```

#### Impact on Reporting
- Income categories: Sum as positive in income reports
- Expense categories: Sum as negative in expense reports
- Transfer categories: Excluded from income/expense totals
- Savings categories: Tracked separately for goal progress

#### UI Updates
- Category type selector in form (required field)
- Type badge on category cards
- Filter by type in search
- Separate sections in category list (Income | Expenses | Savings)

---

### Phase 3: Budget Integration
**Priority**: REMOVED - DUPLICATES EXISTING ENVELOPE SYSTEM
**Status**: NOT APPLICABLE

> **Note**: This phase has been removed because budget integration is already handled by the existing envelope allocations system (`src/lib/schema/budgets/envelope-allocations.ts`). The envelope system provides:
> - Per-period budget allocations via `envelopeAllocations.allocatedAmount`
> - Rollover functionality via `envelopeAllocations.rolloverMode` and `envelopeRolloverHistory`
> - Alert thresholds via `envelopeAllocations.metadata`
> - Category-budget relationships via `budgetCategories` junction table
>
> Adding duplicate budget fields to the categories table would create stale data and conflict with the authoritative envelope system.
>
> **For budget integration**: Use query-layer joins to display envelope allocation data alongside categories, rather than duplicating fields.

---

### Phase 4: Tax & Analytics
**Priority**: MEDIUM
**Estimated Time**: 3 hours
**Goal**: Add tax tracking and spending pattern intelligence

#### Database Schema
```typescript
// Tax tracking
isTaxDeductible: integer("is_tax_deductible", {mode: "boolean"}).default(false)
taxCategory: text("tax_category")
deductiblePercentage: integer("deductible_percentage")  // 0-100

// Spending patterns
isSeasonal: integer("is_seasonal", {mode: "boolean"}).default(false)
seasonalMonths: text("seasonal_months", {mode: "json"})
expectedMonthlyMin: real("expected_monthly_min")
expectedMonthlyMax: real("expected_monthly_max")
spendingPriority: text("spending_priority")  // "essential" | "important" | "discretionary" | "luxury"

// Indexes
index("category_tax_deductible_idx").on(table.isTaxDeductible)
index("category_is_seasonal_idx").on(table.isSeasonal)
index("category_spending_priority_idx").on(table.spendingPriority)
```

#### Tax Categories (IRS Mapping)
```typescript
export const taxCategories = [
  "charitable_contributions",
  "medical_expenses",
  "business_expenses",
  "home_office",
  "education",
  "state_local_taxes",
  "mortgage_interest",
  "investment_expenses",
  "other"
] as const;
```

#### Seasonal Patterns
```typescript
// seasonalMonths example
{
  "months": [11, 12],  // November, December
  "pattern": "holiday_spending"
}
```

#### Spending Priority Levels
```typescript
export const spendingPriorityEnum = [
  "essential",      // Rent, utilities, groceries
  "important",      // Insurance, healthcare
  "discretionary",  // Entertainment, dining out
  "luxury"          // Vacations, high-end purchases
] as const;
```

---

### Phase 5: UI/UX Enhancements
**Priority**: MEDIUM
**Estimated Time**: 2 hours
**Goal**: Update all UI components with new features

#### Components to Update

##### 1. ManageCategoryForm.svelte
Add sections for:
- **Basic Info**: Name, notes, parent category
- **Visual**: Icon picker, color picker
- **Classification**: Category type, spending priority
- **Budget**: Monthly budget, alert threshold, rollover settings
- **Tax**: Tax deductible checkbox, tax category, deductible percentage
- **Patterns**: Seasonal toggle, seasonal months, expected ranges

##### 2. Category Cards (List/Grid View)
Display:
- Icon with colored background
- Category name
- Category type badge
- Budget progress bar (if set)
- Active/inactive indicator
- Tax deductible icon
- Seasonal indicator

##### 3. Category Search & Filters
Add filters for:
- Category type (income/expense/transfer/savings)
- Active status
- Budget assigned (yes/no)
- Tax deductible
- Seasonal categories
- Spending priority

##### 4. Sidebar
- Show category icon with color background
- Display budget progress indicator
- Show inactive categories with reduced opacity

##### 5. Category Analytics Pages
Enhance with:
- Income vs expense breakdown by type
- Budget variance charts
- Tax deduction summary
- Seasonal spending patterns
- Priority-based spending analysis

---

### Phase 6: Database Migrations with Drizzle ORM
**Priority**: HIGH (Required for all phases)
**Estimated Time**: 1 hour
**Goal**: Update schema and generate migrations using Drizzle ORM workflow

#### Drizzle Workflow Overview

This project uses **Drizzle ORM** for schema-first database migrations. Never write manual SQL migrations.

**Standard Workflow**:
1. Update TypeScript schema in `src/lib/schema/categories.ts`
2. Run `bun run db:generate` to auto-generate migration SQL
3. Review generated migration in `drizzle/` directory
4. Run `bun run db:migrate` to apply migration

**Important Limitations**:
- Drizzle migrations are **forward-only** (no rollback scripts)
- SQLite cannot add foreign keys via ALTER TABLE (Drizzle handles via table recreation)
- Backup database before applying migrations to production

#### Schema Updates: Phase 1
**File**: `src/lib/schema/categories.ts`

```typescript
import { relations, sql } from "drizzle-orm";
import { sqliteTable, integer, text, real, index, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  parentId: integer('parent_id').references((): AnySQLiteColumn => categories.id),
  name: text('name').notNull(),
  notes: text('notes'),

  // Phase 1: Visual customization
  categoryIcon: text('category_icon'),
  categoryColor: text('category_color'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  displayOrder: integer('display_order').notNull().default(0),

  // Timestamps
  dateCreated: text('date_created').notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at')
}, (table) => [
  index('category_parent_id_idx').on(table.parentId),
  index('category_icon_idx').on(table.categoryIcon),
  index('category_is_active_idx').on(table.isActive),
  index('category_display_order_idx').on(table.displayOrder)
]);
```

**Then run**:
```bash
bun run db:generate
bun run db:migrate
```

#### Schema Updates: Phase 2
**Add to** `src/lib/schema/categories.ts`:

```typescript
// Add enum definition (TypeScript const, not pgEnum - this is SQLite!)
export const categoryTypeEnum = ['expense', 'income', 'transfer', 'savings'] as const;
export type CategoryType = typeof categoryTypeEnum[number];

// Add to categories table definition
categoryType: text('category_type', { enum: categoryTypeEnum }).notNull().default('expense'),

// Add to indexes array
index('category_type_idx').on(table.categoryType)
```

**Note**: Type exports `Category` and `NewCategory` already exist at the bottom of the schema file using `$inferSelect` and `$inferInsert`.

**Then run**:
```bash
bun run db:generate
bun run db:migrate
```

#### Schema Updates: Phase 3
**REMOVED** - This phase has been eliminated. Budget integration is handled by the existing envelope allocations system.

See Phase 3 description for details on why this was removed and how to integrate with the envelope system instead.

#### Schema Updates: Phase 4
**Add to** `src/lib/schema/categories.ts`:

```typescript
// Add enum definitions (TypeScript const, not pgEnum - this is SQLite!)
export const spendingPriorityEnum = ['essential', 'important', 'discretionary', 'luxury'] as const;
export type SpendingPriority = typeof spendingPriorityEnum[number];

// Add to categories table definition
isTaxDeductible: integer('is_tax_deductible', { mode: 'boolean' }).notNull().default(false),
taxCategory: text('tax_category'),
deductiblePercentage: integer('deductible_percentage'),
isSeasonal: integer('is_seasonal', { mode: 'boolean' }).notNull().default(false),
seasonalMonths: text('seasonal_months'), // JSON array of month numbers
expectedMonthlyMin: real('expected_monthly_min'),
expectedMonthlyMax: real('expected_monthly_max'),
spendingPriority: text('spending_priority', { enum: spendingPriorityEnum }),

// Add to indexes array
index('category_tax_deductible_idx').on(table.isTaxDeductible),
index('category_is_seasonal_idx').on(table.isSeasonal),
index('category_spending_priority_idx').on(table.spendingPriority)
```

#### Migration Reversal Strategy
Drizzle migrations are **forward-only**. To "rollback":

1. **Manual Approach**:
   - Backup database before migration
   - Restore backup if issues occur
   - Recommended for production

2. **New Migration Approach**:
   - Create new migration that removes added columns
   - Update schema file to remove fields
   - Run `bun run db:generate` and `bun run db:migrate`

3. **Development Approach**:
   - Delete generated migration file before applying
   - Reset local database and regenerate schema
   - Only viable in development environment

#### Post-Migration Data Fixes

After Phase 1 migration, fix displayOrder defaults:

```typescript
// In a one-time migration script or admin panel
import { db } from '$lib/server/db';
import { categories } from '$lib/schema/categories';
import { sql } from 'drizzle-orm';

// Set displayOrder sequentially for existing categories
await db.execute(sql`
  UPDATE categories
  SET display_order = (
    SELECT COUNT(*)
    FROM categories c2
    WHERE c2.id <= categories.id AND c2.parent_id IS categories.parent_id
  )
  WHERE display_order = 0
`);

---

## Recommended Implementation Order

### Iteration 1: Visual Foundation (Quick Wins)
**Time**: ~2 hours
**Phases**: Phase 1 (Visual Customization)

**Why First**:
- Immediate UX improvement
- Low complexity
- Pattern matches accounts
- No dependencies

**Deliverables**:
- Icon and color fields in database
- Icon picker and color picker in form
- Visual display in category cards and sidebar
- Active/inactive status management

---

### Iteration 2: Core Classification (Foundation)
**Time**: ~3 hours
**Phases**: Phase 2 (Type Classification)

**Why Second**:
- Fundamental for proper budgeting
- Required for accurate reporting
- No external dependencies
- Enables future features

**Deliverables**:
- Category type enum and field
- Type selector in form
- Type-based filtering
- Separate income/expense reporting

---

### Iteration 3: Budget Integration
**Status**: REMOVED - Handled by existing envelope allocations system

This iteration has been eliminated to avoid duplication with the existing envelope allocations system. Budget integration should be implemented via query-layer joins to the `envelopeAllocations` and `budgetCategories` tables.

---

### Iteration 4: Intelligence & Analytics (Enhanced)
**Time**: ~3 hours
**Phases**: Phase 4 (Tax & Analytics)

**Why Fourth**:
- Adds intelligence to existing features
- Tax season value
- Seasonal planning
- Priority-based decisions

**Deliverables**:
- Tax deductibility tracking
- IRS category mapping
- Seasonal patterns
- Spending priority classification
- Expected range tracking

---

### Iteration 5: Polish & Refinement (Completion)
**Time**: ~2 hours
**Phases**: Phase 5 (UI/UX Enhancements)

**Why Last**:
- Brings everything together
- Comprehensive user experience
- Testing and refinement
- Documentation

**Deliverables**:
- All forms updated
- All displays enhanced
- Search and filtering complete
- Analytics visualizations
- User documentation

---

## Benefits of Abstraction

### Consistency Across Entities
- **Unified Patterns**: Visual customization, status management, type classification
- **Predictable API**: Same field names and structures across entities
- **Shared Components**: Reusable icon pickers, color pickers, status toggles
- **Consistent Documentation**: Same concepts apply everywhere

### Improved User Experience
- **Visual Scanning**: Icons and colors reduce cognitive load
- **Quick Identification**: Status and type badges at a glance
- **Better Filtering**: More dimensions to search and filter by
- **Clearer Organization**: Type-based grouping and hierarchy

### Enhanced Analytics & Reporting
- **Income vs Expense Separation**: Proper classification for accurate reports
- **Tax Reporting**: Built-in deductibility tracking
- **Budget Variance**: Category-level budget tracking
- **Seasonal Analysis**: Pattern recognition and forecasting
- **Priority Analysis**: Spending breakdown by importance

### Future Extensibility
- **Easy Entity Addition**: Clear pattern for new entities
- **Consistent Enhancements**: Add features uniformly across entities
- **Shared Infrastructure**: Common services and utilities
- **Plugin Architecture**: Third-party integrations follow same patterns

---

## Technical Considerations

### Performance
- **Indexes**: All frequently queried fields indexed
- **JSON Fields**: Used sparingly, only for complex nested data
- **Computed Fields**: Consider caching calculated values (e.g., total spent)
- **Query Optimization**: Use proper joins and where clauses

### Backward Compatibility
- **Default Values**: All new fields have sensible defaults
- **Optional Fields**: Most fields nullable or optional
- **Migration Strategy**: Incremental, forward-only migrations with backup strategy
- **Data Preservation**: Never lose existing data

### Data Integrity
- **Foreign Keys**: Proper relationships with cascading
- **Constraints**: Validation at database level
- **Transactions**: Atomic operations for complex updates
- **Soft Deletes**: Use deletedAt instead of hard deletes

---

## Testing Strategy

### Unit Tests
- Schema validation tests
- Type checking tests
- Default value tests
- Constraint tests

### Integration Tests
- CRUD operations
- Foreign key relationships
- Cascade operations
- Migration application and verification

### UI Tests
- Form validation
- Visual rendering
- Filter functionality
- Sort operations

### E2E Tests
- Create category with all fields
- Update category fields
- Delete category
- Budget tracking flow
- Tax reporting flow

---

## Documentation Requirements

### User Documentation
- Feature guide for each new field
- Budget setup tutorial
- Tax tracking guide
- Seasonal spending setup

### Developer Documentation
- Schema documentation
- API endpoint documentation
- Component prop documentation
- Migration guide

---

## Success Metrics

### Adoption Metrics
- % of categories with icons/colors set
- % of categories with budget limits
- % of tax-deductible categories marked
- Average fields filled per category

### Usage Metrics
- Budget alert frequency
- Filter usage by type
- Seasonal category usage
- Priority-based searches

### Quality Metrics
- Reduction in miscategorized transactions
- Improvement in budget accuracy
- Tax deduction report usage
- User satisfaction scores

---

## Risks & Mitigation

### Risk: Migration Failures
**Mitigation**:
- Test migrations on copy of production database
- Backup database for recovery (migrations are forward-only)
- Incremental migrations with validation
- Verify schema changes before applying to production

### Risk: Performance Degradation
**Mitigation**:
- Index all query fields
- Monitor query performance
- Optimize N+1 queries
- Consider caching strategies

### Risk: User Confusion
**Mitigation**:
- Clear field labels and help text
- Default values for all fields
- Gradual feature introduction
- Comprehensive documentation

### Risk: Data Inconsistency
**Mitigation**:
- Database constraints
- Application-level validation
- Transaction wrapping
- Regular integrity checks

---

## Next Steps

### Immediate Actions
1. **Review & Approve Plan**: Stakeholder review and approval
2. **Create GitHub Issues**: One issue per phase
3. **Setup Dev Environment**: Database copy for testing
4. **Create Branch**: `feature/category-enhancement`

### Phase 1 Kickoff Checklist
- [ ] Update `src/lib/schema/categories.ts` with Phase 1 fields
- [ ] Run `bun run db:generate` to create migration
- [ ] Review generated migration SQL in `drizzle/` directory
- [ ] Backup database before applying migration
- [ ] Run `bun run db:migrate` to apply migration
- [ ] Verify migration applied correctly
- [ ] Run displayOrder fix script for existing categories
- [ ] Update TypeScript types (auto-generated by Drizzle)
- [ ] Update validation schemas in Zod
- [ ] Create icon picker component (or import from shared)
- [ ] Create color picker component (or import from shared)
- [ ] Update ManageCategoryForm
- [ ] Update category display components
- [ ] Update search/filter components
- [ ] Write tests
- [ ] Update documentation
- [ ] Code review
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production

---

## Appendix

### Related Documentation
- `docs/plans/budget-system-design.md` - Budget system integration
- `src/lib/schema/accounts.ts` - Reference for icon/color implementation
- `src/lib/schema/payees.ts` - Reference for analytics fields
- `src/lib/components/ui/icon-picker/` - Icon picker component

### References
- Drizzle ORM Documentation
- SQLite ALTER TABLE limitations
- Zod validation patterns
- Svelte 5 form patterns

---

**Document Version**: 1.0
**Last Updated**: 2025-09-29
**Author**: Claude Code
**Status**: Ready for Review
