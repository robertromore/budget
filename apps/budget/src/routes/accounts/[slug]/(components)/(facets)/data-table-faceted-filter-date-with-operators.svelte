<!--
  @fileoverview Enhanced faceted filter component for transaction dates with comparison operators

  This component provides advanced filtering capabilities for transaction dates, supporting
  various comparison operators (in, before, after, between) with proper date formatting
  and integration with the view management system.

  @component DataTableFacetedFilterDateWithOperators
  @example
  ```svelte
  <DataTableFacetedFilterDateWithOperators
    {column}
    title="Date"
  />
  ```
-->
<script lang="ts" generics="TData, TValue">
import type {Column} from '@tanstack/table-core';
import * as Popover from '$lib/components/ui/popover';
import {Button} from '$lib/components/ui/button';
import {Badge} from '$lib/components/ui/badge';
import {cn} from '$lib/utils';
import {currentViews} from '$lib/states/views';
import X from '@lucide/svelte/icons/x';
import CalendarIcon from '@lucide/svelte/icons/calendar';
import {DateFiltersState} from '$lib/states/ui/date-filters.svelte';
import type {FacetedFilterOption} from '$lib/types';
import * as Command from '$lib/components/ui/command';
import {AdvancedDateDialog} from '$lib/components/dialogs';
import {parseDate} from '@internationalized/date';
import {dayFmt} from '$lib/utils/date-formatters';
import {currentDate, timezone} from '$lib/utils/dates';
import DateInput from '$lib/components/input/date-input.svelte';
import {RangeCalendar} from '$lib/components/ui/range-calendar';
import type {DateRange} from 'bits-ui';

/**
 * Date filter value structure supporting multiple operators
 */
type DateFilterValue =
  | {operator: 'in'; values: Set<string>} // Multiple specific dates
  | {operator: 'before'; date: string} // Before a date
  | {operator: 'after'; date: string} // After a date
  | {operator: 'between'; from: string; to: string}; // Between two dates

/**
 * Component props interface
 */
let {
  column,
  title = 'Date',
}: {
  /** TanStack table column instance for applying filters */
  column: Column<TData, TValue>;
  /** Display title for the filter component */
  title?: string;
} = $props();

/** Controls visibility of operator selection popover */
let operatorOpen = $state(false);
/** Controls visibility of date selection popover/dialog */
let datePickerOpen = $state(false);
/** Controls visibility of advanced date dialog */
let advancedDateDialogOpen = $state(false);

/**
 * Available filter operation types for date comparisons.
 */
const filterTypes = [
  {value: 'in', label: 'in', description: 'Select specific dates'},
  {value: 'before', label: 'before', description: 'Before a date'},
  {value: 'after', label: 'after', description: 'After a date'},
  {value: 'between', label: 'between', description: 'Date range'},
];

// Use runed Context API instead of Svelte's getContext
const currentViewsState = $derived(currentViews.get());
const activeView = $derived(currentViewsState?.activeView);

const dateFiltersState = $derived(DateFiltersState.get());
const allDates = $derived(dateFiltersState?.dateFilters || []);

// Get current filter value
const currentFilter = $derived(column.getFilterValue() as DateFilterValue | undefined);

// Initialize filter with default operator when component mounts
$effect(() => {
  if (!currentFilter) {
    const newFilter: DateFilterValue = {operator: 'in', values: new Set()};
    column.setFilterValue(newFilter);
  }
});

const activeOperator = $derived.by(() => {
  if (!currentFilter) return filterTypes[0];
  return filterTypes.find((t) => t.value === currentFilter.operator) || filterTypes[0];
});

const setOperator = (operator: (typeof filterTypes)[0]) => {
  let newFilter: DateFilterValue;

  switch (operator.value) {
    case 'in':
      newFilter = {operator: 'in', values: new Set()};
      break;
    case 'before':
      newFilter = {operator: 'before', date: ''};
      break;
    case 'after':
      newFilter = {operator: 'after', date: ''};
      break;
    case 'between':
      newFilter = {operator: 'between', from: '', to: ''};
      break;
    default:
      newFilter = {operator: 'in', values: new Set()};
  }

  // Update the column filterFn based on operator
  column.columnDef.filterFn = getFilterFnForOperator(operator.value);
  column.setFilterValue(newFilter);
  operatorOpen = false;
};

const getFilterFnForOperator = (operator: string) => {
  switch (operator) {
    case 'in':
      return 'dateIn' as any;
    case 'before':
      return 'dateBefore' as any;
    case 'after':
      return 'dateAfter' as any;
    case 'between':
      return 'dateBetween' as any;
    default:
      return 'dateIn' as any;
  }
};

const clearFilter = () => {
  if (!currentFilter) {
    activeView?.removeFilter(column.id);
    return;
  }

  // Check if filter has any actual values set
  const hasValues =
    currentFilter.operator === 'in'
      ? currentFilter.values.size > 0
      : currentFilter.operator === 'between'
        ? currentFilter.from !== '' || currentFilter.to !== ''
        : currentFilter.operator === 'before' || currentFilter.operator === 'after'
          ? (currentFilter as any).date !== ''
          : false;

  if (hasValues) {
    // First click: reset to default values
    let newFilter: DateFilterValue;
    switch (currentFilter.operator) {
      case 'in':
        newFilter = {operator: 'in', values: new Set()};
        break;
      case 'before':
        newFilter = {operator: 'before', date: ''};
        break;
      case 'after':
        newFilter = {operator: 'after', date: ''};
        break;
      case 'between':
        newFilter = {operator: 'between', from: '', to: ''};
        break;
    }
    column.setFilterValue(newFilter);
  } else {
    // Second click: remove filter entirely
    column.setFilterValue(undefined);
    activeView?.removeFilter(column.id);
  }
};

const formatFilterValue = (filter: DateFilterValue | undefined): string => {
  if (!filter) return 'Select dates';

  switch (filter.operator) {
    case 'in':
      if (filter.values.size === 0) return 'Select dates';
      if (filter.values.size === 1) {
        const date = Array.from(filter.values)[0];
        return date ? formatDate(date) : 'Select dates';
      }
      return `${filter.values.size} dates`;

    case 'before':
      return filter.date ? formatDate(filter.date) : 'Select date';

    case 'after':
      return filter.date ? formatDate(filter.date) : 'Select date';

    case 'between':
      if (!filter.from && !filter.to) return 'Select range';
      if (filter.from && filter.to) {
        return `${formatDate(filter.from)} - ${formatDate(filter.to)}`;
      }
      return 'Select range';

    default:
      return 'Select dates';
  }
};

const formatDate = (dateStr: string): string => {
  try {
    // Handle special date formats (month:, quarter:, etc.)
    if (dateStr.includes(':')) {
      const parts = dateStr.split(':');
      const value = parts[1];
      if (!value) return dateStr;
      const date = parseDate(value);
      return dayFmt.format(date.toDate(timezone));
    }
    const date = parseDate(dateStr);
    return dayFmt.format(date.toDate(timezone));
  } catch {
    return dateStr;
  }
};

// For 'in' operator: toggle date in set
const toggleDateValue = (dateValue: string) => {
  if (currentFilter && currentFilter.operator === 'in') {
    const newValues = new Set(currentFilter.values);
    if (newValues.has(dateValue)) {
      newValues.delete(dateValue);
    } else {
      newValues.add(dateValue);
    }
    column.setFilterValue({operator: 'in', values: newValues});
  }
};

// Single date value for before/after operators
const singleDateValue = $derived.by(() => {
  if (
    !currentFilter ||
    (currentFilter.operator !== 'before' && currentFilter.operator !== 'after')
  ) {
    return currentDate;
  }
  const dateStr = (currentFilter as any).date;
  return dateStr ? parseDate(dateStr) : currentDate;
});

// Range date value for between operator
const rangeDateValue = $derived.by(() => {
  if (!currentFilter || currentFilter.operator !== 'between') {
    return undefined;
  }

  if (currentFilter.from && currentFilter.to) {
    return {
      start: parseDate(currentFilter.from),
      end: parseDate(currentFilter.to),
    } as DateRange;
  }

  return undefined;
});

const handleAdvancedDateSubmit = (newDate: FacetedFilterOption) => {
  dateFiltersState?.add(newDate);
  if (currentFilter && currentFilter.operator === 'in') {
    toggleDateValue(newDate.value);
  }
  advancedDateDialogOpen = false;
};
</script>

<div class="flex">
  <Badge variant="outline" class="h-8 rounded-r-none">{title}</Badge>

  <!-- Operator Selection -->
  <Popover.Root bind:open={operatorOpen}>
    <Popover.Trigger>
      {#snippet child({props})}
        <Button {...props} variant="outline" size="sm" class="h-8 rounded-none border-l-0">
          {activeOperator?.label}
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-56 p-0" align="start">
      <div class="space-y-1 p-2">
        {#each filterTypes as type}
          <Button
            variant="ghost"
            size="sm"
            class={cn(
              'h-auto w-full flex-col items-start justify-start py-2',
              activeOperator?.value === type.value && 'bg-accent'
            )}
            onclick={() => setOperator(type)}>
            <span class="font-medium">{type.label}</span>
            <span class="text-muted-foreground text-xs">{type.description}</span>
          </Button>
        {/each}
      </div>
    </Popover.Content>
  </Popover.Root>

  <!-- Date Selection - depends on operator -->
  {#if currentFilter}
    {#if currentFilter.operator === 'in'}
      <!-- Multi-select for 'in' operator -->
      <Popover.Root bind:open={datePickerOpen}>
        <Popover.Trigger>
          {#snippet child({props})}
            <Button {...props} variant="outline" size="sm" class="h-8 min-w-32 rounded-none">
              <CalendarIcon class="mr-2 h-4 w-4" />
              {formatFilterValue(currentFilter)}
            </Button>
          {/snippet}
        </Popover.Trigger>
        <Popover.Content class="w-64 p-0" align="start">
          <Command.Root>
            <Command.List>
              <Command.Group>
                {#each allDates as dateOption}
                  <Command.Item
                    value={dateOption.value}
                    onSelect={() => toggleDateValue(dateOption.value)}>
                    <div
                      class={cn(
                        'border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border',
                        currentFilter.values.has(dateOption.value)
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}>
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    {dateOption.label}
                  </Command.Item>
                {/each}
                <Command.Item
                  onSelect={() => (advancedDateDialogOpen = true)}
                  class="justify-center text-center">
                  Custom date
                </Command.Item>
              </Command.Group>
            </Command.List>
          </Command.Root>
        </Popover.Content>
      </Popover.Root>
    {:else if currentFilter.operator === 'before' || currentFilter.operator === 'after'}
      <!-- Single date picker using DateInput component -->
      <DateInput
        value={singleDateValue}
        handleSubmit={(newValue) => {
          if (newValue) {
            const dateStr = newValue.toString();
            if (currentFilter.operator === 'before') {
              column.setFilterValue({operator: 'before', date: dateStr});
            } else if (currentFilter.operator === 'after') {
              column.setFilterValue({operator: 'after', date: dateStr});
            }
          }
        }}
        buttonClass="h-8 rounded-none border-l-0 w-auto" />
    {:else if currentFilter.operator === 'between'}
      <!-- Range date picker using RangeCalendar -->
      <Popover.Root>
        <Popover.Trigger>
          {#snippet child({props})}
            <Button
              {...props}
              variant="outline"
              size="sm"
              class="h-8 min-w-48 rounded-none border-l-0">
              <CalendarIcon class="mr-2 h-4 w-4" />
              {formatFilterValue(currentFilter)}
            </Button>
          {/snippet}
        </Popover.Trigger>
        <Popover.Content class="w-auto p-0" align="start">
          <RangeCalendar
            {...rangeDateValue ? {value: rangeDateValue} : {}}
            onValueChange={(newRange) => {
              if (newRange?.start && newRange?.end) {
                column.setFilterValue({
                  operator: 'between',
                  from: newRange.start.toString(),
                  to: newRange.end.toString(),
                });
              }
            }}
            numberOfMonths={2} />
        </Popover.Content>
      </Popover.Root>
    {/if}

    <!-- Clear Filter Button -->
    <Button
      variant="outline"
      size="sm"
      class="h-8 rounded-l-none border-l-0 p-2"
      onclick={clearFilter}>
      <X class="h-4 w-4" />
    </Button>
  {/if}
</div>

<AdvancedDateDialog bind:dialogOpen={advancedDateDialogOpen} onSubmit={handleAdvancedDateSubmit} />
