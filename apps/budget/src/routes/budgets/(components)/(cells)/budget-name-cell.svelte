<script lang="ts">
import type {BudgetWithRelations} from '$lib/server/domains/budgets';

interface Props {
	budget: BudgetWithRelations;
}

let {budget}: Props = $props();
</script>

<a href="/budgets/{budget.slug}" class="font-medium hover:underline">
	{budget.name}
</a>
