<script lang="ts">
import { EntitySearchToolbar, type SortOption } from '$lib/components/shared/search';
import * as Select from '$lib/components/ui/select';
import type { CategorySearchFilters } from '$lib/states/ui/category-search.svelte';

type CategorySortBy = 'name' | 'created' | 'lastTransaction' | 'totalAmount';
type SortOrder = 'asc' | 'desc';

interface Props {
  searchQuery: string;
  filters: CategorySearchFilters;
  viewMode?: 'list' | 'grid';
  sortBy?: CategorySortBy;
  sortOrder?: SortOrder;
  onSearchChange: (query: string) => void;
  onFiltersChange: (filters: CategorySearchFilters) => void;
  onViewModeChange?: (mode: 'list' | 'grid') => void;
  onSortChange?: (sortBy: CategorySortBy, sortOrder: SortOrder) => void;
  onClearAll: () => void;
}

let {
  searchQuery = $bindable(),
  filters = $bindable(),
  viewMode = $bindable('list'),
  sortBy = $bindable('name'),
  sortOrder = $bindable('asc'),
  onSearchChange,
  onFiltersChange,
  onViewModeChange,
  onSortChange,
  onClearAll,
}: Props = $props();

// Sort options
const sortOptions: SortOption<CategorySortBy>[] = [
  { value: 'name', label: 'Name', order: 'asc' },
  { value: 'name', label: 'Name', order: 'desc' },
  { value: 'created', label: 'Date Created', order: 'desc' },
  { value: 'lastTransaction', label: 'Last Transaction', order: 'desc' },
  { value: 'totalAmount', label: 'Amount (High)', order: 'desc' },
  { value: 'totalAmount', label: 'Amount (Low)', order: 'asc' },
];

// Count active filters
const activeFilterCount = $derived.by(() => {
  let count = 0;
  if (filters.hasParent !== undefined) count++;
  if (filters.hasTransactions !== undefined) count++;
  if (filters.categoryType !== undefined) count++;
  if (filters.isTaxDeductible !== undefined) count++;
  if (filters.spendingPriority !== undefined) count++;
  if (filters.isSeasonal !== undefined) count++;
  if (filters.isActive !== undefined) count++;
  return count;
});

// Get filter summaries for display
const filterSummaries = $derived(() => {
  const summary = [];

  if (filters.hasParent !== undefined) {
    summary.push({
      key: 'hasParent',
      label: filters.hasParent ? 'Subcategories Only' : 'Top-level Only',
    });
  }

  if (filters.hasTransactions !== undefined) {
    summary.push({
      key: 'hasTransactions',
      label: filters.hasTransactions ? 'Has Transactions' : 'No Transactions',
    });
  }

  if (filters.categoryType) {
    summary.push({
      key: 'categoryType',
      label: `Type: ${filters.categoryType.charAt(0).toUpperCase() + filters.categoryType.slice(1)}`,
    });
  }

  if (filters.isTaxDeductible !== undefined) {
    summary.push({
      key: 'isTaxDeductible',
      label: filters.isTaxDeductible ? 'Tax Deductible' : 'Not Tax Deductible',
    });
  }

  if (filters.spendingPriority) {
    summary.push({
      key: 'spendingPriority',
      label: `Priority: ${filters.spendingPriority.charAt(0).toUpperCase() + filters.spendingPriority.slice(1)}`,
    });
  }

  if (filters.isSeasonal !== undefined) {
    summary.push({ key: 'isSeasonal', label: filters.isSeasonal ? 'Seasonal' : 'Not Seasonal' });
  }

  if (filters.isActive !== undefined) {
    summary.push({ key: 'isActive', label: filters.isActive ? 'Active Only' : 'Inactive Only' });
  }

  return summary;
});

const updateFilter = <K extends keyof CategorySearchFilters>(
  key: K,
  value: CategorySearchFilters[K]
) => {
  const newFilters = { ...filters };
  if (value === undefined || value === null || value === '') {
    delete newFilters[key];
  } else {
    newFilters[key] = value;
  }
  filters = newFilters;
  onFiltersChange(newFilters);
};
</script>

<EntitySearchToolbar
  bind:searchQuery
  bind:filters
  bind:viewMode
  bind:sortBy
  bind:sortOrder
  searchPlaceholder="Search categories..."
  {sortOptions}
  {activeFilterCount}
  {filterSummaries}
  {onSearchChange}
  {onFiltersChange}
  {onViewModeChange}
  {onSortChange}
  {onClearAll}>
  {#snippet filterContent()}
    <!-- Basic Filters Section -->
    <div class="space-y-3">
      <h5 class="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Basic Filters
      </h5>

      <div class="grid grid-cols-2 gap-3">
        <!-- Parent Category Filter -->
        <div class="space-y-1.5">
          <label for="parent-filter" class="text-xs font-medium">Hierarchy</label>
          <Select.Root
            type="single"
            value={filters.hasParent?.toString() || ''}
            onValueChange={(value) => {
              updateFilter(
                'hasParent',
                value === 'true' ? true : value === 'false' ? false : undefined
              );
            }}>
            <Select.Trigger id="parent-filter" class="h-9 w-full">
              {filters.hasParent === true
                ? 'Subcategories'
                : filters.hasParent === false
                  ? 'Top-level'
                  : 'All'}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="">All</Select.Item>
              <Select.Item value="false">Top-level</Select.Item>
              <Select.Item value="true">Subcategories</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Transactions Filter -->
        <div class="space-y-1.5">
          <label for="transactions-filter" class="text-xs font-medium">Usage</label>
          <Select.Root
            type="single"
            value={filters.hasTransactions?.toString() || ''}
            onValueChange={(value) => {
              updateFilter(
                'hasTransactions',
                value === 'true' ? true : value === 'false' ? false : undefined
              );
            }}>
            <Select.Trigger id="transactions-filter" class="h-9 w-full">
              {filters.hasTransactions === true
                ? 'Has Transactions'
                : filters.hasTransactions === false
                  ? 'No Transactions'
                  : 'All'}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="">All</Select.Item>
              <Select.Item value="true">Has Transactions</Select.Item>
              <Select.Item value="false">No Transactions</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Category Type Filter -->
        <div class="space-y-1.5">
          <label for="type-filter" class="text-xs font-medium">Category Type</label>
          <Select.Root
            type="single"
            value={filters.categoryType || ''}
            onValueChange={(value) => {
              updateFilter('categoryType', value || undefined);
            }}>
            <Select.Trigger id="type-filter" class="h-9 w-full">
              {filters.categoryType
                ? filters.categoryType.charAt(0).toUpperCase() + filters.categoryType.slice(1)
                : 'All'}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="">All</Select.Item>
              <Select.Item value="income">Income</Select.Item>
              <Select.Item value="expense">Expense</Select.Item>
              <Select.Item value="transfer">Transfer</Select.Item>
              <Select.Item value="savings">Savings</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Active Status Filter -->
        <div class="space-y-1.5">
          <label for="active-filter" class="text-xs font-medium">Status</label>
          <Select.Root
            type="single"
            value={filters.isActive?.toString() || ''}
            onValueChange={(value) => {
              updateFilter(
                'isActive',
                value === 'true' ? true : value === 'false' ? false : undefined
              );
            }}>
            <Select.Trigger id="active-filter" class="h-9 w-full">
              {filters.isActive === true
                ? 'Active'
                : filters.isActive === false
                  ? 'Inactive'
                  : 'All'}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="">All</Select.Item>
              <Select.Item value="true">Active</Select.Item>
              <Select.Item value="false">Inactive</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
      </div>
    </div>

    <!-- Advanced Filters Section -->
    <div class="space-y-3 border-t pt-3">
      <h5 class="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Advanced Filters
      </h5>

      <div class="grid grid-cols-2 gap-3">
        <!-- Tax Deductible Filter -->
        <div class="space-y-1.5">
          <label for="tax-filter" class="text-xs font-medium">Tax Status</label>
          <Select.Root
            type="single"
            value={filters.isTaxDeductible?.toString() || ''}
            onValueChange={(value) => {
              updateFilter(
                'isTaxDeductible',
                value === 'true' ? true : value === 'false' ? false : undefined
              );
            }}>
            <Select.Trigger id="tax-filter" class="h-9 w-full">
              {filters.isTaxDeductible === true
                ? 'Tax Deductible'
                : filters.isTaxDeductible === false
                  ? 'Not Deductible'
                  : 'All'}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="">All</Select.Item>
              <Select.Item value="true">Tax Deductible</Select.Item>
              <Select.Item value="false">Not Deductible</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Seasonal Filter -->
        <div class="space-y-1.5">
          <label for="seasonal-filter" class="text-xs font-medium">Seasonality</label>
          <Select.Root
            type="single"
            value={filters.isSeasonal?.toString() || ''}
            onValueChange={(value) => {
              updateFilter(
                'isSeasonal',
                value === 'true' ? true : value === 'false' ? false : undefined
              );
            }}>
            <Select.Trigger id="seasonal-filter" class="h-9 w-full">
              {filters.isSeasonal === true
                ? 'Seasonal'
                : filters.isSeasonal === false
                  ? 'Not Seasonal'
                  : 'All'}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="">All</Select.Item>
              <Select.Item value="true">Seasonal</Select.Item>
              <Select.Item value="false">Not Seasonal</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Spending Priority Filter (full width) -->
        <div class="col-span-2 space-y-1.5">
          <label for="priority-filter" class="text-xs font-medium">Spending Priority</label>
          <Select.Root
            type="single"
            value={filters.spendingPriority || ''}
            onValueChange={(value) => {
              updateFilter('spendingPriority', value || undefined);
            }}>
            <Select.Trigger id="priority-filter" class="h-9 w-full">
              {filters.spendingPriority
                ? filters.spendingPriority.charAt(0).toUpperCase() +
                  filters.spendingPriority.slice(1)
                : 'All'}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="">All</Select.Item>
              <Select.Item value="essential">Essential</Select.Item>
              <Select.Item value="important">Important</Select.Item>
              <Select.Item value="discretionary">Discretionary</Select.Item>
              <Select.Item value="luxury">Luxury</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
      </div>
    </div>
  {/snippet}
</EntitySearchToolbar>
