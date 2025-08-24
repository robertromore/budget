<script lang="ts">
  import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
  import {
    CalendarDate,
    DateFormatter,
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

  let value = $state<CalendarDate>();

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

  const quarterOptions = Array.from({ length: 4 }, (_, i) => {
    const month = currentDate.set({ month: (i * 3) + 1 });
    return {
      value: month.month,
      label: `Q${i+1}`
    };
  });

  const halfYearOptions = Array.from({ length: 2 }, (_, i) => {
    const month = currentDate.set({ month: (i * 6) + 1 });
    return {
      value: month.month,
      label: `H${i+1}`
    };
  });

  const yearOptions = Array.from({ length: 6 }, (_, i) => ({
    label: String(new Date().getFullYear() - i),
    value: new Date().getFullYear() - i
  }));

  let selectedMonth: string | undefined = $state();
  let selectedQuarter: string | undefined = $state();
  let selectedHalfYear: string | undefined = $state();
  let selectedYear: string | undefined = $state();

  let _dateCache = {
    'month': new SvelteMap<string, CalendarDate>(),
    'quarter': new SvelteMap<string, CalendarDate>(),
    'halfYear': new SvelteMap<string, CalendarDate>()
  };

  yearOptions.forEach((yearOption) => {
    monthOptions.forEach((monthOption) => {
      _dateCache.month.set((yearOption.value + '') + (monthOption.value + ''), new CalendarDate(yearOption.value, monthOption.value, 0));
    });
    quarterOptions.forEach((quarterOption) => {
      _dateCache.quarter.set((yearOption.value + '') + (quarterOption.value + ''), new CalendarDate(yearOption.value, quarterOption.value, 0));
    });
    halfYearOptions.forEach((halfYearOption) => {
      _dateCache.halfYear.set((yearOption.value + '') + (halfYearOption.value + ''), new CalendarDate(yearOption.value, halfYearOption.value, 0));
    });
  });

  const formatterOptions = $derived.by(() => {
    if (dateType === 'month') {
      return {
        month: "short" as "short",
        year: "numeric" as "numeric"
      };
    } else if (dateType === 'year') {
      return {
        year: "numeric" as "numeric"
      };
    }
  });

  const formatter = $derived.by(() => {
    switch (dateType) {
      case 'month':
      case 'year':
        return new DateFormatter('en-us', formatterOptions);

      case 'quarter':
        return { format: (value: Date & CalendarDate) => `Q${Math.ceil(value.month / 3)} ${value.year}` };

      case 'half-year':
        return { format: (value: Date & CalendarDate) => `H${Math.ceil(value.month / 6)} ${value.year}` };
    }

    return new DateFormatter('en-us', {
      month: "short",
      day: "2-digit",
      year: "numeric"
    });
  });
</script>

<ToggleGroup.Root type="single" bind:value={dateType} class="items-start justify-start mb-2 mt-1.5" variant="outline" size="default">
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
  <ToggleGroup.Root type="single" bind:value={selectedQuarter} onValueChange={(new_value) => value = _dateCache.quarter.get(new_value)} class="items-stretch justify-start grid grid-cols-2 h-[360px] overflow-auto">
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
{:else if dateType === 'half-year'}
  <ToggleGroup.Root type="single" bind:value={selectedHalfYear} onValueChange={(new_value) => value = _dateCache.halfYear.get(new_value)} class="items-start justify-start grid grid-cols-1 h-[360px] overflow-auto">
    {#each yearOptions as year (year)}
      <div>
        <Label class="my-2">{year.label}</Label>
        <div class="grid grid-cols-2">
          {#each halfYearOptions as halfYear (halfYear)}
            <ToggleGroup.Item value={(year.value + '') + (halfYear.value + '')} aria-label={halfYear.label} class="ring-border ring-1 m-1 rounded">
              {halfYear.label}
            </ToggleGroup.Item>
          {/each}
        </div>
      </div>
    {/each}
  </ToggleGroup.Root>
{:else if dateType === 'year'}
  <ToggleGroup.Root type="single" bind:value={selectedYear} onValueChange={(new_value) => value = new CalendarDate(parseInt(new_value), 0, 0)} class="items-start justify-start grid grid-cols-1 h-[360px] overflow-auto">
    {#each yearOptions as year (year)}
      <ToggleGroup.Item value={(year.value + '')} aria-label={year.label} class="ring-border ring-1 m-1 rounded">
        {year.label}
      </ToggleGroup.Item>
    {/each}
  </ToggleGroup.Root>
{/if}

<Button onclick={() => onSubmit({
  value: dateType !== 'day' ? dateType + ':' + value?.toString() : value?.toString() || '',
  label: formatter.format((dateType === 'month' || dateType === 'year' ? value?.toDate(getLocalTimeZone()) : value) as Date & CalendarDate)
})}>Apply</Button>
