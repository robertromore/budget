<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { ResponsiveSheet } from "$lib/components/ui/responsive-sheet";
  import { getHelpContent, hasHelpContent, helpContent } from "$lib/content/help";
  import { searchHelp } from "$lib/content/help/search";
  import { helpMode } from "$lib/states/ui/help.svelte";
  import { renderMarkdown } from "$lib/utils/markdown-renderer";
  import { goto } from "$app/navigation";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Search from "@lucide/svelte/icons/search";
  import X from "@lucide/svelte/icons/x";
  import * as Sheet from "$lib/components/ui/sheet";
  import HelpSearchResults from "./help-search-results.svelte";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    helpId: string | null;
  }

  let { open, onOpenChange, helpId }: Props = $props();

  // Search state
  let isSearchMode = $state(false);
  let searchQuery = $state("");
  let focusedResultIndex = $state(-1);
  let searchInputEl: HTMLInputElement | null = $state(null);

  // Search results
  const searchResults = $derived(
    searchQuery.trim() ? searchHelp(searchQuery, helpContent) : []
  );

  // Reset focused index when results change
  $effect(() => {
    if (searchResults.length > 0) {
      focusedResultIndex = 0;
    } else {
      focusedResultIndex = -1;
    }
  });

  // Parse content when helpId changes
  const parsedContent = $derived.by(() => {
    if (!helpId) {
      return null;
    }

    const content = getHelpContent(helpId);
    if (!content) {
      return null;
    }

    return renderMarkdown(content);
  });

  const title = $derived(parsedContent?.frontmatter.title ?? helpId ?? "Help");
  const description = $derived(parsedContent?.frontmatter.description);
  const relatedIds = $derived(parsedContent?.frontmatter.related ?? []);
  const navigateTo = $derived(
    parsedContent?.frontmatter.navigateTo as string | undefined
  );
  const htmlContent = $derived(parsedContent?.html ?? "");

  // When there's a modal context, show the help sheet on the left side
  const hasModalContext = $derived(helpMode.hasModalContext());
  const sheetSide = $derived(hasModalContext ? "left" : "right");

  // Navigation helpers
  function navigateToRelated(relatedId: string) {
    helpMode.openDocumentation(relatedId);
  }

  function handlePrevious() {
    helpMode.navigatePrevious();
    helpMode.openHighlightedDocumentation();
  }

  function handleNext() {
    helpMode.navigateNext();
    helpMode.openHighlightedDocumentation();
  }

  function handleNavigateTo() {
    if (navigateTo) {
      helpMode.deactivate();
      goto(navigateTo);
    }
  }

  // Search mode handlers
  function enterSearchMode() {
    isSearchMode = true;
    searchQuery = "";
    focusedResultIndex = -1;
    // Focus input after state update
    requestAnimationFrame(() => {
      searchInputEl?.focus();
    });
  }

  function exitSearchMode() {
    isSearchMode = false;
    searchQuery = "";
    focusedResultIndex = -1;
  }

  function selectSearchResult(id: string) {
    helpMode.openDocumentation(id);
    exitSearchMode();
  }

  function handleSearchKeydown(e: KeyboardEvent) {
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        exitSearchMode();
        break;
      case "ArrowDown":
        e.preventDefault();
        if (searchResults.length > 0) {
          focusedResultIndex = Math.min(
            focusedResultIndex + 1,
            searchResults.length - 1
          );
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (searchResults.length > 0) {
          focusedResultIndex = Math.max(focusedResultIndex - 1, 0);
        }
        break;
      case "Enter":
        e.preventDefault();
        if (focusedResultIndex >= 0 && searchResults[focusedResultIndex]) {
          selectSearchResult(searchResults[focusedResultIndex].id);
        }
        break;
    }
  }

  // Global keyboard handler for Ctrl+K when sheet is open
  function handleGlobalKeydown(e: KeyboardEvent) {
    // Only handle when sheet is open and not already in search mode
    if (!open) return;

    // Ctrl+K or Cmd+K to open search
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      if (!isSearchMode) {
        enterSearchMode();
      }
    }
  }
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<ResponsiveSheet
  {open}
  {onOpenChange}
  side={sheetSide}
  defaultWidth={560}
  minWidth={400}
  maxWidth={800}
  hideOverlay={hasModalContext}
  interactOutsideBehavior={hasModalContext ? "ignore" : undefined}
  class="z-120 hide-default-close"
>
  {#snippet header()}
    {#if isSearchMode}
      <!-- Search mode header -->
      <div class="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 shrink-0"
          onclick={exitSearchMode}
        >
          <ArrowLeft class="h-4 w-4" />
        </Button>
        <div class="relative flex-1">
          <Search
            class="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
          />
          <Input
            bind:ref={searchInputEl}
            bind:value={searchQuery}
            placeholder="Search help topics..."
            class="pl-9 pr-8"
            onkeydown={handleSearchKeydown}
          />
          {#if searchQuery}
            <Button
              variant="ghost"
              size="icon"
              class="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
              onclick={() => (searchQuery = "")}
            >
              <X class="h-3 w-3" />
            </Button>
          {/if}
        </div>
      </div>
    {:else}
      <!-- Normal header -->
      <div class="flex items-center gap-3">
        <div class="bg-primary/10 text-primary rounded-lg p-2">
          <BookOpen class="h-5 w-5" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="truncate text-lg font-semibold">{title}</h2>
          {#if description}
            <p class="text-muted-foreground truncate text-sm">{description}</p>
          {/if}
        </div>
        <div class="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8 shrink-0"
            onclick={enterSearchMode}
            title="Search help topics (Ctrl+K)"
          >
            <Search class="h-4 w-4" />
          </Button>
          <Sheet.Close
            class="ring-offset-background focus-visible:ring-ring h-8 w-8 shrink-0 rounded-md opacity-70 transition-opacity hover:bg-accent hover:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden inline-flex items-center justify-center"
          >
            <X class="h-4 w-4" />
            <span class="sr-only">Close</span>
          </Sheet.Close>
        </div>
      </div>
    {/if}
  {/snippet}

  {#snippet content()}
    {#if isSearchMode}
      <!-- Search results -->
      <HelpSearchResults
        results={searchResults}
        query={searchQuery}
        focusedIndex={focusedResultIndex}
        onSelect={selectSearchResult}
        onFocusChange={(index) => (focusedResultIndex = index)}
      />
    {:else if !helpId}
      <div class="flex flex-col items-center justify-center py-12 text-center">
        <BookOpen class="text-muted-foreground mb-4 h-12 w-12" />
        <h3 class="text-lg font-medium">No topic selected</h3>
        <p class="text-muted-foreground mt-2 max-w-sm">
          Click on a highlighted element to view its documentation.
        </p>
        <Button variant="outline" class="mt-4" onclick={enterSearchMode}>
          <Search class="mr-2 h-4 w-4" />
          Search all topics
        </Button>
      </div>
    {:else if !parsedContent}
      <div class="flex flex-col items-center justify-center py-12 text-center">
        <BookOpen class="text-muted-foreground mb-4 h-12 w-12" />
        <h3 class="text-lg font-medium">Documentation not found</h3>
        <p class="text-muted-foreground mt-2 max-w-sm">
          No documentation is available for "{helpId}".
        </p>
        <Button variant="outline" class="mt-4" onclick={enterSearchMode}>
          <Search class="mr-2 h-4 w-4" />
          Search all topics
        </Button>
      </div>
    {:else}
      <article class="prose dark:prose-invert max-w-none">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html htmlContent}
      </article>

      <!-- Navigate to action -->
      {#if navigateTo}
        <div class="mt-8 border-t pt-6">
          <Button onclick={handleNavigateTo} class="w-full">
            Go there
            <ArrowRight class="ml-2 h-4 w-4" />
          </Button>
        </div>
      {/if}

      <!-- Related topics -->
      {#if relatedIds.length > 0}
        <div class="mt-8 border-t pt-6">
          <h3 class="mb-3 text-sm font-medium">Related Topics</h3>
          <div class="flex flex-wrap gap-2">
            {#each relatedIds as relatedId}
              {#if hasHelpContent(relatedId)}
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => navigateToRelated(relatedId)}
                >
                  {relatedId.replace(/-/g, " ")}
                </Button>
              {/if}
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  {/snippet}

  {#snippet footer()}
    {#if isSearchMode}
      <!-- Search mode footer -->
      <div class="text-muted-foreground flex items-center justify-center gap-4 text-sm">
        <span>
          <kbd class="bg-muted rounded border px-1.5 py-0.5 font-mono text-xs"
            >↑</kbd
          >
          <kbd class="bg-muted rounded border px-1.5 py-0.5 font-mono text-xs"
            >↓</kbd
          >
          to navigate
        </span>
        <span>
          <kbd class="bg-muted rounded border px-1.5 py-0.5 font-mono text-xs"
            >Enter</kbd
          >
          to select
        </span>
        <span>
          <kbd class="bg-muted rounded border px-1.5 py-0.5 font-mono text-xs"
            >Esc</kbd
          >
          to cancel
        </span>
      </div>
    {:else}
      <!-- Normal footer -->
      <div class="flex items-center justify-between">
        <Button variant="outline" size="sm" onclick={handlePrevious}>
          <ChevronLeft class="mr-1 h-4 w-4" />
          Previous
        </Button>
        <span class="text-muted-foreground text-sm">
          Press <kbd class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs"
            >Esc</kbd
          > to close
        </span>
        <Button variant="outline" size="sm" onclick={handleNext}>
          Next
          <ChevronRight class="ml-1 h-4 w-4" />
        </Button>
      </div>
    {/if}
  {/snippet}
</ResponsiveSheet>

<style>
  /* Hide the default absolute-positioned close button from sheet-content */
  :global(.hide-default-close[data-slot="sheet-content"] > button.absolute) {
    display: none;
  }
</style>
