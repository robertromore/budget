<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { Calendar } from '$lib/components/ui/calendar';
import * as Popover from '$lib/components/ui/popover';
import { cn } from '$lib/utils';
import { createTransformAccessors } from '$lib/utils/bind-helpers';
import { dayFmt } from '$lib/utils/date-formatters';
import { currentDate, timezone } from '$lib/utils/dates';
import { type DateValue } from '@internationalized/date';
import CalendarDays from '@lucide/svelte/icons/calendar-days';

interface Props {
  value?: DateValue | undefined;
  handleSubmit?: (value: DateValue | undefined) => void;
  buttonClass?: string;
}

let { value = $bindable(), handleSubmit, buttonClass }: Props = $props();

// Track the last externally provided value to distinguish user changes from prop updates
let lastExternalValue = $state(value ?? currentDate);

// Initialize to current date if undefined, and sync external value changes
$effect(() => {
  if (value === undefined) {
    value = currentDate;
  }
  lastExternalValue = value;
});

// Create accessors for Calendar binding
const valueAccessors = createTransformAccessors(
  () => value ?? currentDate,
  (newValue: DateValue) => {
    value = newValue;
    // Only call handleSubmit if this is a user-initiated change (different from last external value)
    if (handleSubmit && newValue.toString() !== lastExternalValue?.toString()) {
      handleSubmit(newValue);
      lastExternalValue = newValue; // Update to prevent duplicate submissions
    }
  }
);
</script>

<Popover.Root>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        class={cn('w-full justify-start text-left font-normal', buttonClass)}>
        <CalendarDays class="-mt-1 mr-1 inline-block size-4" />
        {dayFmt.format((value ?? currentDate).toDate(timezone))}
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-auto p-0" align="start">
    <Calendar type="single" bind:value={valueAccessors.get, valueAccessors.set} initialFocus />
  </Popover.Content>
</Popover.Root>
