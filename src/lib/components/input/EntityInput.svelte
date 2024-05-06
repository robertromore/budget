<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { cn, keyBy } from '$lib/utils';
  import * as Command from '$lib/components/ui/command';
  import * as Popover from '$lib/components/ui/popover';
  import ManageCategoryForm from '../forms/ManageCategoryForm.svelte';
  import ManagePayeeForm from '../forms/ManagePayeeForm.svelte';
  import type { EditableEntityItem } from '../types';

  let {
    entityLabel = $bindable(),
    entities = $bindable(),
    value = $bindable(),
    handleSubmit,
    class: className,
    enableManagement = false
  }: {
    entityLabel: string;
    entities: EditableEntityItem[];
    value?: EditableEntityItem;
    handleSubmit?: (selected?: EditableEntityItem) => void;
    class?: string;
    enableManagement?: boolean;
  } = $props();

  const findCurrentEntity = () => entities.find((entity) => entity.id == value?.id);
  let label = $state(value?.name);
  $effect(() => {
    label = value?.name || '';
  });

  let selected = $derived(findCurrentEntity());

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
    managingId = 0;
    manage = false;
    if (handleSubmit) handleSubmit(new_entity);
  };

  const onDelete = (id: number) => {
    managingId = 0;
    manage = false;
    if (handleSubmit) handleSubmit(undefined);
  };

  const addNew = (event: MouseEvent) => {
    managingId = 0;
    manage = true;
  };

  const searchEntities = $derived(
    keyBy(
      entities.map((entity) => {
        return {
          id: entity.id,
          name: entity.name
        };
      }),
      'id'
    )
  );
</script>

<div class={cn('flex items-center space-x-4', className)}>
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
        <Command.Root
          filter={(value, search) => {
            if (
              value &&
              searchEntities[value] &&
              searchEntities[value].name.toLowerCase().includes(search)
            )
              return 1;
            return 0;
          }}
        >
          <div class="flex">
            <Command.Input placeholder="Search {entityLabel}..." />
            {#if enableManagement}
              <Button
                size="icon"
                class="h-11 w-12 rounded-none border-b shadow-none"
                onclick={addNew}
              >
                <span class="icon-[lucide--plus]"></span>
              </Button>
            {/if}
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
                      selected?.id != entity.id && 'text-transparent'
                    )}
                  ></span>
                  <div class="flex-grow">
                    {entity.name}
                  </div>
                  {#if enableManagement}
                    <Button
                      variant="outline"
                      size="icon"
                      class="mr-1 p-1 text-xs"
                      onclick={(e: MouseEvent) => {
                      managingId = entity.id;
                      toggleManageScreen(e);
                    }}
                    >
                      <span class="icon-[radix-icons--pencil-2]"></span>
                    </Button>
                  {/if}
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
            <svelte:component
              this={entityLabel === 'categories' ? ManageCategoryForm : ManagePayeeForm}
              payeeId={entityLabel === 'categories' ? undefined : managingId}
              categoryId={entityLabel === 'categories' ? managingId : undefined}
              {onSave}
              {onDelete}
            />
          {:else}
            <svelte:component
              this={entityLabel === 'categories' ? ManageCategoryForm : ManagePayeeForm}
              {onSave}
            />
          {/if}
        </div>
      {/if}
    </Popover.Content>
  </Popover.Root>
</div>
