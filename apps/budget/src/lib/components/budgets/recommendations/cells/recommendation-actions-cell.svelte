<script lang="ts">
import { Button } from '$lib/components/ui/button';
import type { BudgetRecommendationWithRelations } from '$lib/schema/recommendations';
import Check from '@lucide/svelte/icons/check';
import X from '@lucide/svelte/icons/x';

interface Props {
  recommendation: BudgetRecommendationWithRelations;
  onApply: (recommendation: BudgetRecommendationWithRelations) => void;
  onDismiss: (recommendation: BudgetRecommendationWithRelations) => void;
}

let { recommendation, onApply, onDismiss }: Props = $props();
</script>

{#if recommendation.status === 'pending'}
  <div class="flex items-center gap-1">
    <Button size="sm" variant="default" onclick={() => onApply(recommendation)}>
      <Check class="mr-1 h-3.5 w-3.5" />
      Apply
    </Button>
    <Button size="sm" variant="ghost" onclick={() => onDismiss(recommendation)}>
      <X class="mr-1 h-3.5 w-3.5" />
      Dismiss
    </Button>
  </div>
{:else}
  <span class="text-muted-foreground text-sm">
    {recommendation.status === 'applied' ? 'Applied' : 'Dismissed'}
  </span>
{/if}
