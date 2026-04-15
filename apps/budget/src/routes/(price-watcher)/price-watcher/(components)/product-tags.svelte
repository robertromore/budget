<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import {
  getProductTags,
  getAllTags,
  addTag as addTagMutation,
  removeTag as removeTagMutation,
} from '$lib/query/price-watcher';
import Tags from '@lucide/svelte/icons/tags';
import X from '@lucide/svelte/icons/x';
import Plus from '@lucide/svelte/icons/plus';

interface Props {
  productId: number;
}

let { productId }: Props = $props();

const tagsQuery = $derived(getProductTags(productId).options());
const tags = $derived(tagsQuery.data ?? []);

const allTagsQuery = getAllTags().options();
const allTags = $derived(allTagsQuery.data ?? []);

const addMut = addTagMutation.options();
const removeMut = removeTagMutation.options();

let newTag = $state('');
let showInput = $state(false);
let showSuggestions = $state(false);
let selectedSuggestion = $state(-1);
let blurTimeout: ReturnType<typeof setTimeout> | undefined;

// Show suggestions when input is visible and not blurred
const suggestions = $derived.by(() => {
  if (!showInput || !showSuggestions) return [];
  const query = newTag.trim().toLowerCase();
  const existing = new Set(tags);
  const available = allTags.filter((t) => !existing.has(t.tag));
  if (!query) return available.slice(0, 10);
  return available.filter((t) => t.tag.includes(query)).slice(0, 10);
});

function openInput() {
  showInput = true;
  showSuggestions = true;
}

function closeInput() {
  showInput = false;
  showSuggestions = false;
  newTag = '';
  selectedSuggestion = -1;
}

function handleBlur() {
  // Delay so mousedown on a suggestion fires before we close
  blurTimeout = setTimeout(() => {
    showSuggestions = false;
  }, 200);
}

function handleFocus() {
  clearTimeout(blurTimeout);
  showSuggestions = true;
}

async function handleAddTag(value?: string) {
  const tag = (value ?? newTag).trim().toLowerCase();
  if (!tag) return;
  if (tags.includes(tag)) {
    newTag = '';
    return;
  }
  clearTimeout(blurTimeout);
  await addMut.mutateAsync({ productId, tag });
  newTag = '';
  selectedSuggestion = -1;
  showSuggestions = true;
}

async function handleRemoveTag(tag: string) {
  await removeMut.mutateAsync({ productId, tag });
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedSuggestion = Math.min(selectedSuggestion + 1, suggestions.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedSuggestion = Math.max(selectedSuggestion - 1, -1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (selectedSuggestion >= 0 && suggestions[selectedSuggestion]) {
      handleAddTag(suggestions[selectedSuggestion].tag);
    } else {
      handleAddTag();
    }
  } else if (e.key === 'Escape') {
    closeInput();
  }
}

function handleInput() {
  selectedSuggestion = -1;
}
</script>

<div class="space-y-2">
  <div class="flex items-center gap-2">
    <Tags class="text-muted-foreground h-4 w-4" />
    <span class="text-sm font-medium">Tags</span>
  </div>
  <div class="flex flex-wrap items-center gap-1.5">
    {#each tags as tag (tag)}
      <Badge variant="secondary" class="gap-1 pr-1">
        {tag}
        <button
          class="hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
          onclick={() => handleRemoveTag(tag)}
          aria-label="Remove tag {tag}">
          <X class="h-3 w-3" />
        </button>
      </Badge>
    {/each}
    {#if showInput}
      <div class="relative flex items-center gap-1">
        <Input
          class="h-7 w-36 text-xs"
          placeholder="Tag name..."
          bind:value={newTag}
          onkeydown={handleKeydown}
          oninput={handleInput}
          onfocus={handleFocus}
          onblur={handleBlur}
          autofocus />
        <Button
          variant="ghost"
          size="sm"
          class="h-7 w-7 p-0"
          onclick={() => handleAddTag()}
          disabled={!newTag.trim() || addMut.isPending}>
          <Plus class="h-3.5 w-3.5" />
        </Button>

        <!-- Suggestions dropdown -->
        {#if suggestions.length > 0}
          <div class="bg-popover border-border absolute left-0 top-full z-50 mt-1 w-48 rounded-md border py-1 shadow-md">
            {#each suggestions as suggestion, i (suggestion.tag)}
              <button
                class="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition-colors {i === selectedSuggestion ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}"
                onmousedown={(e) => { e.preventDefault(); handleAddTag(suggestion.tag); }}>
                <span>{suggestion.tag}</span>
                <span class="text-muted-foreground text-[10px]">{suggestion.count}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {:else}
      <button
        class="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex h-6 items-center gap-1 rounded-md border border-dashed px-2 text-xs transition-colors"
        onclick={openInput}>
        <Plus class="h-3 w-3" />
        Add tag
      </button>
    {/if}
  </div>
</div>
