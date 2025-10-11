<script lang="ts">
  import * as Select from '$lib/components/ui/select';
  import type {BudgetType, BudgetStatus, BudgetScope, BudgetEnforcementLevel} from '$lib/schema/budgets';
  import type {BudgetSearchFilters} from '$lib/states/ui/budget-search.svelte';

  interface Props {
    filters: BudgetSearchFilters;
    onFilterChange: (key: keyof BudgetSearchFilters, value: any) => void;
  }

  let {filters, onFilterChange}: Props = $props();

  const typeOptions: Array<{value: BudgetType; label: string}> = [
    {value: 'account-monthly', label: 'Account Monthly'},
    {value: 'category-envelope', label: 'Category Envelope'},
    {value: 'goal-based', label: 'Goal Based'},
    {value: 'scheduled-expense', label: 'Scheduled Expense'},
  ];

  const statusOptions: Array<{value: BudgetStatus; label: string}> = [
    {value: 'active', label: 'Active'},
    {value: 'inactive', label: 'Inactive'},
    {value: 'archived', label: 'Archived'},
  ];

  const scopeOptions: Array<{value: BudgetScope; label: string}> = [
    {value: 'account', label: 'Account'},
    {value: 'category', label: 'Category'},
    {value: 'global', label: 'Global'},
    {value: 'mixed', label: 'Mixed'},
  ];

  const enforcementOptions: Array<{value: BudgetEnforcementLevel; label: string}> = [
    {value: 'none', label: 'None'},
    {value: 'warning', label: 'Warning'},
    {value: 'strict', label: 'Strict'},
  ];
</script>

<!-- Basic Filters Section -->
<div class="space-y-3">
  <h5 class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Basic Filters</h5>

  <div class="grid grid-cols-2 gap-3">
    <!-- Budget Type Filter -->
    <div class="space-y-1.5">
      <label for="budget-type-filter" class="text-xs font-medium">Type</label>
      <Select.Root
        type="single"
        value={filters.type || ''}
        onValueChange={(value) => {
          onFilterChange('type', value as BudgetType || undefined);
        }}>
        <Select.Trigger id="budget-type-filter" class="h-9 w-full">
          {filters.type
            ? typeOptions.find((opt) => opt.value === filters.type)?.label || 'All'
            : 'All'}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All types</Select.Item>
          {#each typeOptions as option}
            <Select.Item value={option.value}>{option.label}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>

    <!-- Status Filter -->
    <div class="space-y-1.5">
      <label for="budget-status-filter" class="text-xs font-medium">Status</label>
      <Select.Root
        type="single"
        value={filters.status || ''}
        onValueChange={(value) => {
          onFilterChange('status', value as BudgetStatus || undefined);
        }}>
        <Select.Trigger id="budget-status-filter" class="h-9 w-full">
          {filters.status
            ? statusOptions.find((opt) => opt.value === filters.status)?.label || 'All'
            : 'All'}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All statuses</Select.Item>
          {#each statusOptions as option}
            <Select.Item value={option.value}>{option.label}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
  </div>

  <div class="grid grid-cols-2 gap-3">
    <!-- Scope Filter -->
    <div class="space-y-1.5">
      <label for="budget-scope-filter" class="text-xs font-medium">Scope</label>
      <Select.Root
        type="single"
        value={filters.scope || ''}
        onValueChange={(value) => {
          onFilterChange('scope', value as BudgetScope || undefined);
        }}>
        <Select.Trigger id="budget-scope-filter" class="h-9 w-full">
          {filters.scope
            ? scopeOptions.find((opt) => opt.value === filters.scope)?.label || 'All'
            : 'All'}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All scopes</Select.Item>
          {#each scopeOptions as option}
            <Select.Item value={option.value}>{option.label}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>

    <!-- Enforcement Level Filter -->
    <div class="space-y-1.5">
      <label for="budget-enforcement-filter" class="text-xs font-medium">Enforcement</label>
      <Select.Root
        type="single"
        value={filters.enforcementLevel || ''}
        onValueChange={(value) => {
          onFilterChange('enforcementLevel', value as BudgetEnforcementLevel || undefined);
        }}>
        <Select.Trigger id="budget-enforcement-filter" class="h-9 w-full">
          {filters.enforcementLevel
            ? enforcementOptions.find((opt) => opt.value === filters.enforcementLevel)?.label || 'All'
            : 'All'}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All levels</Select.Item>
          {#each enforcementOptions as option}
            <Select.Item value={option.value}>{option.label}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
  </div>
</div>
