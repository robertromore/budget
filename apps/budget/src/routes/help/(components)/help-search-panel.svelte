<script lang="ts">
import { Input } from '$lib/components/ui/input';
import { helpContent } from '$lib/content/help';
import { helpCategories, getCategoryForTopic } from '$lib/content/help/categories';
import { searchHelp } from '$lib/content/help/search';
import Search from '@lucide/svelte/icons/search';
import X from '@lucide/svelte/icons/x';
import { Button } from '$lib/components/ui/button';

interface Props {
  onTopicSelect: (id: string) => void;
}

let { onTopicSelect }: Props = $props();

let query = $state('');

const results = $derived(query.trim() ? searchHelp(query, helpContent, 20) : []);
</script>

<div class="space-y-3">
  <div class="relative">
    <Search class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
    <Input
      bind:value={query}
      placeholder="Search all help topics..."
      class="pr-8 pl-9" />
    {#if query}
      <Button
        variant="ghost"
        size="icon"
        class="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2"
        onclick={() => (query = '')}>
        <X class="h-3 w-3" />
      </Button>
    {/if}
  </div>

  {#if query.trim()}
    <div class="space-y-1">
      {#if results.length === 0}
        <p class="text-muted-foreground py-4 text-center text-sm">No results for "{query}"</p>
      {:else}
        <p class="text-muted-foreground mb-2 text-xs">{results.length} result{results.length !== 1 ? 's' : ''}</p>
        {#each results as result (result.id)}
          {@const catId = getCategoryForTopic(result.id)}
          {@const cat = catId ? helpCategories.find((c) => c.id === catId) : null}
          <button
            type="button"
            onclick={() => { onTopicSelect(result.id); query = ''; }}
            class="hover:bg-muted w-full rounded-md px-4 py-3 text-left transition-colors">
            <div class="flex items-baseline justify-between gap-2">
              <p class="text-sm font-medium">{result.title}</p>
              {#if cat}
                <span class="text-muted-foreground shrink-0 text-xs">{cat.label}</span>
              {/if}
            </div>
            {#if result.snippet}
              <p class="text-muted-foreground mt-0.5 text-xs">
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                {@html result.snippet}
              </p>
            {/if}
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>
