<script lang="ts">
import { EntitySearchToolbar, type SortOption } from '$lib/components/shared/search';
import * as Select from '$lib/components/ui/select';
import { Input } from '$lib/components/ui/input';
import { Button } from '$lib/components/ui/button';
import type { PayeeSearchFilters } from '$lib/server/domains/payees/repository';
import type { PayeeType, PaymentFrequency } from '$lib/schema';

type PayeeSortBy = 'name' | 'lastTransaction' | 'avgAmount' | 'created';
type SortOrder = 'asc' | 'desc';

interface Props {
  searchQuery: string;
  filters: PayeeSearchFilters;
  viewMode?: 'list' | 'grid';
  sortBy?: PayeeSortBy;
  sortOrder?: SortOrder;
  onSearchChange: (query: string) => void;
  onFiltersChange: (filters: PayeeSearchFilters) => void;
  onViewModeChange?: (mode: 'list' | 'grid') => void;
  onSortChange?: (sortBy: PayeeSortBy, sortOrder: SortOrder) => void;
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

// Payee type options
const payeeTypeOptions = [
  { value: 'merchant', label: 'Merchant' },
  { value: 'person', label: 'Person' },
  { value: 'company', label: 'Company' },
  { value: 'government', label: 'Government' },
  { value: 'charity', label: 'Charity' },
  { value: 'bank', label: 'Bank' },
  { value: 'investment', label: 'Investment' },
  { value: 'other', label: 'Other' },
] as const;

// Payment frequency options
const frequencyOptions = [
  { value: 'one_time', label: 'One Time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi_weekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

// Sort options
const sortOptions: SortOption<PayeeSortBy>[] = [
  { value: 'name', label: 'Name', order: 'asc' },
  { value: 'name', label: 'Name', order: 'desc' },
  { value: 'lastTransaction', label: 'Recently Active', order: 'desc' },
  { value: 'avgAmount', label: 'Amount (High)', order: 'desc' },
  { value: 'avgAmount', label: 'Amount (Low)', order: 'asc' },
  { value: 'created', label: 'Date Created', order: 'desc' },
];

// Count active filters
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

// Get filter summaries for display
const filterSummaries = $derived(() => {
  const summary = [];

  if (filters.payeeType) {
    const type = payeeTypeOptions.find((opt) => opt.value === filters.payeeType);
    if (type) summary.push({ key: 'payeeType', label: `Type: ${type.label}` });
  }

  if (filters.isActive !== undefined) {
    summary.push({ key: 'isActive', label: `Status: ${filters.isActive ? 'Active' : 'Inactive'}` });
  }

  if (filters.taxRelevant !== undefined) {
    summary.push({
      key: 'taxRelevant',
      label: `Tax: ${filters.taxRelevant ? 'Relevant' : 'Not Relevant'}`,
    });
  }

  if (filters.paymentFrequency) {
    const freq = frequencyOptions.find((opt) => opt.value === filters.paymentFrequency);
    if (freq) summary.push({ key: 'paymentFrequency', label: `Frequency: ${freq.label}` });
  }

  if (filters.minAvgAmount !== undefined || filters.maxAvgAmount !== undefined) {
    const min = filters.minAvgAmount ? `$${filters.minAvgAmount}` : '0';
    const max = filters.maxAvgAmount ? `$${filters.maxAvgAmount}` : '∞';
    summary.push({ key: 'amount', label: `Amount: ${min} - ${max}` });
  }

  return summary;
});

const updateFilter = <K extends keyof PayeeSearchFilters>(key: K, value: PayeeSearchFilters[K]) => {
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
  searchPlaceholder="Search payees..."
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
        <!-- Payee Type Filter -->
        <div class="space-y-1.5">
          <label for="payee-type-filter" class="text-xs font-medium">Type</label>
          <Select.Root
            type="single"
            value={filters.payeeType || ''}
            onValueChange={(value) => {
              updateFilter('payeeType', (value as PayeeType) || undefined);
            }}>
            <Select.Trigger id="payee-type-filter" class="h-9 w-full">
              {filters.payeeType
                ? payeeTypeOptions.find((opt) => opt.value === filters.payeeType)?.label || 'All'
                : 'All'}
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
              updateFilter(
                'isActive',
                value === 'true' ? true : value === 'false' ? false : undefined
              );
            }}>
            <Select.Trigger id="status-filter" class="h-9 w-full">
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

      <div class="grid grid-cols-2 gap-3">
        <!-- Tax Relevance Filter -->
        <div class="space-y-1.5">
          <label for="tax-relevance-filter" class="text-xs font-medium">Tax</label>
          <Select.Root
            type="single"
            value={filters.taxRelevant?.toString() || ''}
            onValueChange={(value) => {
              updateFilter(
                'taxRelevant',
                value === 'true' ? true : value === 'false' ? false : undefined
              );
            }}>
            <Select.Trigger id="tax-relevance-filter" class="h-9 w-full">
              {filters.taxRelevant === true
                ? 'Relevant'
                : filters.taxRelevant === false
                  ? 'Not Relevant'
                  : 'All'}
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
              updateFilter('paymentFrequency', (value as PaymentFrequency) || undefined);
            }}>
            <Select.Trigger id="payment-frequency-filter" class="h-9 w-full">
              {filters.paymentFrequency
                ? frequencyOptions.find((opt) => opt.value === filters.paymentFrequency)?.label ||
                  'All'
                : 'All'}
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
    <div class="space-y-3 border-t pt-3">
      <h5 class="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Amount Range
      </h5>
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
            class="h-9" />
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
            class="h-9" />
        </div>
      </div>
    </div>

    <!-- Configuration Section -->
    <div class="space-y-3 border-t pt-3">
      <h5 class="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Configuration
      </h5>
      <div class="grid grid-cols-2 gap-2">
        <Button
          variant={filters.hasDefaultCategory ? 'default' : 'outline'}
          size="sm"
          onclick={() =>
            updateFilter('hasDefaultCategory', filters.hasDefaultCategory ? undefined : true)}
          class="h-9 justify-start text-xs">
          Default Category
        </Button>
        <Button
          variant={filters.hasDefaultBudget ? 'default' : 'outline'}
          size="sm"
          onclick={() =>
            updateFilter('hasDefaultBudget', filters.hasDefaultBudget ? undefined : true)}
          class="h-9 justify-start text-xs">
          Default Budget
        </Button>
      </div>
    </div>
  {/snippet}
</EntitySearchToolbar>
