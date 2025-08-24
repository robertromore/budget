<script lang="ts">
  import { getLocalTimeZone } from "@internationalized/date";
  import { cn } from "$lib/utils";
  import { Button } from "$lib/components/ui/button";
  import * as Calendar from "$lib/components/ui/calendar";
  import * as Popover from "$lib/components/ui/popover";
  import { dateFormatter } from "$lib/utils/date-formatters";
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import * as Tabs from "$lib/components/ui/tabs";
  import * as Card from "$lib/components/ui/card";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Checkbox as BaseCheckbox, useId } from "bits-ui";
  import { Label } from "$lib/components/ui/label";
  import type { RepeatingDate } from "$lib/types";
  import RepeatingDateInputModel from "$lib/models/repeating_date.svelte";
  import Input from "$lib/components/ui/input/input.svelte";
  import { Switch } from "$lib/components/ui/switch";
  import * as RadioGroup from "$lib/components/ui/radio-group";
  import * as Select from "$lib/components/ui/select";
  import { Badge } from "$lib/components/ui/badge";
  import { weekOptions, weekdayOptions } from "$lib/utils/date-options";

  let {
    value = $bindable(new RepeatingDateInputModel()),
    buttonClass,
  }: {
    value?: RepeatingDate;
    buttonClass?: string;
  } = $props();

  let repeating = $state(false);
  let repeat_until = $state(false);

  const isUpcomingDate = (date: Date) => {
    return value.upcoming?.some((d) => {
      const dDate = d.toDate(getLocalTimeZone());
      return (
        dDate.getFullYear() === date.getFullYear() &&
        dDate.getMonth() === date.getMonth() &&
        dDate.getDate() === date.getDate()
      );
    });
  };
</script>

{#snippet DailyCheckbox({ value, label }: { value: string; label: string })}
  {@const id = useId()}
  <div class="flex items-center">
    <Checkbox {id} {value} />
    <Label id="{id}-label" for={id} class="ml-2">
      {label}
    </Label>
  </div>
{/snippet}

<div class="flex w-full max-w-sm flex-col gap-6">
  <div class="flex flex-col">
    <Label class="text-sm font-medium">Date</Label>
    <Popover.Root>
      <Popover.Trigger>
        <Button
          variant="outline"
          class={cn("w-full justify-start text-left font-normal", buttonClass)}
        >
          <CalendarDays class="-mt-1 mr-1 inline-block size-4" />
          {value.start
            ? dateFormatter.format(value.start.toDate(getLocalTimeZone()))
            : "Select a date"}
        </Button>
      </Popover.Trigger>
      <Popover.Content class="w-auto p-0" align="start">
        <Calendar.Calendar type="single" initialFocus bind:value={value.start} />
      </Popover.Content>
    </Popover.Root>

    <Label
      class="hover:bg-accent/50 mt-2.5 flex items-start gap-3 rounded-lg border p-3 has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 dark:has-[[aria-checked=true]]:bg-blue-950"
    >
      <Checkbox
        bind:checked={repeating}
        class="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
      />
      <div class="grid gap-1.5 font-normal">
        <p class="text-sm leading-none font-medium">Repeat</p>
        <p class="text-muted-foreground text-sm">Repeat the schedule on a regular basis.</p>
      </div>
    </Label>

    {#if repeating}
      <Tabs.Root
        bind:value={value.frequency}
        class="mt-2.5"
        onValueChange={(newValue) => {
          value.days = null;
          value.weeks = [];
          value.weeks_days = [];
          value.months = [];
        }}
      >
        <Tabs.List>
          <Tabs.Trigger value="daily">Daily</Tabs.Trigger>
          <Tabs.Trigger value="weekly">Weekly</Tabs.Trigger>
          <Tabs.Trigger value="monthly">Monthly</Tabs.Trigger>
          <Tabs.Trigger value="yearly">Yearly</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="daily">
          <Card.Root>
            <Card.Content class="flex flex-row items-center">
              Repeat every <Input
                type="number"
                bind:value={value.interval}
                class="mx-2 w-20"
                min="1"
              /> day(s)
            </Card.Content>
          </Card.Root>
        </Tabs.Content>
        <Tabs.Content value="weekly">
          <Card.Root>
            <Card.Content>
              <div class="flex flex-row items-center">
                Repeat every <Input
                  type="number"
                  bind:value={value.interval}
                  class="mx-2 w-20"
                  min="1"
                /> week(s) on:
              </div>

              <BaseCheckbox.Group bind:value={value.week_days as unknown as string[]}>
                <div class="mt-2 grid grid-cols-2 gap-4">
                  {@render DailyCheckbox({ value: "0", label: "Sunday" })}
                  {@render DailyCheckbox({ value: "1", label: "Monday" })}
                  {@render DailyCheckbox({ value: "2", label: "Tuesday" })}
                  {@render DailyCheckbox({ value: "3", label: "Wednesday" })}
                  {@render DailyCheckbox({ value: "4", label: "Thursday" })}
                  {@render DailyCheckbox({ value: "5", label: "Friday" })}
                  {@render DailyCheckbox({ value: "6", label: "Saturday" })}
                </div>
              </BaseCheckbox.Group>
            </Card.Content>
          </Card.Root>
        </Tabs.Content>
        <Tabs.Content value="monthly">
          <Card.Root>
            <Card.Content class="flex flex-col gap-4">
              <div class="flex flex-row items-center">
                Repeat every <Input
                  type="number"
                  bind:value={value.interval}
                  class="mx-2 w-20"
                  min="1"
                /> month(s)
              </div>

              <div class="flex flex-row items-center gap-4">
                <div class="flex items-center space-x-2">
                  <Switch id="monthly_on" bind:checked={value.on} />
                  <Label for="monthly_on">On</Label>
                </div>

                <div class="flex flex-col">
                  <RadioGroup.Root bind:value={value.on_type} disabled={!value.on}>
                    <div class="flex items-center space-x-2">
                      <RadioGroup.Item value="day" id="monthly_on_day" />
                      <Label for="monthly_on_day" class="flex flex-row items-center gap-2"
                        >Day <Input
                          bind:value={value.days}
                          type="number"
                          class="w-20"
                          disabled={!value.on || value.on_type !== "day"}
                          min="1"
                          max="32"
                        /></Label
                      >
                    </div>
                    <div class="flex items-center space-x-2">
                      <RadioGroup.Item value="the" id="monthly_on_the" />
                      <Label for="monthly_on_the" class="flex flex-row items-center gap-2">
                        The
                      </Label>

                      <div class="flex flex-col gap-2">
                        <Select.Root
                          type="multiple"
                          bind:value={value.weeks as unknown as string[]}
                          disabled={!value.on || value.on_type !== "the"}
                        >
                          <Select.Trigger class="w-[180px]">
                            {#if (value.weeks?.length || 0) > 2}
                              <Badge>{value.weeks?.length}</Badge>
                            {:else}
                              {value.weeks?.map((week) => weekOptions[week - 1].label).join(", ")}
                            {/if}
                          </Select.Trigger>
                          <Select.Content>
                            <Select.Group>
                              {#each weekOptions as day_value (day_value.value)}
                                <Select.Item value={day_value.value + ""} label={day_value.label}>
                                  {day_value.label}
                                </Select.Item>
                              {/each}
                            </Select.Group>
                          </Select.Content>
                        </Select.Root>

                        <Select.Root
                          type="multiple"
                          bind:value={value.weeks_days as unknown as string[]}
                          disabled={!value.on || value.on_type !== "the"}
                        >
                          <Select.Trigger class="w-[180px] break-after-all">
                            {#if (value.weeks_days?.length || 0) > 2}
                              <Badge>{value.weeks_days?.length}</Badge>
                            {:else}
                              {value.weeks_days?.map((day) => weekdayOptions[day].label).join(", ")}
                            {/if}
                          </Select.Trigger>
                          <Select.Content>
                            <Select.Group>
                              {#each weekdayOptions as day_value (day_value.value)}
                                <Select.Item value={day_value.value + ""} label={day_value.label}>
                                  {day_value.label}
                                </Select.Item>
                              {/each}
                            </Select.Group>
                          </Select.Content>
                        </Select.Root>
                      </div>
                      <!-- </Label> -->
                    </div>
                  </RadioGroup.Root>
                </div>
              </div>
            </Card.Content>
          </Card.Root>
        </Tabs.Content>
        <Tabs.Content value="yearly">
          <Card.Root>
            <Card.Content class="flex flex-col gap-4">
              <div class="flex flex-row items-center">
                Repeat every <Input type="number" bind:value={value.interval} class="mx-2 w-20" /> year(s)
              </div>

              <!-- <div class="flex flex-row items-center gap-4">
                <div class="flex items-center space-x-2">
                  <Switch id="yearly_on" bind:checked={yearly_on} />
                  <Label for="yearly_on">On</Label>
                </div>

                <div class="flex flex-col">
                  <RadioGroup.Root bind:value={yearly_on_type} disabled={!yearly_on}>
                    <div class="flex items-center space-x-2">
                      <RadioGroup.Item value="day" id="yearly_on_day" />
                      <Label for="yearly_on_day" class="flex flex-row items-center gap-2"
                        >Day <Input
                          bind:value={yearly_on_day}
                          type="number"
                          class="w-20"
                          disabled={!yearly_on || yearly_on_type !== "day"}
                        /></Label
                      >
                    </div>
                    <div class="flex items-center space-x-2">
                      <RadioGroup.Item value="the" id="yearly_on_the" />
                      <Label for="yearly_on_the" class="flex flex-row items-center gap-2">
                        The
                        <div class="flex flex-col gap-2">
                          <Select.Root
                            type="multiple"
                            bind:value={yearly_on_the_day}
                            disabled={!yearly_on || yearly_on_type !== "the"}
                          >
                            <Select.Trigger class="w-[180px]">
                              {#if !isNaN(yearly_on_the_day_label as number)}
                                <Badge>
                                  {yearly_on_the_day_label} selected
                                </Badge>
                              {:else}
                                {yearly_on_the_day_label}
                              {/if}
                            </Select.Trigger>
                            <Select.Content>
                              <Select.Group>
                                {#each yearly_on_the_day_values as day_value (day_value.value)}
                                  <Select.Item value={day_value.value} label={day_value.label}>
                                    {day_value.label}
                                  </Select.Item>
                                {/each}
                              </Select.Group>
                            </Select.Content>
                          </Select.Root>
                          <Select.Root
                            type="multiple"
                            bind:value={yearly_on_the_month}
                            disabled={!yearly_on || yearly_on_type !== "the"}
                          >
                            <Select.Trigger class="w-[180px]">
                              {#if !isNaN(yearly_on_the_month_label as number)}
                                <Badge>
                                  {yearly_on_the_month_label} selected
                                </Badge>
                              {:else}
                                {yearly_on_the_month_label}
                              {/if}
                            </Select.Trigger>
                            <Select.Content>
                              <Select.Group>
                                {#each yearly_on_the_month_values as month_value (month_value.value)}
                                  <Select.Item value={month_value.value} label={month_value.label}>
                                    {month_value.label}
                                  </Select.Item>
                                {/each}
                              </Select.Group>
                            </Select.Content>
                          </Select.Root>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup.Root>
                </div>
              </div> -->
            </Card.Content>
          </Card.Root>
        </Tabs.Content>
      </Tabs.Root>

      <Label
        class="hover:bg-accent/50 mt-2.5 flex items-start gap-3 rounded-lg border p-3 has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 dark:has-[[aria-checked=true]]:bg-blue-950"
      >
        <Checkbox
          bind:checked={repeat_until}
          class="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
        />
        <div class="grid gap-1.5 font-normal">
          <p class="text-sm leading-none font-medium">Repeat Until</p>
          <p class="text-muted-foreground text-sm">Repeat the schedule until...</p>
        </div>
      </Label>

      {#if repeat_until}
        <Tabs.Root
          value={value.end_type || "limit"}
          onValueChange={(newValue) => {
            value.end_type = (newValue || null) as "limit" | "until" | null;
          }}
          class="my-2"
        >
          <Tabs.List>
            <Tabs.Trigger value="limit">Limit</Tabs.Trigger>
            <Tabs.Trigger value="until">Until</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="limit">
            <Card.Root>
              <Card.Content class="flex flex-row items-center">
                Repeat <Input
                  type="number"
                  bind:value={value.limit}
                  class="mx-2 w-20"
                  min="1"
                  placeholder="1"
                />
                time(s)
              </Card.Content>
            </Card.Root>
          </Tabs.Content>
          <Tabs.Content value="until">
            <Card.Root>
              <Card.Content class="flex flex-row items-center">
                Repeat until
                <Popover.Root>
                  <Popover.Trigger class="ml-2">
                    <Button
                      variant="outline"
                      class={cn("w-full justify-start text-left font-normal", buttonClass)}
                    >
                      <CalendarDays class="-mt-1 mr-1 inline-block size-4" />
                      {value.end
                        ? dateFormatter.format(value.end.toDate(getLocalTimeZone()))
                        : "Select a date"}
                    </Button>
                  </Popover.Trigger>
                  <Popover.Content class="w-auto p-0" align="start">
                    <Calendar.Calendar type="single" initialFocus bind:value={value.end} />
                  </Popover.Content>
                </Popover.Root>
              </Card.Content>
            </Card.Root>
          </Tabs.Content>
        </Tabs.Root>
      {/if}

      <p class="leading-7 [&:not(:first-child)]:my-3">{value.formatted}</p>

      <strong>Upcoming Dates</strong>
      <!-- <ul class="list-disc pl-5">
        {#each value.upcoming || [] as date}
          <li>{dateFormatter.format(date.toDate(getLocalTimeZone()))}</li>
        {/each}
      </ul> -->

      <Calendar.Calendar
        type="multiple"
        initialFocus
        readonly
        onPlaceholderChange={(newValue) => {
          value.placeholder = newValue;
        }}
        class="mt-4 rounded-md border shadow-sm [--cell-size:--spacing(11)] md:[--cell-size:--spacing(11.5)]"
        disableDaysOutsideMonth={true}
      >
        {#snippet day({ day, outsideMonth })}
          <!-- {#if !outsideMonth} -->
          <Calendar.Day
            class={cn(
              isUpcomingDate(day.toDate(getLocalTimeZone()))
                ? outsideMonth
                  ? "bg-blue-200"
                  : "bg-blue-600 text-white hover:bg-blue-700 focus:bg-blue-700 [&[data-today]:not([data-selected])]:bg-blue-800 [&[data-today]:not([data-selected])]:text-white"
                : "",
              "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex h-[--cell-size] w-[--cell-size] items-center justify-center rounded-full text-sm font-medium transition-colors"
            )}
          >
            {day.day}
          </Calendar.Day>
          <!-- {/if} -->
        {/snippet}
      </Calendar.Calendar>
    {/if}
  </div>
</div>
