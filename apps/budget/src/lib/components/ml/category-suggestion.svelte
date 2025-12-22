<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { cn } from "$lib/utils";
  import Check from "@lucide/svelte/icons/check";
  import Lightbulb from "@lucide/svelte/icons/lightbulb";
  import Sparkles from "@lucide/svelte/icons/sparkles";

  interface Suggestion {
    categoryId: number;
    categoryName: string;
    confidence: number;
    reason: string;
  }

  interface Props {
    suggestions?: Suggestion[];
    selectedCategoryId?: number | null;
    onSelect?: (categoryId: number) => void;
    isLoading?: boolean;
    compact?: boolean;
    class?: string;
  }

  let {
    suggestions = [],
    selectedCategoryId = null,
    onSelect,
    isLoading = false,
    compact = false,
    class: className,
  }: Props = $props();

  const topSuggestion = $derived(suggestions[0]);
  const hasHighConfidence = $derived(topSuggestion && topSuggestion.confidence >= 0.8);

  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return "text-green-500";
    if (confidence >= 0.6) return "text-yellow-500";
    return "text-muted-foreground";
  }

  function getConfidenceLabel(confidence: number): string {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  }

  function handleSelect(categoryId: number) {
    onSelect?.(categoryId);
  }
</script>

{#if isLoading}
  <div class={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
    <Sparkles class="h-4 w-4 animate-pulse" />
    <span>Finding best category...</span>
  </div>
{:else if suggestions.length > 0}
  {#if compact}
    <!-- Compact mode - single suggestion inline -->
    <div class={cn("flex items-center gap-2", className)}>
      <Button
        variant="ghost"
        size="sm"
        class={cn(
          "h-7 gap-1.5 text-xs",
          hasHighConfidence ? "text-green-600 hover:text-green-700" : "text-muted-foreground"
        )}
        onclick={() => handleSelect(topSuggestion.categoryId)}
      >
        <Lightbulb class="h-3 w-3" />
        {topSuggestion.categoryName}
        <Badge variant="secondary" class={cn("ml-1 h-4 px-1 text-[10px]", getConfidenceColor(topSuggestion.confidence))}>
          {(topSuggestion.confidence * 100).toFixed(0)}%
        </Badge>
      </Button>
    </div>
  {:else}
    <!-- Full mode - list of suggestions -->
    <div class={cn("space-y-2", className)}>
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles class="h-4 w-4" />
        <span>Suggested categories</span>
      </div>
      <div class="space-y-1">
        {#each suggestions.slice(0, 3) as suggestion}
          {@const isSelected = suggestion.categoryId === selectedCategoryId}
          <Button
            variant={isSelected ? "secondary" : "ghost"}
            size="sm"
            class={cn(
              "w-full justify-start gap-2 text-left",
              isSelected && "bg-primary/10"
            )}
            onclick={() => handleSelect(suggestion.categoryId)}
          >
            {#if isSelected}
              <Check class="h-4 w-4 text-primary" />
            {:else}
              <div class="h-4 w-4"></div>
            {/if}
            <span class="flex-1">{suggestion.categoryName}</span>
            <Badge
              variant="outline"
              class={cn("text-xs", getConfidenceColor(suggestion.confidence))}
            >
              {getConfidenceLabel(suggestion.confidence)}
            </Badge>
          </Button>
        {/each}
      </div>
      {#if topSuggestion}
        <p class="text-muted-foreground text-xs">
          {topSuggestion.reason}
        </p>
      {/if}
    </div>
  {/if}
{/if}
