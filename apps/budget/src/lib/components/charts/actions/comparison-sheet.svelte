<script lang="ts">
	import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { chartSelection } from '$lib/states/ui/chart-selection.svelte';
	import { currencyFormatter, formatPercentRaw } from '$lib/utils/formatters';

	// Icons
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import Minus from '@lucide/svelte/icons/minus';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}

	let { open = $bindable(false), onOpenChange }: Props = $props();

	// Get sorted points for display
	const sortedPoints = $derived(chartSelection.sortedByDate);

	// Find highest and lowest values
	const highestValue = $derived(chartSelection.maxValue);
	const lowestValue = $derived(chartSelection.minValue);

	// Calculate percentage change between first and last
	const trendInfo = $derived.by(() => {
		if (sortedPoints.length < 2) return null;
		const first = sortedPoints[0].value;
		const last = sortedPoints[sortedPoints.length - 1].value;
		const change = last - first;
		const percentChange = first !== 0 ? ((change / first) * 100) : 0;
		return { change, percentChange };
	});

	function handleClose() {
		open = false;
		onOpenChange?.(false);
	}
</script>

<ResponsiveSheet bind:open {onOpenChange} defaultWidth={800}>
	{#snippet header()}
		<Sheet.Title>Compare Selected Months</Sheet.Title>
		<Sheet.Description>
			Side-by-side comparison of {chartSelection.count} selected months
		</Sheet.Description>
	{/snippet}

	{#snippet content()}
		<div class="space-y-6">
			<!-- Summary stats -->
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<div class="rounded-lg border p-3">
					<p class="text-xs text-muted-foreground">Average</p>
					<p class="text-lg font-semibold">{currencyFormatter.format(chartSelection.averageValue)}</p>
				</div>
				<div class="rounded-lg border p-3">
					<p class="text-xs text-muted-foreground">Median</p>
					<p class="text-lg font-semibold">{currencyFormatter.format(chartSelection.medianValue)}</p>
				</div>
				<div class="rounded-lg border p-3">
					<p class="text-xs text-muted-foreground">Total</p>
					<p class="text-lg font-semibold">{currencyFormatter.format(chartSelection.totalValue)}</p>
				</div>
				<div class="rounded-lg border p-3">
					<p class="text-xs text-muted-foreground">Range</p>
					<p class="text-lg font-semibold">
						{currencyFormatter.format(highestValue - lowestValue)}
					</p>
				</div>
			</div>

			<!-- Trend indicator -->
			{#if trendInfo}
				<div class="flex items-center justify-center gap-2 rounded-lg border p-3">
					{#if trendInfo.percentChange > 0}
						<TrendingUp class="h-5 w-5 text-destructive" />
						<span class="text-destructive">
							Spending increased {formatPercentRaw(Math.abs(trendInfo.percentChange), 1)}
							({currencyFormatter.format(trendInfo.change)})
						</span>
					{:else if trendInfo.percentChange < 0}
						<TrendingDown class="h-5 w-5 text-green-600" />
						<span class="text-green-600">
							Spending decreased {formatPercentRaw(Math.abs(trendInfo.percentChange), 1)}
							({currencyFormatter.format(Math.abs(trendInfo.change))})
						</span>
					{:else}
						<Minus class="h-5 w-5 text-muted-foreground" />
						<span class="text-muted-foreground">No change in spending</span>
					{/if}
				</div>
			{/if}

			<!-- Comparison table -->
			<div class="rounded-md border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Month</Table.Head>
							<Table.Head class="text-right">Spending</Table.Head>
							<Table.Head class="text-right">vs Average</Table.Head>
							<Table.Head class="text-center">Status</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each sortedPoints as point}
							{@const vsAvg = point.value - chartSelection.averageValue}
							{@const vsAvgPercent = chartSelection.averageValue !== 0
								? ((vsAvg / chartSelection.averageValue) * 100)
								: 0}
							{@const isHighest = point.value === highestValue}
							{@const isLowest = point.value === lowestValue}
							<Table.Row>
								<Table.Cell class="font-medium">
									{point.label}
									{#if isHighest}
										<Badge variant="destructive" class="ml-2 text-xs">Highest</Badge>
									{:else if isLowest}
										<Badge variant="secondary" class="ml-2 text-xs">Lowest</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-right tabular-nums">
									{currencyFormatter.format(point.value)}
								</Table.Cell>
								<Table.Cell class="text-right tabular-nums">
									<span class:text-destructive={vsAvg > 0} class:text-green-600={vsAvg < 0}>
										{#if vsAvg > 0}
											<ArrowUp class="inline h-3 w-3" />
										{:else if vsAvg < 0}
											<ArrowDown class="inline h-3 w-3" />
										{/if}
										{vsAvgPercent > 0 ? '+' : ''}{formatPercentRaw(vsAvgPercent, 1)}
									</span>
								</Table.Cell>
								<Table.Cell class="text-center">
									{#if vsAvgPercent > 20}
										<Badge variant="destructive">High</Badge>
									{:else if vsAvgPercent < -20}
										<Badge class="bg-green-600">Low</Badge>
									{:else}
										<Badge variant="secondary">Normal</Badge>
									{/if}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>

			<!-- Visual bar comparison -->
			<div class="space-y-2">
				<h4 class="text-sm font-medium">Visual Comparison</h4>
				<div class="space-y-1.5">
					{#each sortedPoints as point}
						{@const percentage = highestValue !== 0 ? (point.value / highestValue) * 100 : 0}
						<div class="flex items-center gap-2">
							<span class="w-24 truncate text-xs text-muted-foreground">{point.label}</span>
							<div class="flex-1">
								<div
									class="h-4 rounded transition-all"
									style="width: {percentage}%; background-color: {point.value === highestValue
										? 'var(--destructive)'
										: point.value === lowestValue
											? 'var(--chart-3)'
											: 'var(--chart-1)'};"
								></div>
							</div>
							<span class="w-20 text-right text-xs tabular-nums">
								{currencyFormatter.format(point.value)}
							</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/snippet}

	{#snippet footer()}
		<div class="flex justify-between gap-2">
			<Button variant="outline" onclick={handleClose}>Close</Button>
			<Button
				onclick={() => {
					// Copy to clipboard
					const csv = chartSelection.toCSV();
					navigator.clipboard.writeText(csv);
				}}
			>
				Copy as CSV
			</Button>
		</div>
	{/snippet}
</ResponsiveSheet>
