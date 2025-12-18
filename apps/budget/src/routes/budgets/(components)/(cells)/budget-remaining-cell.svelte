<script lang="ts">
import type { BudgetWithRelations } from '$lib/server/domains/budgets';
import { cn } from '$lib/utils';
import { calculateActualSpent, calculateAllocated } from '$lib/utils/budget-calculations';
import { formatCurrency } from '$lib/utils/formatters';

interface Props {
  budget: BudgetWithRelations;
}

let { budget }: Props = $props();

const allocated = $derived(calculateAllocated(budget));
const consumed = $derived(calculateActualSpent(budget));
const remaining = $derived(allocated - consumed);
const isOver = $derived(consumed > allocated);
</script>

<span class={cn(isOver && 'text-destructive font-semibold')}>
  {formatCurrency(remaining)}
</span>
