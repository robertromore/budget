<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { ResponsiveSheet } from '$lib/components/ui/responsive-sheet';
import { Separator } from '$lib/components/ui/separator';
import { Badge } from '$lib/components/ui/badge';
import { ScrollArea } from '$lib/components/ui/scroll-area';
import { Skeleton } from '$lib/components/ui/skeleton';
import Lightbulb from '@lucide/svelte/icons/lightbulb';
import Check from '@lucide/svelte/icons/check';
import X from '@lucide/svelte/icons/x';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import Info from '@lucide/svelte/icons/info';
import { getBulkPayeeCategoryRecommendations, bulkAssignPayeeCategories, payeeCategoryKeys } from '$lib/query/payee-categories';
import { queryClient } from '$lib/query';
import { getIconByName } from '$lib/components/ui/icon-picker/icon-categories';
import type { PayeeCategoryRecommendation } from '$lib/query/payee-categories';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uncategorizedCount: number;
}

let { open = $bindable(), onOpenChange, uncategorizedCount }: Props = $props();

// State management
let acceptedPayeeIds = $state<Set<number>>(new Set());
let rejectedPayeeIds = $state<Set<number>>(new Set());
let processingPayeeId = $state<number | null>(null);

// Fetch recommendations - create query once, use enabled option reactively
const recommendationsQuery = getBulkPayeeCategoryRecommendations(50).options(() => ({
  enabled: open, // Only fetch when sheet is open
}));
const recommendations = $derived(recommendationsQuery.data ?? []);
const isLoading = $derived(recommendationsQuery.isLoading);

// Bulk assign mutation
const assignMutation = bulkAssignPayeeCategories.options();

// Filter recommendations based on accepted/rejected
const visibleRecommendations = $derived.by(() => {
  return recommendations.filter(
    rec => !acceptedPayeeIds.has(rec.payeeId) && !rejectedPayeeIds.has(rec.payeeId)
  );
});

// High confidence recommendations (>=70%)
const highConfidenceRecommendations = $derived.by(() => {
  return visibleRecommendations.filter(rec => rec.confidence >= 0.7 && rec.recommendedCategoryId !== null);
});

// Accept a single recommendation
const acceptRecommendation = async (recommendation: PayeeCategoryRecommendation) => {
  if (!recommendation.recommendedCategoryId) return;

  processingPayeeId = recommendation.payeeId;
  try {
    await assignMutation.mutateAsync({
      payeeIds: [recommendation.payeeId],
      categoryId: recommendation.recommendedCategoryId,
    });
    acceptedPayeeIds.add(recommendation.payeeId);
  } finally {
    processingPayeeId = null;
  }
};

// Reject a recommendation
const rejectRecommendation = (payeeId: number) => {
  rejectedPayeeIds.add(payeeId);
};

// Skip (just hide, no action)
const skipRecommendation = (payeeId: number) => {
  rejectedPayeeIds.add(payeeId);
};

// Accept all high confidence recommendations
const acceptAllHighConfidence = async () => {
  const toAccept = highConfidenceRecommendations;
  if (toAccept.length === 0) return;

  // Group by category for efficient bulk operations
  const byCategory = new Map<number, number[]>();
  for (const rec of toAccept) {
    if (!rec.recommendedCategoryId) continue;
    if (!byCategory.has(rec.recommendedCategoryId)) {
      byCategory.set(rec.recommendedCategoryId, []);
    }
    byCategory.get(rec.recommendedCategoryId)!.push(rec.payeeId);
  }

  // Execute bulk assignments
  for (const [categoryId, payeeIds] of byCategory.entries()) {
    await assignMutation.mutateAsync({ payeeIds, categoryId });
    payeeIds.forEach(id => acceptedPayeeIds.add(id));
  }
};

// Handle open/close changes
const handleOpenChange = (newOpen: boolean) => {
  onOpenChange(newOpen);
  // Reset state after close animation
  if (!newOpen) {
    setTimeout(() => {
      acceptedPayeeIds.clear();
      rejectedPayeeIds.clear();
    }, 300);
  }
};

// Get confidence badge variant
const getConfidenceBadge = (confidence: number) => {
  if (confidence >= 0.7) return { variant: 'default' as const, label: 'High', class: 'bg-green-500' };
  if (confidence >= 0.4) return { variant: 'secondary' as const, label: 'Medium', class: 'bg-yellow-500' };
  return { variant: 'outline' as const, label: 'Low', class: 'bg-orange-500' };
};

// Format percentage
const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
</script>

<ResponsiveSheet bind:open onOpenChange={handleOpenChange}>
  {#snippet header()}
    <div>
      <h2 class="text-lg font-semibold flex items-center gap-2">
        <Lightbulb class="h-5 w-5" />
        Uncategorized Payees
      </h2>
      <p class="text-sm text-muted-foreground">
        Review AI-powered category recommendations for {uncategorizedCount} uncategorized {uncategorizedCount === 1 ? 'payee' : 'payees'}
      </p>
    </div>
  {/snippet}

  {#snippet content()}
    <div class="flex flex-col gap-4 h-full">
      <!-- Quick stats -->
      {#if !isLoading && visibleRecommendations.length > 0}
        <div class="flex items-center justify-between gap-2 text-sm">
          <div class="text-muted-foreground">
            {visibleRecommendations.length} remaining • {acceptedPayeeIds.size} accepted
          </div>
          {#if highConfidenceRecommendations.length > 0}
            <Button
              variant="ghost"
              size="sm"
              onclick={acceptAllHighConfidence}
              disabled={assignMutation.isPending}
            >
              Accept All High Confidence ({highConfidenceRecommendations.length})
            </Button>
          {/if}
        </div>

        <Separator />
      {/if}

      <!-- Recommendations list -->
      <ScrollArea class="flex-1 -mx-6 px-6">
        <div class="space-y-4 pb-4">
          {#if isLoading}
            <!-- Loading skeletons -->
            {#each Array(3) as _, i}
              <div class="rounded-lg border p-4 space-y-3">
                <Skeleton class="h-5 w-32" />
                <Skeleton class="h-4 w-48" />
                <Skeleton class="h-16 w-full" />
                <div class="flex gap-2">
                  <Skeleton class="h-9 flex-1" />
                  <Skeleton class="h-9 flex-1" />
                  <Skeleton class="h-9 flex-1" />
                </div>
              </div>
            {/each}
          {:else if visibleRecommendations.length === 0}
            <!-- Empty state -->
            <div class="text-center py-12">
              {#if acceptedPayeeIds.size > 0}
                <Check class="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 class="text-lg font-semibold mb-2">All Done!</h3>
                <p class="text-sm text-muted-foreground">
                  You've reviewed all recommendations. {acceptedPayeeIds.size} {acceptedPayeeIds.size === 1 ? 'payee' : 'payees'} assigned.
                </p>
              {:else if uncategorizedCount > 0 && recommendationsQuery.isSuccess}
                <Info class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 class="text-lg font-semibold mb-2">No Categories Available</h3>
                <p class="text-sm text-muted-foreground mb-4">
                  You have {uncategorizedCount} uncategorized {uncategorizedCount === 1 ? 'payee' : 'payees'}, but no payee categories exist yet.
                  <br />
                  Create some categories first to get AI-powered recommendations.
                </p>
                <Button variant="outline" onclick={() => handleOpenChange(false)}>
                  Create Categories
                </Button>
              {:else}
                <Check class="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 class="text-lg font-semibold mb-2">All Done!</h3>
                <p class="text-sm text-muted-foreground">
                  No uncategorized payees found.
                </p>
              {/if}
            </div>
          {:else}
            <!-- Recommendation cards -->
            {#each visibleRecommendations as recommendation (recommendation.payeeId)}
              {@const confidenceBadge = getConfidenceBadge(recommendation.confidence)}
              {@const isProcessing = processingPayeeId === recommendation.payeeId}

              <div class="rounded-lg border p-4 space-y-3 hover:bg-accent/50 transition-colors">
                <!-- Payee name -->
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1">
                    <h3 class="font-semibold text-base">{recommendation.payeeName}</h3>
                    {#if recommendation.supportingFactors.length > 0}
                      <p class="text-xs text-muted-foreground mt-1">
                        {recommendation.supportingFactors[0]}
                      </p>
                    {/if}
                  </div>
                  <Badge variant={confidenceBadge.variant} class={confidenceBadge.class}>
                    {confidenceBadge.label} • {formatPercent(recommendation.confidence)}
                  </Badge>
                </div>

                {#if recommendation.recommendedCategoryId}
                  <!-- Recommended category -->
                  <div class="bg-primary/5 border border-primary/20 rounded-md p-3">
                    <div class="flex items-center gap-2 mb-1">
                      <Lightbulb class="h-4 w-4 text-primary" />
                      <span class="text-xs font-medium text-primary">Recommended Category</span>
                    </div>
                    <div class="flex items-center gap-2 text-sm font-medium">
                      <ChevronRight class="h-4 w-4" />
                      <span>{recommendation.categoryName}</span>
                    </div>
                    <p class="text-xs text-muted-foreground mt-2">
                      {recommendation.reasoning}
                    </p>
                  </div>

                  <!-- Alternative categories -->
                  {#if recommendation.alternativeCategories.length > 0}
                    <details class="text-xs">
                      <summary class="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-1">
                        <Info class="h-3 w-3" />
                        View {recommendation.alternativeCategories.length} alternative suggestion{recommendation.alternativeCategories.length !== 1 ? 's' : ''}
                      </summary>
                      <div class="mt-2 pl-4 space-y-1">
                        {#each recommendation.alternativeCategories as alt}
                          <div class="flex items-center justify-between">
                            <span>{alt.name}</span>
                            <span class="text-muted-foreground">{formatPercent(alt.confidence)}</span>
                          </div>
                        {/each}
                      </div>
                    </details>
                  {/if}

                  <!-- Actions -->
                  <div class="flex gap-2 pt-2">
                    <Button
                      variant="default"
                      size="sm"
                      class="flex-1"
                      onclick={() => acceptRecommendation(recommendation)}
                      disabled={isProcessing || assignMutation.isPending}
                    >
                      <Check class="h-4 w-4 mr-1" />
                      {isProcessing ? 'Accepting...' : 'Accept'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onclick={() => skipRecommendation(recommendation.payeeId)}
                      disabled={isProcessing || assignMutation.isPending}
                    >
                      <ChevronRight class="h-4 w-4 mr-1" />
                      Skip
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={() => rejectRecommendation(recommendation.payeeId)}
                      disabled={isProcessing || assignMutation.isPending}
                    >
                      <X class="h-4 w-4" />
                    </Button>
                  </div>
                {:else}
                  <!-- No recommendation available -->
                  <div class="bg-muted rounded-md p-3 text-sm text-muted-foreground">
                    <Info class="h-4 w-4 inline mr-2" />
                    Unable to determine appropriate category. Manual assignment recommended.
                  </div>
                  <div class="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      class="flex-1"
                      onclick={() => skipRecommendation(recommendation.payeeId)}
                    >
                      <ChevronRight class="h-4 w-4 mr-1" />
                      Skip
                    </Button>
                  </div>
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      </ScrollArea>
    </div>
  {/snippet}

  {#snippet footer()}
    <div class="flex gap-2 w-full">
      <Button variant="outline" onclick={() => handleOpenChange(false)} class="flex-1">
        Done
      </Button>
      {#if visibleRecommendations.length > 0}
        <Button
          variant="ghost"
          size="sm"
          onclick={() => {
            visibleRecommendations.forEach(rec => skipRecommendation(rec.payeeId));
          }}
        >
          Skip All Remaining
        </Button>
      {/if}
    </div>
  {/snippet}
</ResponsiveSheet>
