<script lang="ts">
import {Badge} from '$lib/components/ui/badge';
import type {BudgetWithRelations} from '$lib/server/domains/budgets';

interface Props {
  budget: BudgetWithRelations;
}

let {budget}: Props = $props();

const formatted = $derived(budget.status.charAt(0).toUpperCase() + budget.status.slice(1));

const variant = $derived(budget.status === 'active' ? 'default' : 'secondary');
</script>

<Badge {variant}>{formatted}</Badge>
