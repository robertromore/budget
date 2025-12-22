<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type { BudgetSuggestion } from '$lib/hooks/use-payee-insights.svelte';
// Icons
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import Info from '@lucide/svelte/icons/info';
	import Plus from '@lucide/svelte/icons/plus';

	interface Props {
		suggestion: BudgetSuggestion | null;
		onApply?: (amount: number) => void;
	}

	let { suggestion, onApply }: Props = $props();

	// Format currency
	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount);
	}

	// Confidence badge class
	const confidenceBadgeClass = $derived(() => {
		if (!suggestion) return '';
		if (suggestion.confidence >= 0.8) return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300';
		if (suggestion.confidence >= 0.6) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300';
		return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
	});
</script>

<div class="rounded-lg border p-4">
	<div class="mb-3 flex items-center gap-2">
		<DollarSign class="h-4 w-4 text-green-500" />
		<h4 class="font-medium">Budget Suggestion</h4>
	</div>

	{#if suggestion}
		<div class="space-y-3">
			<!-- Suggested Amount -->
			<div class="flex items-center justify-between">
				<div>
					<div class="text-lg font-semibold">{formatCurrency(suggestion.totalSuggested)}/mo</div>
					<div class="text-muted-foreground text-sm">Recommended monthly budget</div>
				</div>
				<Tooltip.Root>
					<Tooltip.Trigger>
						<span class="rounded-full px-2 py-0.5 text-xs {confidenceBadgeClass()}">
							{Math.round(suggestion.confidence * 100)}%
						</span>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p>Suggestion confidence</p>
					</Tooltip.Content>
				</Tooltip.Root>
			</div>

			<!-- Breakdown -->
			<div class="bg-muted/50 space-y-1 rounded-lg p-3 text-sm">
				<div class="flex justify-between">
					<span class="text-muted-foreground">Average spending</span>
					<span>{formatCurrency(suggestion.monthlyAmount)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-muted-foreground flex items-center gap-1">
						Buffer
						<Tooltip.Root>
							<Tooltip.Trigger>
								<Info class="h-3 w-3" />
							</Tooltip.Trigger>
							<Tooltip.Content>
								<p>Safety margin for variations</p>
							</Tooltip.Content>
						</Tooltip.Root>
					</span>
					<span class="flex items-center gap-1">
						<Plus class="h-3 w-3" />
						{formatCurrency(suggestion.buffer)}
					</span>
				</div>
			</div>

			<!-- Seasonal Note -->
			{#if suggestion.seasonalNote}
				<p class="text-muted-foreground text-center text-xs italic">
					{suggestion.seasonalNote}
				</p>
			{/if}

			<!-- Apply Button -->
			{#if onApply}
				<Button
					variant="outline"
					size="sm"
					class="w-full"
					onclick={() => onApply(suggestion.totalSuggested)}
				>
					Set Budget
				</Button>
			{/if}
		</div>
	{:else}
		<p class="text-muted-foreground py-4 text-center text-sm">
			Not enough data to suggest a budget.
		</p>
	{/if}
</div>
