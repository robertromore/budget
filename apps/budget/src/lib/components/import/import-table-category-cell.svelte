<script lang="ts">
import {Button} from '$lib/components/ui/button';
import * as Command from '$lib/components/ui/command';
import * as Popover from '$lib/components/ui/popover';
import Check from '@lucide/svelte/icons/check';
import Tag from '@lucide/svelte/icons/tag';
import Sparkles from '@lucide/svelte/icons/sparkles';
import X from '@lucide/svelte/icons/x';
import type {Row} from '@tanstack/table-core';
import type {ImportRow} from '$lib/types/import';
import {CategoriesState} from '$lib/states/entities/categories.svelte';
import {cn} from '$lib/utils';
import Fuse from 'fuse.js';

interface Props {
  row: Row<ImportRow>;
  onUpdate?: (rowIndex: number, categoryId: number | null, categoryName: string | null) => void;
  temporaryCategories?: string[];
}

let {row, onUpdate, temporaryCategories = []}: Props = $props();

const categoryState = CategoriesState.get();
const categoriesArray = $derived(categoryState ? Array.from(categoryState.categories.values()) : []);

// Get the current value from the row data
const initialCategoryName = $derived(row.original.normalizedData['category'] as string | undefined);

// Local state for the selected category
let selectedCategoryName = $state<string>('');
let selectedCategoryId = $state<number | null>(null);

// Sync with initial value reactively
$effect(() => {
  if (initialCategoryName && selectedCategoryName !== initialCategoryName) {
    selectedCategoryName = initialCategoryName;
    // Try to find matching category from the initial name
    const match = categoriesArray.find(c => c.name?.toLowerCase() === initialCategoryName.toLowerCase());
    if (match) {
      selectedCategoryId = match.id;
    } else {
      selectedCategoryId = null;
    }
  }
});

const rowIndex = $derived(row.original.rowIndex);
let open = $state(false);
let searchValue = $state('');

// When dropdown opens, pre-fill search with current name if creating new
$effect(() => {
  if (open && needsCreation && !searchValue && selectedCategoryName) {
    searchValue = selectedCategoryName;
  }
  if (!open) {
    searchValue = '';
  }
});

// Combine existing categories with temporary ones for search
const combinedItems = $derived.by(() => {
  const existing = categoriesArray.map(c => ({type: 'existing' as const, category: c, name: c.name || ''}));
  const temporary = temporaryCategories
    .filter(name => !categoriesArray.some(c => c.name?.toLowerCase() === name.toLowerCase()))
    .map(name => ({type: 'temporary' as const, name}));
  return [...existing, ...temporary];
});

const fused = $derived(new Fuse(combinedItems, {keys: ['name'], includeScore: true, threshold: 0.3}));

let visibleItems = $derived.by(() => {
  if (searchValue) {
    return fused.search(searchValue).map((result) => result.item);
  }
  return combinedItems;
});

const visibleCategories = $derived(visibleItems.filter(item => item.type === 'existing').map(item => item.category));
const visibleTemporaryCategories = $derived(visibleItems.filter(item => item.type === 'temporary').map(item => item.name));

const selectedCategory = $derived(categoriesArray.find(c => c.id === selectedCategoryId));
const displayName = $derived(selectedCategory?.name || selectedCategoryName || 'Select category...');

// Check if the suggested name from CSV doesn't match any existing category
const needsCreation = $derived(
  selectedCategoryName &&
  !selectedCategoryId &&
  !categoriesArray.some(c => c.name?.toLowerCase() === selectedCategoryName.toLowerCase())
);

function handleSelect(categoryId: number, categoryName: string) {
  selectedCategoryId = categoryId;
  selectedCategoryName = categoryName;
  onUpdate?.(rowIndex, categoryId, categoryName);
  open = false;
  searchValue = '';
}

function handleCreateNew() {
  const nameToCreate = searchValue.trim() || selectedCategoryName;
  if (nameToCreate) {
    selectedCategoryName = nameToCreate;
    selectedCategoryId = null;
    onUpdate?.(rowIndex, null, nameToCreate);
    open = false;
    searchValue = '';
  }
}

function handleSelectTemporary(categoryName: string) {
  selectedCategoryName = categoryName;
  selectedCategoryId = null;
  onUpdate?.(rowIndex, null, categoryName);
  open = false;
  searchValue = '';
}

function handleClear() {
  selectedCategoryName = '';
  selectedCategoryId = null;
  onUpdate?.(rowIndex, null, null);
  open = false;
  searchValue = '';
}
</script>

<div class="w-full min-w-[200px]">
  <Popover.Root bind:open>
    <Popover.Trigger>
      {#snippet child({props})}
        <Button
          {...props}
          variant="outline"
          class={cn(
            'w-full h-8 text-xs justify-start overflow-hidden text-ellipsis whitespace-nowrap',
            !selectedCategory && !selectedCategoryName && 'text-muted-foreground'
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
            {#if selectedCategoryName || selectedCategoryId}
              <Command.Item
                value="clear"
                onSelect={() => handleClear()}
                class="text-destructive">
                <X class="mr-2 h-4 w-4" />
                Clear category
              </Command.Item>
              <Command.Separator />
            {/if}
            {#if searchValue.trim() && visibleCategories.length === 0 && visibleTemporaryCategories.length === 0}
              <Command.Item
                value="create-new"
                onSelect={() => handleCreateNew()}
                class="text-primary">
                <Check class="mr-2 h-4 w-4 text-transparent" />
                Create "{searchValue}"
              </Command.Item>
            {:else if needsCreation && !searchValue}
              <Command.Item
                value="create-suggested"
                onSelect={() => handleCreateNew()}
                class="text-primary">
                <Check class="mr-2 h-4 w-4 text-transparent" />
                Create "{selectedCategoryName}"
              </Command.Item>
            {/if}
            {#each visibleCategories as category (category.id)}
              <Command.Item
                value={String(category.id)}
                onSelect={() => handleSelect(category.id, category.name || '')}>
                <Check class={cn('mr-2 h-4 w-4', selectedCategoryId !== category.id && 'text-transparent')} />
                {category.name}
              </Command.Item>
            {/each}
            {#if visibleTemporaryCategories.length > 0}
              <Command.Separator />
              <Command.Group heading="Temporary (Will be created)">
                {#each visibleTemporaryCategories as tempCategory}
                  <Command.Item
                    value={tempCategory}
                    onSelect={() => handleSelectTemporary(tempCategory)}
                    class="text-blue-600">
                    <Sparkles class={cn('mr-2 h-4 w-4', selectedCategoryName !== tempCategory && 'text-transparent')} />
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
