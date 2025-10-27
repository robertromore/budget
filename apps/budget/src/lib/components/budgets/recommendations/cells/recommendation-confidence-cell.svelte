<script lang="ts">
  import type {BudgetRecommendationWithRelations} from '$lib/schema/recommendations';
  import {Badge} from '$lib/components/ui/badge';

  interface Props {
    recommendation: BudgetRecommendationWithRelations;
  }

  let {recommendation}: Props = $props();

  const getConfidenceVariant = (confidence: number) => {
    if (confidence >= 80) return 'default';
    if (confidence >= 60) return 'secondary';
    return 'outline';
  };
</script>

<Badge variant={getConfidenceVariant(recommendation.confidence)}>
  {recommendation.confidence}%
</Badge>
