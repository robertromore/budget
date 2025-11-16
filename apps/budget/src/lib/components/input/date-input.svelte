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
  value?: DateValue;
  handleSubmit?: (value: DateValue | undefined) => void;
  buttonClass?: string;
}

let { value = $bindable(), handleSubmit, buttonClass }: Props = $props();

// Create accessors for Calendar binding to handle optional DateValue
const valueAccessors = createTransformAccessors(
  () => value ?? currentDate,
  (newValue: DateValue) => {
    value = newValue;
  }
);

// Track if this is the initial mount to avoid triggering submit on mount
let isInitialMount = true;

// Handle submit callback when value changes (but not on initial mount)
$effect(() => {
  if (handleSubmit && value !== undefined) {
    if (isInitialMount) {
      isInitialMount = false;
    } else {
      handleSubmit(value);
    }
  }
});
</script>

<Popover.Root>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        class={cn('w-full justify-start text-left font-normal', buttonClass)}>
        <CalendarDays class="-mt-1 mr-1 inline-block size-4" />
        {dayFmt.format(value ? value.toDate(timezone) : currentDate.toDate(timezone))}
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-auto p-0" align="start">
    <Calendar type="single" bind:value={valueAccessors.get, valueAccessors.set} initialFocus />
  </Popover.Content>
</Popover.Root>
