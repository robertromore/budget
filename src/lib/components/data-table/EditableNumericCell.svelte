<script lang="ts" generics="EditableItem extends { id: number } extends unknown">
  import { currencyFormatter } from '$lib/helpers/formatters';
  import Keypad from '../input/NumericInput.svelte';
  import { cn } from '$lib/utils';
  import { Button } from '../ui/button';
  import { BodyRow, DataColumn } from 'svelte-headless-table';
  import * as Popover from '$lib/components/ui/popover';

  let { row, column, value, onUpdateValue } = $props<{
    row: BodyRow<EditableItem>;
    column: DataColumn<EditableItem>;
    value: EditableItem | undefined;
    onUpdateValue: (rowDataId: number, columnId: string, newValue: unknown) => void;
  }>();

  let open = $state(false);
  const handleSubmit = () => {
    open = false;
    if (row.isData()) {
      onUpdateValue(parseInt(row.dataId), column.id, value);
    }
  };

  $effect(() => {
    value = currencyFormatter.format(value?.toString().replace('$', ''));
  })
</script>

<div class="flex items-center space-x-4">
  <Popover.Root
    bind:open
    let:ids
  >
    <Popover.Trigger asChild let:builder>
      <Button
      variant="outline"
      class={cn(
        "w-[240px] justify-start text-left font-normal",
        !value && "text-muted-foreground"
      )}
      builders={[builder]}
    >
      {value}
    </Button>
    </Popover.Trigger>
    <Popover.Content class="p-0" align="start">
      <Keypad bind:value onSubmit={handleSubmit} hotkeys={true} input={false} />
    </Popover.Content>
  </Popover.Root>
</div>
