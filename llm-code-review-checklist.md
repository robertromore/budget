# LLM Code Review Checklist

This document outlines routine checks that should be performed when writing or modifying code in this codebase.

## Utility Functions

### Before Writing New Code

- [ ] **Search for existing utilities** before implementing common functionality
  - Date utilities: `src/lib/utils/dates.ts`
  - Formatting utilities: `src/lib/utils/formatters.ts`
  - Slug utilities: `src/lib/utils/slug-utils.ts`
  - String utilities: Check for existing helpers before writing string manipulation

- [ ] **Use fresh dates, not stale constants**
  - Use `today(timezone)` from `@internationalized/date` for current date calculations
  - Avoid module-level date constants like `currentDate` in long-running server code
  - Example: `const todayDate = today(defaultTimezone);`

- [ ] **Use existing date parsing/formatting**
  - `parseISOString(dateStr)` - Parse ISO date strings to `DateValue`
  - `toISOString(dateValue)` - Convert `DateValue` to ISO string
  - Handle timestamp formats: `dateStr.split("T")[0]` before parsing if needed

### When Creating New Utilities

- [ ] **Consider reusability** - If writing similar code in multiple places, extract to a utility
- [ ] **Add to appropriate file** - Place utilities in the correct `src/lib/utils/` file
- [ ] **Document the function** - Add JSDoc comments explaining purpose and usage
- [ ] **Export properly** - Ensure the function is exported from the module

## Import Management

### After Making Changes

- [ ] **Remove unused imports** - Check that all imports are actually used
- [ ] **Clean up aliased imports** - Remove aliases if the original name is no longer needed
- [ ] **Verify import paths** - Use `$lib/` aliases consistently

### Common Import Patterns

```typescript
// Date utilities
import { parseISOString, toISOString, timezone } from "$lib/utils/dates";
import { CalendarDate, type DateValue, today } from "@internationalized/date";

// Toast notifications (use interceptor, not direct svelte-sonner)
import { toast } from "$lib/utils/toast-interceptor";

// Query layer
import { rpc } from "$lib/query";
import { cachePatterns, queryClient } from "$lib/query/_client";
```

## Cache Invalidation

### When Modifying Data

- [ ] **Invalidate all affected query keys** - Consider all queries that display the modified data
- [ ] **Check for "related" queries** - Account pages use `["budgets", "related"]` in addition to `["budgets", "list"]` and `["budgets", "account"]`
- [ ] **Use consistent invalidation patterns**:
  ```typescript
  cachePatterns.invalidatePrefix(budgetKeys.lists());
  cachePatterns.invalidatePrefix(["budgets", "account"]);
  cachePatterns.invalidatePrefix(["budgets", "related"]);
  ```

### Query Key Patterns to Remember

| Query | Key Pattern |
|-------|-------------|
| Budget lists | `["budgets", "list", ...]` |
| Budgets by account | `["budgets", "account", accountId]` |
| Related budgets (grouped) | `["budgets", "related", accountId]` |
| Recommendations | `["budgets", "recommendations", ...]` |

## Type Safety

- [ ] **Avoid `any` types** - Use proper typing or `unknown` with type guards
- [ ] **Check for type errors** - Run `bun run check` before committing
- [ ] **Handle nullable values** - Use optional chaining and nullish coalescing appropriately

## Code Organization

### Class Methods

- [ ] **Place methods in correct class** - Verify new methods are inside the intended class, not accidentally outside
- [ ] **Check method visibility** - Use `private` for internal helpers

### Variable Declarations

- [ ] **Avoid redeclaring variables** - Check for existing declarations in the same scope
- [ ] **Use const where possible** - Only use `let` when reassignment is needed

## Console Statements

- [ ] **Remove debug console.log statements** before committing
- [ ] **Keep console.error/warn for actual error handling**

## Navigation

- [ ] **Use relative paths with `goto`** - Never use full URLs with `goto()`
  ```typescript
  // Correct
  goto(url.pathname + url.search, { ... });

  // Incorrect - will error with external URLs
  goto(url.toString(), { ... });
  ```

## Svelte 5 Patterns

- [ ] **Use runes correctly**
  - `$state()` for reactive state
  - `$derived()` for computed values (prefer over `$effect` when possible)
  - `$props()` for component props
  - `$effect()` for side effects only

- [ ] **Use correct icon imports**
  ```typescript
  // Correct
  import Bell from "@lucide/svelte/icons/bell";

  // Incorrect for this codebase
  import { Bell } from "lucide-svelte";
  ```

## Testing Considerations

- [ ] **Verify UI updates** - After mutations, ensure the UI reflects changes without requiring a full refresh
- [ ] **Test edge cases** - Consider empty states, error states, and boundary conditions
