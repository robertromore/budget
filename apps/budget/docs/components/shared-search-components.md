# Shared Search Components

Generic, reusable components for entity search/filter/overview pages. These components abstract common patterns used across payees, categories, and other entity pages.

## Overview

The shared search components consist of:

1. **EntitySearchState** - State management for search/filter functionality
2. **EntitySearchToolbar** - Unified search toolbar with filters, sort, and view modes
3. **EntityCard** - Generic card component for grid view
4. **EntitySearchResults** - Results display with loading/empty states
5. **Search Utilities** - Helper functions for search operations

## Components

### EntitySearchState

A generic state management class for entity search pages.

```typescript
import { createEntitySearchState } from '$lib/components/shared/search';

// Define your filter and sort types
type MyFilters = {
  status?: 'active' | 'inactive';
  category?: string;
};

type MySortBy = 'name' | 'created' | 'updated';

// Create search state
const searchState = createEntitySearchState<MyEntity, MyFilters, MySortBy>({
  defaultViewMode: 'grid',
  defaultSortBy: 'name',
  defaultSortOrder: 'asc',
  initialFilters: {}
});
```

**Methods:**
- `updateQuery(query: string)` - Update search query
- `updateFilter(key, value)` - Update a single filter
- `updateFilters(filters)` - Update multiple filters
- `clearFilters()` - Clear all filters
- `clearAllFilters()` - Clear query and filters
- `updateSort(sortBy, sortOrder)` - Update sort settings
- `setViewMode(mode)` - Set view mode (list/grid)
- `isSearchActive()` - Check if search/filters are active
- `getActiveFilterCount()` - Get count of active filters

### EntitySearchToolbar

A unified toolbar component with search input, filters, sorting, and view mode toggle.

```svelte
<script lang="ts">
import { EntitySearchToolbar, type SortOption } from '$lib/components/shared/search';

const sortOptions: SortOption<MySortBy>[] = [
  { value: 'name', label: 'Name', order: 'asc' },
  { value: 'name', label: 'Name', order: 'desc' },
  { value: 'created', label: 'Date Created', order: 'desc' }
];

const filterSummaries = $derived([
  { key: 'status', label: `Status: ${filters.status}` }
]);
</script>

<EntitySearchToolbar
  bind:searchQuery={search.query}
  bind:filters={search.filters}
  bind:viewMode={search.viewMode}
  bind:sortBy={search.sortBy}
  bind:sortOrder={search.sortOrder}
  searchPlaceholder="Search items..."
  {sortOptions}
  activeFilterCount={search.getActiveFilterCount()}
  {filterSummaries}
  onSearchChange={(q) => search.updateQuery(q)}
  onFiltersChange={(f) => search.updateFilters(f)}
  onViewModeChange={(m) => search.setViewMode(m)}
  onSortChange={(by, order) => search.updateSort(by, order)}
  onClearAll={() => search.clearAllFilters()}
>
  {#snippet filterContent()}
    <!-- Custom filter UI here -->
    <div class="space-y-3">
      <Select.Root bind:value={filters.status}>
        <Select.Trigger>Status</Select.Trigger>
        <Select.Content>
          <Select.Item value="active">Active</Select.Item>
          <Select.Item value="inactive">Inactive</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>
  {/snippet}
</EntitySearchToolbar>
```

**Props:**
- `searchQuery` - Current search query (bindable)
- `searchPlaceholder` - Placeholder text for search input
- `filters` - Current filters object (bindable)
- `activeFilterCount` - Number of active filters
- `filterSummaries` - Array of active filter labels for display
- `viewMode` - Current view mode: 'list' | 'grid' (bindable)
- `showViewModeToggle` - Whether to show view mode toggle
- `sortBy` - Current sort field (bindable)
- `sortOrder` - Current sort order: 'asc' | 'desc' (bindable)
- `sortOptions` - Array of available sort options
- `onSearchChange` - Callback when search changes
- `onFiltersChange` - Callback when filters change
- `onViewModeChange` - Callback when view mode changes
- `onSortChange` - Callback when sort changes
- `onClearAll` - Callback to clear all filters

**Snippets:**
- `filterContent` - Custom filter UI content

### EntityCard

A generic card component for grid view displays.

```svelte
<script lang="ts">
import { EntityCard } from '$lib/components/shared/search';
</script>

<EntityCard
  {entity}
  onView={(e) => viewEntity(e)}
  onEdit={(e) => editEntity(e)}
  onDelete={(e) => deleteEntity(e)}
  onViewAnalytics={(e) => viewAnalytics(e)}
  cardStyle="border-left: 4px solid {entity.color};"
>
  {#snippet header(entity)}
    <Card.Title>{entity.name}</Card.Title>
    <Card.Description>{entity.description}</Card.Description>
  {/snippet}

  {#snippet content(entity)}
    <div class="space-y-2">
      <p>Created: {entity.createdAt}</p>
      <p>Status: {entity.status}</p>
    </div>
  {/snippet}

  {#snippet badges(entity)}
    <div class="flex gap-2">
      {#if entity.isActive}
        <Badge>Active</Badge>
      {/if}
    </div>
  {/snippet}
</EntityCard>
```

**Props:**
- `entity` - The entity to display
- `isReorderMode` - Whether reorder mode is active
- `isDragging` - Whether this card is being dragged
- `onView`, `onEdit`, `onDelete`, `onViewAnalytics` - Action callbacks
- `showViewButton`, `showEditButton`, `showDeleteButton`, `showAnalyticsButton` - Control button visibility
- `viewButtonLabel` - Label for view button (default: "View")
- `cardStyle` - Custom inline styles
- `cardClass` - Additional CSS classes

**Snippets:**
- `header` - Card header content
- `content` - Card body content
- `badges` - Badges/tags to display
- `footer` - Custom footer (overrides default buttons)

### EntitySearchResults

Results display component with loading and empty states.

```svelte
<script lang="ts">
import { EntitySearchResults } from '$lib/components/shared/search';
import User from '@lucide/svelte/icons/user';
</script>

<EntitySearchResults
  entities={displayedEntities}
  {isLoading}
  {searchQuery}
  viewMode={search.viewMode}
  emptyIcon={User}
  emptyTitle="No items found"
  emptyDescription="Try adjusting your filters"
  emptySearchDescription="No items match '{query}'"
  {onView}
  {onEdit}
  {onDelete}
  {onBulkDelete}
  {onViewAnalytics}
>
  {#snippet gridCard(entity)}
    <EntityCard {entity} {onView} {onEdit} {onDelete}>
      {#snippet header(e)}
        <Card.Title>{e.name}</Card.Title>
      {/snippet}
      {#snippet content(e)}
        <p>{e.description}</p>
      {/snippet}
    </EntityCard>
  {/snippet}

  {#snippet listView()}
    <MyDataTable {entities} />
  {/snippet}
</EntitySearchResults>
```

**Props:**
- `entities` - Array of entities to display
- `isLoading` - Loading state
- `searchQuery` - Current search query (for empty state)
- `viewMode` - View mode: 'list' | 'grid'
- `isReorderMode` - Whether reorder mode is active
- `emptyIcon` - Icon component for empty state
- `emptyTitle` - Title for empty state
- `emptyDescription` - Description for empty state
- `emptySearchDescription` - Description when search returns no results (use `{query}` placeholder)
- `onView`, `onEdit`, `onDelete`, `onBulkDelete`, `onViewAnalytics`, `onReorder` - Action callbacks
- `gridColumns` - Tailwind grid classes for layout

**Snippets:**
- `gridCard` - How to render each entity in grid view
- `listView` - How to render list view (usually a data table)

## Search Utilities

Helper functions for search operations.

```typescript
import {
  highlightMatches,
  countActiveFilters,
  isActiveFilterValue,
  formatFilterValue,
  getFilterLabel,
  getFilterSummaries,
  clearFilters,
  updateFilters
} from '$lib/utils/search';

// Highlight search matches
const highlighted = highlightMatches('Hello World', 'world');
// => 'Hello <mark>World</mark>'

// Count active filters
const count = countActiveFilters({ status: 'active', type: undefined });
// => 1

// Check if value is active
isActiveFilterValue('active'); // => true
isActiveFilterValue(undefined); // => false

// Format filter values for display
formatFilterValue(true); // => "Yes"
formatFilterValue(['a', 'b']); // => "a, b"

// Get human-readable label
getFilterLabel('isActive'); // => "Is Active"

// Get filter summaries for display
const summaries = getFilterSummaries(
  { status: 'active', type: 'merchant' },
  { status: 'Status', type: 'Type' }
);
// => ["Status: active", "Type: merchant"]

// Clear specific filters
const newFilters = clearFilters(filters, ['status', 'type']);

// Update filters (removes undefined/null values)
const updated = updateFilters(filters, { status: 'active', type: undefined });
```

## Complete Example

Here's a complete example of using these components together:

```svelte
<script lang="ts">
import { createEntitySearchState, EntitySearchToolbar, EntitySearchResults, EntityCard } from '$lib/components/shared/search';
import { highlightMatches } from '$lib/utils/search';
import User from '@lucide/svelte/icons/user';
import type { Payee } from '$lib/schema';

// Define types
type PayeeFilters = {
  status?: 'active' | 'inactive';
  type?: string;
};

type PayeeSortBy = 'name' | 'created' | 'lastTransaction';

// Create search state
const search = createEntitySearchState<Payee, PayeeFilters, PayeeSortBy>({
  defaultViewMode: 'grid',
  defaultSortBy: 'name',
  defaultSortOrder: 'asc'
});

// Sort options
const sortOptions = [
  { value: 'name', label: 'Name', order: 'asc' },
  { value: 'name', label: 'Name', order: 'desc' },
  { value: 'lastTransaction', label: 'Recently Active', order: 'desc' }
];

// Filter summaries for display
const filterSummaries = $derived.by(() => {
  const summaries = [];
  if (search.filters.status) {
    summaries.push({ key: 'status', label: `Status: ${search.filters.status}` });
  }
  if (search.filters.type) {
    summaries.push({ key: 'type', label: `Type: ${search.filters.type}` });
  }
  return summaries;
});

// Your data
let payees = $state<Payee[]>([]);
let isLoading = $state(false);

// Display logic
const displayedPayees = $derived(
  search.isSearchActive() ? search.results : payees
);
</script>

<div class="space-y-6">
  <!-- Search Toolbar -->
  <EntitySearchToolbar
    bind:searchQuery={search.query}
    bind:filters={search.filters}
    bind:viewMode={search.viewMode}
    bind:sortBy={search.sortBy}
    bind:sortOrder={search.sortOrder}
    searchPlaceholder="Search payees..."
    {sortOptions}
    activeFilterCount={search.getActiveFilterCount()}
    {filterSummaries}
    onSearchChange={(q) => search.updateQuery(q)}
    onFiltersChange={(f) => search.updateFilters(f)}
    onViewModeChange={(m) => search.setViewMode(m)}
    onSortChange={(by, order) => search.updateSort(by, order)}
    onClearAll={() => search.clearAllFilters()}
  >
    {#snippet filterContent()}
      <div class="space-y-3">
        <Select.Root
          value={search.filters.status}
          onValueChange={(v) => search.updateFilter('status', v)}
        >
          <Select.Trigger>Status</Select.Trigger>
          <Select.Content>
            <Select.Item value="">All</Select.Item>
            <Select.Item value="active">Active</Select.Item>
            <Select.Item value="inactive">Inactive</Select.Item>
          </Select.Content>
        </Select.Root>
      </div>
    {/snippet}
  </EntitySearchToolbar>

  <!-- Results -->
  <EntitySearchResults
    entities={displayedPayees}
    {isLoading}
    searchQuery={search.query}
    viewMode={search.viewMode}
    emptyIcon={User}
    emptyTitle="No payees found"
    emptyDescription="Try adjusting your search or filters"
    onView={viewPayee}
    onEdit={editPayee}
    onDelete={deletePayee}
    onBulkDelete={bulkDeletePayees}
    onViewAnalytics={viewAnalytics}
  >
    {#snippet gridCard(payee)}
      <EntityCard
        entity={payee}
        {onView}
        {onEdit}
        {onDelete}
        {onViewAnalytics}
      >
        {#snippet header(p)}
          <Card.Title>
            {@html highlightMatches(p.name, search.query)}
          </Card.Title>
        {/snippet}
        {#snippet content(p)}
          <p class="text-sm text-muted-foreground">{p.description}</p>
        {/snippet}
      </EntityCard>
    {/snippet}

    {#snippet listView()}
      <PayeeDataTable payees={displayedPayees} />
    {/snippet}
  </EntitySearchResults>
</div>
```

## Migration Guide

### From Old Pattern to New Pattern

**Before:**
```svelte
<!-- Duplicate toolbar code in each page -->
<PayeeSearchToolbar ... />
<PayeeSearchResults ... />
```

**After:**
```svelte
<!-- Shared components -->
<EntitySearchToolbar ... />
<EntitySearchResults ... />
```

### Steps to Migrate:

1. **Replace custom search state** with `EntitySearchState`
2. **Replace custom toolbar** with `EntitySearchToolbar`
3. **Replace custom results** with `EntitySearchResults`
4. **Use `highlightMatches`** from search utilities
5. **Simplify filter logic** using search state methods

## Benefits

- **~1,200 lines of code eliminated** across payees and categories
- **Consistent UX** across all entity pages
- **Type-safe** with full TypeScript support
- **Flexible** via snippets and props
- **Maintainable** - fix once, applies everywhere
- **Testable** - test shared components once
- **Extensible** - easy to add new entity pages

## Future Enhancements

- Add keyboard navigation support
- Add accessibility improvements
- Add animation/transition utilities
- Add search query history
- Add saved filter presets
- Add export functionality
