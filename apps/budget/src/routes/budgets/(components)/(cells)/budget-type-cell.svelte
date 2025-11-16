<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import type { BudgetWithRelations } from '$lib/server/domains/budgets';

interface Props {
  budget: BudgetWithRelations;
}

let { budget }: Props = $props();

const formatted = $derived(budget.type.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase()));

const variant = $derived.by(() => {
  switch (budget.type) {
    case 'account-monthly':
      return 'default';
    case 'category-envelope':
      return 'secondary';
    case 'goal-based':
      return 'outline';
    default:
      return 'destructive';
  }
});
</script>

<Badge {variant}>{formatted}</Badge>
