<script lang="ts">
	import { getFormField } from "formsnap";
  import { Button, buttonVariants } from '../ui/button';
  import { Calendar } from "bits-ui";
  import * as Popover from '$lib/components/ui/popover';
  import { cn } from "$lib/utils";
  import { dateFormatter } from "$lib/helpers/formatters";
  import { CalendarDate, getLocalTimeZone, type DateValue } from "@internationalized/date";

	const { setValue, value } = getFormField();

  let handleSubmit = (new_value: DateValue | DateValue[] | undefined) => {
    if (!new_value) return;
    if (Array.isArray(new_value)) new_value = new_value[0];
    setValue(new_value);
  };
</script>

<Popover.Root>
  <Popover.Trigger asChild let:builder>
    <Button
      variant="outline"
      class={cn(
        "w-full justify-start text-left font-normal"
      )}
      builders={[builder]}
    >
      <span class="icon-[lucide--calendar-days] size-4 mr-2" />
      {$value ? dateFormatter.format(($value as CalendarDate).toDate(getLocalTimeZone())) : ''}
    </Button>
  </Popover.Trigger>
  <Popover.Content class="w-auto p-0" align="start">
    <Calendar.Root
      onValueChange={handleSubmit}
      initialFocus
      let:months
      let:weekdays
      weekdayFormat="short"
      fixedWeeks={true}
    >
      <Calendar.Header class="flex items-center justify-between">
        <Calendar.PrevButton
          class="inline-flex size-10 items-center justify-center rounded-9px bg-background hover:bg-muted active:scale-98 active:transition-all rounded-tl-md"
        >
          <span class="icon-[lucide--chevron-left] size-6"></span>
        </Calendar.PrevButton>
        <Calendar.Heading class="text-[15px] font-medium" />
        <Calendar.NextButton
          class="inline-flex size-10 items-center justify-center rounded-9px bg-background hover:bg-muted active:scale-98 active:transition-all rounded-tr-md"
        >
          <span class="icon-[lucide--chevron-right] size-6"></span>
        </Calendar.NextButton>
      </Calendar.Header>
      <div
        class="flex flex-col space-y-4 pt-4 sm:flex-row sm:space-x-4 sm:space-y-0"
      >
        {#each months as month, i (i)}
          <Calendar.Grid class="w-full border-collapse select-none space-y-1">
            <Calendar.GridHead>
              <Calendar.GridRow class="mb-1 flex w-full justify-between">
                {#each weekdays as day}
                  <Calendar.HeadCell
                    class="w-10 rounded-md text-xs !font-normal text-muted-foreground text-center"
                  >
                    <div>{day.slice(0, 2)}</div>
                  </Calendar.HeadCell>
                {/each}
              </Calendar.GridRow>
            </Calendar.GridHead>
            <Calendar.GridBody>
              {#each month.weeks as weekDates}
                <Calendar.GridRow class="flex w-full">
                  {#each weekDates as date}
                    <Calendar.Cell
                      {date}
                      class="relative size-10 !p-0 text-center text-sm"
                    >
                      <Calendar.Day
                        {date}
                        month={month.value}
                        class={cn(
                          buttonVariants({ variant: "ghost" }),
                          "h-8 w-8 p-0 font-normal",
                          // Today
                          "[&[data-today]:not([data-selected])]:bg-accent [&[data-today]:not([data-selected])]:text-accent-foreground",
                          // Selected
                          "data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:hover:bg-primary data-[selected]:hover:text-primary-foreground data-[selected]:focus:bg-primary data-[selected]:focus:text-primary-foreground data-[selected]:opacity-100",
                          // Disabled
                          "data-[disabled]:text-muted-foreground data-[disabled]:opacity-50",
                          // Unavailable
                          "data-[unavailable]:line-through data-[unavailable]:text-destructive-foreground",
                          // Outside months
                          "data-[outside-month]:text-muted-foreground data-[outside-month]:opacity-50 [&[data-outside-month][data-selected]]:bg-accent/50 [&[data-outside-month][data-selected]]:text-muted-foreground [&[data-outside-month][data-selected]]:opacity-30 data-[outside-month]:pointer-events-none",
                        )}
                      >
                        <div
                          class="absolute top-[5px] hidden size-1 rounded-full bg-foreground group-data-[today]:block group-data-[selected]:bg-background"
                        />
                        {date.day}
                      </Calendar.Day>
                    </Calendar.Cell>
                  {/each}
                </Calendar.GridRow>
              {/each}
            </Calendar.GridBody>
          </Calendar.Grid>
        {/each}
      </div>
    </Calendar.Root>
  </Popover.Content>
</Popover.Root>
