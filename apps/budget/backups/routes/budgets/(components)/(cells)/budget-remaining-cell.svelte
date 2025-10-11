<script lang="ts">
import type {BudgetWithRelations} from '$lib/server/domains/budgets';
import {formatCurrency} from '$lib/utils/formatters';
import {calculateActualSpent} from '$lib/utils/budget-calculations';
import {cn} from '$lib/utils';

interface Props {
	budget: BudgetWithRelations;
}

let {budget}: Props = $props();

function getAllocated(budget: BudgetWithRelations): number {
	const templates = budget.periodTemplates ?? [];
	const periods = templates.flatMap((template) => template.periods ?? []);
	if (!periods.length) return 0;

	const latest = periods.reduce((latest, current) =>
		latest.endDate > current.endDate ? latest : current
	);

	if (latest) return Math.abs(latest.allocatedAmount ?? 0);
	return Math.abs(
		((budget.metadata as Record<string, unknown>)?.['allocatedAmount'] as number) ?? 0
	);
}

function getConsumed(budget: BudgetWithRelations): number {
	return calculateActualSpent(budget);
}

const allocated = $derived(getAllocated(budget));
const consumed = $derived(getConsumed(budget));
const remaining = $derived(allocated - consumed);
const isOver = $derived(consumed > allocated);
</script>

<span class={cn(isOver && 'text-destructive font-semibold')}>
	{formatCurrency(remaining)}
</span>
