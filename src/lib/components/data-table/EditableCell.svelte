<script lang="ts" generics="EditableItem">
  import { Textarea } from '../ui/textarea';
  import { Pencil2 } from 'radix-icons-svelte';
  import { cn } from '$lib/utils';
  import { Button } from '../ui/button';
  import * as Popover from '../ui/popover';
  import { BodyRow, DataColumn } from 'svelte-headless-table';

  let { row, column, value, onUpdateValue } = $props<{
    row: BodyRow<EditableItem>;
    column: DataColumn<EditableItem>;
    value: unknown;
    onUpdateValue: (rowDataId: number, columnId: string, newValue: unknown) => void;
  }>();

  let open = $state(false);

  let newValue = $state();

  const handleCancel = () => {
    open = false;
  };
  const handleSubmit = () => {
    open = false;
    value = newValue;
    if (row.isData()) {
      onUpdateValue(parseInt(row.dataId), column.id, value);
    }
  };
</script>

<Popover.Root
  bind:open
  onOpenChange={() => {
    newValue = '';
  }}
>
  <Popover.Trigger asChild let:builder>
    <Button
      variant="outline"
      class={cn(
        "w-48 justify-start text-left font-normal text-ellipsis overflow-hidden whitespace-nowrap block",
        !value && "text-muted-foreground"
      )}
      builders={[builder]}
    >
      <Pencil2 class="mr-2 h-4 w-4 inline-block align-top" />
      {value ? value : ""}
    </Button>
  </Popover.Trigger>
  <Popover.Content class="w-auto p-2 grid gap-2" align="start">
    <Textarea placeholder="" value={value?.toString()} on:change={(e) => newValue = (e.target as HTMLTextAreaElement).value } />
    <Button on:click={handleSubmit}>Save</Button>
  </Popover.Content>
</Popover.Root>

<style>
  form {
    display: flex;
    gap: 0.5rem;
  }

  button {
    padding: 0;
    border: none;
    background: transparent;
  }
</style>
