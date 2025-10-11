# Code Reuse and Refactoring Opportunities

**Generated**: 2025-10-10
**Scope**: Codebase-wide analysis of duplication and reuse opportunities
**Status**: Planning

---

## Executive Summary

This document outlines opportunities for code consolidation, standardization, and improved reusability across the budget application. The analysis identifies **~5,000 lines of duplicate or redundant code** that can be consolidated through shared utilities, base classes, and standardized patterns.

### Impact Metrics

| Category | Lines Saved | Maintenance Benefit | Priority |
|----------|-------------|---------------------|----------|
| Component Patterns | ~2,000 | High - DRY principle | **High** |
| Service Layer | ~2,000 | High - Single source of truth | **High** |
| Utilities | ~200 | Medium - Reduced inline code | **Medium** |
| State Management | ~800 | High - Consistency | **High** |
| Query Layer | N/A | High - Bug fixes + standards | **High** |

---

## 1. Component Patterns (UI Layer)

### 1.1 Search Components - HIGH PRIORITY ⚠️

**Impact**: ~2,000 lines of duplicate code
**Effort**: 2-3 days
**Benefit**: Consistent search UX, easier maintenance

#### Current State

Three nearly identical search implementations exist:
- [payees/(components)/search/payee-search-toolbar.svelte](apps/budget/src/routes/payees/(components)/search/payee-search-toolbar.svelte) (457 lines)
- [categories/(components)/search/category-search-toolbar.svelte](apps/budget/src/routes/categories/(components)/search/category-search-toolbar.svelte) (443 lines)
- [budgets/(components)/search/budget-search-toolbar.svelte](apps/budget/src/routes/budgets/(components)/search/budget-search-toolbar.svelte) (114 lines)

#### Shared Component Already Exists! ✅

[lib/components/shared/search/entity-search-toolbar.svelte](apps/budget/src/lib/components/shared/search/entity-search-toolbar.svelte) (255 lines) - supports custom filters via snippets

#### Action Items

1. **Migrate payee search toolbar**
   - Replace with `entity-search-toolbar.svelte`
   - Extract payee-specific filters to snippet
   - Update imports in [routes/payees/+page.svelte](apps/budget/src/routes/payees/+page.svelte)

2. **Migrate category search toolbar**
   - Replace with `entity-search-toolbar.svelte`
   - Extract category-specific filters to snippet
   - Update imports in [routes/categories/+page.svelte](apps/budget/src/routes/categories/+page.svelte)

3. **Migrate budget search toolbar**
   - Already shorter, but should use shared component for consistency
   - Extract budget filters to snippet

**Estimated Savings**: ~850 lines

---

### 1.2 Search Results - HIGH PRIORITY

**Impact**: ~1,100 lines
**Effort**: 2-3 days

#### Current State

- [payees/(components)/search/payee-search-results.svelte](apps/budget/src/routes/payees/(components)/search/payee-search-results.svelte) (340 lines)
- [categories/(components)/search/category-search-results.svelte](apps/budget/src/routes/categories/(components)/search/category-search-results.svelte) (586 lines)
- [budgets/(components)/search/budget-search-results.svelte](apps/budget/src/routes/budgets/(components)/search/budget-search-results.svelte) (338 lines)

#### Shared Component Exists! ✅

[lib/components/shared/search/entity-search-results.svelte](apps/budget/src/lib/components/shared/search/entity-search-results.svelte) (139 lines) - supports custom card rendering via `gridCard` snippet

#### Action Items

1. **Create entity-specific card components**
   - `PayeeCard.svelte` - Extract from payee-search-results (lines 176-325)
   - `CategoryCard.svelte` - Extract from category-search-results (lines 231-440)
   - `BudgetCard.svelte` - Extract from budget-search-results (lines 188-311)

2. **Migrate to shared results component**
   - Use `entity-search-results.svelte` with custom card snippets
   - Keep drag-and-drop logic in category implementation

**Estimated Savings**: ~1,100 lines

---

### 1.3 Data Table Containers - MEDIUM PRIORITY

**Impact**: ~100 lines
**Effort**: 1 day

#### Duplicates

- [routes/payees/(components)/payee-data-table-container.svelte](apps/budget/src/routes/payees/(components)/payee-data-table-container.svelte) (61 lines)
- [routes/categories/(components)/category-data-table-container.svelte](apps/budget/src/routes/categories/(components)/category-data-table-container.svelte) (67 lines)

#### Shared Component Exists! ✅

[lib/components/shared/data-table/entity-data-table-container.svelte](apps/budget/src/lib/components/shared/data-table/entity-data-table-container.svelte) (60 lines)

#### Action Items

- Delete entity-specific containers
- Update imports to use shared container

---

### 1.4 Styling Issues - HIGH PRIORITY (Dark Mode) 🌙

**Impact**: Proper dark mode support
**Effort**: 1-2 days

#### Issue: Hardcoded Colors

Multiple components use hardcoded Tailwind colors instead of theme CSS variables, breaking dark mode:

**Violations**:
- [categories/(components)/search/category-search-results.svelte:87-96](apps/budget/src/routes/categories/(components)/search/category-search-results.svelte#L87-L96) - Priority colors
- [payees/(components)/search/payee-search-results.svelte:88-95](apps/budget/src/routes/payees/(components)/search/payee-search-results.svelte#L88-L95) - Status colors
- [lib/components/budgets/budget-progress.svelte:62-87](apps/budget/src/lib/components/budgets/budget-progress.svelte#L62-L87) - Status badges

**Correct Pattern** (from category-search-results.svelte:513-555):
```css
.drop-zone-overlay {
  background: hsl(var(--accent) / 0.15);
  border: 2px solid hsl(var(--primary) / 0.3);
}
```

#### Action Items

1. **Define semantic color tokens** in theme configuration
   - `--budget-warning` / `--budget-warning-foreground`
   - `--budget-danger` / `--budget-danger-foreground`
   - `--budget-success` / `--budget-success-foreground`
   - `--priority-essential` / `--priority-important` / etc.

2. **Replace hardcoded colors** in ~10 components
   - Use `hsl(var(--semantic-token))` pattern
   - Test in light/dark modes

**Estimated files affected**: 10+ components

---

### 1.5 Minor Component Improvements

#### Repeated Tailwind Classes

**Pattern**: Grid layout repeated 12+ times
```svelte
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
```

**Recommendation**: Create `EntityGrid.svelte` wrapper component

#### Line-Clamp CSS Duplication

**Found in**: 2 files with custom CSS
```css
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}
```

**Fix**: Use Tailwind's built-in `line-clamp-2` utility class

**Estimated savings**: ~50 lines of CSS

---

## 2. Service Layer (Backend)

### 2.1 Base Service Class - HIGH PRIORITY ⭐

**Impact**: ~1,000 lines saved, consistent CRUD patterns
**Effort**: 2-3 days
**Benefit**: New domains inherit all functionality

#### Duplicate CRUD Operations

All services ([accounts/services.ts](apps/budget/src/lib/server/domains/accounts/services.ts), [categories/services.ts](apps/budget/src/lib/server/domains/categories/services.ts), [payees/services.ts](apps/budget/src/lib/server/domains/payees/services.ts), [budgets/services.ts](apps/budget/src/lib/server/domains/budgets/services.ts)) implement identical:
- Create with slug generation (lines 40-88 in accounts)
- Update with conditional slug regeneration (lines 93-127 in accounts)
- Slug uniqueness checking (lines 202-212 in accounts)
- Bulk delete with error collection (lines 307-347 in categories)

#### Recommendation

**Create**: `apps/budget/src/lib/server/shared/base-entity-service.ts`

```typescript
export abstract class BaseEntityService<TEntity, TCreateData, TUpdateData> {
  protected abstract repository: BaseRepository<TEntity, any, any>;
  protected abstract sanitizeName(name: string): string;
  protected abstract sanitizeData(data: TCreateData): Partial<TEntity>;

  protected async createWithSlug(
    data: TCreateData,
    nameExtractor: (data: TCreateData) => string
  ): Promise<TEntity> {
    const sanitizedData = this.sanitizeData(data);
    const name = nameExtractor(data);
    const slug = await this.generateUniqueSlug(slugify(name));
    return await this.repository.create({...sanitizedData, slug});
  }

  protected async executeBulkOperation<T>(
    ids: number[],
    operation: (id: number) => Promise<T>,
    operationName: string
  ): Promise<BulkOperationResult<T>> {
    // Standardized error collection
  }
}
```

#### Action Items

1. Create `BaseEntityService` with common patterns
2. Refactor `AccountService` to extend base
3. Refactor `CategoryService` to extend base
4. Refactor `PayeeService` to extend base
5. Refactor `BudgetService` to extend base

**Estimated savings**: ~1,000 lines

---

### 2.2 Repository Patterns - HIGH PRIORITY

**Impact**: ~500 lines
**Effort**: 1-2 days

#### Duplicate Query Patterns

All repositories implement identical:
- `findBySlug()` ([accounts/repository.ts:48-60](apps/budget/src/lib/server/domains/accounts/repository.ts#L48-L60), [categories/repository.ts:100-108](apps/budget/src/lib/server/domains/categories/repository.ts#L100-L108), [payees/repository.ts:124-132](apps/budget/src/lib/server/domains/payees/repository.ts#L124-L132))
- `isSlugUnique()` / `slugExists()` - inconsistent naming!
- `softDelete()` with slug archiving ([categories/repository.ts:157-188](apps/budget/src/lib/server/domains/categories/repository.ts#L157-L188), [payees/repository.ts:181-210](apps/budget/src/lib/server/domains/payees/repository.ts#L181-L210))
- `searchByName()` ([accounts/repository.ts:118-128](apps/budget/src/lib/server/domains/accounts/repository.ts#L118-L128), [categories/repository.ts:232-246](apps/budget/src/lib/server/domains/categories/repository.ts#L232-L246))

#### Recommendation

**Extend**: `apps/budget/src/lib/server/shared/database/base-repository.ts`

Add methods:
- `findBySlug(slug: string)`
- `isSlugUnique(slug: string, excludeId?: number)`
- `softDeleteWithSlugArchive(id: number)`
- `searchByName(query: string, options?: {...})`

#### Action Items

1. Add common methods to `BaseRepository`
2. Remove duplicate implementations from child repositories
3. Standardize method names (`isSlugUnique` everywhere)

**Estimated savings**: ~500 lines

---

### 2.3 Statistics Aggregation - MEDIUM PRIORITY

**Impact**: ~200 lines
**Effort**: 1 day

#### Duplicate SQL Patterns

Both [categories/repository.ts:281-301](apps/budget/src/lib/server/domains/categories/repository.ts#L281-L301) and [payees/repository.ts:295-358](apps/budget/src/lib/server/domains/payees/repository.ts#L295-L358) implement:
- `COALESCE(SUM(...), 0)`
- `COALESCE(AVG(...), 0)`
- `MAX(date)` for last transaction
- `count(id)` for transaction count

#### Recommendation

**Create**: `apps/budget/src/lib/server/shared/database/query-builders.ts`

```typescript
export class TransactionStatsBuilder {
  static buildBasicStats(foreignKeyField: any, foreignKeyValue: number) {
    return db.select({
      transactionCount: count(transactions.id),
      totalAmount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      avgAmount: sql<number>`COALESCE(AVG(${transactions.amount}), 0)`,
      // ... all common aggregations
    })
    .from(transactions)
    .where(and(eq(foreignKeyField, foreignKeyValue), isNull(transactions.deletedAt)));
  }
}
```

---

### 2.4 Validation Consolidation - HIGH PRIORITY

**Impact**: Eliminate client-server duplication
**Effort**: 2 days

#### Issue: Duplicate Validation Rules

**Server** ([server/shared/validation/input-sanitizer.ts:66-74](apps/budget/src/lib/server/shared/validation/input-sanitizer.ts#L66-L74)):
```typescript
static sanitizeAccountName(name: string): string {
  return this.sanitizeText(name, {
    required: true,
    minLength: VALIDATION_CONFIG.ACCOUNT.NAME.MIN,
    maxLength: VALIDATION_CONFIG.ACCOUNT.NAME.MAX,
  });
}
```

**Client** ([schema/superforms/accounts.ts:7-12](apps/budget/src/lib/schema/superforms/accounts.ts#L7-L12)):
```typescript
name: z.string()
  .min(2, "Account name must be at least 2 characters")
  .max(50, "Account name must be less than 50 characters")
```

Rules are defined twice with potentially different values!

#### Recommendation

**Create**: `apps/budget/src/lib/shared/validation/common-schemas.ts`

```typescript
import { z } from "zod";
import { VALIDATION_CONFIG } from "$lib/server/config/validation";

export const commonSchemas = {
  accountName: z.string()
    .min(VALIDATION_CONFIG.ACCOUNT.NAME.MIN)
    .max(VALIDATION_CONFIG.ACCOUNT.NAME.MAX)
    .regex(SANITIZATION_PATTERNS.NAME_ALLOWED),

  description: z.string()
    .max(500)
    .optional()
    .nullable(),
};
```

Use in both client superforms AND server validation.

---

## 3. Utility Functions

### 3.1 Number Formatting - HIGH PRIORITY

**Impact**: 40+ inline implementations
**Effort**: 1 day

#### Issues

**Duplicate `formatCurrency`** in 2 files:
- [lib/utils/formatters.ts:16-18](apps/budget/src/lib/utils/formatters.ts#L16-L18) ✅ Correct
- [lib/utils/account-display.ts:79-84](apps/budget/src/lib/utils/account-display.ts#L79-L84) ❌ Duplicate

**Inline percentage formatting**: 40+ instances of `.toFixed(1)%` pattern
- Should use `percentageFormatter.format()` from [lib/utils/formatters.ts:20-22](apps/budget/src/lib/utils/formatters.ts#L20-L22)

**Examples**:
- [routes/budgets/+page.svelte:337](apps/budget/src/routes/budgets/+page.svelte#L337)
- [lib/components/budgets/budget-progress-charts.svelte:198](apps/budget/src/lib/components/budgets/budget-progress-charts.svelte#L198)

#### Action Items

1. Remove duplicate `formatCurrency` from account-display.ts
2. Replace all `.toFixed(1)%` with `percentageFormatter.format(value / 100)`
3. Create search/replace pattern for the conversion

---

### 3.2 String Manipulation - HIGH PRIORITY

**Impact**: 40+ capitalize patterns
**Effort**: 1 day

#### Missing Utilities

**Pattern**: 40+ instances of `.charAt(0).toUpperCase() + .slice(1)`

**Examples**:
- [routes/budgets/(data)/columns.svelte.ts:122](apps/budget/src/routes/budgets/(data)/columns.svelte.ts#L122)
- [routes/categories/(components)/search/category-search-toolbar-v2.svelte:71](apps/budget/src/routes/categories/(components)/search/category-search-toolbar-v2.svelte#L71)

#### Recommendation

**Add to**: `apps/budget/src/lib/utils/string.ts` (NEW FILE)

```typescript
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function titleCase(str: string): string {
  return str.split(' ').map(capitalize).join(' ');
}
```

---

### 3.3 Math Utilities - MEDIUM PRIORITY

**Impact**: 20+ clamp patterns
**Effort**: 4 hours

#### Repeated Pattern

`Math.max(0, Math.min(100, ...)` appears 20+ times:
- [lib/utils/colors.ts:319](apps/budget/src/lib/utils/colors.ts#L319) - opacity
- [lib/components/ui/progress/progress.svelte:19](apps/budget/src/lib/components/ui/progress/progress.svelte#L19) - percentage
- [lib/server/domains/budgets/period-manager.ts:446](apps/budget/src/lib/server/domains/budgets/period-manager.ts#L446) - score

#### Recommendation

**Create**: `apps/budget/src/lib/utils/math.ts`

```typescript
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clampPercentage(value: number): number {
  return clamp(value, 0, 100);
}

export function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return clampPercentage((value / total) * 100);
}
```

---

### 3.4 Array Operations - MEDIUM PRIORITY

**Impact**: 50+ filter patterns
**Effort**: 4 hours

#### Repeated Pattern

`.filter(...).length` without caching (50+ instances):
- [routes/+page.svelte:73](apps/budget/src/routes/+page.svelte#L73) - `accounts.filter(a => !a.closed).length`
- [lib/server/domains/transactions/services.ts:603-605](apps/budget/src/lib/server/domains/transactions/services.ts#L603-L605) - counting by status

#### Recommendation

**Add to**: `apps/budget/src/lib/utils/array.ts` (NEW FILE)

```typescript
export function countBy<T>(array: T[], predicate: (item: T) => boolean): number {
  return array.filter(predicate).length;
}

export function countByProperty<T, K extends keyof T>(
  array: T[],
  key: K,
  value: T[K]
): number {
  return array.filter(item => item[key] === value).length;
}

export function includesIgnoreCase(
  text: string | null | undefined,
  query: string
): boolean {
  if (!text || !query) return false;
  return text.toLowerCase().includes(query.toLowerCase());
}
```

---

### 3.5 Other Utilities

#### File Size Formatting

**Duplicate in 2 files**:
- [lib/components/import/file-upload-dropzone.svelte:42](apps/budget/src/lib/components/import/file-upload-dropzone.svelte#L42)
- [lib/server/import/utils.ts:319](apps/budget/src/lib/server/import/utils.ts#L319)

**Add to**: [lib/utils/formatters.ts](apps/budget/src/lib/utils/formatters.ts)

```typescript
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
```

---

## 4. State Management

### 4.1 Search State Duplication - CRITICAL ⚠️

**Impact**: ~800 lines of duplicate code
**Effort**: 2 days
**Benefit**: Consistent search behavior

#### Issue

Three nearly identical search state managers:
- [lib/states/ui/payee-search.svelte.ts](apps/budget/src/lib/states/ui/payee-search.svelte.ts)
- [lib/states/ui/budget-search.svelte.ts](apps/budget/src/lib/states/ui/budget-search.svelte.ts)
- [lib/states/ui/category-search.svelte.ts](apps/budget/src/lib/states/ui/category-search.svelte.ts)

#### Shared Component Already Exists! ✅

[lib/components/shared/search/entity-search-state.svelte.ts](apps/budget/src/lib/components/shared/search/entity-search-state.svelte.ts) - Generic `EntitySearchState<TEntity, TFilters, TSortBy>` exists but is **NOT USED** by the three managers above!

#### Action Items

1. **Refactor** payee-search.svelte.ts to extend `EntitySearchState`
2. **Refactor** budget-search.svelte.ts to extend `EntitySearchState`
3. **Refactor** category-search.svelte.ts to extend `EntitySearchState`
4. **Fix** incorrect `$derived(() => {...})` syntax - should be `$derived.by(() => {...})`

**Example refactor**:
```typescript
import { EntitySearchState } from '$lib/components/shared/search/entity-search-state.svelte';

class PayeeSearchStateManager extends EntitySearchState<Payee, PayeeSearchFilters, 'name' | 'lastTransaction'> {
  // Only payee-specific customization
  constructor() {
    super({
      defaultViewMode: 'list',
      defaultSortBy: 'name',
      defaultSortOrder: 'asc'
    });
  }
}
```

---

### 4.2 Base Entity State - MEDIUM PRIORITY

**Impact**: ~200 lines
**Effort**: 1 day

#### Issue

All entity states ([accounts.svelte.ts](apps/budget/src/lib/states/entities/accounts.svelte.ts), [payees.svelte.ts](apps/budget/src/lib/states/entities/payees.svelte.ts), [categories.svelte.ts](apps/budget/src/lib/states/entities/categories.svelte.ts)) implement 95% identical code:
- `SvelteMap<number, Entity>` storage
- `getById`, `findBy`, `filterBy` methods
- `add`, `update`, `remove` methods
- Context management pattern

#### Recommendation

**Create**: `apps/budget/src/lib/states/entities/base-entity-state.svelte.ts`

```typescript
export abstract class BaseEntityState<T extends { id: number }> {
  entities = $state(new SvelteMap<number, T>());

  init(entities: T[]) { /* shared */ }
  get all(): T[] { /* shared */ }
  getById(id: number): T | undefined { /* shared */ }
  // ... other shared methods
}
```

Then entity states extend and add only domain-specific methods.

---

### 4.3 Persistence Pattern - LOW PRIORITY

**Impact**: Consistency
**Effort**: 1 day

#### Issue

Three different localStorage persistence patterns:
1. **createLocalStorageState** utility (search states) ✅ Best
2. Manual localStorage (AccountsState) ❌ Verbose
3. WizardStore custom serialization ❌ Inconsistent

#### Recommendation

Standardize on `createLocalStorageState` utility from [lib/utils/local-storage.svelte.ts](apps/budget/src/lib/utils/local-storage.svelte.ts)

---

### 4.4 Svelte 5 Syntax Fixes - CRITICAL 🐛

**Impact**: Correctness
**Effort**: 1 hour

#### Bug

Search states use incorrect `$derived` syntax:

**Wrong**:
```typescript
hasActiveFilters = $derived(() => {
  return Object.keys(this.filters).length > 0;
});
```

This creates a **function** that returns the value, not a reactive value.

**Correct**:
```typescript
// Option 1: Direct expression
hasActiveFilters = $derived(Object.keys(this.filters).length > 0);

// Option 2: Complex computation
hasActiveFilters = $derived.by(() => {
  return Object.keys(this.filters).length > 0;
});
```

#### Files to Fix

- [lib/states/ui/payee-search.svelte.ts:45-57](apps/budget/src/lib/states/ui/payee-search.svelte.ts#L45-L57)
- [lib/states/ui/budget-search.svelte.ts:50-64](apps/budget/src/lib/states/ui/budget-search.svelte.ts#L50-L64)
- [lib/states/ui/category-search.svelte.ts:54-67](apps/budget/src/lib/states/ui/category-search.svelte.ts#L54-L67)

---

## 5. Query/tRPC Layer

### 5.1 Critical Bug - IMMEDIATE FIX REQUIRED 🚨

**Impact**: Runtime errors
**Effort**: 10 minutes
**Priority**: **CRITICAL**

#### Issue

[lib/trpc/routes/transactions.ts](apps/budget/src/lib/trpc/routes/transactions.ts) calls `cachePatterns.invalidateQueries()` which **doesn't exist**!

**Locations**:
- Line 465-470
- Line 491-496
- Line 509

**The method doesn't exist in** [lib/query/_client.ts](apps/budget/src/lib/query/_client.ts)

#### Fix

Add method to `_client.ts`:
```typescript
invalidateQueries: (queryKey: readonly unknown[]) => {
  queryClient.invalidateQueries({
    queryKey,
    refetchType: 'active',
  });
}
```

---

### 5.2 Error Handling Standardization - HIGH PRIORITY

**Impact**: Consistent error responses
**Effort**: 1 day

#### Issue

Three different error transformation patterns:
1. **budgets.ts** - Centralized `translateDomainError()` function ✅ Best
2. **transactions.ts** - `statusCode` checking ❌ Fragile
3. **payees.ts** - `instanceof` checking ❌ Incomplete

#### Recommendation

**Create**: `apps/budget/src/lib/trpc/shared/errors.ts`

Extract budgets' `translateDomainError` to shared utility, use everywhere.

#### Action Items

1. Create shared error transformer
2. Replace error handling in transactions.ts
3. Replace error handling in payees.ts
4. Apply to all other route files

---

### 5.3 File Organization - MEDIUM PRIORITY

**Impact**: Maintainability
**Effort**: 2 hours

#### Issue

[lib/trpc/routes/payees.ts](apps/budget/src/lib/trpc/routes/payees.ts) is **2,159 lines** - 5x larger than any other route file!

Contains:
- Core CRUD (lines 1-465)
- Intelligence routes (lines 466-887)
- ML coordination (lines 888-1117)
- Contact management (lines 1118-1421)
- Subscription detection (lines 1422-1808)
- Bulk operations (lines 1809-2158)

#### Recommendation

Split into focused files:
- `payees-core.ts` - Basic CRUD and analytics
- `payees-intelligence.ts` - Category learning + ML
- `payees-contact.ts` - Contact management
- `payees-subscription.ts` - Subscription detection
- `payees-bulk.ts` - Bulk operations

---

### 5.4 Query Options Standardization - MEDIUM PRIORITY

**Impact**: Consistency
**Effort**: 4 hours

#### Issue

Manual `staleTime` values instead of presets:
- accounts.ts uses `queryPresets.static` ✅
- All other files use manual values like `staleTime: 30 * 1000` ❌

Different staleTime for similar data:
- List queries: 10min (accounts) vs 30s (categories)
- Detail queries: 60s (consistent)
- Analytics: 60s (budgets) vs 5min (payees)

#### Recommendation

**Add to** [lib/query/_client.ts](apps/budget/src/lib/query/_client.ts):

```typescript
export const queryPresets = {
  static: { staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000 },
  details: { staleTime: 60 * 1000, gcTime: 5 * 60 * 1000 },
  analytics: { staleTime: 5 * 60 * 1000, gcTime: 15 * 60 * 1000 },
  transient: { staleTime: 30 * 1000, gcTime: 2 * 60 * 1000 },
};
```

Use consistently across all query definitions.

---

## Implementation Roadmap

### Phase 1: Critical Fixes (1 day)

1. ✅ Fix `cachePatterns.invalidateQueries()` bug in transactions.ts
2. ✅ Fix `$derived` syntax in search states
3. ✅ Create shared error transformer
4. ✅ Replace hardcoded colors with theme variables

### Phase 2: High-Impact Consolidation (1 week)

1. ✅ Migrate search toolbars to shared component (~850 lines)
2. ✅ Migrate search results to shared component (~1,100 lines)
3. ✅ Create BaseEntityService (~1,000 lines)
4. ✅ Extend BaseRepository with common methods (~500 lines)
5. ✅ Refactor search states to use EntitySearchState (~800 lines)

**Total savings after Phase 2**: ~4,250 lines

### Phase 3: Utilities & Refinement (3 days)

1. ✅ Create string manipulation utilities
2. ✅ Create math utilities
3. ✅ Create array operation utilities
4. ✅ Fix number formatting duplication
5. ✅ Consolidate validation schemas

### Phase 4: Remaining Improvements (2 days)

1. ✅ Create BaseEntityState
2. ✅ Split payees.ts into focused files
3. ✅ Standardize query options
4. ✅ Create statistics query builder

---

## Testing Strategy

After each refactoring phase:

1. **TypeScript compilation**: `bunx tsc --noEmit`
2. **Svelte check**: `bunx svelte-check`
3. **Manual testing**: Search, CRUD operations, analytics
4. **Dark mode testing**: Verify theme color usage

---

## Metrics & Success Criteria

### Code Reduction

| Phase | Lines Removed | Files Affected |
|-------|---------------|----------------|
| Phase 1 | ~50 | 5 files |
| Phase 2 | ~4,250 | 20+ files |
| Phase 3 | ~200 | 30+ files |
| Phase 4 | ~300 | 10+ files |
| **Total** | **~4,800** | **65+ files** |

### Maintainability Improvements

- ✅ Single source of truth for common patterns
- ✅ New features inherit base functionality
- ✅ Bug fixes propagate to all implementations
- ✅ Consistent UX across all entity types
- ✅ Proper dark mode support

---

## References

### Existing Shared Components (Underutilized)

- [lib/components/shared/search/entity-search-toolbar.svelte](apps/budget/src/lib/components/shared/search/entity-search-toolbar.svelte)
- [lib/components/shared/search/entity-search-results.svelte](apps/budget/src/lib/components/shared/search/entity-search-results.svelte)
- [lib/components/shared/search/entity-search-state.svelte.ts](apps/budget/src/lib/components/shared/search/entity-search-state.svelte.ts)
- [lib/components/shared/data-table/entity-data-table-container.svelte](apps/budget/src/lib/components/shared/data-table/entity-data-table-container.svelte)

These exist but are not consistently used!

### Base Classes to Create

- `apps/budget/src/lib/server/shared/base-entity-service.ts`
- `apps/budget/src/lib/states/entities/base-entity-state.svelte.ts`
- `apps/budget/src/lib/trpc/shared/errors.ts`

### Utility Files to Create

- `apps/budget/src/lib/utils/string.ts`
- `apps/budget/src/lib/utils/math.ts`
- `apps/budget/src/lib/utils/array.ts`
- `apps/budget/src/lib/shared/validation/common-schemas.ts`
- `apps/budget/src/lib/server/shared/database/query-builders.ts`

---

**End of Document**
