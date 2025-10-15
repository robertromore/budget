# HSA Expense Table Upgrade Plan

**Goal**: Upgrade HSA expenses table to match the full-featured transactions table with sorting, filtering, grouping, searching, views, and bulk actions.

**Status**: In Progress

---

## Current State Analysis

### Transactions Table (`/accounts/[slug]`)
✅ **Has:**
- TanStack Table with DataTable component
- Sorting, filtering, grouping, pagination
- Column visibility controls
- Search functionality
- Views system (saved table configurations)
- Bulk actions (delete multiple)
- Row selection
- Date filters with faceted options
- Editable cells (inline editing)
- Skeleton loading states
- Toolbar with filters and actions
- Pagination controls

### HSA Expenses Table (`/hsa/[slug]`)
❌ **Missing:**
- Basic HTML `<table>` only
- Only tax year dropdown filter
- No sorting, filtering, search
- No views system
- No bulk actions
- Manual row rendering
- No inline editing
- No pagination

✅ **Has:**
- Claim status badge with dropdown (unique to HSA)
- Claim management dialog
- Tax year filtering

---

## Implementation Phases

### Phase 1: Data Table Infrastructure ⏳
Create foundational files for TanStack Table integration

#### 1.1 Expense Columns Definition
**File**: `src/routes/hsa/[slug]/(data)/columns.svelte.ts`
**Purpose**: Define all table columns with types, formatting, and cell components

**Columns**:
- **select** - Checkbox for row selection
- **date** - Service date (editable, sortable, filterable)
- **provider** - Medical provider name (editable, sortable, filterable)
- **patientName** - Patient name (editable, sortable, filterable)
- **expenseType** - Type of medical expense (editable, sortable, filterable)
- **diagnosis** - Diagnosis/reason (optional)
- **treatment** - Treatment description (optional)
- **amount** - Total expense amount (editable, sortable)
- **insuranceCovered** - Amount covered by insurance (editable)
- **outOfPocket** - Out of pocket amount (calculated, sortable)
- **status** - Claim status with dropdown (unique feature)
- **actions** - Edit, delete, manage claims, add receipt

**Features per column**:
- Sortable header
- Filterable (where applicable)
- Editable cells with validation
- Custom cell renderers
- Tooltips for truncated content

#### 1.2 Table State Management
**Directory**: `src/routes/hsa/[slug]/(data)/`

Create state files (pattern from transactions table):
- **filters.svelte.ts** - Column filtering, search, date ranges
- **pagination.svelte.ts** - Page index, page size, total counts
- **selection.svelte.ts** - Selected rows, select all
- **sorts.svelte.ts** - Sort column, sort direction
- **visibility.svelte.ts** - Hidden/visible columns
- **groups.svelte.ts** - Group by column
- **expanded.svelte.ts** - Expanded groups/rows
- **pinning.svelte.ts** - Pinned columns (left/right)

All use Svelte 5 `$state` runes for reactivity.

#### 1.3 ExpenseTableContainer Component
**File**: `src/routes/hsa/[slug]/(components)/expense-table-container.svelte`

**Responsibilities**:
- Wrapper around ExpenseDataTable
- Handle loading states with ExpenseSkeleton
- Pass data and callbacks to DataTable
- Manage queries and mutations

**Props**:
```typescript
{
  isLoading: boolean;
  expenses: MedicalExpense[];
  hsaAccountId: number;
  table?: TTable<ExpenseFormat>;
  views?: View[];
  onEdit?: (expense: ExpenseFormat) => void;
  onDelete?: (expense: ExpenseFormat) => void;
  onBulkDelete?: (expenses: ExpenseFormat[]) => void;
  updateExpenseData?: (id: number, field: string, value: unknown) => Promise<void>;
}
```

#### 1.4 ExpenseDataTable Component
**File**: `src/routes/hsa/[slug]/(components)/expense-data-table.svelte`

**Core TanStack Table implementation**:
- Initialize table with `createSvelteTable`
- Configure all table features (sorting, filtering, pagination, etc.)
- Render table with proper structure
- Handle row selection
- Handle inline editing
- Integrate toolbar and pagination components

**Table Features**:
```typescript
getCoreRowModel(),
getFilteredRowModel(),
getPaginationRowModel(),
getSortedRowModel(),
getFacetedRowModel(),
getFacetedUniqueValues(),
getGroupedRowModel(),
getExpandedRowModel()
```

#### 1.5 ExpenseTableToolbar Component
**File**: `src/routes/hsa/[slug]/(components)/expense-table-toolbar.svelte`

**Layout** (left to right):
1. **Search Input** - Search across provider, patient, diagnosis, notes
2. **Filters**:
   - Expense Type (multi-select faceted filter)
   - Provider (multi-select faceted filter)
   - Patient (multi-select faceted filter)
   - Status (multi-select faceted filter)
   - Date Range (from/to picker)
   - Tax Year (dropdown - preserve existing functionality)
3. **Views Selector** - Dropdown to load/save view configurations
4. **Column Visibility** - Toggle column visibility
5. **Actions**:
   - Add Expense button
   - Export button (CSV)
   - Bulk actions (when rows selected)

#### 1.6 ExpenseTablePagination Component
**File**: `src/routes/hsa/[slug]/(components)/expense-table-pagination.svelte`

**Display**:
- Total rows count
- Current page info (e.g., "Showing 1-10 of 50")
- Rows per page selector (10, 20, 50, 100)
- Previous/Next page buttons
- First/Last page buttons
- Page number display

#### 1.7 Additional Components

**ExpenseSkeleton Component**
**File**: `src/routes/hsa/[slug]/(components)/expense-skeleton.svelte`
- Loading placeholder with shimmer effect
- Match table structure
- Configurable row count

**ExpenseBulkActions Component**
**File**: `src/routes/hsa/[slug]/(components)/expense-bulk-actions.svelte`
- Shown when rows selected
- Actions: Delete selected, Export selected
- Selection count display

**Index File**
**File**: `src/routes/hsa/[slug]/(components)/index.ts`
- Export all components for clean imports

---

### Phase 2: Backend & Query Updates 🔜

#### 2.1 Repository Updates
**File**: `src/lib/server/domains/medical-expenses/repository.ts`

**Add method**: `getAllExpensesWithFilters()`
```typescript
async getAllExpensesWithFilters(params: {
  hsaAccountId: number;
  searchQuery?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
  expenseTypes?: string[];
  providers?: string[];
  patients?: string[];
  statuses?: string[];
}): Promise<MedicalExpense[]>
```

**Features**:
- Full-text search across provider, patient, diagnosis, treatment, notes
- Multi-column sorting
- Date range filtering (service date and paid date)
- Multi-select filters (expense type, provider, patient, status)
- Include claims relation by default
- Efficient database queries with proper indexes

#### 2.2 tRPC Route Updates
**File**: `src/lib/trpc/routes/medical-expenses.ts`

**Add procedure**: `getAllHsaExpenses`
```typescript
getAllHsaExpenses: protectedProcedure
  .input(z.object({
    hsaAccountId: z.number(),
    searchQuery: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    expenseTypes: z.array(z.string()).optional(),
    providers: z.array(z.string()).optional(),
    patients: z.array(z.string()).optional(),
    statuses: z.array(z.string()).optional(),
  }))
  .query(async ({ input, ctx }) => {
    // Call repository method
    // Return formatted expenses with claims
  })
```

**Update existing**: `updateMedicalExpense`
- Return updated expenses with recalculated balances (like transactions)
- Support optimistic updates

#### 2.3 Query Factory Updates
**File**: `src/lib/query/medical-expenses.ts`

**Add queries**:
```typescript
// Main data query
getAllHsaExpenses(params) - TanStack Query with proper keys

// Mutations
updateExpenseMutation - Optimistic updates
deleteExpenseMutation - With cache invalidation
bulkDeleteExpensesMutation - Batch delete
```

**Features**:
- Proper query key management
- Optimistic updates for inline edits
- Cache invalidation strategies
- Error handling and rollback

---

### Phase 3: Views System Integration 🔜

#### 3.1 Extend Views Schema
**Files**:
- `src/lib/schema/views.ts` (if needed)
- Database migration (if needed)

**Add support for**:
- `resourceType: 'hsa-expense'`
- Store column visibility, filters, sorts, grouping
- Per-user view configurations

#### 3.2 View Management
**Integrate with ExpenseTableToolbar**:
- Load view dropdown
- Apply view to table state
- Save current state as new view
- Update existing view
- Delete view
- Default view per account

---

### Phase 4: Main Page Integration 🔜

#### 4.1 Update +page.svelte
**File**: `src/routes/hsa/[slug]/+page.svelte`

**Changes**:
1. Remove `<ExpenseList>` component usage
2. Add `<ExpenseTableContainer>`
3. Wire up queries and mutations
4. Add inline editing handlers
5. Add bulk action handlers
6. Keep expense form dialogs
7. Keep claim management integration

**New Structure**:
```svelte
<Tabs.Content value="expenses">
  <ExpenseTableContainer
    {isLoading}
    {expenses}
    {hsaAccountId}
    {views}
    {updateExpenseData}
    {onEdit}
    {onDelete}
    {onBulkDelete}
    bind:table />
</Tabs.Content>
```

#### 4.2 Implement Inline Editing

**Editable fields**:
- Date (date picker)
- Provider (text input with autocomplete)
- Patient (text input with autocomplete)
- Expense Type (select dropdown)
- Amount (number input)
- Insurance Covered (number input)

**Flow**:
1. Click cell to edit
2. Show input/picker
3. On blur/enter, save
4. Optimistic update
5. Show loading indicator
6. On error, revert and show toast

#### 4.3 Implement Bulk Actions

**Features**:
- Multi-select with checkboxes
- Select all (current page)
- Bulk delete with confirmation dialog
- Show selection count in toolbar
- Clear selection button

---

### Phase 5: Polish & Feature Parity 🔜

#### 5.1 Search Functionality
- Debounced search input (300ms)
- Search across: provider, patient, diagnosis, treatment, notes
- Clear search button
- Search highlight in results (optional)

#### 5.2 Advanced Filters
**Faceted Filters**:
- Expense Type (with counts)
- Provider (with counts)
- Patient (with counts)
- Status (with counts)

**Date Filters**:
- Service Date Range
- Paid Date Range
- Quick filters: This Month, Last Month, This Year, Last Year, All Time

#### 5.3 Grouping
**Group By Options**:
- Expense Type
- Provider
- Patient
- Month (service date)
- Status

**Features**:
- Expandable groups
- Group summaries (count, total amount)
- Collapsible groups

#### 5.4 Export
**Export Options**:
- Export visible columns only
- Export filtered data
- Export all data
- CSV format
- Include claim status
- Filename: `hsa-expenses-{account}-{date}.csv`

#### 5.5 Preserve Unique HSA Features
**Keep existing functionality**:
- Claim status badge with dropdown ✅
- Quick status updates (Submit, Approve, Deny, Paid) ✅
- Claim management dialog ✅
- Receipt upload ✅
- Tax year filtering ✅

---

## File Structure

```
src/routes/hsa/[slug]/
├── (components)/
│   ├── expense-data-table.svelte          [NEW] - Core table implementation
│   ├── expense-table-container.svelte     [NEW] - Wrapper with loading states
│   ├── expense-table-toolbar.svelte       [NEW] - Search, filters, actions
│   ├── expense-table-pagination.svelte    [NEW] - Pagination controls
│   ├── expense-bulk-actions.svelte        [NEW] - Bulk operation UI
│   ├── expense-skeleton.svelte            [NEW] - Loading placeholder
│   ├── expense-list.svelte                [REMOVE] - Old simple table
│   ├── claim-management-dialog.svelte     [KEEP] - Advanced claim management
│   ├── medical-expense-form.svelte        [KEEP] - Add/edit expense form
│   ├── expense-wizard.svelte              [KEEP] - Wizard for new expenses
│   ├── receipt-upload-widget.svelte       [KEEP] - Receipt management
│   └── index.ts                           [UPDATE] - Export all components
├── (data)/
│   ├── columns.svelte.ts                  [NEW] - Column definitions
│   ├── filters.svelte.ts                  [NEW] - Filter state
│   ├── pagination.svelte.ts               [NEW] - Pagination state
│   ├── selection.svelte.ts                [NEW] - Selection state
│   ├── sorts.svelte.ts                    [NEW] - Sort state
│   ├── visibility.svelte.ts               [NEW] - Visibility state
│   ├── groups.svelte.ts                   [NEW] - Grouping state
│   ├── expanded.svelte.ts                 [NEW] - Expanded state
│   └── pinning.svelte.ts                  [NEW] - Pinning state
└── +page.svelte                           [UPDATE] - Use new table

src/lib/server/domains/medical-expenses/
├── repository.ts                          [UPDATE] - Add getAllExpensesWithFilters
└── services.ts                            [UPDATE] - Service layer for new queries

src/lib/trpc/routes/
└── medical-expenses.ts                    [UPDATE] - Add getAllHsaExpenses procedure

src/lib/query/
└── medical-expenses.ts                    [UPDATE] - Query factories
```

---

## Data Types

### ExpenseFormat (for table)
```typescript
interface ExpenseFormat {
  id: number;
  date: DateValue; // @internationalized/date
  provider: string | null;
  patientName: string | null;
  expenseType: MedicalExpenseType;
  diagnosis: string | null;
  treatmentDescription: string | null;
  amount: number;
  insuranceCovered: number;
  outOfPocket: number;
  serviceDate: string;
  paidDate: string | null;
  taxYear: number;
  notes: string | null;
  isQualified: boolean;

  // Relations
  claims: HsaClaim[];
  receipts: ExpenseReceipt[];

  // Computed
  claimStatus: ClaimStatus; // From most recent claim
  hasReceipts: boolean;
}
```

---

## Success Criteria

**✅ Feature Parity**:
- [ ] All transactions table features work on expenses table
- [ ] Sorting works on all sortable columns
- [ ] Filtering works on all filterable columns
- [ ] Search finds expenses across all text fields
- [ ] Pagination works correctly
- [ ] Column visibility toggles work
- [ ] Grouping works by all group options
- [ ] Views can be saved and loaded
- [ ] Bulk delete works
- [ ] Inline editing works for all editable fields
- [ ] Export generates correct CSV

**✅ HSA-Specific Features Preserved**:
- [ ] Claim status badge with quick actions
- [ ] Claim management dialog accessible
- [ ] Receipt upload works
- [ ] Tax year filtering preserved
- [ ] Auto-claim creation on expense add

**✅ Performance**:
- [ ] Table renders < 100ms for 100 rows
- [ ] Filters update < 50ms
- [ ] Search debounced properly
- [ ] Optimistic updates feel instant
- [ ] No layout shift on data load

**✅ UX**:
- [ ] Tables look identical (HSA vs regular accounts)
- [ ] Loading states consistent
- [ ] Error handling consistent
- [ ] Keyboard navigation works
- [ ] Mobile responsive

---

## Implementation Order

### Sprint 1: Core Infrastructure (Current)
1. ✅ Create plan document
2. ⏳ Create column definitions
3. ⏳ Create state management files
4. ⏳ Create skeleton/loading component
5. ⏳ Create basic ExpenseDataTable
6. ⏳ Create ExpenseTableContainer

### Sprint 2: Backend & Integration
7. Update repository with filtering
8. Update tRPC routes
9. Update query factories
10. Integrate into +page.svelte
11. Test basic functionality

### Sprint 3: Advanced Features
12. Add toolbar with filters
13. Add pagination
14. Add search
15. Add inline editing
16. Add bulk actions

### Sprint 4: Polish
17. Add views system
18. Add export functionality
19. Add grouping
20. Performance optimization
21. Final testing

---

## Notes

- **Pattern Reuse**: Maximum code reuse from transactions table
- **Incremental**: Build and test feature by feature
- **Backward Compatible**: Keep old table until new one is ready
- **Type Safety**: Full TypeScript coverage
- **Accessibility**: ARIA labels, keyboard nav, screen reader support
- **Mobile**: Responsive design, touch-friendly
- **Testing**: Manual testing as we go

---

## References

**Existing Implementations**:
- `/src/routes/accounts/[slug]/` - Transactions table (source of truth)
- `/src/routes/hsa/[slug]/` - Current HSA implementation

**Libraries**:
- TanStack Table v8
- TanStack Query v5
- Svelte 5
- @internationalized/date

---

**Last Updated**: 2025-10-13
**Status**: Phase 1 in progress
