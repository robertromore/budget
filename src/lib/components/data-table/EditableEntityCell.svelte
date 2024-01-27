<script lang="ts" generics="EditableItem extends { id: number } extends unknown, SelectableEditableEntity extends { value: string, label: string }">
  import { Avatar, Check } from 'radix-icons-svelte';
  import { cn } from '$lib/utils';
  import { Button } from '../ui/button';
  import { BodyRow, DataColumn } from 'svelte-headless-table';
  import * as Popover from '$lib/components/ui/popover';
  import * as Command from '$lib/components/ui/command';

  let { row, column, value, onUpdateValue, entities, entityLabel } = $props<{
    row: BodyRow<EditableItem>;
    column: DataColumn<EditableItem>;
    value: EditableItem | undefined;
    onUpdateValue: (rowDataId: number, columnId: string, newValue: unknown) => void;
    entities: SelectableEditableEntity[],
    entityLabel: string
  }>();

  const findCurrentEntity = () => entities.find((entity) => entity.value == value?.id);
  let label = $state(findCurrentEntity()?.label);
  $effect(() => {
    label = findCurrentEntity()?.label;
  });

  let open = $state(false);
  const handleSubmit = (selected: string) => {
    open = false;
    const new_entity = entities.find((entity) => entity.value == selected);
    value = { id: new_entity?.value, name: new_entity?.label } as EditableItem;
    if (row.isData()) {
      onUpdateValue(parseInt(row.dataId), column.id + 'Id', parseInt(value?.id));
    }
  };
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
        "w-[240px] justify-start text-left font-normal text-ellipsis overflow-hidden whitespace-nowrap block",
        !value && "text-muted-foreground"
      )}
      builders={[builder]}
    >
      <Avatar class="mr-2 h-4 w-4 inline-block align-top" />
      {label}
    </Button>
    </Popover.Trigger>
    <Popover.Content class="p-0" align="start">
      <Command.Root>
        <Command.Input placeholder="Search {entityLabel}..." />
        <Command.List>
          <Command.Empty>No results found.</Command.Empty>
          <Command.Group>
            {#each entities as entity}
              <Command.Item
                value={entity.value}
                onSelect={(currentValue: string) => {
                  handleSubmit(currentValue);
                }}
                class={cn(value?.id == entity.value && "bg-muted")}
              >
                <Check
                  class={cn(
                    "mr-2 h-4 w-4",
                    value?.id != entity.value && "text-transparent"
                  )}
                />
                {entity.label}
              </Command.Item>
            {/each}
          </Command.Group>
        </Command.List>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>
</div>
