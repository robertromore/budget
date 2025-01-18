<script lang="ts" generics="TData, TValue">
	import PlusCircled from "svelte-radix/PlusCircled.svelte";
	import Check from "svelte-radix/Check.svelte";
	import type { Column, FilterFns } from "@tanstack/table-core";
	import type { Component } from "svelte";
	import { SvelteSet } from "svelte/reactivity";
	import * as Command from "$lib/components/ui/command";
	import * as Popover from "$lib/components/ui/popover";
	import { Button } from "$lib/components/ui/button";
	import { cn } from "$lib/utils.js";
	import { Separator } from "$lib/components/ui/separator";
	import { Badge } from "$lib/components/ui/badge";
  import X from 'lucide-svelte/icons/x';
  import type { AvailableFilters } from "$lib/types";

  type Option = {
    label: string;
    value: string;
    icon?: Component;
  }

	type Props<TData, TValue> = {
		column: Column<TData, TValue>;
		title: string;
		options?: Option[];
    allOptions?: Option[];
    allIcon?: Component;
    value?: TValue;
	};

	let { column, title, options, allOptions, allIcon, value }: Props<TData, TValue> = $props();

	const facets = $derived(column?.getFacetedUniqueValues());
  const operators = $derived<AvailableFilters>(column?.columnDef.meta?.availableFilters || []);
	const selectedValues = $derived(new SvelteSet(column?.getFilterValue() as string[]));

  column.setFilterValue(value);

  let showAll = $state(false);
  let activeOperator = $state<string>(column.getFilterFn()?.name as keyof FilterFns);

  const optionsValues = $derived(options?.map(opt => opt.value));
  const showOptions: Option[] = $derived((showAll ? options?.concat(allOptions?.filter(option => !optionsValues?.includes(option.value)) || []) : options) || []);
  const notIn = $derived((allOptions?.length || 0) - (options?.length || 0));

  let variant = 'advanced';
</script>

{#if variant === 'advanced'}
  <div class="flex">
    <Badge variant="outline" class="rounded-r-none">{title}</Badge>
    <Popover.Root>
      <Popover.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="outline" size="sm" class="h-8 rounded-none border-l-0 border-r-0">
            {operators.find(op => op.id === activeOperator)?.label}
          </Button>
        {/snippet}
      </Popover.Trigger>
      <Popover.Content class="min-w-[200px] w-auto p-0" align="start">
        <Command.Root>
          <Command.List>
            <Command.Empty>No operators found.</Command.Empty>
            <Command.Group>
              {#each operators as {id, label}}
                {@const isSelected = activeOperator === id}
                <Command.Item value={id} onSelect={() => {
                  column.columnDef.filterFn = id as keyof FilterFns;
                  // force state refresh
                  column.setFilterValue(column.getFilterValue());
                  activeOperator = id;
                }}>
                  <div
                    class={cn(
                      "border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                  >
                    <Check class={cn("h-4 w-4")} />
                  </div>
                  <span>{label}</span>
                </Command.Item>
              {/each}
            </Command.Group>
          </Command.List>
        </Command.Root>
      </Popover.Content>
    </Popover.Root>
    <Popover.Root>
      <Popover.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="outline" size="sm" class="h-8 rounded-none">
            {#if selectedValues.size === 0}
              <Badge variant="secondary">none selected</Badge>
            {:else}
              <Badge variant="secondary" class="rounded-sm px-1 font-normal lg:hidden">
                {selectedValues.size}
              </Badge>
              <div class="hidden space-x-1 lg:flex">
                {#if selectedValues.size > 2}
                  <Badge variant="secondary" class="rounded-sm px-1 font-normal">
                    {selectedValues.size} selected
                  </Badge>
                {:else}
                  {#each allOptions!.filter((opt) => selectedValues.has(opt.value)) as option}
                    <Badge variant="secondary" class="rounded-sm px-1 font-normal">
                      {option.label}
                    </Badge>
                  {/each}
                {/if}
              </div>
            {/if}
          </Button>
        {/snippet}
      </Popover.Trigger>
      <Popover.Content class="min-w-[200px] w-auto p-0" align="start">
        <Command.Root>
          <Command.Input placeholder={title} />
          <Command.List>
            <Command.Empty>No results found.</Command.Empty>
            <Command.Group>
              {#each showOptions as option}
                {@const isSelected = selectedValues.has(option.value)}
                <Command.Item
                  onSelect={() => {
                    if (isSelected) {
                      selectedValues.delete(option.value);
                    } else {
                      selectedValues.add(option.value);
                    }
                    const filterValues = Array.from(selectedValues);
                    column?.setFilterValue(
                      filterValues.length ? filterValues : undefined
                    );
                  }}
                >
                  <div
                    class={cn(
                      "border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                  >
                    <Check class={cn("h-4 w-4")} />
                  </div>
                  {#if option.icon}
                    {@const Icon = option.icon}
                    <Icon class="size-4" />
                  {/if}

                  <span>{option.label}</span>
                  {@const optionValue = ['category', 'payee'].includes(column.id) ? parseInt(option.value) : option.value}
                  {#if facets?.has(optionValue)}
                    <span
                      class="ml-auto flex size-4 items-center justify-center font-mono text-xs"
                    >
                      {facets.get(optionValue)}
                    </span>
                  {/if}
                </Command.Item>
              {/each}
              {#if allOptions?.length && notIn > 0}
                <Command.Item
                  onSelect={() => showAll = !showAll}
                >
                  {#if allIcon}
                    {@const AllIcon = allIcon}
                    <AllIcon class="size-4" />
                  {/if}
                  <span class="text-slate-800 text-sm">{showAll ? 'hide' : 'show' } {notIn} options not matching any {title.toLowerCase()}</span>
                </Command.Item>
              {/if}
            </Command.Group>
            {#if selectedValues.size > 0}
              <Command.Separator />
              <Command.Group>
                <Command.Item
                  onSelect={() => column?.setFilterValue(undefined)}
                  class="justify-center text-center"
                >
                  Clear filters
                </Command.Item>
              </Command.Group>
            {/if}
          </Command.List>
        </Command.Root>
      </Popover.Content>
    </Popover.Root>
    <Button variant="outline" class="p-2 h-8 rounded-l-none border-l-0" onclick={() => column.columnDef.enableColumnFilter = false}><X/></Button>
  </div>
{:else if variant === 'simple'}
  <Popover.Root>
    <Popover.Trigger>
      {#snippet child({ props })}
        <Button {...props} variant="outline" size="sm" class="h-8 border-dashed">
          <PlusCircled class="mr-2 h-4 w-4" />
          {title}
          {#if selectedValues.size > 0}
            <Separator orientation="vertical" class="mx-2 h-4" />
            <Badge variant="secondary" class="rounded-sm px-1 font-normal lg:hidden">
              {selectedValues.size}
            </Badge>
            <div class="hidden space-x-1 lg:flex">
              {#if selectedValues.size > 2}
                <Badge variant="secondary" class="rounded-sm px-1 font-normal">
                  {selectedValues.size} selected
                </Badge>
              {:else}
                {#each options!.filter((opt) => selectedValues.has(opt.value)) as option}
                  <Badge variant="secondary" class="rounded-sm px-1 font-normal">
                    {option.label}
                  </Badge>
                {/each}
              {/if}
            </div>
          {/if}
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="min-w-[200px] w-auto p-0" align="start">
      <Command.Root>
        <Command.Input placeholder={title} />
        <Command.List>
          <Command.Empty>No results found.</Command.Empty>
          <Command.Group>
            {#each showOptions as option}
              {@const isSelected = selectedValues.has(option.value)}
              <Command.Item
                onSelect={() => {
                  if (isSelected) {
                    selectedValues.delete(option.value);
                  } else {
                    selectedValues.add(option.value);
                  }
                  const filterValues = Array.from(selectedValues);
                  column?.setFilterValue(
                    filterValues.length ? filterValues : undefined
                  );
                }}
              >
                <div
                  class={cn(
                    "border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "opacity-50 [&_svg]:invisible"
                  )}
                >
                  <Check class={cn("h-4 w-4")} />
                </div>
                {#if option.icon}
                  {@const Icon = option.icon}
                  <Icon class="size-4" />
                {/if}

                <span>{option.label}</span>
                {#if facets?.has(parseInt(option.value))}
                  <span
                    class="ml-auto flex size-4 items-center justify-center font-mono text-xs"
                  >
                    {facets.get(parseInt(option.value))}
                  </span>
                {/if}
              </Command.Item>
            {/each}
            <Command.Item
              onSelect={() => showAll = !showAll}
            >
              {#if allIcon}
                {@const AllIcon = allIcon}
                <AllIcon class="size-4" />
              {/if}
              <span class="text-slate-800 text-sm">{showAll ? 'hide' : 'show' } {notIn} options not matching any {title.toLowerCase()}</span>
            </Command.Item>
          </Command.Group>
          {#if selectedValues.size > 0}
            <Command.Separator />
            <Command.Group>
              <Command.Item
                onSelect={() => column?.setFilterValue(undefined)}
                class="justify-center text-center"
              >
                Clear filters
              </Command.Item>
            </Command.Group>
          {/if}
        </Command.List>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>
{/if}
