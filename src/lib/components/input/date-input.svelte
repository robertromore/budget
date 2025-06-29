<script lang="ts">
  import { getLocalTimeZone, type DateValue, today } from "@internationalized/date";
  import { cn } from "$lib/utils";
  import { Button } from "$lib/components/ui/button";
  import { Calendar } from "$lib/components/ui/calendar";
  import * as Popover from "$lib/components/ui/popover";
  import { dateFormatter } from "$lib/helpers/formatters";
  import CalendarDays from "@lucide/svelte/icons/calendar-days";

  let {
    value = $bindable(),
    handleSubmit,
    buttonClass,
  }: {
    value?: DateValue;
    handleSubmit?: (value: DateValue | undefined) => void;
    buttonClass?: string;
  } = $props();
</script>

<Popover.Root>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button {...props} variant="outline" class={cn("w-full justify-start text-left font-normal", buttonClass)}>
        <CalendarDays class="-mt-1 mr-1 inline-block size-4" />
        {dateFormatter.format(
          value
            ? value.toDate(getLocalTimeZone())
            : today(getLocalTimeZone()).toDate(getLocalTimeZone())
        )}
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-auto p-0" align="start">
    <Calendar type="single" bind:value initialFocus onValueChange={handleSubmit} />
  </Popover.Content>
</Popover.Root>
