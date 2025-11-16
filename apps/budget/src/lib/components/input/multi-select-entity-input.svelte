<script lang="ts">
import {Button} from '$lib/components/ui/button';
import {cn} from '$lib/utils';
import * as Command from '$lib/components/ui/command';
import * as Popover from '$lib/components/ui/popover';
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import type {EditableEntityItem} from '$lib/types';
import Plus from '@lucide/svelte/icons/plus';
import Pencil from '@lucide/svelte/icons/pencil';
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
  value: number[];
  handleChange: (selectedIds: number[]) => void;
  class?: string;
  buttonClass?: string;
  management?: ManagementOptions;
  icon: ComponentType;
  maxDisplayedNames?: number; // Default 2
}

let {
  entityLabel = $bindable(),
  entities = $bindable(),
  value = $bindable([]),
  handleChange,
  class: className,
  buttonClass,
  management,
  icon: Icon,
  maxDisplayedNames = 2,
}: Props = $props();

let open = $state(false);
let sheetOpen = $state(false);
let managingId: number = $state(0);

// Get selected entities
const selectedEntities = $derived(entities.filter((e) => value.includes(e.id)));

// Compute trigger button text
const triggerText = $derived.by(() => {
  if (selectedEntities.length === 0) {
    return `Select ${entityLabel}s...`;
  } else if (selectedEntities.length <= maxDisplayedNames) {
    return selectedEntities.map((e) => e.name).join(', ');
  } else {
    return `${selectedEntities.length} ${entityLabel}s selected`;
  }
});

// Toggle selection
const toggleSelection = (entityId: number) => {
  const newValue = value.includes(entityId)
    ? value.filter((id) => id !== entityId)
    : [...value, entityId];
  handleChange(newValue);
};

// Management handlers
const onSave = (new_entity: EditableEntityItem, is_new: boolean) => {
  management?.onSave(new_entity, is_new);
  managingId = 0;
  sheetOpen = false;
  // Note: Auto-selection is handled by the parent's onSave callback
};

const onDelete = (id: number) => {
  management?.onDelete(id);
  managingId = 0;
  sheetOpen = false;
};

const addNew = () => {
  managingId = 0;
  sheetOpen = true;
};

// Search functionality
let searchValue = $state('');
const fused = $derived(new Fuse(entities, {keys: ['name'], includeScore: true}));

const visibleEntities = $derived.by(() => {
  if (searchValue) {
    return fused.search(searchValue).map((result) => result.item);
  }
  return entities;
});
</script>

<div class={cn('flex items-center space-x-4', className)}>
  <Popover.Root bind:open>
    <Popover.Trigger>
      {#snippet child({props})}
        <Button
          {...props}
          variant="outline"
          class={cn(
            'block justify-start overflow-hidden text-left font-normal text-ellipsis whitespace-nowrap',
            selectedEntities.length === 0 && 'text-muted-foreground',
            buttonClass || 'w-48'
          )}>
          <Icon class="-mt-1 mr-1 inline-block size-4"></Icon>
          {triggerText}
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="relative overflow-hidden p-0" align="start">
      {#if management?.enable}
        <!-- Entity List with Management Actions -->
        <Command.Root shouldFilter={false}>
          <Command.Input
            placeholder="Search {entityLabel}..."
            bind:value={searchValue}
            class="pr-12" />
          <Button
            size="icon"
            class="absolute top-0 right-0 rounded-none rounded-tr-md"
            onclick={addNew}>
            <Plus />
          </Button>
          <Command.List class="max-h-[300px] overflow-auto">
            <Command.Empty>No results found.</Command.Empty>
            <Command.Group>
              {#each visibleEntities as entity}
                <Command.Item
                  value={entity.id + ''}
                  data-value={entity.id}
                  class={cn(value.includes(entity.id) && 'bg-muted')}
                  onSelect={() => {
                    toggleSelection(entity.id);
                  }}>
                  <Check class={cn(!value.includes(entity.id) && 'text-transparent')} />
                  <div class="flex-grow">
                    {entity.name}
                  </div>
                  <div
                    role="button"
                    tabindex="0"
                    class="border-input bg-background hover:bg-accent hover:text-accent-foreground mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md border p-1 text-xs"
                    onclick={(e: MouseEvent) => {
                      e.stopPropagation();
                      managingId = entity.id;
                      sheetOpen = true;
                    }}
                    onkeydown={(e: KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        managingId = entity.id;
                        sheetOpen = true;
                      }
                    }}>
                    <Pencil class="h-4 w-4" />
                  </div>
                </Command.Item>
              {/each}
            </Command.Group>
          </Command.List>
        </Command.Root>
      {:else}
        <!-- Simple Entity List (when management is disabled) -->
        <Command.Root shouldFilter={false}>
          <Command.Input placeholder="Search {entityLabel}..." bind:value={searchValue} />
          <Command.List class="max-h-[300px] overflow-auto">
            <Command.Empty>No results found.</Command.Empty>
            <Command.Group>
              {#each visibleEntities as entity}
                <Command.Item
                  value={entity.id + ''}
                  data-value={entity.id}
                  class={cn(value.includes(entity.id) && 'bg-muted')}
                  onSelect={() => {
                    toggleSelection(entity.id);
                  }}>
                  <Check class={cn(!value.includes(entity.id) && 'text-transparent')} />
                  <div class="flex-grow">
                    {entity.name}
                  </div>
                </Command.Item>
              {/each}
            </Command.Group>
          </Command.List>
        </Command.Root>
      {/if}
    </Popover.Content>
  </Popover.Root>

  <!-- Management Sheet -->
  {#if management?.enable}
    <ResponsiveSheet bind:open={sheetOpen}>
      {#snippet header()}
        <h2 class="text-lg font-semibold">
          {managingId > 0 ? `Edit ${entityLabel}` : `Add ${entityLabel}`}
        </h2>
      {/snippet}
      {#snippet content()}
        {#if managingId > 0}
          <management.component id={managingId} {onSave} {onDelete}></management.component>
        {:else}
          <management.component {onSave}></management.component>
        {/if}
      {/snippet}
    </ResponsiveSheet>
  {/if}
</div>
