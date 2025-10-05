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
import {Input} from '$lib/components/ui/input';
import {Badge} from '$lib/components/ui/badge';
import {cn} from '$lib/utils';
import {currencyFormatter} from '$lib/utils/formatters';
import {currentViews} from '$lib/states/views';
import X from '@lucide/svelte/icons/x';

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
/** Controls visibility of value input popover */
let valueOpen = $state(false);

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

const activeView = $derived(currentViews.get().activeView);
const activeViewModel = $derived(activeView.view);

const currentFilter = $derived(column.getFilterValue() as any);
const hasFilter = $derived(currentFilter !== undefined);

const activeOperator = $derived(() => {
  if (!currentFilter) return filterTypes[0];
  return filterTypes.find((t) => t.value === currentFilter.type) || filterTypes[0];
});

const setOperator = (operator: (typeof filterTypes)[0]) => {
  if (currentFilter) {
    // When switching types, create new filter with just the type (no default values)
    const newFilter = {type: operator.value};
    column.setFilterValue(newFilter);
  } else {
    // Create new filter with just the type (no default values)
    column.setFilterValue({type: operator.value});
  }
  operatorOpen = false;
};

const clearFilter = () => {
  column.setFilterValue(undefined);
  valueOpen = false;
};

const formatFilterValue = (filter: any) => {
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

let inputValue = $state('');
let rangeMin = $state('');
let rangeMax = $state('');

const applyValue = () => {
  if (!currentFilter) return;

  if (currentFilter.type === 'between') {
    const min = parseFloat(rangeMin);
    const max = parseFloat(rangeMax);
    if (!isNaN(min) && !isNaN(max)) {
      const newFilter = {...currentFilter, min, max};
      column.setFilterValue(newFilter);
    }
  } else {
    const value = parseFloat(inputValue);
    if (!isNaN(value)) {
      const newFilter = {...currentFilter, value};
      column.setFilterValue(newFilter);
    }
  }
  valueOpen = false;
};

// Initialize input values when filter changes
$effect(() => {
  if (currentFilter) {
    if (currentFilter.type === 'between') {
      rangeMin = currentFilter.min !== undefined ? currentFilter.min.toString() : '';
      rangeMax = currentFilter.max !== undefined ? currentFilter.max.toString() : '';
    } else {
      inputValue = currentFilter.value !== undefined ? currentFilter.value.toString() : '';
    }
  } else {
    // Clear inputs when no filter
    inputValue = '';
    rangeMin = '';
    rangeMax = '';
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
          {activeOperator().label}
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-48 p-0" align="start">
      <div class="space-y-1 p-2">
        {#each filterTypes as type}
          <Button
            variant="ghost"
            size="sm"
            class={cn('w-full justify-start', activeOperator().value === type.value && 'bg-accent')}
            onclick={() => setOperator(type)}>
            {type.label}
          </Button>
        {/each}
      </div>
    </Popover.Content>
  </Popover.Root>

  <!-- Value Selection -->
  <Popover.Root bind:open={valueOpen}>
    <Popover.Trigger>
      {#snippet child({props})}
        <Button {...props} variant="outline" size="sm" class="h-8 rounded-none">
          {formatFilterValue(currentFilter)}
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-80" align="start">
      <div class="space-y-4 p-4">
        {#if currentFilter?.type === 'between'}
          <div class="grid grid-cols-2 gap-2">
            <div class="space-y-2">
              <label for="amount-min" class="text-sm font-medium">Min Amount</label>
              <Input
                id="amount-min"
                type="number"
                step="0.01"
                bind:value={rangeMin}
                placeholder="0.00"
                onkeydown={(e) => {
                  if (e.key === 'Enter') {
                    applyValue();
                  }
                }} />
            </div>
            <div class="space-y-2">
              <label for="amount-max" class="text-sm font-medium">Max Amount</label>
              <Input
                id="amount-max"
                type="number"
                step="0.01"
                bind:value={rangeMax}
                placeholder="100.00"
                onkeydown={(e) => {
                  if (e.key === 'Enter') {
                    applyValue();
                  }
                }} />
            </div>
          </div>
        {:else}
          <div class="space-y-2">
            <label for="amount-value" class="text-sm font-medium">Amount</label>
            <Input
              id="amount-value"
              type="number"
              step="0.01"
              bind:value={inputValue}
              placeholder="0.00"
              onkeydown={(e) => {
                if (e.key === 'Enter') {
                  applyValue();
                }
              }} />
          </div>
        {/if}

        <div class="flex space-x-2">
          <Button size="sm" onclick={applyValue}>Apply</Button>
          <Button variant="outline" size="sm" onclick={clearFilter}>Clear</Button>
        </div>
      </div>
    </Popover.Content>
  </Popover.Root>

  <!-- Clear Filter Button -->
  <Button
    variant="outline"
    size="sm"
    class="h-8 rounded-l-none border-l-0 p-2"
    onclick={clearFilter}>
    <X class="h-4 w-4" />
  </Button>
</div>
