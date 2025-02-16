<script lang="ts" generics="TData, TValue">
  import type { Column } from '@tanstack/table-core';
  import { DataTableFacetedFilter } from '..';
  import UsersRound from 'lucide-svelte/icons/users-round';
  import type { Component } from 'svelte';
  import { getLocalTimeZone, today } from '@internationalized/date';
  import type { HTMLAttributes } from 'svelte/elements';

  type Props<TData, TValue> = HTMLAttributes<HTMLDivElement> & {
		column: Column<TData, TValue>;
	};

	let { column }: Props<TData, TValue> = $props();

  const thisday = today(getLocalTimeZone());
  const allOptions = [
    {
      value: thisday.subtract({ days: 1 }).toString(),
      label: '1 day ago',
    },
    {
      value: thisday.subtract({ days: 3 }).toString(),
      label: '3 days ago',
    },
    {
      value: thisday.subtract({ weeks: 1 }).toString(),
      label: '1 week ago',
    },
    {
      value: thisday.subtract({ months: 1 }).toString(),
      label: '1 month ago',
    },
    {
      value: thisday.subtract({ months: 3 }).toString(),
      label: '3 months ago',
    },
    {
      value: thisday.subtract({ months: 6 }).toString(),
      label: '6 months ago',
    },
    {
      value: thisday.subtract({ years: 1 }).toString(),
      label: '1 year ago',
    },
  ];

  const options = allOptions.filter(Boolean);
</script>

<DataTableFacetedFilter
  column={column}
  title="Date"
  {options}
  {allOptions}
  allIcon={UsersRound as unknown as Component}
/>
