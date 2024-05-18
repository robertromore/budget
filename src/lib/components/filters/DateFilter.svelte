<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import { Calendar } from '$lib/components/ui/calendar/index.js';
  import * as Popover from '$lib/components/ui/popover/index.js';
  import { dateFormatter } from '$lib/helpers/formatters';
  import { cn } from '$lib/utils';
  import { getLocalTimeZone, today, type DateValue } from '@internationalized/date';

  type Props = {
    value?: DateValue;
    class?: string;
    changeFilterValue: (new_value: unknown) => unknown;
  };

  let { value = $bindable(), class: className, changeFilterValue }: Props = $props();
</script>

<div class={cn('flex items-center space-x-4', className)}>
  <Popover.Root>
    <Popover.Trigger asChild let:builder>
      <Button
        variant="outline"
        class={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground')}
        builders={[builder]}
      >
        <span class="icon-[lucide--calendar-days] mr-2 size-4"></span>
        {value ? dateFormatter.format(value.toDate(getLocalTimeZone())) : 'Pick a date'}
      </Button>
    </Popover.Trigger>
    <Popover.Content class="w-auto p-0" align="start">
      <Calendar
        bind:value
        onValueChange={(new_value) => {
          changeFilterValue(new_value);
        }}
      />
    </Popover.Content>
  </Popover.Root>
</div>
