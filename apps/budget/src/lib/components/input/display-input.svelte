<script lang="ts">
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import * as Select from '$lib/components/ui/select';
import * as Popover from '$lib/components/ui/popover';
import {buttonVariants} from '$lib/components/ui/button';
import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
import {cn} from '$lib/utils';
import {Label} from '$lib/components/ui/label';
import {Badge} from '$lib/components/ui/badge';
import type {SortingState, VisibilityState, ColumnPinningState} from '@tanstack/table-core';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import CircleChevronUp from '@lucide/svelte/icons/chevron-up';
import CircleChevronDown from '@lucide/svelte/icons/chevron-down';
import {Switch} from '$lib/components/ui/switch';
import {currentViews} from '$lib/states/views';
import ColumnPinningManager from './column-pinning-manager.svelte';
import ColumnOrderManager from './column-order-manager.svelte';
import {Separator} from '$lib/components/ui/separator';
import * as Collapsible from '$lib/components/ui/collapsible';
import ChevronRight from '@lucide/svelte/icons/chevron-right';

// Use runed Context API instead of Svelte's getContext
const currentViewsState = $derived(currentViews.get());
const currentView = $derived(currentViewsState?.activeView);
const table = $derived(currentView?.table);
// Special UI columns that should be excluded from user controls
const specialColumns = ['select-col', 'expand-contract-col', 'actions', 'transfer'];

const groupableColumns = $derived(
  table?.getAllColumns().filter((column) => {
    if (specialColumns.includes(column.id)) return false;
    return column.getCanGroup();
  }) ?? []
);

const sortableColumns = $derived(
  table?.getAllColumns().filter((column) => {
    if (specialColumns.includes(column.id)) return false;
    return column.getCanSort();
  }) ?? []
);
const visiableColumns = $derived(
  table?.getAllColumns().filter((column) => column.getCanHide()) ?? []
);
const pinnableColumns = $derived(
  table?.getAllColumns().filter((column) => {
    if (specialColumns.includes(column.id)) return false;
    return column.getCanPin?.();
  }) ?? []
);

const sorting = $derived(currentView?.view.getSorting() ?? []);
const visibility = $derived(currentView?.view.getVisibility() ?? {});
const pinning = $derived(currentView?.view.getPinning() ?? {left: [], right: []});
const columnOrder = $derived(currentView?.view.getColumnOrder() ?? []);
const visibleColumns = $derived(
  visiableColumns.filter(
    (column) => !Object.keys(visibility).includes(column.id) || visibility[column.id] === true
  )
);

// All columns that are currently visible and should appear in the column order manager
// Excludes special columns (select, expand/contract, actions, transfer indicator)
const allVisibleColumns = $derived(
  table?.getAllColumns().filter((column) => {
    if (specialColumns.includes(column.id)) return false;

    // Columns that can't be hidden are always visible
    if (!column.getCanHide()) return true;
    // For columns that can be hidden, check visibility state
    return !Object.keys(visibility).includes(column.id) || visibility[column.id] === true;
  }) ?? []
);

// Grouping state - derived from view, with setter to update view
const grouping = {
  get value() {
    return currentView?.view.getGrouping() ?? [];
  },
  set value(newGrouping: string[]) {
    if (currentView?.view) {
      currentView.updateTableGrouping(newGrouping);
    }
  },
};

// Visibility state - derived from view, with setter to update view
const visibilityValue = {
  get value() {
    return visibleColumns.map((visibleColumn) => visibleColumn.id);
  },
  set value(newVisibility: string[]) {
    if (!currentView) return;
    const visibility = Object.assign(
      {},
      ...visiableColumns.map((column) => {
        return {[column.id as string]: false};
      }),
      ...newVisibility.map((id) => {
        return {[id as string]: true};
      })
    ) as VisibilityState;
    currentView.updateTableVisibility(visibility);
  },
};

// Pinning update handlers
const updateLeftPinning = (newPinning: string[]) => {
  if (!currentView) return;
  const pinningState: ColumnPinningState = {
    left: newPinning,
    right: pinning.right ?? [],
  };
  currentView.updateTablePinning(pinningState);
};

const updateRightPinning = (newPinning: string[]) => {
  if (!currentView) return;
  const pinningState: ColumnPinningState = {
    left: pinning.left ?? [],
    right: newPinning,
  };
  currentView.updateTablePinning(pinningState);
};

// Column order update handler
// Merges the new order (visible columns only) with hidden columns to preserve their positions
const updateColumnOrder = (newOrder: string[]) => {
  if (!currentView) return;

  // Get the current full column order
  const currentOrder = columnOrder;

  // Get IDs of all visible columns
  const visibleColumnIds = new Set(allVisibleColumns.map((col) => col.id));

  // Extract hidden columns from current order to preserve their positions
  const hiddenColumns = currentOrder.filter((id) => !visibleColumnIds.has(id));

  // Merge: new visible order + preserved hidden columns at the end
  const mergedOrder = [...newOrder, ...hiddenColumns];

  currentView.updateTableColumnOrder(mergedOrder);
};

// Only render if we have a valid context
const hasContext = $derived(!!currentView?.view && !!table);
</script>

{#if hasContext}
  <Popover.Root>
    <Popover.Trigger class={cn(buttonVariants({variant: 'outline'}), 'h-8')}>
      <SlidersHorizontal />
      Display
    </Popover.Trigger>
    <Popover.Content class="w-80">
      <div class="grid gap-2">
        <div class="grid grid-cols-3 items-center gap-4">
          <Label for="grouping">Grouping</Label>
          <Select.Root type="multiple" name="grouping" bind:value={grouping.value}>
            <Select.Trigger class="w-[180px]">
              {#if grouping.value.length === 0}
                <Badge variant="secondary">none selected</Badge>
              {:else}
                <div class="hidden space-x-1 lg:flex">
                  {#if grouping.value.length > 2}
                    <Badge variant="secondary" class="rounded-sm px-1 font-normal">
                      {grouping.value.length} selected
                    </Badge>
                  {:else}
                    {#each groupableColumns.filter( (column) => grouping.value.includes(column.id) ) as groupableColumn}
                      <Badge variant="secondary" class="rounded-sm px-1 font-normal">
                        {groupableColumn.columnDef.meta?.label}
                      </Badge>
                    {/each}
                  {/if}
                </div>
              {/if}
            </Select.Trigger>
            <Select.Content>
              <Select.Group>
                {#each groupableColumns as column}
                  <Select.Item value={column.id} label={column.columnDef.meta?.label ?? column.id}>
                    {column.columnDef.meta?.label ?? column.id}
                  </Select.Item>
                {/each}
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </div>
        <div class="grid grid-cols-3 items-center gap-4">
          <Label>Sorting</Label>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              class={cn(
                'border-input text-muted-foreground ring-offset-background focus:ring-ring flex h-9 w-[180px] items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-sm focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1'
              )}>
              {#if sorting.length === 0}
                <Badge variant="secondary">none selected</Badge>
              {:else}
                <div class="hidden space-x-1 lg:flex">
                  {#if sorting.length > 2}
                    <Badge variant="secondary" class="rounded-sm px-1 text-xs font-semibold">
                      {sorting.length} selected
                    </Badge>
                  {:else}
                    {#each sorting as sort}
                      {@const col = sortableColumns.find((column) => sort.id === column.id)}
                      {#if col}
                        <Badge variant="secondary" class="rounded-sm px-1 text-xs font-semibold">
                          {col.columnDef.meta?.label}
                          {#if sort.desc}
                            <CircleChevronDown class="ml-1 size-4" />
                          {:else}
                            <CircleChevronUp class="ml-1 size-4" />
                          {/if}
                        </Badge>
                      {/if}
                    {/each}
                  {/if}
                </div>
              {/if}
              <ChevronDown class="size-4 opacity-50" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Group>
                {#each sortableColumns as column}
                  <DropdownMenu.Item
                    onSelect={() => {
                      if (!currentView?.view) return;
                      let newState = currentView.view.getSorting();
                      if (!sorting.find((sorter) => sorter.id === column.id)) {
                        newState.push({
                          id: column.id,
                          desc: false,
                        });
                      } else {
                        newState = newState
                          .map((sorter) => {
                            if (sorter.id !== column.id) {
                              return sorter;
                            }
                            if (sorter.desc === true) {
                              return false;
                            }
                            if (sorter.desc === false) {
                              return Object.assign({}, sorter, {desc: true});
                            }
                            return {
                              id: column.id,
                              desc: false,
                            };
                          })
                          .filter(Boolean) as SortingState;
                      }
                      currentView.updateTableSorting(newState);
                    }}
                    closeOnSelect={false}>
                    {column.columnDef.meta?.label}
                    {@const sorter = sorting.find((sort) => sort.id === column.id)}
                    {#if sorter && sorter.desc}
                      <CircleChevronDown class="absolute right-0 mr-1" />
                    {:else if sorter && !sorter.desc}
                      <CircleChevronUp class="absolute right-0 mr-1" />
                    {/if}
                  </DropdownMenu.Item>
                {/each}
              </DropdownMenu.Group>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
        <div class="grid grid-cols-3 items-center gap-4">
          <Label>Visibility</Label>
          <Select.Root type="multiple" name="visibility" bind:value={visibilityValue.value}>
            <Select.Trigger class="text-muted-foreground w-[180px]">
              {#if visibleColumns.length === 0}
                <Badge variant="secondary">none selected</Badge>
              {:else}
                <div class="hidden space-x-1 lg:flex">
                  {#if visibleColumns.length > 2}
                    <Badge variant="secondary" class="rounded-sm px-1 font-normal">
                      {visibleColumns.length} selected
                    </Badge>
                  {:else}
                    {#each visibleColumns as visibleColumn}
                      <Badge variant="secondary" class="rounded-sm px-1 font-normal">
                        {visibleColumn.columnDef.meta?.label}
                      </Badge>
                    {/each}
                  {/if}
                </div>
              {/if}
            </Select.Trigger>
            <Select.Content>
              <Select.Group>
                {#each visiableColumns as column}
                  <Select.Item value={column.id} label={column.columnDef.meta?.label ?? column.id}>
                    {column.columnDef.meta?.label ?? column.id}
                  </Select.Item>
                {/each}
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      <Separator class="my-4" />

      {#if pinnableColumns.length > 0}
        <Collapsible.Root class="space-y-2">
          <Collapsible.Trigger
            class="flex w-full items-center justify-between text-sm font-medium hover:underline">
            Pin Left
            <ChevronRight
              class="size-4 transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
          </Collapsible.Trigger>
          <Collapsible.Content class="pt-2">
            <ColumnPinningManager
              pinnedColumns={pinning.left ?? []}
              availableColumns={pinnableColumns}
              onUpdate={updateLeftPinning} />
          </Collapsible.Content>
        </Collapsible.Root>

        <Collapsible.Root class="space-y-2">
          <Collapsible.Trigger
            class="flex w-full items-center justify-between text-sm font-medium hover:underline">
            Pin Right
            <ChevronRight
              class="size-4 transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
          </Collapsible.Trigger>
          <Collapsible.Content class="pt-2">
            <ColumnPinningManager
              pinnedColumns={pinning.right ?? []}
              availableColumns={pinnableColumns}
              onUpdate={updateRightPinning} />
          </Collapsible.Content>
        </Collapsible.Root>

        <Separator class="my-2" />
      {/if}

      <Collapsible.Root class="space-y-2">
        <Collapsible.Trigger
          class="flex w-full items-center justify-between text-sm font-medium hover:underline">
          Column Order
          <ChevronRight
            class="size-4 transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
        </Collapsible.Trigger>
        <Collapsible.Content class="pt-2">
          <ColumnOrderManager
            columns={allVisibleColumns}
            {columnOrder}
            onUpdate={updateColumnOrder} />
        </Collapsible.Content>
      </Collapsible.Root>

      <div class="mt-4 flex justify-start">
        <Switch
          id="expand-all"
          checked={typeof currentView?.view.getExpanded() === 'boolean' &&
            (currentView.view.getExpanded() as boolean)}
          onCheckedChange={(checked) => {
            if (!currentView) return;
            currentView.updateTableAllRowsExpanded(checked ? true : {});
          }}
          aria-labelledby="Expand all rows"
          disabled={grouping.value.length === 0} />
        <Label
          for="expand-all"
          class="ml-1 text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Expand All
        </Label>
      </div>

      <div class="mt-2 flex justify-start">
        <Switch
          id="dense-mode"
          checked={currentView?.view.getDensity() === 'dense'}
          onCheckedChange={(checked) => {
            if (!currentView) return;
            currentView.updateTableDensity(checked ? 'dense' : 'normal');
          }}
          aria-labelledby="Dense mode" />
        <Label
          for="dense-mode"
          class="ml-1 text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Dense
        </Label>
      </div>

      <div class="mt-2 flex justify-start">
        <Switch
          id="sticky-header"
          checked={currentView?.view.getStickyHeader() === true}
          onCheckedChange={(checked) => {
            if (!currentView) return;
            currentView.view.setStickyHeader(checked);
          }}
          aria-labelledby="Sticky header" />
        <Label
          for="sticky-header"
          class="ml-1 text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Sticky header
        </Label>
      </div>

      <div class="mt-4">
        <Label for="page-size" class="text-sm font-medium">Rows per page</Label>
        <Select.Root
          allowDeselect={false}
          type="single"
          value={String(currentView?.view.getPageSize() ?? 25)}
          onValueChange={(value) => {
            if (!currentView || !value) return;
            currentView.view.setPageSize(Number(value));
          }}>
          <Select.Trigger id="page-size" class="mt-1 h-9 w-full">
            {currentView?.view.getPageSize() ?? 25}
          </Select.Trigger>
          <Select.Content>
            {#each [10, 20, 25, 30, 40, 50, 100] as pageSize (pageSize)}
              <Select.Item value={String(pageSize)}>
                {pageSize}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </Popover.Content>
  </Popover.Root>
{/if}
