<script lang="ts" generics="TData, TValue">
  import type { Column } from "@tanstack/table-core";
  import { DataTableFacetedFilter } from "..";
  import UsersRound from "lucide-svelte/icons/users-round";
  import type { Component } from "svelte";
  import { getLocalTimeZone, today } from "@internationalized/date";
  import type { HTMLAttributes } from "svelte/elements";
  import type { FacetedFilterOption } from "$lib/types";
  import { SvelteMap } from "svelte/reactivity";
  import * as Command from "$lib/components/ui/command";
  import AdvancedDateDialog from "$lib/components/dialogs/advanced-date-dialog.svelte";
  import { currentViews } from "$lib/states/current-views.svelte";
  import { getSpecialDateValueAsLabel } from "$lib/utils";

  type Props<TData, TValue> = HTMLAttributes<HTMLDivElement> & {
    column: Column<TData, TValue>;
  };

  let { column }: Props<TData, TValue> = $props();

  const thisday = today(getLocalTimeZone());
  const activeView = $derived(currentViews.get().activeView);
  const customDates = $derived(
    activeView.view.getAllFilterValues()
      .filter(filter => filter.column === 'date')
      .map(filter => filter.value)
      .flat()
      .filter(filterValue => typeof filterValue === 'string' && filterValue.includes(':'))
  );

  let i = 0;
  const allOptions = $derived(new SvelteMap<number, FacetedFilterOption>([
    [i++, {
      value: thisday.subtract({ days: 1 }).toString(),
      label: "1 day ago",
    }],
    [i++, {
      value: thisday.subtract({ days: 3 }).toString(),
      label: "3 days ago",
    }],
    [i++, {
      value: thisday.subtract({ weeks: 1 }).toString(),
      label: "1 week ago",
    }],
    [i++, {
      value: thisday.subtract({ months: 1 }).toString(),
      label: "1 month ago",
    }],
    [i++, {
      value: thisday.subtract({ months: 3 }).toString(),
      label: "3 months ago",
    }],
    [i++, {
      value: thisday.subtract({ months: 6 }).toString(),
      label: "6 months ago",
    }],
    [i++, {
      value: thisday.subtract({ years: 1 }).toString(),
      label: "1 year ago",
    }],
    ...customDates.map(customDate => [i++, { value: customDate as string, label: getSpecialDateValueAsLabel(customDate as string) as string }] as [number, FacetedFilterOption])
  ]));

  const options = $derived(allOptions);

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
  options.set(options.size, new_value);
  dialogOpen = false;
}}/>
