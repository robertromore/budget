<script lang="ts">
  import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
  import {
    CalendarDate,
    DateFormatter,
    type DateValue,
    getLocalTimeZone,
    today
  } from "@internationalized/date";
  import { Calendar } from "$lib/components/ui/calendar/index.js";
  import Label from "../ui/label/label.svelte";
  import { SvelteMap } from "svelte/reactivity";
  import type { FacetedFilterOption } from "$lib/types";
  import { Button } from "../ui/button";

  type Props = {
    onSubmit: (new_value: FacetedFilterOption) => void;
  }
  let { onSubmit }: Props = $props();

  let dateType = $state('day');

  let value = $state<DateValue>();

  const currentDate = today(getLocalTimeZone());

  const monthFmt = new DateFormatter("en-US", {
    month: "long"
  });

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const month = currentDate.set({ month: i + 1 });
    return {
      value: month.month,
      label: monthFmt.format(month.toDate(getLocalTimeZone()))
    };
  });

  let j = 1;
  const quarterOptions = Array.from({ length: 4 }, (_, i) => {
    const month = currentDate.set({ month: (i * 3) + 1 });
    return {
      value: month.month,
      label: `Q${j++}`
    };
  });

  const yearOptions = Array.from({ length: 6 }, (_, i) => ({
    label: String(new Date().getFullYear() - i),
    value: new Date().getFullYear() - i
  }));

  let selectedMonth: string | undefined = $state();
  let selectedQuarter: string | undefined = $state();

  let _dateCache = {
    'month': new SvelteMap<string, CalendarDate>(),
    'quarter': new SvelteMap<string, CalendarDate>(),
  };

  yearOptions.forEach((yearOption) => {
    monthOptions.forEach((monthOption) => {
      _dateCache.month.set((yearOption.value + '') + (monthOption.value + ''), new CalendarDate(yearOption.value, monthOption.value, 0));
    });
    Array.from({ length: 4 }, (_, i) => {
      const month = currentDate.set({ month: (i * 3) + 1 });
      _dateCache.quarter.set((yearOption.value + '') + (month.month + ''), new CalendarDate(yearOption.value, month.month, 0));
    });
  });

  const formatterOptions = $derived.by(() => {
    if (dateType === 'month') {
      return {
        month: "short" as "short",
        year: "numeric" as "numeric"
      };
    }
  });

  const formatter = $derived(new DateFormatter('en-us', formatterOptions));
</script>

<ToggleGroup.Root type="single" bind:value={dateType} class="items-start justify-start mb-2 mt-1.5">
  <ToggleGroup.Item value="day" aria-label="Day">
    Day
  </ToggleGroup.Item>
  <ToggleGroup.Item value="month" aria-label="Month">
    Month
  </ToggleGroup.Item>
  <ToggleGroup.Item value="quarter" aria-label="Quarter">
    Quarter
  </ToggleGroup.Item>
  <ToggleGroup.Item value="half-year" aria-label="Half Year">
    Half Year
  </ToggleGroup.Item>
  <ToggleGroup.Item value="year" aria-label="Year">
    Year
  </ToggleGroup.Item>
</ToggleGroup.Root>

{#if dateType === 'day'}
  <Calendar type="single" numberOfMonths={2} class="p-0" bind:value />
{:else if dateType === 'month'}
  <ToggleGroup.Root type="single" bind:value={selectedMonth} onValueChange={(new_value) => value = _dateCache.month.get(new_value)} class="items-start justify-start grid h-[360px] overflow-auto">
    {#each yearOptions as year (year)}
      <Label class="my-2">{year.label}</Label>
      <div class="grid w-full grid-cols-4">
        {#each monthOptions as month (month)}
          <ToggleGroup.Item value={(year.value + '') + (month.value + '')} aria-label={month.label} class="ring-border ring-1 m-1 rounded">
            {month.label}
          </ToggleGroup.Item>
        {/each}
      </div>
    {/each}
  </ToggleGroup.Root>
{:else if dateType === 'quarter'}
  <ToggleGroup.Root type="single" bind:value={selectedQuarter} onValueChange={(new_value) => value = _dateCache.quarter.get(new_value)} class="items-start justify-start grid grid-cols-2 h-[360px] overflow-auto">
    {#each yearOptions as year (year)}
      <div>
        <Label class="my-2">{year.label}</Label>
        <div class="grid grid-cols-4">
          {#each quarterOptions as quarter (quarter)}
            <ToggleGroup.Item value={(year.value + '') + (quarter.value + '')} aria-label={quarter.label} class="ring-border ring-1 m-1 rounded">
              {quarter.label}
            </ToggleGroup.Item>
          {/each}
        </div>
      </div>
    {/each}
  </ToggleGroup.Root>
{/if}

<Button onclick={() => onSubmit({
  value: dateType + ':' + value?.toString(),
  label: value ? formatter.format(value.toDate(getLocalTimeZone())) : '?'
})}>Apply</Button>
