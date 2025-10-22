<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { cn } from '$lib/utils';
import * as Command from '$lib/components/ui/command';
import * as Popover from '$lib/components/ui/popover';
import type { EditableEntityItem } from '$lib/types';
import SuggestionBadge from '$lib/components/ui/suggestion-badge.svelte';
import Plus from '@lucide/svelte/icons/plus';
import Pencil from '@lucide/svelte/icons/pencil';
import MoveLeft from '@lucide/svelte/icons/move-left';
import Check from '@lucide/svelte/icons/check';
import type { Component as ComponentType } from 'svelte';
import Fuse from 'fuse.js';

interface IntelligenceSuggestion {
  type: 'smart' | 'intelligent' | 'insight' | 'auto' | 'info';
  reason: string;
  confidence?: number;
  suggestedValue?: EditableEntityItem;
  onApply?: () => void;
}

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
  suggestion?: IntelligenceSuggestion;
  showSuggestionBadge?: boolean;
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
  suggestion,
  showSuggestionBadge = true,
}: Props = $props();

let label = $derived(value?.name);
let selected = $derived.by(() => entities.find((entity) => entity.id == value?.id));
let open = $state(false);
let manage = $state(false);
let managingId: number = $state(0);
let suggestionDismissed = $state(false);

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

const applySuggestion = () => {
  if (suggestion?.suggestedValue) {
    value = suggestion.suggestedValue;
    if (handleSubmit) handleSubmit(suggestion.suggestedValue);
  }
  if (suggestion?.onApply) {
    suggestion.onApply();
  }
  suggestionDismissed = false;
};

const dismissSuggestion = () => {
  suggestionDismissed = true;
};

let searchValue = $state('');
const fused = $derived(new Fuse(entities, { keys: ['name'], includeScore: true }));

// Use $derived instead of $effect for computed filtering
const visibleEntities = $derived.by(() => {
  if (searchValue) {
    return fused.search(searchValue).map((result) => result.item);
  }
  return entities;
});

// Check if current value matches suggestion
const isSuggestionApplied = $derived.by(() => {
  return suggestion?.suggestedValue && value?.id === suggestion.suggestedValue.id;
});

// Show suggestion if it exists, hasn't been dismissed, and current value doesn't match suggestion
const shouldShowSuggestion = $derived.by(() => {
  return suggestion &&
         showSuggestionBadge &&
         !suggestionDismissed &&
         !isSuggestionApplied;
});

// Scroll selected item into view when popover opens
$effect(() => {
  if (open && value?.id && !manage) {
    const valueId = value.id; // Capture the value
    // Wait for DOM to render, then scroll
    // Use multiple animation frames to ensure content is fully rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          // Find the wrapper element
          const wrapper = document.querySelector(`[data-value="${valueId}"]`) as HTMLElement;

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

<div class={cn('flex flex-col space-y-2', className)}>
  <!-- Suggestion Badge (appears above the input when suggestion is available) -->
  {#if shouldShowSuggestion}
    <div class="flex items-center justify-between">
      <SuggestionBadge
        type={suggestion?.type || 'info'}
        variant="accent"
        {...(suggestion?.confidence !== undefined && { confidence: suggestion.confidence })}
        reason={suggestion?.reason || 'Suggested value'}
        dismissible={true}
        onDismiss={dismissSuggestion}
        onApply={applySuggestion}
      >
        Suggested: {suggestion?.suggestedValue?.name || 'Auto-fill'}
      </SuggestionBadge>
    </div>
  {/if}

  <!-- Entity Input -->
  <div class="flex items-center space-x-2">
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
              'block justify-start overflow-hidden text-left font-normal text-ellipsis whitespace-nowrap transition-all duration-200',
              !value && 'text-muted-foreground',
              shouldShowSuggestion && 'ring-2 ring-purple-200 dark:ring-purple-800',
              isSuggestionApplied && 'ring-2 ring-green-200 dark:ring-green-800',
              buttonClass || 'w-48'
            )}>
            <Icon class="-mt-1 mr-1 inline-block size-4"></Icon>
            {label}

            <!-- Applied indicator -->
            {#if isSuggestionApplied}
              <SuggestionBadge
                type="smart"
                variant="success"
                applied={true}
                class="ml-auto"
              />
            {/if}
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

              <!-- Suggestion in dropdown -->
              {#if shouldShowSuggestion && suggestion?.suggestedValue}
                <div class="border-b bg-accent/5 p-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-muted-foreground">Suggested:</span>
                    <SuggestionBadge
                      type={suggestion?.type || 'info'}
                      {...(suggestion?.confidence !== undefined && { confidence: suggestion.confidence })}
                      class="text-xs"
                    />
                  </div>
                  <Command.Item
                    value={suggestion.suggestedValue.id + ''}
                    class="mt-1 bg-accent/10 border border-accent/20"
                    onSelect={() => {
                      applySuggestion();
                      open = false;
                    }}>
                    <Check class="text-accent" />
                    <div class="flex-grow font-medium">
                      {suggestion.suggestedValue.name}
                    </div>
                    <span class="text-xs text-muted-foreground">Suggested</span>
                  </Command.Item>
                </div>
              {/if}

              <Command.List>
                <Command.Empty>No results found.</Command.Empty>
                <Command.Group>
                  {#each visibleEntities as entity}
                    <Command.Item
                      value={entity.id + ''}
                      data-value={entity.id}
                      class={cn(
                        value?.id == entity.id && 'bg-muted',
                        suggestion?.suggestedValue?.id === entity.id && 'ring-1 ring-accent/30'
                      )}
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
                      {#if suggestion?.suggestedValue?.id === entity.id}
                        <SuggestionBadge
                          type="smart"
                          class="ml-2 text-xs"
                        />
                      {/if}
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
</div>
