<script lang="ts">
import * as ToggleGroup from '$ui/lib/components/ui/toggle-group/index.js';
import {CalendarDate, DateFormatter, getLocalTimeZone, today} from '@internationalized/date';
import {Calendar} from '$lib/components/ui/calendar/index.js';
import {Label} from '$ui/lib/components/ui/label';
import {SvelteMap} from 'svelte/reactivity';
import type {FacetedFilterOption} from '$lib/types';
import {Button} from '$ui/lib/components/ui/button';

type Props = {
  onSubmit: (new_value: FacetedFilterOption) => void;
  disabled?: boolean;
  ariaLabel?: string;
};
let {onSubmit, disabled = false, ariaLabel = 'Advanced date input'}: Props = $props();

let dateType = $state('day');

let value = $state<CalendarDate>(today(getLocalTimeZone()));

// Constants for better maintainability
const MONTHS_PER_QUARTER = 3;
const MONTHS_PER_HALF_YEAR = 6;
const YEARS_TO_SHOW = 6;

const currentDate = today(getLocalTimeZone());

// Localization support - can be enhanced with proper i18n store
const userLocale = 'en-US'; // TODO: Replace with actual locale from i18n store

const monthFmt = new DateFormatter(userLocale, {
  month: 'long',
});

const monthOptions = Array.from({length: 12}, (_, i) => {
  const month = currentDate.set({month: i + 1});
  return {
    value: month.month,
    label: monthFmt.format(month.toDate(getLocalTimeZone())),
  };
});

const quarterOptions = Array.from({length: 4}, (_, i) => {
  const month = currentDate.set({month: i * MONTHS_PER_QUARTER + 1});
  return {
    value: month.month,
    label: `Q${i + 1}`,
  };
});

const halfYearOptions = Array.from({length: 2}, (_, i) => {
  const month = currentDate.set({month: i * MONTHS_PER_HALF_YEAR + 1});
  return {
    value: month.month,
    label: `H${i + 1}`,
  };
});

const yearOptions = Array.from({length: YEARS_TO_SHOW}, (_, i) => ({
  label: String(new Date().getFullYear() - i),
  value: new Date().getFullYear() - i,
}));

let selectedMonth: string = $state('');
let selectedQuarter: string = $state('');
let selectedHalfYear: string = $state('');
let selectedYear: string = $state('');

let _dateCache = {
  month: new SvelteMap<string, CalendarDate>(),
  quarter: new SvelteMap<string, CalendarDate>(),
  halfYear: new SvelteMap<string, CalendarDate>(),
};

// Lazy cache initialization for better performance
const getDateCache = (() => {
  let cache: typeof _dateCache | null = null;
  return () => {
    if (!cache) {
      cache = {
        month: new SvelteMap<string, CalendarDate>(),
        quarter: new SvelteMap<string, CalendarDate>(),
        halfYear: new SvelteMap<string, CalendarDate>(),
      };

      // Initialize cache with valid CalendarDate objects
      yearOptions.forEach((yearOption) => {
        monthOptions.forEach((monthOption) => {
          cache!.month.set(
            `${yearOption.value}${monthOption.value}`,
            new CalendarDate(yearOption.value, monthOption.value, 1)
          );
        });
        quarterOptions.forEach((quarterOption) => {
          cache!.quarter.set(
            `${yearOption.value}${quarterOption.value}`,
            new CalendarDate(yearOption.value, quarterOption.value, 1)
          );
        });
        halfYearOptions.forEach((halfYearOption) => {
          cache!.halfYear.set(
            `${yearOption.value}${halfYearOption.value}`,
            new CalendarDate(yearOption.value, halfYearOption.value, 1)
          );
        });
      });
    }
    return cache;
  };
})();

// Safe formatter function that handles all date types properly
const getFormattedValue = (): string => {
  try {
    switch (dateType) {
      case 'month':
        return new DateFormatter(userLocale, {
          month: 'short',
          year: 'numeric',
        }).format(value.toDate(getLocalTimeZone()));
      case 'year':
        return new DateFormatter(userLocale, {
          year: 'numeric',
        }).format(value.toDate(getLocalTimeZone()));
      case 'quarter':
        return `Q${Math.ceil(value.month / MONTHS_PER_QUARTER)} ${value.year}`;
      case 'half-year':
        return `H${Math.ceil(value.month / MONTHS_PER_HALF_YEAR)} ${value.year}`;
      default:
        return new DateFormatter(userLocale, {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        }).format(value.toDate(getLocalTimeZone()));
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

// Validation and submission helper
const validateAndSubmit = (event: Event) => {
  event.preventDefault();

  try {
    const submissionValue = {
      value: dateType !== 'day' ? `${dateType}:${value.toString()}` : value.toString(),
      label: getFormattedValue(),
    };

    onSubmit(submissionValue);
  } catch (error) {
    console.error('Error submitting date:', error);
  }
};
</script>

<div role="region" aria-label={ariaLabel}>
  <form onsubmit={validateAndSubmit}>
    <fieldset>
      <legend class="sr-only">Select date range type</legend>
      <ToggleGroup.Root
        type="single"
        bind:value={dateType}
        variant="outline"
        size="default"
        role="radiogroup"
        aria-labelledby="date-type-label">
        <ToggleGroup.Item value="day" aria-label="Select specific day">Day</ToggleGroup.Item>
        <ToggleGroup.Item value="month" aria-label="Select entire month">Month</ToggleGroup.Item>
        <ToggleGroup.Item value="quarter" aria-label="Select quarter (3 months)">
          Quarter
        </ToggleGroup.Item>
        <ToggleGroup.Item value="half-year" aria-label="Select half year (6 months)">
          Half Year
        </ToggleGroup.Item>
        <ToggleGroup.Item value="year" aria-label="Select entire year">Year</ToggleGroup.Item>
      </ToggleGroup.Root>
    </fieldset>

    {#if dateType === 'day'}
      <div role="group" aria-labelledby="day-picker-label">
        <span id="day-picker-label" class="sr-only">Select specific day</span>
        <Calendar type="single" numberOfMonths={2} class="p-0" bind:value />
      </div>
    {:else if dateType === 'month'}
      <div role="group" aria-labelledby="month-picker-label">
        <span id="month-picker-label" class="sr-only">Select month and year</span>
        <ToggleGroup.Root
          type="single"
          variant="outline"
          bind:value={selectedMonth}
          onValueChange={(new_value) => {
            if (new_value) {
              const cached = getDateCache().month.get(new_value);
              if (cached) {
                value = cached;
              }
            } else {
              selectedMonth = '';
            }
          }}
          class="grid h-[360px] items-start justify-start overflow-auto">
          {#each yearOptions as year (year)}
            <Label class="my-2">{year.label}</Label>
            <div class="grid w-full grid-cols-4">
              {#each monthOptions as month (month)}
                <ToggleGroup.Item
                  value={year.value + '' + (month.value + '')}
                  aria-label={month.label}>
                  {month.label}
                </ToggleGroup.Item>
              {/each}
            </div>
          {/each}
        </ToggleGroup.Root>
      </div>
    {:else if dateType === 'quarter'}
      <div role="group" aria-labelledby="quarter-picker-label">
        <span id="quarter-picker-label" class="sr-only">Select quarter and year</span>
        <ToggleGroup.Root
          type="single"
          variant="outline"
          bind:value={selectedQuarter}
          onValueChange={(new_value) => {
            if (new_value) {
              const cached = getDateCache().quarter.get(new_value);
              if (cached) {
                value = cached;
              }
            } else {
              selectedQuarter = '';
            }
          }}
          class="grid h-[360px] grid-cols-2 items-stretch justify-start overflow-auto">
          {#each yearOptions as year (year)}
            <div>
              <Label class="my-2">{year.label}</Label>
              <div class="grid grid-cols-4 gap-0">
                {#each quarterOptions as quarter (quarter)}
                  <ToggleGroup.Item
                    value={year.value + '' + (quarter.value + '')}
                    aria-label={quarter.label}>
                    {quarter.label}
                  </ToggleGroup.Item>
                {/each}
              </div>
            </div>
          {/each}
        </ToggleGroup.Root>
      </div>
    {:else if dateType === 'half-year'}
      <div role="group" aria-labelledby="half-year-picker-label">
        <span id="half-year-picker-label" class="sr-only">Select half year and year</span>
        <ToggleGroup.Root
          type="single"
          variant="outline"
          bind:value={selectedHalfYear}
          onValueChange={(new_value) => {
            if (new_value) {
              const cached = getDateCache().halfYear.get(new_value);
              if (cached) {
                value = cached;
              }
            } else {
              selectedHalfYear = '';
            }
          }}
          class="grid h-[360px] grid-cols-3 items-start justify-start gap-2 overflow-auto">
          {#each yearOptions as year (year)}
            <div>
              <Label class="my-2 block text-center">{year.label}</Label>
              <div class="grid grid-cols-2">
                {#each halfYearOptions as halfYear (halfYear)}
                  <ToggleGroup.Item
                    value={`${year.value}${halfYear.value}`}
                    aria-label="{halfYear.label} {year.label}">
                    {halfYear.label}
                  </ToggleGroup.Item>
                {/each}
              </div>
            </div>
          {/each}
        </ToggleGroup.Root>
      </div>
    {:else if dateType === 'year'}
      <div role="group" aria-labelledby="year-picker-label">
        <span id="year-picker-label" class="sr-only">Select year</span>
        <ToggleGroup.Root
          type="single"
          variant="outline"
          bind:value={selectedYear}
          onValueChange={(new_value) => {
            if (new_value) {
              value = new CalendarDate(parseInt(new_value), 1, 1);
            } else {
              selectedYear = '';
            }
          }}
          class="grid h-[360px] grid-cols-3 items-start justify-start overflow-auto">
          {#each yearOptions as year (year)}
            <ToggleGroup.Item value={`${year.value}`} aria-label={year.label}>
              {year.label}
            </ToggleGroup.Item>
          {/each}
        </ToggleGroup.Root>
      </div>
    {/if}

    <Button type="submit" {disabled}>Apply</Button>
  </form>
</div>
