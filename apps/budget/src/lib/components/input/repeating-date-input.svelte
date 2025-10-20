<!--
  RepeatingDateInput Component

  A comprehensive recurring date input component with improved UX and maintainability.

  Example Usage:
  ```svelte
  <script>
    import RepeatingDateInput from "$lib/components/input/repeating-date-input.svelte";
    import RepeatingDateInputModel from "$lib/models/repeating_date.svelte";

    let recurringDate = new RepeatingDateInputModel();
  </script>

  <RepeatingDateInput bind:value={recurringDate} />
  ```

  Features:
  - Clean, intuitive interface with progressive disclosure
  - Real-time validation with error messages
  - Live preview of recurrence pattern and upcoming dates
  - Calendar visualization of recurring dates
  - Support for daily, weekly, monthly, and yearly patterns
  - Flexible end conditions (limit or end date)
  - Fully accessible with proper ARIA labels
  - Responsive design that works on all screen sizes

  Props:
  - value: RepeatingDateInputModel - The recurring date configuration (bindable)
  - class?: string - Additional CSS classes
  - disabled?: boolean - Disable all inputs

  The component automatically handles:
  - Input validation and error display
  - Pattern preview generation
  - Upcoming dates calculation
  - Calendar highlighting of recurring dates
-->
<script lang="ts">
import {getLocalTimeZone, today, type DateValue} from '@internationalized/date';
import {cn} from '$lib/utils';
import {Button} from '$lib/components/ui/button';
import * as Calendar from '$lib/components/ui/calendar';
import * as Popover from '$lib/components/ui/popover';
import * as Card from '$lib/components/ui/card';
import * as Tabs from '$lib/components/ui/tabs';
import * as RadioGroup from '$lib/components/ui/radio-group';
import {Checkbox} from '$lib/components/ui/checkbox';
import {Switch} from '$lib/components/ui/switch';
import {Label} from '$lib/components/ui/label';
import {Input} from '$lib/components/ui/input';
import {Badge} from '$lib/components/ui/badge';
import {Separator} from '$lib/components/ui/separator';
import {dateFormatter, pluralRules} from '$lib/utils/date-formatters';
import {weekOptions, weekdayOptions} from '$lib/utils/date-options';
import {nextDaily, nextWeekly, nextMonthly, nextYearly} from '$lib/utils/date-frequency';

import CalendarDays from '@lucide/svelte/icons/calendar-days';
import Repeat from '@lucide/svelte/icons/repeat';
import CircleAlert from '@lucide/svelte/icons/circle-alert';
import X from '@lucide/svelte/icons/x';

import RepeatingDateInputModel from '$lib/models/repeating_date.svelte';

// Props
let {
  value = $bindable(new RepeatingDateInputModel()),
  class: className,
  disabled = false,
  isRepeating = $bindable(false),
  hideRecurringToggle = false,
}: {
  value?: RepeatingDateInputModel;
  class?: string;
  disabled?: boolean;
  isRepeating?: boolean;
  hideRecurringToggle?: boolean;
} = $props();

// Local state
let hasEndCondition = $state(false);

// Auto-enable isRepeating when the toggle is hidden
$effect(() => {
  if (hideRecurringToggle) {
    isRepeating = true;
  }
});

// Computed properties
let isValid = $derived.by(() => {
  const validation = value.validate();
  return validation ? validation.valid : true;
});

let validationErrors = $derived.by(() => {
  const validation = value.validate();
  return validation ? validation.errors : [];
});

// Helper functions
const formatDate = (date: DateValue) => {
  return dateFormatter.format(date.toDate(getLocalTimeZone()));
};

const isUpcomingDate = (date: DateValue) => {
  // Only highlight dates that are part of the recurring pattern AND on/after start date
  return value.upcoming.some((d) => {
    return d.year === date.year && d.month === date.month && d.day === date.day;
  });
};

const isSpecificDate = (date: DateValue) => {
  const specificDates = value.specific_dates || [];
  return specificDates.some((d) => {
    return d.year === date.year && d.month === date.month && d.day === date.day;
  });
};

// Specific dates button text
const specificDatesButtonText = $derived.by(() => {
  const count = value.specific_dates?.length || 0;
  if (count === 0) return 'Add specific dates';
  const plural = pluralRules.select(count) === 'one' ? '' : 's';
  return `${count} date${plural} selected`;
});

// Generate next occurrences independent of calendar navigation
const nextOccurrences = $derived.by(() => {
  if (!value.start) return [];

  const frequency = value.frequency || 'daily';
  const interval = value.interval || 1;
  const startDate = value.start;

  // Generate enough dates for display (50 should be more than enough for the first 5)
  const endDate = startDate.add({ years: 2 });
  const limit = 50;

  try {
    let dates: DateValue[] = [];

    switch (frequency) {
      case 'daily':
        dates = nextDaily(startDate, endDate, interval, limit);
        break;
      case 'weekly': {
        const weekDays = value.week_days ?? [];
        dates = nextWeekly(startDate, endDate, interval, weekDays, limit);
        break;
      }
      case 'monthly':
        dates = nextMonthly(startDate, endDate, interval, value.days || null, value.weeks || [], value.weeks_days || [], limit);
        break;
      case 'yearly':
        dates = nextYearly(startDate, startDate, endDate, interval, limit);
        break;
    }

    // Add specific dates
    const specificDates = value.specific_dates || [];
    dates.push(...specificDates);

    // Deduplicate dates
    const uniqueDatesMap = new Map<string, DateValue>();
    for (const date of dates) {
      const key = date.toString();
      if (!uniqueDatesMap.has(key)) {
        uniqueDatesMap.set(key, date);
      }
    }

    // Sort and return first 5
    const uniqueDates = Array.from(uniqueDatesMap.values()).sort((a, b) => a.compare(b));
    return uniqueDates.slice(0, 5);
  } catch (error) {
    console.warn('Error generating next occurrences:', error);
    return [];
  }
});

// Handle frequency changes
$effect(() => {
  if (value.frequency) {
    // Reset frequency-specific settings when changing frequency
    value.week_days = [];
    value.weeks = [];
    value.weeks_days = [];
    value.days = [];
    value.on = false;
  }
});

const handleWeekdayToggle = (weekday: number) => {
  const current = value.week_days || [];
  const index = current.indexOf(weekday);

  if (index > -1) {
    value.week_days = current.filter((d) => d !== weekday);
  } else {
    value.week_days = [...current, weekday].sort();
  }
};

const handleWeekToggle = (week: number) => {
  const current = value.weeks || [];
  const index = current.indexOf(week);

  if (index > -1) {
    value.weeks = current.filter((w) => w !== week);
  } else {
    value.weeks = [...current, week].sort();
  }
};

const handleWeeksDaysToggle = (weekday: number) => {
  const current = value.weeks_days || [];
  const index = current.indexOf(weekday);

  if (index > -1) {
    value.weeks_days = current.filter((d) => d !== weekday);
  } else {
    value.weeks_days = [...current, weekday].sort();
  }
};

const handleDayToggle = (day: number) => {
  const current = value.days || [];
  const index = current.indexOf(day);

  if (index > -1) {
    value.days = current.filter((d) => d !== day);
  } else {
    value.days = [...current, day].sort();
  }
};

const handleRemoveSpecificDate = (dateToRemove: DateValue) => {
  const current = value.specific_dates || [];
  value.specific_dates = current.filter(d =>
    !(d.year === dateToRemove.year && d.month === dateToRemove.month && d.day === dateToRemove.day)
  );
};
</script>

<div class={cn('space-y-6', className)}>
  <!-- Start Date -->
  <div class="space-y-2">
    <Label for="start-date" class="text-sm font-medium">Start Date</Label>
    <Popover.Root>
      <Popover.Trigger class="inline-flex h-10 w-full items-center justify-start whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-left text-sm font-normal ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" {disabled}>
        <CalendarDays class="mr-2 h-4 w-4" />
        {value.start ? formatDate(value.start) : 'Select a date'}
      </Popover.Trigger>
      <Popover.Content class="w-auto p-0" align="start">
        <Calendar.Calendar type="single" initialFocus bind:value={value.start} {disabled} />
      </Popover.Content>
    </Popover.Root>
  </div>

  <!-- Repeat Toggle -->
  <div class="space-y-4">
    {#if !hideRecurringToggle}
      <Label
        class="hover:bg-accent/50 has-[[aria-checked=true]]:border-primary has-[[aria-checked=true]]:bg-primary/5 flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors">
        <Checkbox
          bind:checked={isRepeating}
          {disabled}
          class="data-[state=checked]:border-primary data-[state=checked]:bg-primary" />
        <div class="flex-1 space-y-1">
          <div class="flex items-center gap-2">
            <Repeat class="h-4 w-4" />
            <span class="font-medium">Make this recurring</span>
          </div>
          <p class="text-muted-foreground text-sm">Set up a repeating schedule for this item</p>
        </div>
      </Label>
    {/if}

    <!-- Recurrence Pattern -->
    {#if isRepeating}
      <Card.Root>
        <Card.Header class="pb-4">
          <Card.Title class="text-base">Recurrence Pattern</Card.Title>
          <Card.Description>Configure how often this should repeat</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-6">
          <!-- Frequency Selection -->
          <Tabs.Root bind:value={value.frequency}>
            <Tabs.List class="grid w-full grid-cols-4">
              <Tabs.Trigger value="daily" {disabled}>Daily</Tabs.Trigger>
              <Tabs.Trigger value="weekly" {disabled}>Weekly</Tabs.Trigger>
              <Tabs.Trigger value="monthly" {disabled}>Monthly</Tabs.Trigger>
              <Tabs.Trigger value="yearly" {disabled}>Yearly</Tabs.Trigger>
            </Tabs.List>

            <!-- Daily Options -->
            <Tabs.Content value="daily" class="space-y-4">
              <div class="flex items-center gap-2 text-sm">
                <span>Repeat every</span>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  bind:value={value.interval}
                  class="w-20"
                  {disabled} />
                <span>day{(value.interval || 1) > 1 ? 's' : ''}</span>
              </div>
            </Tabs.Content>

            <!-- Weekly Options -->
            <Tabs.Content value="weekly" class="space-y-4">
              <div class="flex items-center gap-2 text-sm">
                <span>Repeat every</span>
                <Input
                  type="number"
                  min="1"
                  max="52"
                  bind:value={value.interval}
                  class="w-20"
                  {disabled} />
                <span>week{(value.interval || 1) > 1 ? 's' : ''}</span>
              </div>

              <div class="space-y-2">
                <Label class="text-sm font-medium">On these days:</Label>
                <div class="grid grid-cols-4 gap-2">
                  {#each weekdayOptions as weekday}
                    <Button
                      variant={(value.week_days || []).includes(weekday.value)
                        ? 'default'
                        : 'outline'}
                      size="sm"
                      onclick={() => handleWeekdayToggle(weekday.value)}
                      {disabled}
                      class="text-xs">
                      {weekday.label.slice(0, 3)}
                    </Button>
                  {/each}
                </div>
              </div>
            </Tabs.Content>

            <!-- Monthly Options -->
            <Tabs.Content value="monthly" class="space-y-4">
              <div class="flex items-center gap-2 text-sm">
                <span>Repeat every</span>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  bind:value={value.interval}
                  class="w-20"
                  {disabled} />
                <span>month{(value.interval || 1) > 1 ? 's' : ''}</span>
              </div>

              <div class="space-y-4">
                <div class="flex items-center gap-2">
                  <Switch bind:checked={value.on} {disabled} id="specify-occurrence-pattern" />
                  <Label class="text-sm font-medium" for="specify-occurrence-pattern">Specify occurrence pattern</Label>
                </div>

                {#if value.on}
                  <RadioGroup.Root bind:value={value.on_type} disabled={!value.on || disabled}>
                    <div class="space-y-3">
                      <!-- On specific day of month -->
                      <div class="flex items-start gap-3">
                        <RadioGroup.Item value="day" class="mt-1" id="on-day" />
                        <div class="space-y-3">
                          <Label for="on-day">On day(s) of the month</Label>

                          <div class="grid grid-cols-7 gap-0.5">
                            {#each Array.from({length: 31}, (_, i) => i + 1) as day}
                              <Button
                                variant={(value.days || []).includes(day) ? 'default' : 'outline'}
                                size="sm"
                                onclick={() => handleDayToggle(day)}
                                disabled={value.on_type !== 'day' || !value.on || disabled}
                                class="text-xs h-8 w-8 p-0">
                                {day}
                              </Button>
                            {/each}
                          </div>

                          <p class="text-xs text-muted-foreground">
                            Select multiple days (e.g., 10th and 25th for bi-monthly)
                          </p>
                        </div>
                      </div>

                      <!-- On specific weekday -->
                      <div class="flex items-start gap-3">
                        <RadioGroup.Item value="the" class="mt-1" id="on-the" />
                        <div class="space-y-3">
                          <Label for="on-the">On the</Label>

                          <div class="space-y-2">
                            <Label class="text-muted-foreground text-xs font-medium"
                              >Week(s):</Label>
                            <div class="flex flex-wrap gap-1">
                              {#each weekOptions as week}
                                <Button
                                  variant={(value.weeks || []).includes(week.value)
                                    ? 'default'
                                    : 'outline'}
                                  size="sm"
                                  onclick={() => handleWeekToggle(week.value)}
                                  disabled={value.on_type !== 'the' || !value.on || disabled}
                                  class="text-xs">
                                  {week.label}
                                </Button>
                              {/each}
                            </div>
                          </div>

                          <div class="space-y-2">
                            <Label class="text-muted-foreground text-xs font-medium">Day(s):</Label>
                            <div class="grid grid-cols-4 gap-1">
                              {#each weekdayOptions as weekday}
                                <Button
                                  variant={(value.weeks_days || []).includes(weekday.value)
                                    ? 'default'
                                    : 'outline'}
                                  size="sm"
                                  onclick={() => handleWeeksDaysToggle(weekday.value)}
                                  disabled={value.on_type !== 'the' || !value.on || disabled}
                                  class="text-xs">
                                  {weekday.label.slice(0, 3)}
                                </Button>
                              {/each}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </RadioGroup.Root>
                {/if}
              </div>
            </Tabs.Content>

            <!-- Yearly Options -->
            <Tabs.Content value="yearly" class="space-y-4">
              <div class="flex items-center gap-2 text-sm">
                <span>Repeat every</span>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  bind:value={value.interval}
                  class="w-20"
                  {disabled} />
                <span>year{(value.interval || 1) > 1 ? 's' : ''}</span>
              </div>
            </Tabs.Content>
          </Tabs.Root>

          <Separator />

          <!-- Weekend Handling -->
          <div class="space-y-4">
            <div class="space-y-2">
              <Label class="text-sm font-medium">Weekend Handling</Label>
              <p class="text-muted-foreground text-xs">Adjust dates that fall on weekends</p>
            </div>

            <RadioGroup.Root bind:value={value.moveWeekends} {disabled}>
              <div class="space-y-2">
                <div class="flex items-center space-x-2">
                  <RadioGroup.Item value="none" id="move-weekends-none" />
                  <Label class="text-sm" for="move-weekends-none">No adjustment</Label>
                </div>
                <div class="flex items-center space-x-2">
                  <RadioGroup.Item value="next_weekday" id="move-weekends-next" />
                  <Label class="text-sm" for="move-weekends-next">Move to next weekday (Monday)</Label>
                </div>
                <div class="flex items-center space-x-2">
                  <RadioGroup.Item value="previous_weekday" id="move-weekends-previous" />
                  <Label class="text-sm" for="move-weekends-previous">Move to previous weekday (Friday)</Label>
                </div>
              </div>
            </RadioGroup.Root>
          </div>

          <Separator />

          <!-- Holiday Handling -->
          <div class="space-y-4">
            <div class="space-y-2">
              <Label class="text-sm font-medium">Holiday Handling</Label>
              <p class="text-muted-foreground text-xs">Adjust dates that fall on US federal holidays</p>
            </div>

            <RadioGroup.Root bind:value={value.moveHolidays} {disabled}>
              <div class="space-y-2">
                <div class="flex items-center space-x-2">
                  <RadioGroup.Item value="none" id="move-holidays-none" />
                  <Label class="text-sm" for="move-holidays-none">No adjustment</Label>
                </div>
                <div class="flex items-center space-x-2">
                  <RadioGroup.Item value="next_weekday" id="move-holidays-next" />
                  <Label class="text-sm" for="move-holidays-next">Move to next weekday</Label>
                </div>
                <div class="flex items-center space-x-2">
                  <RadioGroup.Item value="previous_weekday" id="move-holidays-previous" />
                  <Label class="text-sm" for="move-holidays-previous">Move to previous weekday</Label>
                </div>
              </div>
            </RadioGroup.Root>
          </div>

          <Separator />

          <!-- Additional Dates -->
          <div class="space-y-4">
            <div class="space-y-2">
              <Label class="text-sm font-medium">Additional Dates</Label>
              <p class="text-muted-foreground text-xs">Add specific dates to include in the schedule</p>
            </div>

            <Popover.Root>
              <Popover.Trigger class="inline-flex h-10 w-full items-center justify-start whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" {disabled}>
                <CalendarDays class="mr-2 h-4 w-4" />
                {specificDatesButtonText}
              </Popover.Trigger>
              <Popover.Content class="w-auto p-0" align="start">
                <Calendar.Calendar
                  type="multiple"
                  bind:value={value.specific_dates}
                  {disabled}
                  initialFocus />
              </Popover.Content>
            </Popover.Root>

            {#if value.specific_dates && value.specific_dates.length > 0}
              <div class="space-y-1.5">
                {#each value.specific_dates as date}
                  <div class="bg-muted/50 flex items-center justify-between rounded p-2">
                    <span class="text-sm">{formatDate(date)}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      class="h-6 w-6"
                      onclick={() => handleRemoveSpecificDate(date)}
                      {disabled}>
                      <X class="h-4 w-4" />
                    </Button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <Separator />

          <!-- End Condition -->
          <div class="space-y-4">
            <Label
              class="hover:bg-accent/50 has-[[aria-checked=true]]:border-primary has-[[aria-checked=true]]:bg-primary/5 flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors">
              <Checkbox
                bind:checked={hasEndCondition}
                onCheckedChange={(checked) => {
                  if (!checked) {
                    value.end_type = null;
                    value.end = undefined;
                    value.limit = 0;
                  }
                }}
                {disabled}
                class="data-[state=checked]:border-primary data-[state=checked]:bg-primary" />
              <div class="flex-1">
                <div class="text-sm font-medium">Set end condition</div>
                <p class="text-muted-foreground text-xs">
                  Limit the number of occurrences or set an end date
                </p>
              </div>
            </Label>

            {#if hasEndCondition}
              <Tabs.Root
                bind:value={value.end_type}>
                <Tabs.List class="grid w-full grid-cols-2">
                  <Tabs.Trigger value="limit" {disabled}>Limit occurrences</Tabs.Trigger>
                  <Tabs.Trigger value="until" {disabled}>End on date</Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="limit" class="space-y-2">
                  <div class="flex items-center gap-2 text-sm">
                    <span>Stop after</span>
                    <Input
                      type="number"
                      min="1"
                      max="999"
                      bind:value={value.limit}
                      class="w-20"
                      {disabled} />
                    <span>occurrence{(value.limit || 1) > 1 ? 's' : ''}</span>
                  </div>
                </Tabs.Content>

                <Tabs.Content value="until" class="space-y-2">
                  Repeat until
                  <Popover.Root>
                    <Popover.Trigger class="ml-1 inline-flex h-10 w-full items-center justify-start whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-left text-sm font-normal ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" {disabled}>
                      <CalendarDays class="mr-2 h-4 w-4" />
                      {value.end ? formatDate(value.end) : 'Select end date'}
                    </Popover.Trigger>
                    <Popover.Content class="w-auto p-0" align="start">
                      <Calendar.Calendar
                        type="single"
                        initialFocus
                        bind:value={value.end}
                        {disabled} />
                    </Popover.Content>
                  </Popover.Root>
                </Tabs.Content>
              </Tabs.Root>
            {/if}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}
  </div>

  <!-- Preview Section -->
  {#if isRepeating && value.start}
    <Card.Root>
      <Card.Header class="pb-3">
        <Card.Title class="text-base">Preview</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        <!-- Validation Errors -->
        {#if !isValid && validationErrors.length > 0}
          <div class="bg-destructive/10 rounded-lg p-3 text-sm">
            <div class="text-destructive flex items-center gap-2 font-medium">
              <CircleAlert class="h-4 w-4" />
              Configuration Issues
            </div>
            <ul class="text-destructive/80 mt-2 space-y-1">
              {#each validationErrors as error}
                <li>• {error}</li>
              {/each}
            </ul>
          </div>
        {/if}

        <!-- Pattern Description -->
        <div class="space-y-2">
          <Label class="text-muted-foreground text-xs font-medium">Pattern:</Label>
          <p class="bg-muted/50 rounded p-2 text-sm">{value.formatted}</p>
        </div>

        <!-- Calendar Preview -->
        <div class="space-y-2">
          <Label class="text-muted-foreground text-xs font-medium">Calendar preview:</Label>
          <div class="flex flex-col md:flex-row gap-4 items-start">
            <div class="inline-block">
              <Calendar.Calendar
                type="single"
                value={value.start}
                class="rounded-md border [--cell-size:--spacing(11)] md:[--cell-size:--spacing(12.5)]"
                readonly
                bind:placeholder={value.placeholder}
                captionLayout="dropdown">
                {#snippet day({day, outsideMonth})}
                  {@const isStartDate = value.start && day.year === value.start.year && day.month === value.start.month && day.day === value.start.day}
                  {@const isRecurring = isUpcomingDate(day)}
                  {@const isSpecific = isSpecificDate(day)}
                  {@const todayDate = currentDate}
                  {@const isToday = day.year === todayDate.year && day.month === todayDate.month && day.day === todayDate.day}
                  {@const prevDay = day.subtract({ days: 1 })}
                  {@const nextDay = day.add({ days: 1 })}
                  {@const isPrevRecurring = isUpcomingDate(prevDay)}
                  {@const isNextRecurring = isUpcomingDate(nextDay)}
                  {@const isPrevSpecific = isSpecificDate(prevDay)}
                  {@const isNextSpecific = isSpecificDate(nextDay)}

                  <Calendar.Day
                    class={cn(
                      isStartDate
                        ? outsideMonth
                          ? '!bg-white dark:!bg-transparent ring-2 ring-green-500/40 !text-green-600/50 dark:!text-green-400/50 font-semibold'
                          : '!bg-white dark:!bg-transparent ring-2 ring-green-500 !text-green-600 dark:!text-green-400 font-semibold'
                        : isSpecific
                          ? outsideMonth
                            ? 'bg-amber-500/30 text-amber-700 hover:bg-amber-500/40 border-2 border-dotted border-amber-500/50'
                            : 'bg-amber-500 text-white hover:bg-amber-600 border-2 border-dotted border-amber-300'
                          : isRecurring
                            ? outsideMonth
                              ? 'bg-primary/30 text-primary hover:bg-primary/40 border-primary/50 border'
                              : 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                            : isToday
                              ? outsideMonth
                                ? 'border-2 border-blue-500/40 !text-blue-600/50 dark:!text-blue-400/50 font-medium'
                                : 'border-2 border-blue-500 !text-blue-600 dark:!text-blue-400 font-medium'
                              : outsideMonth
                                ? 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50'
                                : '',
                      // Flow adjacent highlighted days together
                      isRecurring && isPrevRecurring && 'rounded-l-none',
                      isRecurring && isNextRecurring && 'rounded-r-none',
                      isSpecific && isPrevSpecific && 'rounded-l-none',
                      isSpecific && isNextSpecific && 'rounded-r-none'
                    )}>
                    {day.day}
                  </Calendar.Day>
                {/snippet}
              </Calendar.Calendar>
            </div>

            <!-- Next Occurrences List -->
            {#if nextOccurrences.length > 0}
              <div class="space-y-3 flex-1">
                <div class="space-y-2">
                  <Label class="text-muted-foreground text-xs font-medium">Next occurrences:</Label>
                  <div class="space-y-1.5">
                    {#each nextOccurrences as date, index}
                      <div class="flex items-center gap-2 text-sm">
                        <Badge variant="outline" class="w-6 h-6 p-0 flex items-center justify-center text-xs">
                          {index + 1}
                        </Badge>
                        <span>{formatDate(date)}</span>
                      </div>
                    {/each}
                  </div>
                </div>

                <!-- Weekend/Holiday Adjustments -->
                {#if value.moveWeekends !== 'none' && value.moveWeekends !== 0 || value.moveHolidays !== 'none' && value.moveHolidays !== 0}
                  <div class="space-y-2 pt-2 border-t">
                    <Label class="text-muted-foreground text-xs font-medium">Adjustments:</Label>
                    <div class="space-y-1.5 text-xs">
                      {#if value.moveWeekends === 'next_weekday' || value.moveWeekends === 1}
                        <div class="flex items-center gap-2 text-muted-foreground">
                          <Badge variant="secondary" class="text-xs px-1.5 py-0">Weekend</Badge>
                          <span>Move to next weekday (Monday)</span>
                        </div>
                      {:else if value.moveWeekends === 'previous_weekday' || value.moveWeekends === 2}
                        <div class="flex items-center gap-2 text-muted-foreground">
                          <Badge variant="secondary" class="text-xs px-1.5 py-0">Weekend</Badge>
                          <span>Move to previous weekday (Friday)</span>
                        </div>
                      {/if}
                      {#if value.moveHolidays === 'next_weekday' || value.moveHolidays === 1}
                        <div class="flex items-center gap-2 text-muted-foreground">
                          <Badge variant="secondary" class="text-xs px-1.5 py-0">Holiday</Badge>
                          <span>Move to next weekday</span>
                        </div>
                      {:else if value.moveHolidays === 'previous_weekday' || value.moveHolidays === 2}
                        <div class="flex items-center gap-2 text-muted-foreground">
                          <Badge variant="secondary" class="text-xs px-1.5 py-0">Holiday</Badge>
                          <span>Move to previous weekday</span>
                        </div>
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </div>

        <!-- Legend -->
        <div class="space-y-2">
          <Label class="text-muted-foreground text-xs font-medium">Legend:</Label>
          <div class="flex flex-wrap gap-3 text-xs">
            <div class="flex items-center gap-1">
              <div class="bg-white dark:bg-transparent ring-2 ring-green-500 h-3 w-3 rounded"></div>
              <span>Start date</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="bg-primary h-3 w-3 rounded"></div>
              <span>Recurring dates</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="bg-primary/30 border-primary/50 h-3 w-3 rounded border"></div>
              <span>Adjacent month occurrences</span>
            </div>
            {#if value.specific_dates && value.specific_dates.length > 0}
              <div class="flex items-center gap-1">
                <div class="bg-amber-500 border-2 border-dotted border-amber-300 h-3 w-3 rounded"></div>
                <span>Specific dates</span>
              </div>
            {/if}
            <div class="flex items-center gap-1">
              <div class="border-2 border-blue-500 h-3 w-3 rounded"></div>
              <span>Today</span>
            </div>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
