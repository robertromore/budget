<script lang="ts">
import {Button} from '$lib/components/ui/button';
import {Input} from '$lib/components/ui/input';
import * as InputGroup from '$lib/components/ui/input-group';
import * as Select from '$lib/components/ui/select';
import * as Popover from '$lib/components/ui/popover';
import {Badge} from '$lib/components/ui/badge';
import {cn} from '$lib/utils';
import Search from '@lucide/svelte/icons/search';
import Filter from '@lucide/svelte/icons/filter';
import X from '@lucide/svelte/icons/x';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import List from '@lucide/svelte/icons/list';
import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
import type {PayeeType, PaymentFrequency} from '$lib/schema';
import type {PayeeSearchFilters} from '$lib/server/domains/payees/repository';

export type ViewMode = 'list' | 'grid';
export type SortBy = 'name' | 'lastTransaction' | 'avgAmount' | 'created';
export type SortOrder = 'asc' | 'desc';

interface Props {
  searchQuery: string;
  filters: PayeeSearchFilters;
  viewMode?: ViewMode;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  onSearchChange: (query: string) => void;
  onFiltersChange: (filters: PayeeSearchFilters) => void;
  onViewModeChange?: (mode: ViewMode) => void;
  onSortChange?: (sortBy: SortBy, sortOrder: SortOrder) => void;
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
  onClearAll
}: Props = $props();

let filtersOpen = $state(false);

// Payee type options
const payeeTypeOptions = [
  {value: 'merchant', label: 'Merchant'},
  {value: 'person', label: 'Person'},
  {value: 'company', label: 'Company'},
  {value: 'government', label: 'Government'},
  {value: 'charity', label: 'Charity'},
  {value: 'bank', label: 'Bank'},
  {value: 'investment', label: 'Investment'},
  {value: 'other', label: 'Other'}
] as const;

// Payment frequency options
const frequencyOptions = [
  {value: 'one_time', label: 'One Time'},
  {value: 'weekly', label: 'Weekly'},
  {value: 'bi_weekly', label: 'Bi-Weekly'},
  {value: 'monthly', label: 'Monthly'},
  {value: 'quarterly', label: 'Quarterly'},
  {value: 'yearly', label: 'Yearly'}
] as const;

// Sort options
const sortOptions = [
  {value: 'name', label: 'Name', order: 'asc' as SortOrder},
  {value: 'name', label: 'Name', order: 'desc' as SortOrder},
  {value: 'lastTransaction', label: 'Recently Active', order: 'desc' as SortOrder},
  {value: 'avgAmount', label: 'Amount (High)', order: 'desc' as SortOrder},
  {value: 'avgAmount', label: 'Amount (Low)', order: 'asc' as SortOrder},
  {value: 'created', label: 'Date Created', order: 'desc' as SortOrder}
];

const getCurrentSortLabel = $derived.by(() => {
  const option = sortOptions.find(opt => opt.value === sortBy && opt.order === sortOrder);
  if (option) {
    return option.label + (option.order === 'asc' && option.value === 'name' ? ' (A-Z)' :
                          option.order === 'desc' && option.value === 'name' ? ' (Z-A)' : '');
  }
  return 'Sort';
});

// Count active filters for badge
const activeFilterCount = $derived.by(() => {
  let count = 0;
  if (filters.payeeType) count++;
  if (filters.isActive !== undefined) count++;
  if (filters.taxRelevant !== undefined) count++;
  if (filters.hasDefaultCategory !== undefined) count++;
  if (filters.hasDefaultBudget !== undefined) count++;
  if (filters.paymentFrequency) count++;
  if (filters.minAvgAmount !== undefined) count++;
  if (filters.maxAvgAmount !== undefined) count++;
  if (filters.lastTransactionAfter) count++;
  if (filters.lastTransactionBefore) count++;
  return count;
});

const handleSearchInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  searchQuery = target.value;
  onSearchChange(target.value);
};

const updateFilter = <K extends keyof PayeeSearchFilters>(
  key: K,
  value: PayeeSearchFilters[K]
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

const clearAllFilters = () => {
  searchQuery = '';
  filters = {};
  onClearAll();
  filtersOpen = false;
};

// Get labels for active filters
const getFilterSummary = $derived(() => {
  const summary: string[] = [];

  if (filters.payeeType) {
    const type = payeeTypeOptions.find(opt => opt.value === filters.payeeType);
    if (type) summary.push(`Type: ${type.label}`);
  }

  if (filters.isActive !== undefined) {
    summary.push(`Status: ${filters.isActive ? 'Active' : 'Inactive'}`);
  }

  if (filters.taxRelevant !== undefined) {
    summary.push(`Tax: ${filters.taxRelevant ? 'Relevant' : 'Not Relevant'}`);
  }

  if (filters.paymentFrequency) {
    const freq = frequencyOptions.find(opt => opt.value === filters.paymentFrequency);
    if (freq) summary.push(`Frequency: ${freq.label}`);
  }

  if (filters.minAvgAmount !== undefined || filters.maxAvgAmount !== undefined) {
    const min = filters.minAvgAmount ? `$${filters.minAvgAmount}` : '0';
    const max = filters.maxAvgAmount ? `$${filters.maxAvgAmount}` : '∞';
    summary.push(`Amount: ${min} - ${max}`);
  }

  return summary;
});
</script>

<div class="flex flex-col gap-4">
  <!-- Search and Filter Row -->
  <div class="flex items-center gap-2">
    <!-- Search Input -->
    <div class="flex-1 max-w-sm">
      <InputGroup.InputGroup>
        <InputGroup.InputGroupAddon align="inline-start">
          <Search class="h-4 w-4" />
        </InputGroup.InputGroupAddon>
        <InputGroup.InputGroupInput
          type="text"
          placeholder="Search payees..."
          value={searchQuery}
          oninput={handleSearchInput}
        />
      </InputGroup.InputGroup>
    </div>

    <!-- Filter Button -->
    <Popover.Root bind:open={filtersOpen}>
      <Popover.Trigger>
        {#snippet child({props})}
          <Button variant="outline" {...props} class="relative">
            <Filter class="mr-2 h-4 w-4" />
            Filters
            {#if activeFilterCount > 0}
              <Badge variant="secondary" class="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {activeFilterCount}
              </Badge>
            {/if}
          </Button>
        {/snippet}
      </Popover.Trigger>

      <Popover.Content class="w-96" align="end">
        <div class="space-y-4">
          <!-- Header -->
          <div class="flex items-center justify-between pb-3 border-b">
            <h4 class="font-semibold">Filter Payees</h4>
            {#if activeFilterCount > 0}
              <Button
                variant="ghost"
                size="sm"
                onclick={clearAllFilters}
                class="h-auto px-2 py-1 text-xs">
                Clear all
              </Button>
            {/if}
          </div>

          <!-- Basic Filters Section -->
          <div class="space-y-3">
            <h5 class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Basic Filters</h5>

            <div class="grid grid-cols-2 gap-3">
              <!-- Payee Type Filter -->
              <div class="space-y-1.5">
                <label for="payee-type-filter" class="text-xs font-medium">Type</label>
                <Select.Root
                  type="single"
                  value={filters.payeeType || ''}
                  onValueChange={(value) => {
                    updateFilter('payeeType', value as PayeeType || undefined);
                  }}>
                  <Select.Trigger id="payee-type-filter" class="h-9 w-full">
                    {filters.payeeType ? payeeTypeOptions.find(opt => opt.value === filters.payeeType)?.label || 'All' : 'All'}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="">All types</Select.Item>
                    {#each payeeTypeOptions as option}
                      <Select.Item value={option.value}>{option.label}</Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>
              </div>

              <!-- Status Filter -->
              <div class="space-y-1.5">
                <label for="status-filter" class="text-xs font-medium">Status</label>
                <Select.Root
                  type="single"
                  value={filters.isActive?.toString() || ''}
                  onValueChange={(value) => {
                    updateFilter('isActive', value === 'true' ? true : value === 'false' ? false : undefined);
                  }}>
                  <Select.Trigger id="status-filter" class="h-9 w-full">
                    {filters.isActive === true ? 'Active' : filters.isActive === false ? 'Inactive' : 'All'}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="">All</Select.Item>
                    <Select.Item value="true">Active</Select.Item>
                    <Select.Item value="false">Inactive</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <!-- Tax Relevance Filter -->
              <div class="space-y-1.5">
                <label for="tax-relevance-filter" class="text-xs font-medium">Tax</label>
                <Select.Root
                  type="single"
                  value={filters.taxRelevant?.toString() || ''}
                  onValueChange={(value) => {
                    updateFilter('taxRelevant', value === 'true' ? true : value === 'false' ? false : undefined);
                  }}>
                  <Select.Trigger id="tax-relevance-filter" class="h-9 w-full">
                    {filters.taxRelevant === true ? 'Relevant' : filters.taxRelevant === false ? 'Not Relevant' : 'All'}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="">All</Select.Item>
                    <Select.Item value="true">Tax Relevant</Select.Item>
                    <Select.Item value="false">Not Tax Relevant</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>

              <!-- Payment Frequency Filter -->
              <div class="space-y-1.5">
                <label for="payment-frequency-filter" class="text-xs font-medium">Frequency</label>
                <Select.Root
                  type="single"
                  value={filters.paymentFrequency || ''}
                  onValueChange={(value) => {
                    updateFilter('paymentFrequency', value as PaymentFrequency || undefined);
                  }}>
                  <Select.Trigger id="payment-frequency-filter" class="h-9 w-full">
                    {filters.paymentFrequency ? frequencyOptions.find(opt => opt.value === filters.paymentFrequency)?.label || 'All' : 'All'}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="">All frequencies</Select.Item>
                    {#each frequencyOptions as option}
                      <Select.Item value={option.value}>{option.label}</Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>
              </div>
            </div>
          </div>

          <!-- Amount Range Section -->
          <div class="space-y-3 pt-3 border-t">
            <h5 class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount Range</h5>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <label for="min-amount-filter" class="text-xs font-medium">Minimum</label>
                <Input
                  id="min-amount-filter"
                  type="number"
                  placeholder="0.00"
                  value={filters.minAvgAmount || ''}
                  oninput={(e) => {
                    const value = parseFloat((e.target as HTMLInputElement).value);
                    updateFilter('minAvgAmount', isNaN(value) ? undefined : value);
                  }}
                  class="h-9"
                />
              </div>
              <div class="space-y-1.5">
                <label for="max-amount-filter" class="text-xs font-medium">Maximum</label>
                <Input
                  id="max-amount-filter"
                  type="number"
                  placeholder="No limit"
                  value={filters.maxAvgAmount || ''}
                  oninput={(e) => {
                    const value = parseFloat((e.target as HTMLInputElement).value);
                    updateFilter('maxAvgAmount', isNaN(value) ? undefined : value);
                  }}
                  class="h-9"
                />
              </div>
            </div>
          </div>

          <!-- Configuration Section -->
          <div class="space-y-3 pt-3 border-t">
            <h5 class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Configuration</h5>
            <div class="grid grid-cols-2 gap-2">
              <Button
                variant={filters.hasDefaultCategory ? "default" : "outline"}
                size="sm"
                onclick={() => updateFilter('hasDefaultCategory', filters.hasDefaultCategory ? undefined : true)}
                class="h-9 justify-start text-xs">
                Default Category
              </Button>
              <Button
                variant={filters.hasDefaultBudget ? "default" : "outline"}
                size="sm"
                onclick={() => updateFilter('hasDefaultBudget', filters.hasDefaultBudget ? undefined : true)}
                class="h-9 justify-start text-xs">
                Default Budget
              </Button>
            </div>
          </div>

          <!-- Clear Filters Button -->
          {#if activeFilterCount > 0}
            <div class="pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onclick={clearAllFilters}
                class="w-full h-9">
                <X class="mr-2 h-3.5 w-3.5" />
                Clear All Filters ({activeFilterCount})
              </Button>
            </div>
          {/if}
        </div>
      </Popover.Content>
    </Popover.Root>

    <!-- Sort Dropdown -->
    <Popover.Root>
      <Popover.Trigger>
        {#snippet child({props})}
          <Button variant="outline" {...props} class="h-9 w-[180px] justify-start">
            <ArrowUpDown class="mr-2 h-4 w-4" />
            {getCurrentSortLabel}
          </Button>
        {/snippet}
      </Popover.Trigger>
      <Popover.Content class="w-56" align="end">
        <div class="space-y-1">
          {#each sortOptions as option}
            <Button
              variant={sortBy === option.value && sortOrder === option.order ? "default" : "ghost"}
              size="sm"
              onclick={() => {
                sortBy = option.value;
                sortOrder = option.order;
                onSortChange?.(option.value, option.order);
              }}
              class="w-full justify-start">
              {option.label}
              {#if option.value === 'name'}
                {option.order === 'asc' ? '(A-Z)' : '(Z-A)'}
              {/if}
            </Button>
          {/each}
        </div>
      </Popover.Content>
    </Popover.Root>

    <!-- View Mode Toggle -->
    <div class="flex items-center border rounded-md">
      <Button
        variant={viewMode === 'list' ? 'default' : 'ghost'}
        size="sm"
        onclick={() => {
          viewMode = 'list';
          onViewModeChange?.('list');
        }}
        class="h-9 rounded-r-none border-r">
        <List class="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onclick={() => {
          viewMode = 'grid';
          onViewModeChange?.('grid');
        }}
        class="h-9 rounded-l-none">
        <LayoutGrid class="h-4 w-4" />
      </Button>
    </div>
  </div>

  <!-- Active Filters Summary -->
  {#if activeFilterCount > 0}
    <div class="flex items-center gap-2 flex-wrap">
      <span class="text-sm text-muted-foreground">Active filters:</span>
      {#each getFilterSummary() as filter}
        <Badge variant="secondary" class="text-xs">
          {filter}
        </Badge>
      {/each}
      <Button
        variant="ghost"
        size="sm"
        onclick={clearAllFilters}
        class="h-6 text-xs text-muted-foreground hover:text-foreground">
        <X class="mr-1 h-3 w-3" />
        Clear all
      </Button>
    </div>
  {/if}
</div>
