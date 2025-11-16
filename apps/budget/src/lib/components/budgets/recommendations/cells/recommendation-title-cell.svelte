<script lang="ts">
import type { BudgetRecommendationWithRelations } from '$lib/schema/recommendations';

interface Props {
  recommendation: BudgetRecommendationWithRelations;
}

let { recommendation }: Props = $props();
</script>

<div class="space-y-1">
  <div class="font-medium">{recommendation.title}</div>
  <div class="text-muted-foreground line-clamp-3 text-sm whitespace-pre-line">
    {recommendation.description}
  </div>
</div>
