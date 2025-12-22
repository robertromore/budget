<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type { NextTransactionPrediction } from '$lib/hooks/use-payee-insights.svelte';
// Icons
	import Calendar from '@lucide/svelte/icons/calendar';
	import Clock from '@lucide/svelte/icons/clock';

	interface Props {
		prediction: NextTransactionPrediction | null;
	}

	let { prediction }: Props = $props();

	// Format currency
	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
		}).format(amount);
	}

	// Format date
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
		});
	}

	// Days until text
	const daysUntilText = $derived(() => {
		if (!prediction) return '';
		if (prediction.daysUntil === 0) return 'Today';
		if (prediction.daysUntil === 1) return 'Tomorrow';
		if (prediction.daysUntil < 0) return `${Math.abs(prediction.daysUntil)} days ago`;
		return `${prediction.daysUntil} days`;
	});

	// Confidence badge class
	const confidenceBadgeClass = $derived(() => {
		if (!prediction) return '';
		if (prediction.confidence >= 0.8) return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300';
		if (prediction.confidence >= 0.6) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300';
		return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
	});
</script>

<div class="rounded-lg border p-4">
	<div class="mb-3 flex items-center gap-2">
		<Calendar class="h-4 w-4 text-blue-500" />
		<h4 class="font-medium">Next Transaction</h4>
	</div>

	{#if prediction}
		<div class="space-y-3">
			<!-- Date Prediction -->
			<div class="flex items-center justify-between">
				<div>
					<div class="text-lg font-semibold">{formatDate(prediction.date)}</div>
					<div class="text-muted-foreground flex items-center gap-1 text-sm">
						<Clock class="h-3 w-3" />
						{daysUntilText()}
					</div>
				</div>
				<Tooltip.Root>
					<Tooltip.Trigger>
						<span class="rounded-full px-2 py-0.5 text-xs {confidenceBadgeClass()}">
							{Math.round(prediction.confidence * 100)}%
						</span>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p>Prediction confidence</p>
					</Tooltip.Content>
				</Tooltip.Root>
			</div>

			<!-- Amount Prediction -->
			<div class="bg-muted/50 rounded-lg p-3">
				<div class="text-center">
					<div class="text-xl font-bold">{formatCurrency(prediction.amount)}</div>
					<div class="text-muted-foreground text-xs">
						Range: {formatCurrency(prediction.amountRange[0])} - {formatCurrency(prediction.amountRange[1])}
					</div>
				</div>
			</div>

			<!-- Method -->
			<p class="text-muted-foreground text-center text-xs">{prediction.method}</p>
		</div>
	{:else}
		<p class="text-muted-foreground py-4 text-center text-sm">
			Not enough data to predict next transaction.
		</p>
	{/if}
</div>
