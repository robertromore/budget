<script lang="ts">
  import type {BudgetRecommendationWithRelations} from '$lib/schema/recommendations';
  import {Button} from '$lib/components/ui/button';
  import Check from '@lucide/svelte/icons/check';
  import X from '@lucide/svelte/icons/x';

  interface Props {
    recommendation: BudgetRecommendationWithRelations;
    onApply: (recommendation: BudgetRecommendationWithRelations) => void;
    onDismiss: (recommendation: BudgetRecommendationWithRelations) => void;
  }

  let {recommendation, onApply, onDismiss}: Props = $props();
</script>

{#if recommendation.status === 'pending'}
  <div class="flex items-center gap-1">
    <Button size="sm" variant="default" onclick={() => onApply(recommendation)}>
      <Check class="h-3.5 w-3.5 mr-1" />
      Apply
    </Button>
    <Button size="sm" variant="ghost" onclick={() => onDismiss(recommendation)}>
      <X class="h-3.5 w-3.5 mr-1" />
      Dismiss
    </Button>
  </div>
{:else}
  <span class="text-sm text-muted-foreground">
    {recommendation.status === 'applied' ? 'Applied' : 'Dismissed'}
  </span>
{/if}
