<!--
  @fileoverview Faceted filter component for transaction amounts with multiple comparison operators

  This component provides advanced filtering capabilities for transaction amounts, supporting
  various comparison operators (equals, greater than, less than, between, not equals) with
  proper currency formatting and integration with the view management system.

  @component DataTableFacetedFilterAmount
  @example
  ```svelte
  <DataTableFacetedFilterAmount
    {column}
    title="Amount"
  />
  ```
-->
<script lang="ts" generics="TData, TValue">
import type {Column} from '@tanstack/table-core';
import * as Popover from '$lib/components/ui/popover';
import {Button} from '$lib/components/ui/button';
import {Badge} from '$lib/components/ui/badge';
import {cn} from '$lib/utils';
import {currencyFormatter} from '$lib/utils/formatters';
import {getContext} from 'svelte';
import type {CurrentViewsState} from '$lib/states/views';
import X from '@lucide/svelte/icons/x';
import type {AmountFilterValue} from '$lib/types/filter';
import NumericInput from '$lib/components/input/numeric-input.svelte';

/**
 * Component props interface
 */
let {
  column,
  title = 'Amount',
}: {
  /** TanStack table column instance for applying filters */
  column: Column<TData, TValue>;
  /** Display title for the filter component */
  title?: string;
} = $props();

/** Controls visibility of operator selection popover */
let operatorOpen = $state(false);

/**
 * Available filter operation types for amount comparisons.
 * Each type represents a different mathematical comparison operation.
 */
const filterTypes = [
  {value: 'equals', label: 'equals'}, // Exact match
  {value: 'greaterThan', label: 'greater than'}, // Amount > value
  {value: 'lessThan', label: 'less than'}, // Amount < value
  {value: 'between', label: 'between'}, // value1 <= Amount <= value2
  {value: 'notEquals', label: 'not equals'}, // Amount != value
];

const currentViewsState = getContext<CurrentViewsState<TData>>('current_views');
const activeView = $derived(currentViewsState?.activeView);
const activeViewModel = $derived(activeView?.view);

const currentFilter = $derived(column.getFilterValue() as AmountFilterValue | undefined);
const hasFilter = $derived(currentFilter !== undefined);

// Initialize filter with default operator when component mounts
$effect(() => {
  if (!currentFilter) {
    const newFilter: AmountFilterValue = {type: 'equals', value: undefined};
    column.setFilterValue(newFilter);
  }
});

const activeOperator = $derived.by(() => {
  if (!currentFilter) return filterTypes[0];
  return filterTypes.find((t) => t.value === currentFilter.type) || filterTypes[0];
});

const setOperator = (operator: (typeof filterTypes)[0]) => {
  if (currentFilter) {
    // When switching types, create new filter with just the type (no default values)
    const newFilter: AmountFilterValue = {type: operator.value};
    column.setFilterValue(newFilter);
  } else {
    // Create new filter with just the type (no default values)
    const newFilter: AmountFilterValue = {type: operator.value};
    column.setFilterValue(newFilter);
  }
  operatorOpen = false;
};

const clearFilter = () => {
  if (!currentFilter) {
    // No filter exists at all - remove from view
    activeView?.removeFilter(column.id);
    return;
  }

  // Check if filter has any actual values set (not at default/undefined)
  const hasValues = currentFilter.type === 'between'
    ? (currentFilter.min !== undefined && currentFilter.min !== 0) ||
      (currentFilter.max !== undefined && currentFilter.max !== 0)
    : (currentFilter.value !== undefined && currentFilter.value !== 0);

  if (hasValues) {
    // First click: reset to default values (undefined, which displays as 0)
    if (currentFilter.type === 'between') {
      const newFilter: AmountFilterValue = {type: currentFilter.type, min: undefined, max: undefined};
      column.setFilterValue(newFilter);
    } else {
      const newFilter: AmountFilterValue = {type: currentFilter.type, value: undefined};
      column.setFilterValue(newFilter);
    }
  } else {
    // Second click: remove filter entirely from view
    column.setFilterValue(undefined);
    activeView?.removeFilter(column.id);
  }
};

const formatFilterValue = (filter: AmountFilterValue | undefined) => {
  if (!filter) return 'Select value';

  if (filter.type === 'between') {
    // Show placeholder if no values are set
    if (filter.min === undefined && filter.max === undefined) {
      return 'Select range';
    }
    // Show partial range if only one value is set
    if (filter.min !== undefined && filter.max !== undefined) {
      return `${currencyFormatter.format(filter.min)} - ${currencyFormatter.format(filter.max)}`;
    }
    return 'Select range';
  }

  // Show placeholder if no value is set
  if (filter.value === undefined) {
    return 'Select value';
  }

  return currencyFormatter.format(filter.value);
};

let inputValue = $state(0);
let rangeMin = $state(0);
let rangeMax = $state(0);

const applySingleValue = () => {
  if (!currentFilter) {
    // If no filter exists, create one with default operator
    const newFilter: AmountFilterValue = {
      type: 'equals',
      value: inputValue
    };
    column.setFilterValue(newFilter);
    return;
  }

  const newFilter: AmountFilterValue = {...currentFilter, value: inputValue};
  column.setFilterValue(newFilter);
};

const applyRangeValue = () => {
  if (!currentFilter) return;

  const newFilter: AmountFilterValue = {...currentFilter, min: rangeMin, max: rangeMax};
  column.setFilterValue(newFilter);
};

// Initialize input values when filter changes
$effect(() => {
  if (currentFilter) {
    if (currentFilter.type === 'between') {
      rangeMin = currentFilter.min ?? 0;
      rangeMax = currentFilter.max ?? 0;
    } else {
      inputValue = currentFilter.value ?? 0;
    }
  } else {
    // Clear inputs when no filter
    inputValue = 0;
    rangeMin = 0;
    rangeMax = 0;
  }
});
</script>

<div class="flex">
  <Badge variant="outline" class="h-8 rounded-r-none">{title}</Badge>

  <!-- Operator Selection -->
  <Popover.Root bind:open={operatorOpen}>
    <Popover.Trigger>
      {#snippet child({props})}
        <Button
          {...props}
          variant="outline"
          size="sm"
          class="h-8 rounded-none border-r-0 border-l-0">
          {activeOperator?.label}
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-48 p-0" align="start">
      <div class="space-y-1 p-2">
        {#each filterTypes as type}
          <Button
            variant="ghost"
            size="sm"
            class={cn('w-full justify-start', activeOperator?.value === type.value && 'bg-accent')}
            onclick={() => setOperator(type)}>
            {type.label}
          </Button>
        {/each}
      </div>
    </Popover.Content>
  </Popover.Root>

  <!-- Value Selection -->
  {#if currentFilter}
    {#if currentFilter.type === 'between'}
      <NumericInput
        id="amount-min"
        bind:value={rangeMin}
        onSubmit={applyRangeValue}
        buttonClass="h-8 rounded-none w-20" />
      <NumericInput
        id="amount-max"
        bind:value={rangeMax}
        onSubmit={applyRangeValue}
        buttonClass="h-8 rounded-none w-20" />
    {:else}
      <NumericInput
        id="amount-value"
        bind:value={inputValue}
        onSubmit={applySingleValue}
        buttonClass="h-8 rounded-none" />
    {/if}

    <!-- Clear Filter Button -->
    <Button
      variant="outline"
      size="sm"
      class="h-8 rounded-l-none border-l-0 p-2"
      onclick={clearFilter}>
      <X class="h-4 w-4" />
    </Button>
  {:else}
    <!-- Placeholder when filter just added but no operator/value set yet -->
    <Button
      variant="outline"
      size="sm"
      class="h-8 rounded-none"
      onclick={() => {
        const newFilter: AmountFilterValue = {type: 'equals', value: undefined};
        column.setFilterValue(newFilter);
      }}>
      Select value
    </Button>
    <Button
      variant="outline"
      size="sm"
      class="h-8 rounded-l-none border-l-0 p-2"
      onclick={clearFilter}>
      <X class="h-4 w-4" />
    </Button>
  {/if}
</div>
