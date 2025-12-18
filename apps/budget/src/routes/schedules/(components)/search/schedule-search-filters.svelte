<script lang="ts">
import * as Select from '$lib/components/ui/select';
import { rpc } from '$lib/query';
import { BudgetState } from '$lib/states/budgets.svelte';
import { AccountsState, CategoriesState, PayeesState } from '$lib/states/entities';
import type { ScheduleSearchFilters } from '$lib/states/ui/schedule-search.svelte';

interface Props {
  filters: ScheduleSearchFilters;
  onFilterChange: (key: keyof ScheduleSearchFilters, value: any) => void;
}

let { filters, onFilterChange }: Props = $props();

// Get entity states
const accountsState = $derived(AccountsState.get());
const payeesState = $derived(PayeesState.get());
const categoriesState = $derived(CategoriesState.get());
const budgetState = $derived(BudgetState.get());

const accounts = $derived(Array.from(accountsState.accounts.values()));
const payees = $derived(Array.from(payeesState.payees.values()));
const categories = $derived(Array.from(categoriesState.categories.values()));

// Fetch budgets using query
const budgetsQuery = $derived(rpc.budgets.listBudgets().options());
const budgets = $derived(budgetsQuery.data ?? budgetState.all);
</script>

<!-- Basic Filters Section -->
<div class="space-y-3">
  <h5 class="text-muted-foreground text-xs font-medium tracking-wide uppercase">Basic Filters</h5>

  <div class="grid grid-cols-2 gap-3">
    <!-- Status Filter -->
    <div class="space-y-1.5">
      <label for="status-filter" class="text-xs font-medium">Status</label>
      <Select.Root
        type="single"
        value={filters.status || ''}
        onValueChange={(value) => {
          onFilterChange('status', value || undefined);
        }}>
        <Select.Trigger id="status-filter" class="h-9 w-full">
          {filters.status === 'active'
            ? 'Active'
            : filters.status === 'inactive'
              ? 'Inactive'
              : 'All'}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All</Select.Item>
          <Select.Item value="active">Active</Select.Item>
          <Select.Item value="inactive">Inactive</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>

    <!-- Recurring Filter -->
    <div class="space-y-1.5">
      <label for="recurring-filter" class="text-xs font-medium">Recurring</label>
      <Select.Root
        type="single"
        value={filters.recurring?.toString() || ''}
        onValueChange={(value) => {
          onFilterChange(
            'recurring',
            value === 'true' ? true : value === 'false' ? false : undefined
          );
        }}>
        <Select.Trigger id="recurring-filter" class="h-9 w-full">
          {filters.recurring === true
            ? 'Recurring'
            : filters.recurring === false
              ? 'One-time'
              : 'All'}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All</Select.Item>
          <Select.Item value="true">Recurring</Select.Item>
          <Select.Item value="false">One-time</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>

    <!-- Auto-Add Filter -->
    <div class="space-y-1.5">
      <label for="autoadd-filter" class="text-xs font-medium">Auto-Add</label>
      <Select.Root
        type="single"
        value={filters.autoAdd?.toString() || ''}
        onValueChange={(value) => {
          onFilterChange(
            'autoAdd',
            value === 'true' ? true : value === 'false' ? false : undefined
          );
        }}>
        <Select.Trigger id="autoadd-filter" class="h-9 w-full">
          {filters.autoAdd === true ? 'Enabled' : filters.autoAdd === false ? 'Disabled' : 'All'}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All</Select.Item>
          <Select.Item value="true">Enabled</Select.Item>
          <Select.Item value="false">Disabled</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>

    <!-- Amount Type Filter -->
    <div class="space-y-1.5">
      <label for="amount-type-filter" class="text-xs font-medium">Amount Type</label>
      <Select.Root
        type="single"
        value={filters.amountType || ''}
        onValueChange={(value) => {
          onFilterChange('amountType', value || undefined);
        }}>
        <Select.Trigger id="amount-type-filter" class="h-9 w-full">
          {filters.amountType
            ? filters.amountType.charAt(0).toUpperCase() + filters.amountType.slice(1)
            : 'All'}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All</Select.Item>
          <Select.Item value="exact">Exact</Select.Item>
          <Select.Item value="approximate">Approximate</Select.Item>
          <Select.Item value="range">Range</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>
  </div>
</div>

<!-- Related Entities Section -->
<div class="space-y-3">
  <h5 class="text-muted-foreground text-xs font-medium tracking-wide uppercase">
    Related Entities
  </h5>

  <div class="grid grid-cols-2 gap-3">
    <!-- Account Filter -->
    <div class="space-y-1.5">
      <label for="account-filter" class="text-xs font-medium">Account</label>
      <Select.Root
        type="single"
        value={filters.accountId?.toString() || ''}
        onValueChange={(value) => {
          onFilterChange('accountId', value ? parseInt(value, 10) : undefined);
        }}>
        <Select.Trigger id="account-filter" class="h-9 w-full">
          {filters.accountId
            ? accounts.find((a) => a.id === filters.accountId)?.name || 'Unknown'
            : 'All Accounts'}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All Accounts</Select.Item>
          {#each accounts as account}
            <Select.Item value={account.id.toString()}>{account.name}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>

    <!-- Payee Filter -->
    <div class="space-y-1.5">
      <label for="payee-filter" class="text-xs font-medium">Payee</label>
      <Select.Root
        type="single"
        value={filters.payeeId?.toString() || ''}
        onValueChange={(value) => {
          onFilterChange('payeeId', value ? parseInt(value, 10) : undefined);
        }}>
        <Select.Trigger id="payee-filter" class="h-9 w-full">
          {filters.payeeId
            ? payees.find((p) => p.id === filters.payeeId)?.name || 'Unknown'
            : 'All Payees'}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All Payees</Select.Item>
          {#each payees as payee}
            <Select.Item value={payee.id.toString()}>{payee.name}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>

    <!-- Category Filter -->
    <div class="space-y-1.5">
      <label for="category-filter" class="text-xs font-medium">Category</label>
      <Select.Root
        type="single"
        value={filters.categoryId?.toString() || ''}
        onValueChange={(value) => {
          onFilterChange('categoryId', value ? parseInt(value, 10) : undefined);
        }}>
        <Select.Trigger id="category-filter" class="h-9 w-full">
          {filters.categoryId
            ? categories.find((c) => c.id === filters.categoryId)?.name || 'Unknown'
            : 'All Categories'}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All Categories</Select.Item>
          {#each categories as category}
            <Select.Item value={category.id.toString()}>{category.name}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>

    <!-- Budget Filter -->
    <div class="space-y-1.5">
      <label for="budget-filter" class="text-xs font-medium">Budget</label>
      <Select.Root
        type="single"
        value={filters.budgetId?.toString() || ''}
        onValueChange={(value) => {
          onFilterChange('budgetId', value ? parseInt(value, 10) : undefined);
        }}>
        <Select.Trigger id="budget-filter" class="h-9 w-full">
          {filters.budgetId
            ? budgets.find((b) => b.id === filters.budgetId)?.name || 'Unknown'
            : 'All Budgets'}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All Budgets</Select.Item>
          {#each budgets as budget}
            <Select.Item value={budget.id.toString()}>{budget.name}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
  </div>
</div>
