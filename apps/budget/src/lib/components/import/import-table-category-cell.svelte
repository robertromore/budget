<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Command from '$lib/components/ui/command';
import * as Popover from '$lib/components/ui/popover';
import { CategoriesState } from '$lib/states/entities/categories.svelte';
import type { ImportRow } from '$lib/types/import';
import { cn } from '$lib/utils';
import { createTransformAccessors } from '$lib/utils/bind-helpers';
import Check from '@lucide/svelte/icons/check';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Tag from '@lucide/svelte/icons/tag';
import X from '@lucide/svelte/icons/x';
import type { Row } from '@tanstack/table-core';
import Fuse from 'fuse.js';

interface Props {
  row: Row<ImportRow>;
  onUpdate?: (rowIndex: number, categoryId: number | null, categoryName: string | null) => void;
  temporaryCategories?: string[];
}

let { row, onUpdate, temporaryCategories = [] }: Props = $props();

const categoryState = CategoriesState.get();
const categoriesArray = $derived(
  categoryState ? Array.from(categoryState.categories.values()) : []
);

// Get the current value from the row data
const initialCategoryName = $derived(row.original.normalizedData['category'] as string | undefined);

// Local state for the selected category - using private vars for accessor pattern
let _selectedCategoryName = $state<string>('');
let _selectedCategoryId = $state<number | null>(null);

// Initialize from row data only once on mount
let hasInitialized = $state(false);
$effect(() => {
  if (!hasInitialized) {
    const initName = initialCategoryName || '';
    _selectedCategoryName = initName;

    if (initName) {
      const match = categoriesArray.find((c) => c.name?.toLowerCase() === initName.toLowerCase());
      _selectedCategoryId = match?.id || null;
    }

    hasInitialized = true;
  }
});

// Create accessors to allow controlled access without triggering effect loops
const selectedCategoryName = createTransformAccessors(
  () => _selectedCategoryName,
  (value: string) => {
    _selectedCategoryName = value;
  }
);

const selectedCategoryId = createTransformAccessors(
  () => _selectedCategoryId,
  (value: number | null) => {
    _selectedCategoryId = value;
  }
);

const rowIndex = $derived(row.original.rowIndex);
let open = $state(false);
let searchValue = $state('');

// Combine existing categories with temporary ones for search
const combinedItems = $derived.by(() => {
  const existing = categoriesArray.map((c) => ({
    type: 'existing' as const,
    category: c,
    name: c.name || '',
  }));
  const temporary = temporaryCategories
    .filter((name) => !categoriesArray.some((c) => c.name?.toLowerCase() === name.toLowerCase()))
    .map((name) => ({ type: 'temporary' as const, name }));
  return [...existing, ...temporary];
});

const fused = $derived(
  new Fuse(combinedItems, { keys: ['name'], includeScore: true, threshold: 0.3 })
);

let visibleItems = $derived.by(() => {
  if (searchValue) {
    return fused.search(searchValue).map((result) => result.item);
  }
  return combinedItems;
});

const visibleCategories = $derived(
  visibleItems.filter((item) => item.type === 'existing').map((item) => item.category)
);
const visibleTemporaryCategories = $derived(
  visibleItems.filter((item) => item.type === 'temporary').map((item) => item.name)
);

const selectedCategory = $derived(categoriesArray.find((c) => c.id === selectedCategoryId.get()));
const displayName = $derived(
  selectedCategory?.name || selectedCategoryName.get() || 'Select category...'
);

// Show "Create" option when: there's search text AND no exact match exists (case-sensitive)
const showCreateOption = $derived.by(() => {
  if (!searchValue.trim()) return false;
  const searchTrimmed = searchValue.trim();
  // Check for exact match (case-sensitive) - allows creating different capitalizations
  const hasExactMatch =
    visibleCategories.some((c) => c.name === searchTrimmed) ||
    visibleTemporaryCategories.some((t) => t === searchTrimmed);
  return !hasExactMatch;
});

function handleSelect(categoryId: number, categoryName: string) {
  // Only call onUpdate if the value actually changed
  const currentId = selectedCategoryId.get();
  const currentName = selectedCategoryName.get();
  const hasChanged = currentId !== categoryId || currentName !== categoryName;

  selectedCategoryId.set(categoryId);
  selectedCategoryName.set(categoryName);

  if (hasChanged) {
    onUpdate?.(rowIndex, categoryId, categoryName);
  }

  searchValue = '';
  open = false;
}

function handleCreateNew() {
  const nameToCreate = searchValue.trim();
  if (nameToCreate) {
    selectedCategoryName.set(nameToCreate);
    selectedCategoryId.set(null);
    onUpdate?.(rowIndex, null, nameToCreate);
    searchValue = '';
    open = false;
  }
}

function handleSelectTemporary(categoryName: string) {
  const hasChanged = selectedCategoryName.get() !== categoryName;

  selectedCategoryName.set(categoryName);
  selectedCategoryId.set(null);

  if (hasChanged) {
    onUpdate?.(rowIndex, null, categoryName);
  }

  searchValue = '';
  open = false;
}

function handleClear() {
  selectedCategoryName.set('');
  selectedCategoryId.set(null);
  onUpdate?.(rowIndex, null, null);
  searchValue = '';
  open = false;
}
</script>

<div class="w-full min-w-[200px]">
  <Popover.Root bind:open>
    <Popover.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="outline"
          class={cn(
            'h-8 w-full justify-start overflow-hidden text-xs text-ellipsis whitespace-nowrap',
            !selectedCategory && !selectedCategoryName.get() && 'text-muted-foreground'
          )}>
          <Tag class="mr-2 h-3 w-3" />
          {displayName}
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-[250px] p-0" align="start">
      <Command.Root shouldFilter={false}>
        <Command.Input placeholder="Search or create category..." bind:value={searchValue} />
        <Command.List class="max-h-[300px]">
          <Command.Group>
            {#if selectedCategoryName.get() || selectedCategoryId.get()}
              <Command.Item value="clear" onSelect={() => handleClear()} class="text-destructive">
                <X class="mr-2 h-4 w-4" />
                Clear category
              </Command.Item>
              <Command.Separator />
            {/if}
            {#if showCreateOption}
              <Command.Item
                value="create-new"
                onSelect={() => handleCreateNew()}
                class="text-primary">
                <Check class="mr-2 h-4 w-4 text-transparent" />
                Create "{searchValue.trim()}"
              </Command.Item>
            {/if}
            {#each visibleCategories as category (category.id)}
              {@const isSelected = selectedCategoryId.get() === category.id}
              <Command.Item
                value={String(category.id)}
                onSelect={() => handleSelect(category.id, category.name || '')}>
                <Check class={cn('mr-2 h-4 w-4', !isSelected && 'text-transparent')} />
                {category.name}
              </Command.Item>
            {/each}
            {#if visibleTemporaryCategories.length > 0}
              <Command.Separator />
              <Command.Group heading="Temporary (Will be created)">
                {#each visibleTemporaryCategories as tempCategory}
                  {@const isSelected = selectedCategoryName.get() === tempCategory}
                  <Command.Item
                    value={tempCategory}
                    onSelect={() => handleSelectTemporary(tempCategory)}
                    class="text-blue-600">
                    <Sparkles class={cn('mr-2 h-4 w-4', !isSelected && 'text-transparent')} />
                    {tempCategory}
                  </Command.Item>
                {/each}
              </Command.Group>
            {/if}
          </Command.Group>
        </Command.List>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>
</div>
