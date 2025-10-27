<script lang="ts">
  import type {BudgetRecommendationWithRelations} from '$lib/schema/recommendations';

  interface Props {
    recommendation: BudgetRecommendationWithRelations;
  }

  let {recommendation}: Props = $props();
</script>

<div class="space-y-1">
  <div class="font-medium">{recommendation.title}</div>
  <div class="text-sm text-muted-foreground whitespace-pre-line line-clamp-3">
    {recommendation.description}
  </div>
</div>
