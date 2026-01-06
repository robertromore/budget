<script lang="ts">
import { Button } from '$lib/components/ui/button';
import type { BudgetRecommendationWithRelations } from '$lib/schema/recommendations';
import Check from '@lucide/svelte/icons/check';
import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
import X from '@lucide/svelte/icons/x';

interface Props {
  recommendation: BudgetRecommendationWithRelations;
  onApply: (recommendation: BudgetRecommendationWithRelations) => void;
  onDismiss: (recommendation: BudgetRecommendationWithRelations) => void;
  onReset?: (recommendation: BudgetRecommendationWithRelations) => void;
}

let { recommendation, onApply, onDismiss, onReset }: Props = $props();
</script>

{#if recommendation.status === 'pending'}
  <div class="flex items-center gap-1">
    <Button size="icon" variant="default" onclick={(e) => { e.stopPropagation(); onApply(recommendation); }} title="Apply">
      <Check class="h-3.5 w-3.5" />
    </Button>
    <Button size="icon" variant="destructive" onclick={(e) => { e.stopPropagation(); onDismiss(recommendation); }} title="Dismiss">
      <X class="h-3.5 w-3.5" />
    </Button>
  </div>
{:else if recommendation.status === 'applied'}
  <div class="flex items-center gap-2">
    <span class="text-muted-foreground text-sm">Applied</span>
    {#if onReset}
      <Button size="icon" variant="ghost" class="h-7 w-7" onclick={(e) => { e.stopPropagation(); onReset(recommendation); }} title="Reset to reapply">
        <RotateCcw class="h-3.5 w-3.5" />
      </Button>
    {/if}
  </div>
{:else}
  <span class="text-muted-foreground text-sm">Dismissed</span>
{/if}
