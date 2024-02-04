<script lang="ts" generics="EditableItem">
  import { DateFormatter, getLocalTimeZone, type DateValue } from '@internationalized/date';
  import { cn } from '$lib/utils';
  import { Button } from '../ui/button';
  import { BodyRow, DataColumn } from 'svelte-headless-table';
  import * as Popover from '$lib/components/ui/popover';
  import { Calendar } from '$lib/components/ui/calendar';
  import { Calendar as CalendarIcon } from "radix-icons-svelte";

  let { row, column, value, onUpdateValue } = $props<{
    row: BodyRow<EditableItem>;
    column: DataColumn<EditableItem>;
    value: DateValue | undefined;
    onUpdateValue: (rowDataId: number, columnId: string, newValue: unknown) => void;
  }>();

  const handleSubmit = (new_value: DateValue | undefined) => {
    if (row.isData() && new_value) {
      onUpdateValue(parseInt(row.dataId), column.id, new_value.toDate(getLocalTimeZone()));
    }
  };

  const df = new DateFormatter("en-US", {
    dateStyle: "long"
  });
</script>

<Popover.Root>
  <Popover.Trigger asChild let:builder>
    <Button
      variant="outline"
      class={cn(
        "w-58 justify-start text-left font-normal"
      )}
      builders={[builder]}
    >
      <CalendarIcon class="mr-2 h-4 w-4" />
    </Button>
  </Popover.Trigger>
  <Popover.Content class="w-auto p-0" align="start">
    <Calendar bind:value onValueChange={handleSubmit} initialFocus />
  </Popover.Content>
</Popover.Root>
