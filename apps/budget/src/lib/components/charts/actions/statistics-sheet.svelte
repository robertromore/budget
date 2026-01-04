<script lang="ts">
	import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import { chartSelection } from '$lib/states/ui/chart-selection.svelte';
	import { currencyFormatter } from '$lib/utils/formatters';

	// Icons
	import Calculator from '@lucide/svelte/icons/calculator';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import Minus from '@lucide/svelte/icons/minus';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}

	let { open = $bindable(false), onOpenChange }: Props = $props();

	const sortedPoints = $derived(chartSelection.sortedByDate);
	const sortedByValue = $derived(chartSelection.sortedByValue);

	// Additional computed statistics
	const additionalStats = $derived.by(() => {
		if (sortedPoints.length < 2) return null;

		const values = sortedPoints.map((p) => p.value);
		const n = values.length;
		const mean = chartSelection.averageValue;
		const stdDev = chartSelection.standardDeviation;

		// Coefficient of Variation
		const cv = mean !== 0 ? (stdDev / mean) * 100 : 0;

		// Skewness (Fisher-Pearson)
		let skewness = 0;
		if (stdDev !== 0 && n > 2) {
			const sumCubed = values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 3), 0);
			skewness = (n / ((n - 1) * (n - 2))) * sumCubed;
		}

		// Percentiles
		const sorted = [...values].sort((a, b) => a - b);
		const p10 = sorted[Math.floor(n * 0.1)] ?? sorted[0];
		const p25 = sorted[Math.floor(n * 0.25)] ?? sorted[0];
		const p75 = sorted[Math.floor(n * 0.75)] ?? sorted[n - 1];
		const p90 = sorted[Math.floor(n * 0.9)] ?? sorted[n - 1];
		const iqr = p75 - p25;

		// Sum
		const sum = chartSelection.totalValue;

		// First and last values for simple change
		const first = sortedPoints[0]?.value ?? 0;
		const last = sortedPoints[n - 1]?.value ?? 0;
		const absoluteChange = last - first;
		const percentChange = first !== 0 ? (absoluteChange / first) * 100 : 0;

		return {
			cv,
			skewness,
			p10,
			p25,
			p75,
			p90,
			iqr,
			sum,
			absoluteChange,
			percentChange,
			first,
			last,
			firstLabel: sortedPoints[0]?.label ?? '',
			lastLabel: sortedPoints[n - 1]?.label ?? ''
		};
	});

	function getSkewnessLabel(skew: number): string {
		if (Math.abs(skew) < 0.5) return 'Symmetric';
		if (skew > 0) return 'Right-skewed (high outliers)';
		return 'Left-skewed (low outliers)';
	}

	function handleClose() {
		open = false;
		onOpenChange?.(false);
	}
</script>

<ResponsiveSheet bind:open {onOpenChange} defaultWidth={700}>
	{#snippet header()}
		<Sheet.Title class="flex items-center gap-2">
			<Calculator class="h-5 w-5" />
			Summary Statistics
		</Sheet.Title>
		<Sheet.Description>
			Comprehensive statistics for {chartSelection.count} selected periods
		</Sheet.Description>
	{/snippet}

	{#snippet content()}
		<div class="space-y-6">
			<!-- Central Tendency -->
			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="text-base">Central Tendency</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
						<div>
							<p class="text-xs text-muted-foreground">Mean (Average)</p>
							<p class="text-lg font-semibold tabular-nums">
								{currencyFormatter.format(chartSelection.averageValue)}
							</p>
						</div>
						<div>
							<p class="text-xs text-muted-foreground">Median (Middle)</p>
							<p class="text-lg font-semibold tabular-nums">
								{currencyFormatter.format(chartSelection.medianValue)}
							</p>
						</div>
						<div>
							<p class="text-xs text-muted-foreground">Total Sum</p>
							<p class="text-lg font-semibold tabular-nums">
								{currencyFormatter.format(additionalStats?.sum ?? 0)}
							</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Spread / Dispersion -->
			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="flex items-center gap-2 text-base">
						<BarChart3 class="h-4 w-4" />
						Spread & Dispersion
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
						<div>
							<p class="text-xs text-muted-foreground">Std Deviation (σ)</p>
							<p class="text-lg font-semibold tabular-nums">
								{currencyFormatter.format(chartSelection.standardDeviation)}
							</p>
						</div>
						<div>
							<p class="text-xs text-muted-foreground">Coefficient of Variation</p>
							<p class="text-lg font-semibold tabular-nums">
								{(additionalStats?.cv ?? 0).toFixed(1)}%
							</p>
							<p class="text-xs text-muted-foreground">
								{(additionalStats?.cv ?? 0) < 20 ? 'Low variability' : (additionalStats?.cv ?? 0) < 40 ? 'Moderate' : 'High variability'}
							</p>
						</div>
						<div>
							<p class="text-xs text-muted-foreground">Range</p>
							<p class="text-lg font-semibold tabular-nums">
								{currencyFormatter.format(chartSelection.maxValue - chartSelection.minValue)}
							</p>
						</div>
						<div>
							<p class="text-xs text-muted-foreground">Minimum</p>
							<p class="text-lg font-semibold tabular-nums text-green-600">
								{currencyFormatter.format(chartSelection.minValue)}
							</p>
						</div>
						<div>
							<p class="text-xs text-muted-foreground">Maximum</p>
							<p class="text-lg font-semibold tabular-nums text-destructive">
								{currencyFormatter.format(chartSelection.maxValue)}
							</p>
						</div>
						<div>
							<p class="text-xs text-muted-foreground">IQR (Q3-Q1)</p>
							<p class="text-lg font-semibold tabular-nums">
								{currencyFormatter.format(additionalStats?.iqr ?? 0)}
							</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Percentiles -->
			{#if additionalStats}
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-base">Percentiles</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-3">
							<div class="flex items-center gap-2">
								<div class="flex-1">
									<div class="flex justify-between text-xs text-muted-foreground mb-1">
										<span>10th</span>
										<span>25th (Q1)</span>
										<span>50th (Median)</span>
										<span>75th (Q3)</span>
										<span>90th</span>
									</div>
									<div class="relative h-3 rounded-full bg-muted">
										<div class="absolute h-full rounded-full bg-primary/30" style="left: 10%; right: 10%;"></div>
										<div class="absolute h-full rounded-full bg-primary/50" style="left: 25%; right: 25%;"></div>
										<div class="absolute top-0 h-full w-0.5 bg-primary" style="left: 50%;"></div>
									</div>
								</div>
							</div>
							<div class="grid grid-cols-5 gap-2 text-center text-sm">
								<div>
									<p class="font-medium tabular-nums">{currencyFormatter.format(additionalStats.p10)}</p>
								</div>
								<div>
									<p class="font-medium tabular-nums">{currencyFormatter.format(additionalStats.p25)}</p>
								</div>
								<div>
									<p class="font-medium tabular-nums">{currencyFormatter.format(chartSelection.medianValue)}</p>
								</div>
								<div>
									<p class="font-medium tabular-nums">{currencyFormatter.format(additionalStats.p75)}</p>
								</div>
								<div>
									<p class="font-medium tabular-nums">{currencyFormatter.format(additionalStats.p90)}</p>
								</div>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Change Over Time -->
			{#if additionalStats && sortedPoints.length >= 2}
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="flex items-center gap-2 text-base">
							{#if additionalStats.absoluteChange > 0}
								<TrendingUp class="h-4 w-4 text-destructive" />
							{:else if additionalStats.absoluteChange < 0}
								<TrendingDown class="h-4 w-4 text-green-600" />
							{:else}
								<Minus class="h-4 w-4 text-muted-foreground" />
							{/if}
							Change Over Period
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
							<div>
								<p class="text-xs text-muted-foreground">First ({additionalStats.firstLabel})</p>
								<p class="font-semibold tabular-nums">
									{currencyFormatter.format(additionalStats.first)}
								</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Last ({additionalStats.lastLabel})</p>
								<p class="font-semibold tabular-nums">
									{currencyFormatter.format(additionalStats.last)}
								</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Absolute Change</p>
								<p class="font-semibold tabular-nums" class:text-destructive={additionalStats.absoluteChange > 0} class:text-green-600={additionalStats.absoluteChange < 0}>
									{additionalStats.absoluteChange > 0 ? '+' : ''}{currencyFormatter.format(additionalStats.absoluteChange)}
								</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Percent Change</p>
								<p class="font-semibold tabular-nums" class:text-destructive={additionalStats.percentChange > 0} class:text-green-600={additionalStats.percentChange < 0}>
									{additionalStats.percentChange > 0 ? '+' : ''}{additionalStats.percentChange.toFixed(1)}%
								</p>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Distribution Shape -->
			{#if additionalStats}
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-base">Distribution Shape</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium">Skewness</p>
								<p class="text-xs text-muted-foreground">{getSkewnessLabel(additionalStats.skewness)}</p>
							</div>
							<Badge variant="outline">
								{additionalStats.skewness.toFixed(2)}
							</Badge>
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Top and Bottom Values -->
			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="text-base">Ranked Values</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<p class="mb-2 text-xs font-medium text-destructive">Highest Values</p>
							<div class="space-y-1">
								{#each sortedByValue.slice(0, 5) as point, i}
									<div class="flex items-center justify-between text-sm">
										<span class="text-muted-foreground">{i + 1}. {point.label}</span>
										<span class="font-medium tabular-nums">{currencyFormatter.format(point.value)}</span>
									</div>
								{/each}
							</div>
						</div>
						<div>
							<p class="mb-2 text-xs font-medium text-green-600">Lowest Values</p>
							<div class="space-y-1">
								{#each [...sortedByValue].reverse().slice(0, 5) as point, i}
									<div class="flex items-center justify-between text-sm">
										<span class="text-muted-foreground">{i + 1}. {point.label}</span>
										<span class="font-medium tabular-nums">{currencyFormatter.format(point.value)}</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	{/snippet}

	{#snippet footer()}
		<Button variant="outline" onclick={handleClose}>Close</Button>
	{/snippet}
</ResponsiveSheet>

