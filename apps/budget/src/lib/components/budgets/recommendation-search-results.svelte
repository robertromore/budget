<script lang="ts">
import { EntitySearchResults } from '$lib/components/shared/search';
import BudgetRecommendationCard from './budget-recommendation-card.svelte';
import * as Empty from '$lib/components/ui/empty';
import { Lightbulb, Sparkles } from '@lucide/svelte/icons';
import type { BudgetRecommendationWithRelations } from '$lib/schema/recommendations';

export type ViewMode = 'grid' | 'list' | 'table';

interface Props {
  recommendations: BudgetRecommendationWithRelations[];
  isLoading: boolean;
  searchQuery: string;
  viewMode?: ViewMode;
  onApply: (recommendation: BudgetRecommendationWithRelations) => void;
  onDismiss: (recommendation: BudgetRecommendationWithRelations) => void;
}

let {
  recommendations,
  isLoading,
  searchQuery,
  viewMode = 'grid',
  onApply,
  onDismiss,
}: Props = $props();
</script>

{#if isLoading}
  <!-- Loading state -->
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each Array(6) as _}
      <div class="bg-card space-y-4 rounded-lg border p-6">
        <div class="space-y-2">
          <div class="bg-muted h-4 w-3/4 animate-pulse rounded"></div>
          <div class="bg-muted h-3 w-full animate-pulse rounded"></div>
          <div class="bg-muted h-3 w-5/6 animate-pulse rounded"></div>
        </div>
        <div class="space-y-2">
          <div class="bg-muted h-3 w-1/2 animate-pulse rounded"></div>
          <div class="bg-muted h-3 w-2/3 animate-pulse rounded"></div>
        </div>
        <div class="flex gap-2">
          <div class="bg-muted h-8 flex-1 animate-pulse rounded"></div>
          <div class="bg-muted h-8 flex-1 animate-pulse rounded"></div>
        </div>
      </div>
    {/each}
  </div>
{:else if recommendations.length === 0}
  <!-- Empty state -->
  <Empty.Empty>
    <Empty.EmptyMedia variant="icon">
      <Lightbulb class="h-12 w-12" />
    </Empty.EmptyMedia>
    <Empty.EmptyHeader>
      <Empty.EmptyTitle>No Recommendations Found</Empty.EmptyTitle>
      <Empty.EmptyDescription>
        {#if searchQuery.trim()}
          No recommendations match your search criteria. Try adjusting your filters or search terms.
        {:else}
          You don't have any recommendations. Click "Analyze Spending" to generate smart budget
          recommendations based on your transaction history.
        {/if}
      </Empty.EmptyDescription>
    </Empty.EmptyHeader>
  </Empty.Empty>
{:else}
  <!-- Results -->
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each recommendations as recommendation (recommendation.id)}
      <BudgetRecommendationCard {recommendation} />
    {/each}
  </div>

  <!-- Results Count -->
  <p class="text-muted-foreground mt-4 text-center text-sm">
    Showing {recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''}
  </p>
{/if}
