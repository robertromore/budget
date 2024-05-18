<script lang="ts" generics="TValue">
  import type { FilterManager } from '$lib/filters/FilterManager.svelte';
  import type { FilterOperator, FilterType } from '$lib/filters/BaseFilter.svelte';
  import type { Selected } from 'bits-ui';
  import { cn } from '$lib/utils';
  import type { TransactionsFormat } from '../types';
  import { Button } from '$lib/components/ui/button';
  import * as Popover from '$lib/components/ui/popover';
  import * as Select from '$lib/components/ui/select';
  import type { Column, Header } from './index';

  type Props = {
    label?: string;
    header: Header<TransactionsFormat, TValue>;
    column?: Column<TransactionsFormat, unknown>;
    filterManager?: FilterManager;
  };
  const { label, header, column, filterManager }: Props = $props();

  let operators: Record<string, Record<string, FilterOperator>> | undefined = $derived(
    filterManager?.availableOperators
  );
  let selectedOperators: Selected<string>[] = $state([]);
  let filterValues: unknown[] = $state([]);
</script>

{label ?? header.column.id}

{#if header.column.getCanSort()}
  <Button
    variant="ghost"
    class={cn('cursor-pointer select-none px-2 py-0')}
    onclick={header.column.getToggleSortingHandler()}
  >
    {#if header.column.getIsSorted().toString() === 'asc'}
      <span class="icon-[lucide--arrow-up] size-4"></span>
    {:else if header.column.getIsSorted().toString() === 'desc'}
      <span class="icon-[lucide--arrow-down] size-4"></span>
    {:else}
      <span class="icon-[lucide--arrow-down-up] size-4"></span>
    {/if}
  </Button>
{/if}

{#if header.column.getCanFilter()}
  <Popover.Root>
    <Popover.Trigger asChild let:builder>
      <Button
        builders={[builder]}
        variant="ghost"
        class={cn('cursor-pointer select-none px-2 py-0')}
      >
        <span class="icon-[lucide--filter] size-4"></span>
      </Button>
    </Popover.Trigger>
    <Popover.Content class="w-96">
      <div class="grid gap-4">
        <div class="space-y-2">
          <h4 class="font-medium leading-none">Filter</h4>
          <p class="text-sm text-muted-foreground">Set the filters for this column.</p>
        </div>
        <div class="grid gap-2">
          {#if filterManager && operators}
            {#each filterManager.selectedOperators as _, index}
              <div class="grid grid-cols-12 items-center gap-1">
                <Select.Root
                  bind:selected={selectedOperators[index]}
                  onSelectedChange={(new_operator: Selected<string> | undefined) => {
                  if (new_operator) {
                    filterManager.updateSelectedOperator({ operator: new_operator.value, value: undefined }, index);
                    filterValues[index] = undefined;
                    let [group, id] = new_operator.value.split(':');
                    selectedOperators[index] = filterManager.availableOperators[group][id] as Selected<string>;
                    column?.setFilterValue({
                      context: filterManager,
                      cb: filterManager.passes
                    });
                  }
                }}
                >
                  <Select.Trigger class="col-span-5">
                    <Select.Value placeholder="Filter type" />
                  </Select.Trigger>
                  <Select.Content>
                    {#each Object.entries(operators) as [filter_id, ops]}
                      <Select.Group>
                        {#if filterManager.filters}
                          <Select.Label>{filterManager.getFilter(filter_id)?.label}</Select.Label>
                        {/if}
                        {#each Object.entries(ops).filter(([id]) => !filterManager.selectedOperators.find((selectedFilter) => selectedFilter && selectedFilter.operator === id)) as [id, op]}
                          <Select.Item value={id} label={op.label}>{op.label}</Select.Item>
                        {/each}
                      </Select.Group>
                    {/each}
                  </Select.Content>
                </Select.Root>

                {#if filterManager.selectedOperators && filterManager.selectedOperators[index].operator}
                  <svelte:component
                    this={filterManager.getFilterComponent(filterManager.selectedOperators[index].operator!)}
                    class={cn(filterManager.size >= 1 ? 'col-span-6' : 'col-span-7')}
                    {...filterManager.getFilterProps(filterManager.selectedOperators[index].operator!)}
                    changeFilterValue={(new_value: unknown) => {
                      filterManager.updateSelectedOperator({ value: new_value }, index);
                      filterValues[index] = new_value;
                      column?.setFilterValue({
                        context: filterManager,
                        cb: filterManager.passes
                      });
                    }}
                    bind:value={filterValues[index]}
                  />
                {:else}
                  <div
                    class={cn(filterManager.size >= 1 ? 'col-span-6' : 'col-span-7', 'h-8')}
                  ></div>
                {/if}

                {#if filterManager.size >= 1}
                  <Button
                    variant="outline"
                    class={cn('col-span-1 h-7 cursor-pointer select-none px-2 py-0')}
                    onclick={() => {
                      filterManager.removeSelectedOperator(index);
                      selectedOperators.splice(index, 1);
                      filterValues.splice(index, 1);
                      column?.setFilterValue({
                        context: filterManager,
                        cb: filterManager.passes
                      });
                    }}
                  >
                    <span class="icon-[lucide--minus] size-4"></span>
                  </Button>
                {/if}
              </div>
            {/each}
          {/if}
          <Button
            variant="ghost"
            class={cn('cursor-pointer select-none px-2 py-0')}
            onclick={() => filterManager?.addSelectedOperator()}
          >
            <span class="icon-[lucide--plus] size-4"></span>
          </Button>
        </div>
      </div>
    </Popover.Content>
  </Popover.Root>
{/if}
