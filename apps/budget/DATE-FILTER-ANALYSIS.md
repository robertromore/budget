# Date Filter Analysis - What Actually Happened

## TL;DR

**The date filter operators NEVER had a UI.** The column definition has `availableFilters` metadata, and the filter functions ARE implemented, but there's no UI component to let users select which operator to use. The current implementation only supports multi-select ("in" operator).

---

## Git History Investigation

### What I Found

1. **The component was created in the Svelte 5 overhaul (commit `34ce87e`)**
   - Replaced old `DateFilter.svelte` and `DateRangeFilter.svelte` components
   - Those old components were simple calendar pickers (single date or range)
   - They had NO operator selection either

2. **The current component has ALWAYS been multi-select only**
   - From creation (`97e80e0` - Mar 30, 2025) to now
   - Uses `DataTableFacetedFilter` wrapper (generic multi-select component)
   - Shows list of date options with checkboxes
   - Added advanced date dialog later (`20be022`)

3. **The column definition has ALWAYS specified operators**
   ```typescript
   availableFilters: [
     { id: "dateIn", label: "in" },
     { id: "dateBefore", label: "before" },
     { id: "dateAfter", label: "after" },
   ],
   ```

4. **The filter functions ARE fully implemented**
   - `dateIn` - checks if transaction date matches any selected date/period
   - `dateBefore` - checks if transaction is before any selected date
   - `dateAfter` - checks if transaction is after any selected date
   - `dateOn` - checks if transaction matches exact date interval
   - All support special date formats (`month:2024-01`, `quarter:2024-01`, etc.)

---

## The Disconnect

### What EXISTS:
- ✅ Filter function implementations ([filters.svelte.ts:84-130](filters.svelte.ts#L84-L130))
- ✅ Column metadata defining operators ([columns.svelte.ts:234-247](columns.svelte.ts#L234-L247))
- ✅ Multi-select date filter UI component

### What's MISSING:
- ❌ UI to SELECT which operator to use
- ❌ Single date input for "before"/"after" operators
- ❌ Date range input for "between" operator

---

## Current Behavior

### How It Works Now:

1. User clicks "Date" filter button
2. Component shows a multi-select popover with date options
3. User can check multiple dates (works like category/payee filters)
4. The column's `filterFn` is hardcoded to `"dateAfter"` ([columns.svelte.ts:220](columns.svelte.ts#L220))
5. The `dateAfter` filter function receives a `Set<string>` of selected dates
6. It returns `true` if the transaction date is AFTER ANY of the selected dates

### The Problem:

The `filterFn` is fixed at column definition time:
```typescript
filterFn: "dateAfter" as FilterFnOption<TransactionsFormat>,
```

This means:
- Users can only use "after" logic
- Can't switch to "before" or "in" without changing code
- The `availableFilters` metadata is purely documentation
- Multi-select + "after" is confusing UX (what does "after date1 OR date2" mean?)

---

## Why The Amount Filter Works Differently

The amount filter ([data-table-faceted-filter-amount.svelte](data-table-faceted-filter-amount.svelte)) was **designed from the start** with operator support:

1. **Has operator dropdown** - User can select equals/greater/less/between/not
2. **Dynamic input** - Shows appropriate input(s) based on operator
3. **Updates filterFn** - Changes `column.columnDef.filterFn` when operator changes
4. **Structured filter value** - Uses `AmountFilterValue` type with operator field

```typescript
type AmountFilterValue = {
  type: string;  // 'equals', 'greaterThan', etc.
  value?: number;
  min?: number;
  max?: number;
};
```

---

## The Real Issue

**The date filter was built as a "faceted" filter (multi-select from list) when it should have been built as a "comparison" filter (operator + value).**

### Comparison:

| Feature | Category Filter | Amount Filter | Date Filter (Current) | Date Filter (Needed) |
|---------|----------------|---------------|----------------------|----------------------|
| Type | Faceted | Comparison | Faceted | Comparison |
| UI | Multi-select | Operator + Input | Multi-select | Operator + Input |
| Operators | None | equals/gt/lt/between | None | in/before/after/between |
| Filter Value | `Set<id>` | `{type, value}` | `Set<date>` | `{operator, value/values}` |
| Dynamic filterFn | No | Yes | No | Yes |

---

## What Needs to Happen

### Option 1: Add Operator UI (Recommended)

Create a new component similar to amount filter:

```svelte
<div class="flex">
  <Badge>Date</Badge>

  <!-- Operator dropdown -->
  <Popover.Root>
    <Button>{activeOperator}</Button>
    <!-- in, before, after, between -->
  </Popover.Root>

  <!-- Dynamic input based on operator -->
  {#if operator === 'in'}
    <!-- Multi-select popover (current behavior) -->
  {:else if operator === 'before' || operator === 'after'}
    <!-- Single date input -->
  {:else if operator === 'between'}
    <!-- Two date inputs (from/to) -->
  {/if}

  <!-- Clear button -->
</div>
```

### Option 2: Remove Operator Metadata (Not Recommended)

Remove the misleading `availableFilters` from column definition since they're not actually available in the UI.

### Option 3: Keep As-Is with Documentation

Document that date filter only supports "after" operator and is multi-select.

---

## Implementation Notes

### Filter Value Structure

All current filter functions expect `Set<string>` as the filter value:

```typescript
dateBefore: (row, columnId, filterValue: Set<string>) => {
  return filterValue.size === 0 ? true
    : Array.from(filterValue.values()).some(date =>
        compareDate(row.original.date, date) < 0
      );
}
```

This means:
- Multiple values are treated as OR logic
- "before date1 OR date2 OR date3" → matches if before ANY of them
- "after date1 OR date2 OR date3" → matches if after ANY of them
- "in date1 OR date2 OR date3" → matches if equal to ANY of them

### Special Date Formats

The filter functions support special date formats:
- `2024-01-15` - specific day
- `month:2024-01-01` - entire month
- `quarter:2024-01-01` - entire quarter (3 months)
- `half-year:2024-01-01` - half year (6 months)
- `year:2024-01-01` - entire year

These are created by the advanced date dialog.

### Why Multi-Select Makes Sense for "in" But Not "before"/"after"

**"in" operator (includes):**
- Multi-select: ✅ Makes sense
- "Show transactions from Jan, Mar, or June"
- OR logic is intuitive

**"before" operator:**
- Multi-select: ❌ Confusing
- "Show transactions before Jan 1 OR March 1 OR June 1"
- Would match anything before June 1 (the latest date)
- Better UX: Single date picker

**"after" operator:**
- Multi-select: ❌ Confusing
- "Show transactions after Jan 1 OR March 1 OR June 1"
- Would match anything after Jan 1 (the earliest date)
- Better UX: Single date picker

**"between" operator:**
- Multi-select: ❌ Doesn't make sense
- Need exactly two dates (from/to)
- Better UX: Two date pickers

---

## Recommended Solution

Implement Option 1 with the following structure:

```typescript
type DateFilterValue =
  | { operator: 'in'; values: Set<string> }        // Multi-select (current)
  | { operator: 'before'; date: string }           // Single date
  | { operator: 'after'; date: string }            // Single date
  | { operator: 'between'; from: string; to: string }; // Date range
```

This provides:
1. **Backward compatibility** - "in" operator maintains current multi-select behavior
2. **Intuitive UX** - Single inputs for before/after, range for between
3. **Type safety** - Discriminated union prevents invalid states
4. **Uses existing filter functions** - Just changes how filterValue is structured
5. **Matches amount filter UX** - Consistent operator-based filtering

---

## Why This Matters

**Current state is confusing:**
- Column says "available filters: in, before, after"
- UI only shows checkbox list
- No way to tell what logic is being used
- Hard-coded to "after" which doesn't match multi-select UX

**With operator UI:**
- User can see and change which comparison to use
- UI adapts to selected operator (multi-select vs single date vs range)
- Consistent with amount filter patterns
- Actually uses the defined `availableFilters` metadata

---

## Conclusion

This wasn't a regression - **the operator UI never existed**. The component was built as a multi-select faceted filter (like categories/payees) but the column was defined expecting comparison operators (like amount). The solution I provided in the refactored component adds the missing operator UI to match the column's expectations.
