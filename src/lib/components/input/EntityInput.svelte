<script lang="ts">
  import type { Category, Payee } from '$lib/schema';
  import { getPayeeState } from '$lib/states/PayeeState.svelte';
  import { getCategoryState } from '$lib/states/CategoryState.svelte';
  import { cn } from '$lib/utils';
  import ManagePayeeForm from '../forms/ManagePayeeForm.svelte';
  import { Button } from '$lib/components/ui/button';
  import * as Command from '$lib/components/ui/command';
  import * as Popover from '$lib/components/ui/popover';
  import type { EditableEntityItem } from '../types';

  let { entityLabel = $bindable(), value = $bindable(), handleSubmit }: {
    entityLabel: string;
    value?: EditableEntityItem;
    handleSubmit?: (selected: EditableEntityItem) => void;
  } = $props();

  let entities: Category[] | Payee[] = entityLabel === 'categories' ? getCategoryState().categories : getPayeeState().payees;

  const findCurrentEntity = () => entities.find((entity) => entity.id == value?.id);
  let label = $state(findCurrentEntity()?.name);
  $effect(() => {
    label = findCurrentEntity()?.name;
  });

  let open = $state(false);
  let manage = $state(false);
  let search = $state('');
  let managingId: number = $state(0);

  const toggleManageScreen = (event: MouseEvent) => {
    manage = !manage;
    if (!manage) {
      managingId = 0;
    }
  };

  const onSave = (new_entity: EditableEntityItem, is_new: boolean) => {
    if (is_new) {
      entities.push(new_entity);
      value = new_entity;
    } else {
      for (let i = 0; i < entities.length; i++) {
        if (entities[i].id === new_entity.id) {
          entities[i].name = new_entity.name;
          break;
        }
      }
    }
    managingId = 0;
    manage = false;
  };

  const onDelete = (id: number) => {
    let position = null;
    for (let i = 0; i < entities.length; i++) {
      if (entities[i].id === id) {
        position = i;
        break;
      }
    }
    if (position) {
      entities.splice(position, 1);
    }
    managingId = 0;
    manage = false;
  };

  const addNew = (event: MouseEvent) => {
    managingId = 0;
    toggleManageScreen(event);
  };
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
          'block w-full justify-start overflow-hidden text-ellipsis whitespace-nowrap text-left font-normal',
          !value && 'text-muted-foreground'
        )}
        builders={[builder]}
      >
        <span class="icon-[carbon--user-avatar] mr-2 inline-block h-4 w-4 align-top"></span>
        {label}
      </Button>
    </Popover.Trigger>
    <Popover.Content class="p-0" align="start">
      {#if !manage}
        <Command.Root>
          <div class="flex">
            <Command.Input placeholder="Search {entityLabel}..." bind:value={search} />
            <Button
              size="icon"
              class="h-11 w-12 rounded-none border-b shadow-none"
              onclick={addNew}
            >
              <span class="icon-[lucide--plus]"></span>
            </Button>
          </div>
          <Command.List>
            <Command.Empty>No results found.</Command.Empty>
            <Command.Group>
              {#each entities as entity}
                <Command.Item
                  value={entity.id + ''}
                  class={cn(value?.id == entity.id && 'bg-muted')}
                  onSelect={() => {
                    value = entity;
                    if (handleSubmit) {
                      handleSubmit(entity);
                    }
                  }}
                >
                  <span
                    class={cn(
                      'icon-[lucide--check] mr-2 size-4',
                      value?.id != entity.id && 'text-transparent'
                    )}
                  />
                  <div class="flex-grow">
                    {entity.name}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    class="mr-1 p-1 text-xs"
                    onclick={(e: MouseEvent) => {
                    managingId = entity.id;
                    toggleManageScreen(e);
                  }}
                  >
                    <span class="icon-[radix-icons--pencil-2]" />
                  </Button>
                </Command.Item>
              {/each}
            </Command.Group>
          </Command.List>
        </Command.Root>
      {:else}
        <div class="p-2">
          <Button variant="outline" size="icon" onclick={toggleManageScreen}>
            <span class="icon-[lucide--move-left] size-4"></span>
          </Button>
          {#if managingId > 0}
            <ManagePayeeForm
              payeeId={managingId}
              {onSave}
              {onDelete}
            />
          {:else}
            <ManagePayeeForm name={search} {onSave} />
          {/if}
        </div>
      {/if}
    </Popover.Content>
  </Popover.Root>
</div>
