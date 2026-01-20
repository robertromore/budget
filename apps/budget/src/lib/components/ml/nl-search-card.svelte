<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { cn, formatCurrency, formatPercent } from "$lib/utils";
  import Calendar from "@lucide/svelte/icons/calendar";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import DollarSign from "@lucide/svelte/icons/dollar-sign";
  import Lightbulb from "@lucide/svelte/icons/lightbulb";
  import Search from "@lucide/svelte/icons/search";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Tag from "@lucide/svelte/icons/tag";
  import X from "@lucide/svelte/icons/x";

  interface SearchResult {
    id: number;
    date: string;
    amount: number;
    notes: string | null;
    payeeName: string | null;
    categoryName: string | null;
    accountName: string | null;
  }

  interface ParsedQuery {
    dateFrom?: string;
    dateTo?: string;
    minAmount?: number;
    maxAmount?: number;
    payeeNames?: string[];
    categoryNames?: string[];
    transactionType?: "income" | "expense" | "all";
    searchTerms?: string[];
    interpretation: string;
    confidence: number;
  }

  interface Example {
    query: string;
    description: string;
  }

  interface Props {
    results?: SearchResult[];
    parsedQuery?: ParsedQuery | null;
    examples?: Example[];
    isLoading?: boolean;
    totalCount?: number;
    executionTimeMs?: number;
    onSearch?: (query: string) => void;
    onViewTransaction?: (id: number) => void;
    class?: string;
  }

  let {
    results = [],
    parsedQuery = null,
    examples = [],
    isLoading = false,
    totalCount = 0,
    executionTimeMs = 0,
    onSearch,
    onViewTransaction,
    class: className,
  }: Props = $props();

  let searchQuery = $state("");
  let showExamples = $state(true);

  function handleSearch() {
    if (searchQuery.trim() && onSearch) {
      showExamples = false;
      onSearch(searchQuery.trim());
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      handleSearch();
    }
  }

  function handleExampleClick(query: string) {
    searchQuery = query;
    showExamples = false;
    onSearch?.(query);
  }

  function handleClear() {
    searchQuery = "";
    showExamples = true;
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const hasResults = $derived(results.length > 0);
  const displayResults = $derived(results.slice(0, 10));
</script>

<Card.Root class={cn("", className)}>
  <Card.Header class="pb-3">
    <Card.Title class="flex items-center gap-2 text-sm font-medium">
      <Sparkles class="h-4 w-4" />
      Natural Language Search
    </Card.Title>
    <Card.Description>
      Search transactions using everyday language
    </Card.Description>
  </Card.Header>

  <Card.Content class="space-y-4">
    <!-- Search Input -->
    <div class="flex gap-2">
      <div class="relative flex-1">
        <Search class="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          type="text"
          placeholder="e.g., 'Coffee purchases last month' or 'Large expenses over $500'"
          class="pl-9 pr-9"
          bind:value={searchQuery}
          onkeydown={handleKeydown}
        />
        {#if searchQuery}
          <button
            type="button"
            class="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
            onclick={handleClear}
          >
            <X class="h-4 w-4" />
          </button>
        {/if}
      </div>
      <Button onclick={handleSearch} disabled={!searchQuery.trim() || isLoading}>
        {#if isLoading}
          <Search class="mr-2 h-4 w-4 animate-spin" />
        {:else}
          <Search class="mr-2 h-4 w-4" />
        {/if}
        Search
      </Button>
    </div>

    <!-- Examples Section -->
    {#if showExamples && examples.length > 0}
      <div class="space-y-2">
        <p class="text-muted-foreground flex items-center gap-1 text-xs">
          <Lightbulb class="h-3 w-3" />
          Try these examples:
        </p>
        <div class="flex flex-wrap gap-2">
          {#each examples.slice(0, 6) as example (example.query)}
            <button
              type="button"
              class="rounded-full border bg-muted/50 px-3 py-1 text-xs transition-colors hover:bg-muted"
              onclick={() => handleExampleClick(example.query)}
              title={example.description}
            >
              {example.query}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Loading State -->
    {#if isLoading}
      <div class="space-y-3">
        <Skeleton class="h-4 w-48" />
        {#each Array(3) as _, i (i)}
          <Skeleton class="h-16 w-full" />
        {/each}
      </div>
    {:else if parsedQuery && !showExamples}
      <!-- Query Interpretation -->
      {#if parsedQuery.interpretation}
        <div class="rounded-lg border bg-muted/30 p-3">
          <p class="text-muted-foreground text-xs">
            <span class="font-medium">Understood as:</span>
            {parsedQuery.interpretation}
          </p>
          <div class="mt-2 flex items-center gap-2">
            <Badge variant="secondary" class="text-xs">
              {formatPercent(parsedQuery.confidence)} confidence
            </Badge>
            {#if executionTimeMs > 0}
              <span class="text-muted-foreground text-xs">
                ({executionTimeMs}ms)
              </span>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Results -->
      {#if hasResults}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-muted-foreground text-xs">
              Found {totalCount} transaction{totalCount === 1 ? "" : "s"}
            </p>
          </div>

          <div class="space-y-2">
            {#each displayResults as result (result.id)}
              <button
                type="button"
                class="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                onclick={() => onViewTransaction?.(result.id)}
              >
                <div class="flex items-center gap-3 overflow-hidden">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    {#if result.amount >= 0}
                      <DollarSign class="h-4 w-4 text-green-500" />
                    {:else}
                      <DollarSign class="h-4 w-4 text-red-500" />
                    {/if}
                  </div>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium">
                      {result.payeeName || result.notes || "Unknown"}
                    </p>
                    <div class="flex items-center gap-2 text-xs text-muted-foreground">
                      <span class="flex items-center gap-1">
                        <Calendar class="h-3 w-3" />
                        {formatDate(result.date)}
                      </span>
                      {#if result.categoryName}
                        <span class="flex items-center gap-1">
                          <Tag class="h-3 w-3" />
                          {result.categoryName}
                        </span>
                      {/if}
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class={cn("text-sm font-semibold", {
                      "text-green-600": result.amount >= 0,
                      "text-red-600": result.amount < 0,
                    })}
                  >
                    {formatCurrency(result.amount)}
                  </span>
                  <ChevronRight class="text-muted-foreground h-4 w-4" />
                </div>
              </button>
            {/each}
          </div>

          {#if totalCount > 10}
            <p class="text-muted-foreground text-center text-xs">
              Showing 10 of {totalCount} results
            </p>
          {/if}
        </div>
      {:else if searchQuery && !isLoading}
        <!-- No Results -->
        <div class="py-6 text-center">
          <Search class="text-muted-foreground mx-auto h-8 w-8" />
          <p class="mt-2 text-sm font-medium">No transactions found</p>
          <p class="text-muted-foreground text-xs">
            Try adjusting your search query
          </p>
        </div>
      {/if}
    {/if}
  </Card.Content>
</Card.Root>
