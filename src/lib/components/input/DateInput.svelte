<script lang="ts">
  import { getLocalTimeZone, type DateValue, today } from '@internationalized/date';
  import { cn } from '$lib/utils';
  import { Button } from '$lib/components/ui/button';
  import { Calendar } from '$lib/components/ui/calendar';
  import * as Popover from '$lib/components/ui/popover';
  import { dateFormatter } from '$lib/helpers/formatters';

  let {
    value = $bindable(),
    handleSubmit
  }: {
    value?: DateValue;
    handleSubmit?: (value: DateValue | DateValue[] | undefined) => void;
  } = $props();
</script>

<Popover.Root>
  <Popover.Trigger asChild let:builder>
    <Button
      variant="outline"
      class={cn('w-full justify-start text-left font-normal')}
      builders={[builder]}
    >
      <span class="icon-[lucide--calendar-days] mr-2 size-4"></span>
      {dateFormatter.format(
        value
          ? value.toDate(getLocalTimeZone())
          : today(getLocalTimeZone()).toDate(getLocalTimeZone())
      )}
    </Button>
  </Popover.Trigger>
  <Popover.Content class="w-auto p-0" align="start">
    <Calendar bind:value initialFocus onValueChange={handleSubmit} />
  </Popover.Content>
</Popover.Root>
