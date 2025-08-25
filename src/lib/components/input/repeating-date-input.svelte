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
  import { getLocalTimeZone, type DateValue } from "@internationalized/date";
  import { cn } from "$lib/utils";
  import { Button } from "$lib/components/ui/button";
  import * as Calendar from "$lib/components/ui/calendar";
  import * as Popover from "$lib/components/ui/popover";
  import * as Card from "$lib/components/ui/card";
  import * as Tabs from "$lib/components/ui/tabs";
  import * as RadioGroup from "$lib/components/ui/radio-group";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Switch } from "$lib/components/ui/switch";
  import { Label } from "$lib/components/ui/label";
  import Input from "$lib/components/ui/input/input.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { Separator } from "$lib/components/ui/separator";
  import { dateFormatter } from "$lib/utils/date-formatters";
  import { weekOptions, weekdayOptions } from "$lib/utils/date-options";

  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import Repeat from "@lucide/svelte/icons/repeat";
  import AlertCircle from "@lucide/svelte/icons/alert-circle";

  import RepeatingDateInputModel from "$lib/models/repeating_date.svelte";

  // Props
  let {
    value = $bindable(new RepeatingDateInputModel()),
    class: className,
    disabled = false,
  }: {
    value?: RepeatingDateInputModel;
    class?: string;
    disabled?: boolean;
  } = $props();

  // Local state
  let isRepeating = $state(false);
  let hasEndCondition = $state(false);

  // Computed properties
  let isValid = $derived.by(() => {
    const validation = value.validate();
    return validation ? validation.valid : true;
  });

  let validationErrors = $derived.by(() => {
    const validation = value.validate();
    return validation ? validation.errors : [];
  });

  let upcomingDatesPreview = $derived.by(() => {
    return value.upcoming.slice(0, 5);
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

  // Event handlers
  const handleFrequencyChange = (newFrequency: string) => {
    value.frequency = newFrequency as "daily" | "weekly" | "monthly" | "yearly";
    // Reset frequency-specific settings when changing frequency
    value.week_days = [];
    value.weeks = [];
    value.weeks_days = [];
    value.days = null;
    value.on = false;
  };

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

  $inspect(value);
</script>

<div class={cn("space-y-6", className)}>
  <!-- Start Date -->
  <div class="space-y-2">
    <Label for="start-date" class="text-sm font-medium">Start Date</Label>
    <Popover.Root>
      <Popover.Trigger>
        <Button variant="outline" class="w-full justify-start text-left font-normal" {disabled}>
          <CalendarDays class="mr-2 h-4 w-4" />
          {value.start ? formatDate(value.start) : "Select a date"}
        </Button>
      </Popover.Trigger>
      <Popover.Content class="w-auto p-0" align="start">
        <Calendar.Calendar type="single" initialFocus bind:value={value.start} {disabled} />
      </Popover.Content>
    </Popover.Root>
  </div>

  <!-- Repeat Toggle -->
  <div class="space-y-4">
    <Label
      class="hover:bg-accent/50 has-[[aria-checked=true]]:border-primary has-[[aria-checked=true]]:bg-primary/5 flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors"
    >
      <Checkbox
        bind:checked={isRepeating}
        {disabled}
        class="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
      />
      <div class="flex-1 space-y-1">
        <div class="flex items-center gap-2">
          <Repeat class="h-4 w-4" />
          <span class="font-medium">Make this recurring</span>
        </div>
        <p class="text-muted-foreground text-sm">Set up a repeating schedule for this item</p>
      </div>
    </Label>

    <!-- Recurrence Pattern -->
    {#if isRepeating}
      <Card.Root>
        <Card.Header class="pb-4">
          <Card.Title class="text-base">Recurrence Pattern</Card.Title>
          <Card.Description>Configure how often this should repeat</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-6">
          <!-- Frequency Selection -->
          <Tabs.Root bind:value={value.frequency} onValueChange={handleFrequencyChange}>
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
                  {disabled}
                />
                <span>day{(value.interval || 1) > 1 ? "s" : ""}</span>
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
                  {disabled}
                />
                <span>week{(value.interval || 1) > 1 ? "s" : ""}</span>
              </div>

              <div class="space-y-2">
                <Label class="text-sm font-medium">On these days:</Label>
                <div class="grid grid-cols-4 gap-2">
                  {#each weekdayOptions as weekday}
                    <Button
                      variant={(value.week_days || []).includes(weekday.value)
                        ? "default"
                        : "outline"}
                      size="sm"
                      onclick={() => handleWeekdayToggle(weekday.value)}
                      {disabled}
                      class="text-xs"
                    >
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
                  {disabled}
                />
                <span>month{(value.interval || 1) > 1 ? "s" : ""}</span>
              </div>

              <div class="space-y-4">
                <div class="flex items-center gap-2">
                  <Switch bind:checked={value.on} {disabled} />
                  <Label class="text-sm font-medium">Specify occurrence pattern</Label>
                </div>

                {#if value.on}
                  <RadioGroup.Root bind:value={value.on_type} disabled={!value.on || disabled}>
                    <div class="space-y-3">
                      <!-- On specific day of month -->
                      <div class="flex items-center gap-3">
                        <RadioGroup.Item value="day" />
                        <Label class="flex items-center gap-2">
                          <span>On day</span>
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            bind:value={value.days}
                            class="w-16"
                            disabled={value.on_type !== "day" || !value.on || disabled}
                          />
                          <span>of the month</span>
                        </Label>
                      </div>

                      <!-- On specific weekday -->
                      <div class="flex items-start gap-3">
                        <RadioGroup.Item value="the" class="mt-1" />
                        <div class="space-y-3">
                          <Label>On the</Label>

                          <div class="space-y-2">
                            <Label class="text-muted-foreground text-xs font-medium">Week(s):</Label
                            >
                            <div class="flex flex-wrap gap-1">
                              {#each weekOptions as week}
                                <Button
                                  variant={(value.weeks || []).includes(week.value)
                                    ? "default"
                                    : "outline"}
                                  size="sm"
                                  onclick={() => handleWeekToggle(week.value)}
                                  disabled={value.on_type !== "the" || !value.on || disabled}
                                  class="text-xs"
                                >
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
                                    ? "default"
                                    : "outline"}
                                  size="sm"
                                  onclick={() => handleWeeksDaysToggle(weekday.value)}
                                  disabled={value.on_type !== "the" || !value.on || disabled}
                                  class="text-xs"
                                >
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
                  {disabled}
                />
                <span>year{(value.interval || 1) > 1 ? "s" : ""}</span>
              </div>
            </Tabs.Content>
          </Tabs.Root>

          <Separator />

          <!-- End Condition -->
          <div class="space-y-4">
            <Label
              class="hover:bg-accent/50 has-[[aria-checked=true]]:border-primary has-[[aria-checked=true]]:bg-primary/5 flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors"
            >
              <Checkbox
                bind:checked={hasEndCondition}
                {disabled}
                class="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
              />
              <div class="flex-1">
                <div class="text-sm font-medium">Set end condition</div>
                <p class="text-muted-foreground text-xs">
                  Limit the number of occurrences or set an end date
                </p>
              </div>
            </Label>

            {#if hasEndCondition}
              <Tabs.Root
                value={value.end_type || "limit"}
                onValueChange={(v) => (value.end_type = v as "limit" | "until" | null)}
              >
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
                      {disabled}
                    />
                    <span>occurrence{(value.limit || 1) > 1 ? "s" : ""}</span>
                  </div>
                </Tabs.Content>

                <Tabs.Content value="until" class="space-y-2">
                  Repeat until
                  <Popover.Root>
                    <Popover.Trigger>
                      <Button
                        variant="outline"
                        class="w-full justify-start text-left font-normal"
                        {disabled}
                      >
                        <CalendarDays class="mr-2 h-4 w-4" />
                        {value.end ? formatDate(value.end) : "Select end date"}
                      </Button>
                    </Popover.Trigger>
                    <Popover.Content class="w-auto p-0" align="start">
                      <Calendar.Calendar
                        type="single"
                        initialFocus
                        bind:value={value.end}
                        {disabled}
                      />
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
              <AlertCircle class="h-4 w-4" />
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

        <!-- Date Range Info -->
        {#if value.upcoming.length > 0}
          <div class="space-y-2">
            <Label class="text-muted-foreground text-xs font-medium">
              Found {value.upcoming.length} occurrence{value.upcoming.length > 1 ? "s" : ""} (from start
              date onwards)
            </Label>
            <div class="bg-muted/30 rounded p-2 text-xs">
              Range: {formatDate(value.upcoming[0])} → {formatDate(
                value.upcoming[value.upcoming.length - 1]
              )}
            </div>
          </div>
        {/if}

        <!-- Upcoming Dates -->
        {#if upcomingDatesPreview.length > 0}
          <div class="space-y-2">
            <Label class="text-muted-foreground text-xs font-medium">Next occurrences:</Label>
            <div class="flex flex-wrap gap-1">
              {#each upcomingDatesPreview as date}
                <Badge variant="outline" class="text-xs">
                  {formatDate(date)}
                </Badge>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Calendar Preview -->
        <div class="space-y-2">
          <Label class="text-muted-foreground text-xs font-medium">Calendar preview:</Label>
          <Calendar.Calendar
            type="single"
            value={value.start}
            class="rounded-md border"
            readonly
            onPlaceholderChange={(newValue) => {
              value.placeholder = newValue;
            }}
          >
            {#snippet day({ day, outsideMonth })}
              {@const dayDate = day.toDate(getLocalTimeZone())}
              {@const isStartDate =
                value.start &&
                dayDate.getFullYear() === value.start.year &&
                dayDate.getMonth() === value.start.month - 1 &&
                dayDate.getDate() === value.start.day}
              {@const isRecurring = isUpcomingDate(dayDate)}

              <Calendar.Day
                class={cn(
                  isStartDate
                    ? "bg-green-500 font-bold text-white ring-2 ring-green-300 hover:bg-green-600"
                    : isRecurring
                      ? outsideMonth
                        ? "bg-primary/30 text-primary hover:bg-primary/40 border-primary/50 border"
                        : "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                      : outsideMonth
                        ? "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50"
                        : ""
                )}
              >
                {day.day}
              </Calendar.Day>
            {/snippet}
          </Calendar.Calendar>
        </div>

        <!-- Legend -->
        <div class="space-y-2">
          <Label class="text-muted-foreground text-xs font-medium">Legend:</Label>
          <div class="flex flex-wrap gap-3 text-xs">
            <div class="flex items-center gap-1">
              <div class="h-3 w-3 rounded bg-green-500 ring-1 ring-green-300"></div>
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
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
