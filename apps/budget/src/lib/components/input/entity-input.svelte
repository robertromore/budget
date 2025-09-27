<script lang="ts">
import {Button} from '$lib/components/ui/button';
import {cn} from '$lib/utils';
import * as Command from '$lib/components/ui/command';
import * as Popover from '$lib/components/ui/popover';
import type {EditableEntityItem} from '$lib/types';
import Plus from '@lucide/svelte/icons/plus';
import Pencil from '@lucide/svelte/icons/pencil';
import MoveLeft from '@lucide/svelte/icons/move-left';
import Check from '@lucide/svelte/icons/check';
import type {Component as ComponentType} from 'svelte';
import Fuse from 'fuse.js';

interface ManagementOptions {
  enable: boolean;
  component: ComponentType;
  onSave: (new_value: EditableEntityItem, is_new: boolean) => void;
  onDelete: (id: number) => void;
}

interface Props {
  entityLabel: string;
  entities: EditableEntityItem[];
  value?: EditableEntityItem;
  defaultValue?: number | unknown;
  handleSubmit?: (selected?: EditableEntityItem) => void;
  class?: string;
  buttonClass?: string;
  management?: ManagementOptions;
  icon: ComponentType;
}

let {
  entityLabel = $bindable(),
  entities = $bindable(),
  defaultValue,
  value = $bindable(),
  handleSubmit,
  class: className,
  buttonClass,
  management,
  icon: Icon,
}: Props = $props();

const findCurrentEntity = () => entities.find((entity) => entity.id == value?.id);
let label = $derived(value?.name);
let selected = $derived(findCurrentEntity());
let open = $state(false);
let manage = $state(false);
let managingId: number = $state(0);

if (defaultValue) {
  const defaultEntity = entities.find((entity) => entity.id === defaultValue);
  if (defaultEntity) {
    value = defaultEntity;
  }
}

const onSave = (new_entity: EditableEntityItem, is_new: boolean) => {
  management?.onSave(new_entity, is_new);
  managingId = 0;
  manage = false;
  value = new_entity; // Select the saved entity
  if (handleSubmit) handleSubmit(new_entity);
  open = false; // Close the dropdown
};

const onDelete = (id: number) => {
  management?.onDelete(id);
  managingId = 0;
  manage = false;
  // Clear selection if the deleted entity was selected
  if (value?.id === id) {
    value = undefined;
    if (handleSubmit) handleSubmit(undefined);
  }
  open = false; // Close the dropdown
};

const addNew = () => {
  managingId = 0;
  manage = true;
};

let searchValue = $state('');
const fused = $derived(new Fuse(entities, {keys: ['name'], includeScore: true}));

let visibleEntities = $state(entities);
$effect(() => {
  if (searchValue) {
    visibleEntities = fused.search(searchValue).map((result) => result.item);
  } else {
    visibleEntities = entities;
  }
});
</script>

<div class={cn('flex items-center space-x-4', className)}>
  <Popover.Root
    bind:open
    onOpenChange={(open) => {
      if (!open) {
        manage = false;
      }
    }}>
    <Popover.Trigger>
      {#snippet child({props})}
        <Button
          {...props}
          variant="outline"
          class={cn(
            'block justify-start overflow-hidden text-left font-normal text-ellipsis whitespace-nowrap',
            !value && 'text-muted-foreground',
            buttonClass || 'w-48'
          )}>
          <Icon class="-mt-1 mr-1 inline-block size-4"></Icon>
          {label}
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="p-0 overflow-hidden" align="start">
      <!-- Sliding Panel Container -->
      <div class="grid grid-cols-2 transition-transform duration-300 ease-in-out" style="width: 200%; transform: translateX({manage ? '-50%' : '0%'})">

        <!-- Panel 1: Entity List -->
        <div class="w-full min-w-0">
          <Command.Root shouldFilter={false}>
            <div class="flex">
              <Command.Input placeholder="Search {entityLabel}..." bind:value={searchValue} />
              {#if management?.enable}
                <Button
                  size="icon"
                  class="rounded-none border-l-0 border-b shadow-none"
                  onclick={addNew}>
                  <Plus />
                </Button>
              {/if}
            </div>
            <Command.List>
              <Command.Empty>No results found.</Command.Empty>
              <Command.Group>
                {#each visibleEntities as entity}
                  <Command.Item
                    value={entity.id + ''}
                    class={cn(value?.id == entity.id && 'bg-muted')}
                    onSelect={() => {
                      value = entity;
                      if (handleSubmit) {
                        handleSubmit(entity);
                      }
                      open = false;
                    }}>
                    <Check class={cn(selected?.id != entity.id && 'text-transparent')} />
                    <div class="flex-grow">
                      {entity.name}
                    </div>
                    {#if management?.enable}
                      <Button
                        variant="outline"
                        size="icon"
                        class="mr-1 p-1 text-xs"
                        onclick={(e: MouseEvent) => {
                          e.stopPropagation();
                          managingId = entity.id;
                          manage = true;
                        }}>
                        <Pencil />
                      </Button>
                    {/if}
                  </Command.Item>
                {/each}
              </Command.Group>
            </Command.List>
          </Command.Root>
        </div>

        <!-- Panel 2: Management Form -->
        <div class="w-full min-w-0 p-4">
          <div class="flex items-center gap-2 mb-4">
            <Button
              variant="outline"
              size="icon"
              onclick={() => {
                manage = false;
                managingId = 0;
              }}>
              <MoveLeft class="size-4" />
            </Button>
            <h3 class="text-sm font-medium">
              {managingId > 0 ? `Edit ${entityLabel}` : `Add ${entityLabel}`}
            </h3>
          </div>
          {#if management}
            {#if managingId > 0}
              <management.component id={managingId} {onSave} {onDelete}></management.component>
            {:else}
              <management.component {onSave}></management.component>
            {/if}
          {/if}
        </div>

      </div>
    </Popover.Content>
  </Popover.Root>
</div>
