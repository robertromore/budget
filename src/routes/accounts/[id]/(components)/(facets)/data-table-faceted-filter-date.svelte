<script lang="ts" generics="TData, TValue">
  import type { Column } from "@tanstack/table-core";
  import { DataTableFacetedFilter } from "..";
  import UsersRound from "lucide-svelte/icons/users-round";
  import type { Component } from "svelte";
  import { getLocalTimeZone, today } from "@internationalized/date";
  import type { HTMLAttributes } from "svelte/elements";
  import type { FacetedFilterOption } from "$lib/types";
  import { SvelteMap } from "svelte/reactivity";

  type Props<TData, TValue> = HTMLAttributes<HTMLDivElement> & {
    column: Column<TData, TValue>;
  };

  let { column }: Props<TData, TValue> = $props();

  const thisday = today(getLocalTimeZone());
  const allOptions = new SvelteMap<number, FacetedFilterOption>([
    [0, {
      value: thisday.subtract({ days: 1 }).toString(),
      label: "1 day ago",
    }],
    [1, {
      value: thisday.subtract({ days: 3 }).toString(),
      label: "3 days ago",
    }],
    [2, {
      value: thisday.subtract({ weeks: 1 }).toString(),
      label: "1 week ago",
    }],
    [3, {
      value: thisday.subtract({ months: 1 }).toString(),
      label: "1 month ago",
    }],
    [4, {
      value: thisday.subtract({ months: 3 }).toString(),
      label: "3 months ago",
    }],
    [5, {
      value: thisday.subtract({ months: 6 }).toString(),
      label: "6 months ago",
    }],
    [6, {
      value: thisday.subtract({ years: 1 }).toString(),
      label: "1 year ago",
    }],
  ]);

  const options = allOptions;
</script>

<DataTableFacetedFilter
  {column}
  title="Date"
  {options}
  {allOptions}
  allIcon={UsersRound as unknown as Component}
/>
