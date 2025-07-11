<script lang="ts" generics="TData, TValue">
  import Check from "@lucide/svelte/icons/check";
  import type { Column, FilterFns } from "@tanstack/table-core";
  import type { Component, Snippet } from "svelte";
  import * as Command from "$lib/components/ui/command";
  import * as Popover from "$lib/components/ui/popover";
  import { Button } from "$lib/components/ui/button";
  import { cn } from "$lib/utils.js";
  import { Badge } from "$lib/components/ui/badge";
  import X from "@lucide/svelte/icons/x";
  import type { AvailableFilters, FacetedFilterOption } from "$lib/types";
  import { currentViews } from "$lib/states/current-views.svelte";
  import type { SvelteMap } from "svelte/reactivity";

  type Props<TData, TValue> = {
    column: Column<TData, TValue>;
    title: string;
    options?: SvelteMap<string | number, FacetedFilterOption>;
    allOptions?: SvelteMap<string | number, FacetedFilterOption>;
    allIcon?: Component;
    customValueSnippet?: Snippet;
  };

  let { column, title, options, allOptions, allIcon, customValueSnippet }: Props<TData, TValue> = $props();

  const facets = $derived(column?.getFacetedUniqueValues());
  const operators = $derived<AvailableFilters>(column?.columnDef.meta?.availableFilters || []);

  let showAll = $state(false);
  let activeOperator = $state<string>(column.getFilterFn()?.name as keyof FilterFns);

  const optionsValues = $derived(options?.values().toArray());
  const optionsRawValues = $derived(optionsValues?.map((opt) => opt.value));
  const showOptions: FacetedFilterOption[] = $derived(
    (showAll
      ? optionsValues?.concat(
          allOptions?.values().toArray().filter((option) => !optionsRawValues?.includes(option.value)) || []
        )
      : optionsValues) || []
  );
  const notIn = $derived((allOptions?.size || 0) - (options?.size || 0));

  const activeView = $derived(currentViews.get().activeView);
  const activeViewModel = $derived(activeView.view);
  const selectedValues = $derived(activeViewModel.getFilterValue(column.id));
</script>

<div class="flex">
  <Badge variant="outline" class="h-8 rounded-r-none">{title}</Badge>
  <Popover.Root>
    <Popover.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="outline"
          size="sm"
          class="h-8 rounded-none border-l-0 border-r-0"
        >
          {operators.find((op) => op.id === activeOperator)?.label}
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-auto min-w-[200px] p-0" align="start">
      <Command.Root>
        <Command.List>
          <Command.Empty>No operators found.</Command.Empty>
          <Command.Group>
            {#each operators as { id, label }}
              {@const isSelected = activeOperator === id}
              <Command.Item
                value={id}
                onSelect={() => {
                  activeView.updateFilter({
                    column: column.id,
                    filter: id,
                  });
                  activeOperator = id;
                }}
              >
                <div
                  class={cn(
                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
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
                {#each allOptions!.values().filter((opt) => selectedValues.has(opt.value)) as option}
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
    <Popover.Content class="w-auto min-w-[200px] p-0" align="start">
      <Command.Root>
        <Command.Input placeholder={title} />
        <Command.List>
          <Command.Empty>No results found.</Command.Empty>
          <Command.Group>
            {#each showOptions as option}
              {@const isSelected = selectedValues.has(option.value)}
              <Command.Item
                onSelect={() => {
                  activeView.toggleFilterValue(column.id, option.value);
                }}
              >
                <div
                  class={cn(
                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
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
                {@const optionValue = ["category", "payee"].includes(column.id)
                  ? parseInt(option.value)
                  : option.value}
                {#if facets?.has(optionValue)}
                  <span class="ml-auto flex size-4 items-center justify-center font-mono text-xs">
                    {facets.get(optionValue)}
                  </span>
                {/if}
              </Command.Item>
            {/each}
            {#if allOptions?.size && notIn > 0}
              <Command.Item onSelect={() => (showAll = !showAll)}>
                {#if allIcon}
                  {@const AllIcon = allIcon}
                  <AllIcon class="size-4" />
                {/if}
                <span class="text-sm text-slate-800"
                  >{showAll ? "hide" : "show"}
                  {notIn} options not matching any {title.toLowerCase()}</span
                >
              </Command.Item>
            {/if}
          </Command.Group>

          {#if customValueSnippet}
            <Command.Separator />
            <Command.Group>
              {@render customValueSnippet()}
            </Command.Group>
          {/if}

          {#if selectedValues.size > 0}
            <Command.Separator />
            <Command.Group>
              <Command.Item
                onSelect={() => activeView.clearFilterValue(column.id)}
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
  <Button
    variant="outline"
    class="h-8 rounded-l-none border-l-0 p-2"
    onclick={() => activeView.removeFilter(column.id)}><X /></Button
  >
</div>
