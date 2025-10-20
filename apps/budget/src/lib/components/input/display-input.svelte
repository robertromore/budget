<script lang="ts">
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import * as Select from '$lib/components/ui/select';
import * as Popover from '$lib/components/ui/popover';
import {buttonVariants} from '$lib/components/ui/button';
import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
import {cn} from '$lib/utils';
import {Label} from '$lib/components/ui/label';
import {Badge} from '$lib/components/ui/badge';
import type {SortingState, VisibilityState} from '@tanstack/table-core';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import CircleChevronUp from '@lucide/svelte/icons/chevron-up';
import CircleChevronDown from '@lucide/svelte/icons/chevron-down';
import {Switch} from '$lib/components/ui/switch';
import {getContext} from 'svelte';
import type {CurrentViewsState} from '$lib/states/views';

const currentViewsState = getContext<CurrentViewsState<any>>('current_views');
const currentView = $derived(currentViewsState?.activeView);
const table = $derived(currentView?.table);
const groupableColumns = $derived(table?.getAllColumns().filter((column) => column.getCanGroup()) ?? []);
const sortableColumns = $derived(table?.getAllColumns().filter((column) => column.getCanSort()) ?? []);
const visiableColumns = $derived(table?.getAllColumns().filter((column) => column.getCanHide()) ?? []);

const sorting = $derived(currentView?.view.getSorting() ?? []);
const visibility = $derived(currentView?.view.getVisibility() ?? {});
const visibleColumns = $derived(
  visiableColumns.filter(
    (column) => !Object.keys(visibility).includes(column.id) || visibility[column.id] === true
  )
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
  }
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
  }
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
        <Select.Root
          type="multiple"
          name="grouping"
          bind:value={grouping.value}>
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
        <Select.Root
          type="multiple"
          name="visibility"
          bind:value={visibilityValue.value}>
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
  </Popover.Content>
</Popover.Root>
{/if}
