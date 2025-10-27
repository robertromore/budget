<script lang="ts">
  import type {BudgetRecommendationWithRelations} from '$lib/schema/recommendations';
  import {Badge} from '$lib/components/ui/badge';

  interface Props {
    recommendation: BudgetRecommendationWithRelations;
  }

  let {recommendation}: Props = $props();

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'applied':
        return 'default';
      case 'dismissed':
        return 'secondary';
      case 'expired':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };
</script>

<Badge variant={getStatusVariant(recommendation.status)}>
  {getStatusLabel(recommendation.status)}
</Badge>
