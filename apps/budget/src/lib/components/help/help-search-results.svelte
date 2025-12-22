<script lang="ts">
  import type { HelpSearchResult } from "$lib/content/help/search";
  import FileText from "@lucide/svelte/icons/file-text";
  import SearchX from "@lucide/svelte/icons/search-x";

  interface Props {
    results: HelpSearchResult[];
    query: string;
    focusedIndex?: number;
    onSelect: (id: string) => void;
    onFocusChange?: (index: number) => void;
  }

  let {
    results,
    query,
    focusedIndex = -1,
    onSelect,
    onFocusChange,
  }: Props = $props();
</script>

{#if results.length === 0 && query.trim()}
  <!-- No results state -->
  <div class="flex flex-col items-center justify-center py-12 text-center">
    <SearchX class="text-muted-foreground mb-4 h-12 w-12" />
    <h3 class="text-lg font-medium">No results found</h3>
    <p class="text-muted-foreground mt-2 max-w-sm">
      No help topics match "{query}". Try different keywords or browse all
      topics.
    </p>
  </div>
{:else if results.length > 0}
  <!-- Results list -->
  <div class="text-muted-foreground mb-2 px-2 text-sm">
    {results.length} {results.length === 1 ? "result" : "results"} found
  </div>
  <div class="divide-y">
    {#each results as result, index (result.id)}
      <button
        type="button"
        class="group w-full px-2 py-3 text-left transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none {focusedIndex ===
        index
          ? 'bg-muted/50'
          : ''}"
        onclick={() => onSelect(result.id)}
        onmouseenter={() => onFocusChange?.(index)}
        onfocus={() => onFocusChange?.(index)}
      >
        <div class="flex items-start gap-3">
          <div
            class="bg-primary/10 text-primary mt-0.5 rounded-md p-1.5 transition-colors group-hover:bg-primary/20"
          >
            <FileText class="h-4 w-4" />
          </div>
          <div class="min-w-0 flex-1">
            <h4 class="font-medium leading-tight">{result.title}</h4>
            {#if result.description}
              <p class="text-muted-foreground mt-0.5 text-sm line-clamp-1">
                {result.description}
              </p>
            {/if}
            {#if result.snippet}
              <p class="text-muted-foreground mt-1.5 text-sm line-clamp-2">
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                {@html result.snippet}
              </p>
            {/if}
          </div>
        </div>
      </button>
    {/each}
  </div>
{:else}
  <!-- Empty state (no query yet) -->
  <div class="flex flex-col items-center justify-center py-12 text-center">
    <FileText class="text-muted-foreground mb-4 h-12 w-12" />
    <h3 class="text-lg font-medium">Search help topics</h3>
    <p class="text-muted-foreground mt-2 max-w-sm">
      Type to search across all help documentation.
    </p>
  </div>
{/if}

<style>
  :global(mark) {
    background-color: hsl(var(--primary) / 0.2);
    color: inherit;
    border-radius: 2px;
    padding: 0 2px;
  }
</style>
