<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Command from '$lib/components/ui/command';
import * as Popover from '$lib/components/ui/popover';
import { CategoriesState } from '$lib/states/entities/categories.svelte';
import type { CategorySuggestion, CategorySuggestionReason, ImportRow } from '$lib/types/import';
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
  suggestion?: CategorySuggestion;
}

let { row, onUpdate, temporaryCategories = [], suggestion }: Props = $props();

// Track if user has manually overridden the AI suggestion
let userOverride = $state(false);

// Format reason for display
function formatReason(reason: CategorySuggestionReason): string {
  const labels: Record<CategorySuggestionReason, string> = {
    'payee_match': 'Payee',
    'payee_history': 'History',
    'amount_pattern': 'Amount',
    'time_pattern': 'Timing',
    'similar_transaction': 'Similar',
    'ml_prediction': 'AI'
  };
  return labels[reason] || reason;
}

// Check if the current selection was from AI suggestion
const isAISuggested = $derived.by(() => {
  if (!suggestion || userOverride) return false;
  if (suggestion.suggestions.length === 0) return false;
  const topSuggestion = suggestion.suggestions[0];
  // Check if current selection matches top suggestion
  const currentId = selectedCategoryId.get();
  const currentName = selectedCategoryName.get();
  return (
    (currentId && currentId === topSuggestion.categoryId) ||
    (currentName && currentName === topSuggestion.categoryName)
  );
});

// Get confidence percentage for display
const suggestionConfidence = $derived.by(() => {
  if (!suggestion || suggestion.suggestions.length === 0) return 0;
  return Math.round(suggestion.suggestions[0].confidence * 100);
});

const categoryState = CategoriesState.get();
const categoriesArray = $derived(
  categoryState ? Array.from(categoryState.categories.values()) : []
);

// Get the current value from the row data (includes entityOverrides applied by parent)
const externalCategoryName = $derived(row.original.normalizedData['category'] as string | undefined);
// Explicit categoryId from alias match or user selection
const externalCategoryId = $derived(row.original.normalizedData['categoryId'] as number | null | undefined);

// Local state for the selected category - using private vars for accessor pattern
let _selectedCategoryName = $state<string>('');
let _selectedCategoryId = $state<number | null>(null);

// Sync from external data on initial load
let hasInitialized = $state(false);
$effect(() => {
  if (!hasInitialized && (externalCategoryName !== undefined || externalCategoryId !== undefined)) {
    hasInitialized = true;

    // First check for explicit categoryId (from alias match or previous selection)
    if (externalCategoryId && typeof externalCategoryId === 'number') {
      const matchById = categoriesArray.find((c) => c.id === externalCategoryId);
      if (matchById) {
        _selectedCategoryId = matchById.id;
        _selectedCategoryName = matchById.name || '';
        return;
      }
    }

    // Fall back to name lookup
    const newName = externalCategoryName || '';
    _selectedCategoryName = newName;

    if (newName) {
      const match = categoriesArray.find((c) => c.name?.toLowerCase() === newName.toLowerCase());
      _selectedCategoryId = match?.id || null;
    } else {
      _selectedCategoryId = null;
    }
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
const isInvalid = $derived(row.original.validationStatus === 'invalid');
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

function handleSelect(categoryId: number, categoryName: string, fromSuggestion = false) {
  // Only call onUpdate if the value actually changed
  const currentId = selectedCategoryId.get();
  const currentName = selectedCategoryName.get();
  const hasChanged = currentId !== categoryId || currentName !== categoryName;

  selectedCategoryId.set(categoryId);
  selectedCategoryName.set(categoryName);

  // Mark as user override if not from suggestion selection
  if (!fromSuggestion) {
    userOverride = true;
  }

  if (hasChanged) {
    onUpdate?.(rowIndex, categoryId, categoryName);
  }

  searchValue = '';
  open = false;
}

function handleSuggestionSelect(opt: { categoryId: number; categoryName: string }) {
  handleSelect(opt.categoryId, opt.categoryName, true);
}

function handleCreateNew() {
  const nameToCreate = searchValue.trim();
  if (nameToCreate) {
    selectedCategoryName.set(nameToCreate);
    selectedCategoryId.set(null);
    userOverride = true;
    onUpdate?.(rowIndex, null, nameToCreate);
    searchValue = '';
    open = false;
  }
}

function handleSelectTemporary(categoryName: string) {
  const hasChanged = selectedCategoryName.get() !== categoryName;

  selectedCategoryName.set(categoryName);
  selectedCategoryId.set(null);
  userOverride = true;

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
  {#if isInvalid}
    <div
      class="text-muted-foreground flex h-8 w-full items-center overflow-hidden text-xs text-ellipsis whitespace-nowrap opacity-50">
      <Tag class="mr-2 h-3 w-3" />
      {displayName}
    </div>
  {:else}
    <Popover.Root bind:open>
      <Popover.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            variant="outline"
            class={cn(
              'h-8 w-full justify-start overflow-hidden text-xs text-ellipsis whitespace-nowrap',
              !selectedCategory && !selectedCategoryName.get() && 'text-muted-foreground',
              isAISuggested && 'border-amber-500/50'
            )}>
            {#if isAISuggested}
              <Sparkles class="mr-1.5 h-3 w-3 shrink-0 text-amber-500" />
            {:else}
              <Tag class="mr-2 h-3 w-3 shrink-0" />
            {/if}
            <span class="truncate">{displayName}</span>
            {#if isAISuggested && suggestionConfidence > 0}
              <Badge variant="secondary" class="ml-auto shrink-0 text-[10px] px-1 py-0">
                {suggestionConfidence}%
              </Badge>
            {/if}
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
            {#if suggestion && suggestion.suggestions.length > 0 && !searchValue}
              <Command.Group heading="AI Suggestions">
                {#each suggestion.suggestions.slice(0, 3) as opt, i}
                  {@const isSelected = selectedCategoryId.get() === opt.categoryId}
                  <Command.Item
                    value={`suggestion-${i}`}
                    onSelect={() => handleSuggestionSelect(opt)}>
                    <div class="flex w-full items-center">
                      <Sparkles class={cn('mr-2 h-4 w-4 text-amber-500', isSelected && 'opacity-100', !isSelected && 'opacity-50')} />
                      <span class="flex-1 truncate">{opt.categoryName}</span>
                      <div class="ml-2 flex items-center gap-1.5">
                        <Badge variant="outline" class="text-[10px] px-1 py-0">
                          {formatReason(opt.reason)}
                        </Badge>
                        <span class="text-muted-foreground text-[10px]">
                          {Math.round(opt.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </Command.Item>
                {/each}
              </Command.Group>
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
  {/if}
</div>
