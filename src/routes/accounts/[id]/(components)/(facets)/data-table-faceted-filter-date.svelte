<script lang="ts" generics="TData, TValue">
  import type { Column } from "@tanstack/table-core";
  import { DataTableFacetedFilter } from "..";
  import UsersRound from "lucide-svelte/icons/users-round";
  import type { Component } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { FacetedFilterOption } from "$lib/types";
  import { SvelteMap } from "svelte/reactivity";
  import * as Command from "$lib/components/ui/command";
  import AdvancedDateDialog from "$lib/components/dialogs/advanced-date-dialog.svelte";
  import { DateFiltersState } from "$lib/states/date-filters.svelte";

  type Props<TData, TValue> = HTMLAttributes<HTMLDivElement> & {
    column: Column<TData, TValue>;
  };

  let { column }: Props<TData, TValue> = $props();

  let dateFiltersState: DateFiltersState = DateFiltersState.get();
  const allDates = $derived(dateFiltersState?.dateFilters);

  const faceted = $derived(column.getFacetedUniqueValues());

  const allOptions = $derived(
    new SvelteMap<string, FacetedFilterOption>(allDates?.map((date: FacetedFilterOption) => [date.value, date]))
  );

  const options = $derived(
    new SvelteMap<string, FacetedFilterOption>(allDates?.filter((date: FacetedFilterOption) => faceted.has(date.value)).map((date: FacetedFilterOption) => [date.value, date]))
  );

  let dialogOpen = $state(false);
</script>

{#snippet customValueSnippet()}
  <Command.Item
    onSelect={() => dialogOpen = true}
    class="justify-center text-center"
  >
    Custom value
  </Command.Item>
{/snippet}

<DataTableFacetedFilter
  {column}
  title="Date"
  {options}
  {allOptions}
  allIcon={UsersRound as unknown as Component}
  {customValueSnippet}
/>

<AdvancedDateDialog bind:dialogOpen={dialogOpen} onSubmit={(new_value: FacetedFilterOption) => {
  dateFiltersState?.add(new_value);
  dialogOpen = false;
}}/>
