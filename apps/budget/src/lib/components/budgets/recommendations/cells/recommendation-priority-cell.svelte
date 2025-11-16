<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import type { BudgetRecommendationWithRelations } from '$lib/schema/recommendations';

interface Props {
  recommendation: BudgetRecommendationWithRelations;
}

let { recommendation }: Props = $props();

const getPriorityVariant = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'destructive';
    case 'medium':
      return 'default';
    case 'low':
      return 'secondary';
    default:
      return 'outline';
  }
};

const getPriorityLabel = (priority: string) => {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
};
</script>

<Badge variant={getPriorityVariant(recommendation.priority)}>
  {getPriorityLabel(recommendation.priority)}
</Badge>
