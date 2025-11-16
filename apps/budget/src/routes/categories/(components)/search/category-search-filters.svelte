<script lang="ts">
import * as Select from '$lib/components/ui/select';
import type {CategorySearchFilters} from '$lib/server/domains/categories/repository';
import type {CategoryType} from '$lib/schema/categories';

interface Props {
  filters: CategorySearchFilters;
  onFilterChange: (key: keyof CategorySearchFilters, value: any) => void;
}

let {filters, onFilterChange}: Props = $props();
</script>

<!-- Basic Filters Section -->
<div class="space-y-3">
  <h5 class="text-muted-foreground text-xs font-medium tracking-wide uppercase">Basic Filters</h5>

  <div class="grid grid-cols-2 gap-3">
    <!-- Hierarchy Filter -->
    <div class="space-y-1.5">
      <label for="parent-filter" class="text-xs font-medium">Hierarchy</label>
      <Select.Root
        type="single"
        value={filters.hasParent?.toString() || ''}
        onValueChange={(value) => {
          onFilterChange(
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
          onFilterChange(
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
          onFilterChange('categoryType', (value as CategoryType) || undefined);
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
          onFilterChange(
            'isActive',
            value === 'true' ? true : value === 'false' ? false : undefined
          );
        }}>
        <Select.Trigger id="active-filter" class="h-9 w-full">
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
</div>

<!-- Advanced Filters Section -->
<div class="space-y-3">
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
          onFilterChange(
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

    <!-- Budget Tracking Filter -->
    <div class="space-y-1.5">
      <label for="budget-filter" class="text-xs font-medium">Budget</label>
      <Select.Root
        type="single"
        value={filters.isBudgetTracked?.toString() || ''}
        onValueChange={(value) => {
          onFilterChange(
            'isBudgetTracked',
            value === 'true' ? true : value === 'false' ? false : undefined
          );
        }}>
        <Select.Trigger id="budget-filter" class="h-9 w-full">
          {filters.isBudgetTracked === true
            ? 'Tracked'
            : filters.isBudgetTracked === false
              ? 'Not Tracked'
              : 'All'}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All</Select.Item>
          <Select.Item value="true">Budget Tracked</Select.Item>
          <Select.Item value="false">Not Tracked</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>
  </div>
</div>
