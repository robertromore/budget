<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Calendar } from "$lib/components/ui/calendar/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { dateFormatter } from "$lib/helpers/formatters";
  import { cn } from "$lib/utils";
  import { getLocalTimeZone, today, type DateValue } from "@internationalized/date";
  import { RangeCalendar } from "../ui/range-calendar";
    import type { DateRange } from "bits-ui";

  type Props = {
    value?: DateRange;
    startValue?: DateValue;
    class?: string;
    changeFilterValue: (new_value: unknown) => any;
  };

  let {
    value = $bindable(),
    startValue = $bindable(),
    class: className,
    changeFilterValue
  }: Props = $props();
</script>

<div class={cn("flex items-center space-x-4", className)}>
  <Popover.Root>
    <Popover.Trigger asChild let:builder>
      <Button
        variant="outline"
        class={cn(
          "w-full justify-start text-left font-normal",
          !value && "text-muted-foreground"
        )}
        builders={[builder]}
      >
        <span class="icon-[lucide--calendar-range] mr-2 size-4"></span>
        {#if value && value.start}
          {#if value.end}
            {dateFormatter.formatRange(value.start.toDate(getLocalTimeZone()), value.end.toDate(getLocalTimeZone()))}
          {:else}
            {dateFormatter.format(value.start.toDate(getLocalTimeZone()))}
          {/if}
        {:else if startValue}
          {dateFormatter.format(startValue.toDate(getLocalTimeZone()))}
        {:else}
          Pick a date
        {/if}
      </Button>
    </Popover.Trigger>
    <Popover.Content class="w-auto p-0" align="start">
      <RangeCalendar
        bind:value
        bind:startValue
        placeholder={value?.start}
        initialFocus
        numberOfMonths={2}
        onValueChange={(new_value) => {
          changeFilterValue(new_value);
        }}
      />
    </Popover.Content>
  </Popover.Root>
</div>
