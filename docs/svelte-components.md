# Svelte Components Documentation

This document provides detailed documentation for the Svelte components created and modified during the account performance optimization feature implementation.

## Overview

The components are organized to support both client-side and server-side rendering patterns, with a focus on performance optimization for large datasets through smart pagination and caching strategies.

## Component Architecture

```text
src/routes/accounts/[id]/(components)/
├── server-data-table.svelte           # Server-side paginated table
├── server-data-table-toolbar.svelte   # Search and filtering toolbar
├── server-data-table-pagination.svelte # Pagination controls
├── data-table.svelte                   # Client-side advanced table
└── (facets)/
    └── data-table-faceted-filter-amount.svelte # Amount filtering component
```

## Server-Side Components

### ServerDataTable (`server-data-table.svelte`)

A high-performance data table component optimized for server-side pagination and large transaction datasets.

#### Props

```typescript
interface ServerDataTableProps<TValue> {
  columns: ColumnDef<TransactionsFormat, TValue>[];
  accountState: ServerAccountState;
  accountId: number;
  table?: TTable<TransactionsFormat>; // bindable
}
```

#### Features

- **Server-side sorting**: Manual sorting with state managed by `ServerAccountState`
- **Server-side pagination**: Handles large datasets without loading all data
- **Loading states**: Built-in skeleton loading for smooth UX
- **Error handling**: Displays alerts for data loading failures
- **TanStack Table integration**: Uses TanStack Table core with server-side configuration

#### Key Characteristics

- **Manual sorting/pagination**: `manualSorting: true, manualPagination: true`
- **State binding**: Syncs with `ServerAccountState` for consistent data management
- **Performance optimized**: Only renders current page data
- **Responsive design**: Handles various screen sizes gracefully

#### Usage Example

```svelte
<script>
  import { ServerDataTable } from './(components)';
  import { columns } from './(data)/columns.svelte';
  
  let serverAccountState = new ServerAccountState(accountId);
</script>

<ServerDataTable 
  {columns}
  accountState={serverAccountState}
  {accountId}
  bind:table
/>
```

### ServerDataTableToolbar (`server-data-table-toolbar.svelte`)

Advanced filtering and search toolbar for server-side data tables.

#### Props

```typescript
interface ServerDataTableToolbarProps {
  accountState: ServerAccountState;
  accountId: number;
}
```

#### Features

- **Debounced search**: 300ms debounce delay for search input
- **Date range filtering**: From/to date selection with date pickers
- **Sort controls**: Sort by date, amount, or notes with asc/desc options
- **Filter badges**: Visual indicators for active filters
- **Reset functionality**: Clear all filters with single click

#### Search Implementation

```typescript
// Debounced search with 300ms delay
$effect(() => {
  if (searchValue !== (accountState.filters.searchQuery || "")) {
    if (searchTimeout) clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(() => {
      accountState.searchTransactions(accountId, searchValue);
    }, 300);
  }
});
```

#### Filter State Management

- **Search query**: Real-time search across transaction notes and amounts
- **Date filters**: Range-based date filtering with ISO date strings
- **Sort options**: Dynamic sorting by multiple fields
- **Active filter display**: Badge-based UI for current filter state

### ServerDataTablePagination (`server-data-table-pagination.svelte`)

Comprehensive pagination controls for server-side data tables.

#### Props

```typescript
interface ServerDataTablePaginationProps {
  accountState: ServerAccountState;
  accountId: number;
}
```

#### Features

- **Page size selection**: 10, 25, 50, 100 items per page
- **Navigation controls**: First, previous, next, last page buttons
- **Page information**: "Showing X to Y of Z transactions"
- **Responsive design**: Adapts to available screen space

#### Page Size Options

```typescript
const pageSizeOptions = [
  { value: "10", label: "10 per page" },
  { value: "25", label: "25 per page" },
  { value: "50", label: "50 per page" },
  { value: "100", label: "100 per page" },
];
```

#### Navigation Methods

```typescript
// Page navigation functions
function goToFirstPage() {
  accountState.goToPage(accountId, 0);
}

function goToLastPage() {
  accountState.goToPage(accountId, accountState.pagination.totalPages - 1);
}

function goToPreviousPage() {
  accountState.goToPage(accountId, accountState.pagination.page - 1);
}

function goToNextPage() {
  accountState.goToPage(accountId, accountState.pagination.page + 1);
}
```

## Advanced Filtering Components

### DataTableFacetedFilterAmount (`(facets)/data-table-faceted-filter-amount.svelte`)

Specialized filtering component for transaction amounts with multiple comparison operators.

#### Props

```typescript
interface DataTableFacetedFilterAmountProps<TData, TValue> {
  column: Column<TData, TValue>;
  title?: string; // defaults to "Amount"
}
```

#### Filter Types

```typescript
const filterTypes = [
  { value: "equals", label: "equals" },
  { value: "greaterThan", label: "greater than" },
  { value: "lessThan", label: "less than" },
  { value: "between", label: "between" },
  { value: "notEquals", label: "not equals" },
];
```

#### Features

- **Multiple operators**: Equals, greater than, less than, between, not equals
- **Currency formatting**: Displays amounts with proper currency formatting
- **Range filtering**: Between operator for amount ranges
- **Visual feedback**: Badge indicators for active filters
- **Integration with views**: Works with the view management system

#### Filter Value Structure

```typescript
interface AmountFilter {
  type: 'equals' | 'greaterThan' | 'lessThan' | 'between' | 'notEquals';
  value: number;
  value2?: number; // for 'between' type
}
```

## State Management Integration

### ServerAccountState Integration

All server-side components integrate with `ServerAccountState` for consistent state management:

```typescript
// State synchronization
$effect(() => {
  // Components automatically react to state changes
  if (accountState.isLoadingTransactions) {
    // Show loading state
  }
  
  if (accountState.error) {
    // Display error message
  }
});
```

#### Key State Properties

- **`pagination`**: Current page, page size, total counts
- **`filters`**: Search query, date range, sort options
- **`isLoadingTransactions`**: Loading state for async operations
- **`error`**: Error state for failed operations
- **`formatted`**: Processed transaction data for display

### View Management Integration

Components integrate with the view management system for saved filters and layouts:

```typescript
// View state integration
const activeView = $derived(currentViews.get().activeView);
const activeViewModel = $derived(activeView.view);

// Filter synchronization with active view
const currentFilter = $derived(column.getFilterValue());
```

## Performance Considerations

### Rendering Optimization

- **Virtual rendering**: Only visible rows are rendered
- **Debounced inputs**: Prevents excessive API calls during typing
- **Caching integration**: Leverages server-side caching for repeated queries
- **Loading states**: Skeleton components during data fetching

### Memory Management

- **Page-based loading**: Limits memory usage for large datasets
- **Component cleanup**: Proper cleanup of timeouts and subscriptions
- **State batching**: Batches multiple state updates to prevent excessive re-renders

## Styling and Theming

### Design System Integration

Components use the project's design system:

- **Shadcn-svelte components**: Button, Input, Select, Popover, Badge
- **Lucide icons**: Consistent iconography throughout
- **Tailwind CSS**: Responsive design and consistent spacing
- **Theme support**: Adapts to light/dark theme preferences

### Component Styling Patterns

```svelte
<!-- Consistent button styling -->
<Button variant="outline" size="sm" class="h-8">
  <Icon class="mr-2 h-4 w-4" />
  Button Text
</Button>

<!-- Badge patterns for active filters -->
<Badge variant="secondary" class="rounded-sm px-1 font-normal">
  Filter: {filterValue}
  <Button size="sm" class="ml-1 h-auto p-0">
    <X class="h-3 w-3" />
  </Button>
</Badge>
```

## Testing Considerations

### Component Testing Strategy

1. **Unit tests**: Individual component behavior and props
2. **Integration tests**: Component interaction with state management
3. **Performance tests**: Large dataset handling and memory usage
4. **Accessibility tests**: Screen reader compatibility and keyboard navigation

### Mock Data Patterns

```typescript
// Mock account state for testing
const mockAccountState = {
  pagination: { page: 0, pageSize: 50, totalCount: 1000, totalPages: 20 },
  filters: { searchQuery: '', sortBy: 'date', sortOrder: 'desc' },
  formatted: mockTransactions,
  isLoadingTransactions: false,
  error: null,
};
```

## Common Usage Patterns

### Server-Side Table Setup

```svelte
<script>
  import { ServerDataTable, ServerDataTableToolbar, ServerDataTablePagination } from './(components)';
  
  let serverAccountState = new ServerAccountState(accountId);
  let table;
</script>

<div class="space-y-4">
  <ServerDataTableToolbar 
    accountState={serverAccountState} 
    {accountId} 
  />
  
  <ServerDataTable 
    {columns} 
    accountState={serverAccountState} 
    {accountId}
    bind:table 
  />
  
  <ServerDataTablePagination 
    accountState={serverAccountState} 
    {accountId} 
  />
</div>
```

### Filter Integration

```svelte
<script>
  import { DataTableFacetedFilterAmount } from './(components)/(facets)';
  
  // In column definition
  const amountColumn = {
    id: 'amount',
    header: ({ column }) => {
      return DataTableFacetedFilterAmount({ column, title: 'Amount' });
    },
    cell: ({ row }) => currencyFormatter(row.getValue('amount')),
  };
</script>
```

## Error Handling

### Component Error States

```svelte
{#if accountState.error}
  <Alert.Root variant="destructive">
    <AlertCircle class="h-4 w-4" />
    <Alert.Title>Error loading transactions</Alert.Title>
    <Alert.Description>{accountState.error}</Alert.Description>
  </Alert.Root>
{/if}
```

### Graceful Degradation

- **Fallback UI**: Simple table when advanced components fail
- **Error boundaries**: Prevent component failures from breaking the page
- **Retry mechanisms**: Allow users to retry failed operations

## Future Enhancements

### Planned Features

1. **Virtual scrolling**: For extremely large client-side datasets
2. **Column resizing**: Dynamic column width adjustment
3. **Export functionality**: CSV/Excel export integration
4. **Advanced filters**: More sophisticated filtering options
5. **Real-time updates**: WebSocket integration for live data

### Performance Targets

- **Initial render**: <100ms for component initialization
- **Filter response**: <200ms for server-side filter operations
- **Pagination**: <150ms for page navigation
- **Memory usage**: <50MB for largest supported datasets

## Conclusion

The server-side components provide a robust, performant foundation for handling large transaction datasets while maintaining excellent user experience. The modular architecture allows for easy extension and customization while ensuring consistent behavior across the application.

The integration with `ServerAccountState` and the view management system provides a cohesive data management strategy that scales from small to very large datasets while maintaining responsive user interactions.