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

let label = $derived(value?.name);
let selected = $derived.by(() => entities.find((entity) => entity.id == value?.id));
let open = $state(false);
let sheetOpen = $state(false);
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
  sheetOpen = false;
  value = new_entity; // Select the saved entity
  if (handleSubmit) handleSubmit(new_entity);
};

const onDelete = (id: number) => {
  management?.onDelete(id);
  managingId = 0;
  sheetOpen = false;
  // Clear selection if the deleted entity was selected
  if (value?.id === id) {
    value = undefined;
    if (handleSubmit) handleSubmit(undefined);
  }
};

const addNew = () => {
  managingId = 0;
  sheetOpen = true;
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

// Scroll selected item into view when popover opens
$effect(() => {
  if (open && value?.id) {
    // Wait for DOM to render, then scroll
    // Use multiple animation frames to ensure content is fully rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          // Find the wrapper element
          const wrapper = document.querySelector(`[data-value="${value.id}"]`) as HTMLElement;

          if (wrapper) {
            // Look for the actual item element
            const item = wrapper.querySelector('[role="option"]') as HTMLElement ||
                        wrapper.querySelector('[cmdk-item]') as HTMLElement ||
                        wrapper.firstElementChild as HTMLElement;

            if (item) {
              // Get the scrollable container (Command.List)
              const scrollContainer = item.closest('[cmdk-list]') as HTMLElement;

              if (scrollContainer) {
                // Calculate the position to scroll to
                const itemTop = item.offsetTop;
                const itemHeight = item.offsetHeight;
                const containerHeight = scrollContainer.clientHeight;

                // Center the item in the container
                const scrollTo = itemTop - (containerHeight / 2) + (itemHeight / 2);
                scrollContainer.scrollTop = scrollTo;
              } else {
                // Fallback to scrollIntoView if we can't find the container
                item.scrollIntoView({
                  block: 'center',
                  behavior: 'instant'
                });
              }
            }
          }
        }, 50);
      });
    });
  }
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
            !value && 'text-muted-foreground',
            buttonClass || 'w-48'
          )}>
          <Icon class="-mt-1 mr-1 inline-block size-4"></Icon>
          {label}
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="p-0 overflow-hidden" align="start">
      {#if management?.enable}
        <!-- Entity List with Management Actions -->
        <Command.Root shouldFilter={false}>
          <div class="flex">
            <Command.Input placeholder="Search {entityLabel}..." bind:value={searchValue} />
            <Button
              size="icon"
              class="rounded-none border-l-0 border-b shadow-none"
              onclick={addNew}>
              <Plus />
            </Button>
          </div>
          <Command.List class="max-h-[300px] overflow-auto">
            <Command.Empty>No results found.</Command.Empty>
            <Command.Group>
              {#each visibleEntities as entity}
                <Command.Item
                  value={entity.id + ''}
                  data-value={entity.id}
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
                  <div
                    role="button"
                    tabindex="0"
                    class="mr-1 p-1 text-xs inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
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
