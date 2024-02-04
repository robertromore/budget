<script lang="ts" generics="EditableItem extends { id: number } extends unknown, SelectableEditableEntity extends { value: string, label: string }">
  import { Avatar, Check } from 'radix-icons-svelte';
  import { cn } from '$lib/utils';
  import { Button } from '$lib/components/ui/button';
  import { BodyRow, DataColumn } from 'svelte-headless-table';
  import * as Popover from '$lib/components/ui/popover';
  import * as Command from '$lib/components/ui/command';
  import Icon from '@iconify/svelte';
  import ManagePayeeForm from '../forms/ManagePayeeForm.svelte';

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

  let manage = $state(false);
  let managingId: number = $state(0);
  const addNew = (event: MouseEvent) => {
    managingId = 0;
    toggleManageScreen(event);
  };
  const toggleManageScreen = (event: MouseEvent) => {
    manage = !manage;
    if (!manage) {
      managingId = 0;
    }
  };
  const onSave = (new_entity: EditableItem, is_new: boolean) => {
    if (is_new) {
      entities.push({ value: new_entity.id.toString(), label: new_entity.name } as SelectableEditableEntity);
    }
    else {
      for (let i = 0; i < entities.length; i++) {
        if (parseInt(entities[i].value) === new_entity.id) {
          entities[i].label = new_entity.name;
          break;
        }
      }
    }
  };
  const onDelete = (id: number) => {
    let position = null;
    for (let i = 0; i < entities.length; i++) {
      if (parseInt(entities[i].value) === id) {
        position = i;
        break;
      }
    }
    if (position) {
      entities.splice(position, 1);
    }
  }

  let search = $state('');
</script>

<div class="flex items-center space-x-4">
  <Popover.Root
    bind:open
    let:ids
    onOpenChange={(open) => {
      if (!open) {
        manage = false;
      }
    }}
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
      {#if !manage}
        <Command.Root>
          <div class="flex">
            <Command.Input placeholder="Search {entityLabel}..." bind:value={search} />
            <Button size="icon" class="rounded-none h-11 w-12 border-b shadow-none" onclick={addNew}>
              <Icon icon="lucide:plus"/>
            </Button>
          </div>
          <Command.List>
            <Command.Empty>No results found.</Command.Empty>
            <Command.Group>
              <!-- <Command.Item value="manage" onSelect={toggleManageScreen}>
                <div class="mr-2 h-4 w-4"></div>
                <div class="flex-grow font-bold">Manage {entityLabel}</div>
                <Icon icon="lucide:move-right" class="w-4 h-4 right-0"/>
              </Command.Item> -->
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
                  <div class="flex-grow">
                    {entity.label}
                  </div>
                  <Button variant="outline" size="icon" class="mr-1 p-2" onclick={(e: MouseEvent) => {
                    managingId = parseInt(entity.value);
                    toggleManageScreen(e);
                  }}>
                    edit
                  </Button>
                </Command.Item>
              {/each}
            </Command.Group>
          </Command.List>
        </Command.Root>
      {:else}
        <div class="p-2">
          <Button variant="outline" size="icon" onclick={toggleManageScreen}>
            <Icon icon="lucide:move-left" class="w-4 h-4"/>
          </Button>
          {#if managingId > 0}
            <ManagePayeeForm payeeId={managingId} onSave={onSave} onDelete={onDelete} />
          {:else}
            <ManagePayeeForm name={search} onSave={onSave} />
          {/if}
        </div>
      {/if}
      <!-- <Button class="rounded-none w-full">Manage</Button> -->
    </Popover.Content>
  </Popover.Root>
</div>
