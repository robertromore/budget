<script lang="ts">
	import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { chartSelection } from '$lib/states/ui/chart-selection.svelte';
	import { currencyFormatter, formatPercentRaw } from '$lib/utils/formatters';

	// Icons
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import Minus from '@lucide/svelte/icons/minus';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import ArrowDownRight from '@lucide/svelte/icons/arrow-down-right';
	import Target from '@lucide/svelte/icons/target';
	import Calendar from '@lucide/svelte/icons/calendar';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}

	let { open = $bindable(false), onOpenChange }: Props = $props();

	const sortedPoints = $derived(chartSelection.sortedByDate);

	// Calculate comprehensive trend analysis
	const trendAnalysis = $derived.by(() => {
		if (sortedPoints.length < 2) return null;

		const n = sortedPoints.length;
		const xValues = sortedPoints.map((_, i) => i);
		const yValues = sortedPoints.map((p) => p.value);

		// Linear regression
		const sumX = xValues.reduce((a, b) => a + b, 0);
		const sumY = yValues.reduce((a, b) => a + b, 0);
		const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
		const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

		const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
		const intercept = (sumY - slope * sumX) / n;

		// R-squared (coefficient of determination)
		const meanY = sumY / n;
		const ssTotal = yValues.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
		const ssResidual = yValues.reduce((sum, y, i) => {
			const predicted = slope * i + intercept;
			return sum + Math.pow(y - predicted, 2);
		}, 0);
		const rSquared = ssTotal !== 0 ? 1 - ssResidual / ssTotal : 0;

		// Calculate residuals for each point
		const residuals = sortedPoints.map((p, i) => {
			const predicted = slope * i + intercept;
			return {
				...p,
				predicted,
				residual: p.value - predicted,
				percentError: predicted !== 0 ? ((p.value - predicted) / predicted) * 100 : 0
			};
		});

		// Find largest deviations from trend
		const sortedByResidual = [...residuals].sort((a, b) => Math.abs(b.residual) - Math.abs(a.residual));
		const largestDeviations = sortedByResidual.slice(0, 3);

		// Calculate momentum (comparing recent vs older periods)
		const halfPoint = Math.floor(n / 2);
		const firstHalfAvg = yValues.slice(0, halfPoint).reduce((a, b) => a + b, 0) / halfPoint;
		const secondHalfAvg = yValues.slice(halfPoint).reduce((a, b) => a + b, 0) / (n - halfPoint);
		const momentum = secondHalfAvg - firstHalfAvg;

		// Calculate acceleration (is the trend speeding up or slowing down?)
		let acceleration = 0;
		if (n >= 4) {
			const q1End = Math.floor(n / 4);
			const q3Start = Math.floor((3 * n) / 4);
			const earlySlope =
				(yValues[q1End] - yValues[0]) / q1End || 0;
			const lateSlope =
				(yValues[n - 1] - yValues[q3Start]) / (n - 1 - q3Start) || 0;
			acceleration = lateSlope - earlySlope;
		}

		// Period-over-period changes
		const periodChanges = sortedPoints.slice(1).map((p, i) => {
			const prev = sortedPoints[i];
			const change = p.value - prev.value;
			const percentChange = prev.value !== 0 ? (change / prev.value) * 100 : 0;
			return {
				from: prev.label,
				to: p.label,
				change,
				percentChange
			};
		});

		// Find largest increases and decreases
		const sortedChanges = [...periodChanges].sort((a, b) => b.change - a.change);
		const largestIncrease = sortedChanges[0];
		const largestDecrease = sortedChanges[sortedChanges.length - 1];

		// Volatility (coefficient of variation)
		const stdDev = chartSelection.standardDeviation;
		const volatility = meanY !== 0 ? (stdDev / meanY) * 100 : 0;

		// Project next periods
		const projections = [1, 3, 6].map((months) => ({
			months,
			value: intercept + slope * (n - 1 + months),
			change: slope * months
		}));

		return {
			slope,
			intercept,
			rSquared,
			direction: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
			monthlyChange: slope,
			totalChange: slope * (n - 1),
			percentTotalChange: sortedPoints[0].value !== 0
				? ((sortedPoints[n - 1].value - sortedPoints[0].value) / sortedPoints[0].value) * 100
				: 0,
			momentum,
			acceleration,
			volatility,
			residuals,
			largestDeviations,
			periodChanges,
			largestIncrease,
			largestDecrease,
			projections,
			startValue: sortedPoints[0].value,
			endValue: sortedPoints[n - 1].value,
			startLabel: sortedPoints[0].label,
			endLabel: sortedPoints[n - 1].label
		};
	});

	function getTrendStrength(rSquared: number): { label: string; color: string } {
		if (rSquared >= 0.8) return { label: 'Very Strong', color: 'text-green-600' };
		if (rSquared >= 0.6) return { label: 'Strong', color: 'text-blue-600' };
		if (rSquared >= 0.4) return { label: 'Moderate', color: 'text-yellow-600' };
		if (rSquared >= 0.2) return { label: 'Weak', color: 'text-orange-600' };
		return { label: 'Very Weak', color: 'text-muted-foreground' };
	}

	function handleClose() {
		open = false;
		onOpenChange?.(false);
	}
</script>

<ResponsiveSheet bind:open {onOpenChange} defaultWidth={800}>
	{#snippet header()}
		<Sheet.Title class="flex items-center gap-2">
			{#if trendAnalysis?.direction === 'increasing'}
				<TrendingUp class="h-5 w-5 text-destructive" />
			{:else if trendAnalysis?.direction === 'decreasing'}
				<TrendingDown class="h-5 w-5 text-green-600" />
			{:else}
				<Minus class="h-5 w-5 text-muted-foreground" />
			{/if}
			Trend Analysis
		</Sheet.Title>
		<Sheet.Description>
			Comprehensive trend analysis for {chartSelection.count} selected periods
		</Sheet.Description>
	{/snippet}

	{#snippet content()}
		{#if trendAnalysis}
			<div class="space-y-6">
				<!-- Overview Card -->
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-base">Trend Overview</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
							<div>
								<p class="text-xs text-muted-foreground">Direction</p>
								<div class="flex items-center gap-1">
									{#if trendAnalysis.direction === 'increasing'}
										<ArrowUpRight class="h-4 w-4 text-destructive" />
										<span class="font-semibold text-destructive">Increasing</span>
									{:else if trendAnalysis.direction === 'decreasing'}
										<ArrowDownRight class="h-4 w-4 text-green-600" />
										<span class="font-semibold text-green-600">Decreasing</span>
									{:else}
										<Minus class="h-4 w-4 text-muted-foreground" />
										<span class="font-semibold">Stable</span>
									{/if}
								</div>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Monthly Change</p>
								<p class="text-lg font-semibold tabular-nums" class:text-destructive={trendAnalysis.monthlyChange > 0} class:text-green-600={trendAnalysis.monthlyChange < 0}>
									{trendAnalysis.monthlyChange > 0 ? '+' : ''}{currencyFormatter.format(trendAnalysis.monthlyChange)}
								</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Total Change</p>
								<p class="text-lg font-semibold tabular-nums" class:text-destructive={trendAnalysis.totalChange > 0} class:text-green-600={trendAnalysis.totalChange < 0}>
									{trendAnalysis.totalChange > 0 ? '+' : ''}{currencyFormatter.format(trendAnalysis.totalChange)}
								</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">% Change</p>
								<p class="text-lg font-semibold tabular-nums" class:text-destructive={trendAnalysis.percentTotalChange > 0} class:text-green-600={trendAnalysis.percentTotalChange < 0}>
									{trendAnalysis.percentTotalChange > 0 ? '+' : ''}{formatPercentRaw(trendAnalysis.percentTotalChange, 1)}
								</p>
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Trend Quality -->
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="flex items-center gap-2 text-base">
							<Target class="h-4 w-4" />
							Trend Quality Metrics
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
							<div>
								<p class="text-xs text-muted-foreground">Trend Strength (R²)</p>
								<p class="text-lg font-semibold tabular-nums">
									{formatPercentRaw(trendAnalysis.rSquared * 100, 1)}
								</p>
								<p class="text-xs {getTrendStrength(trendAnalysis.rSquared).color}">{getTrendStrength(trendAnalysis.rSquared).label}</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Volatility (CV)</p>
								<p class="text-lg font-semibold tabular-nums">
									{formatPercentRaw(trendAnalysis.volatility, 1)}
								</p>
								<p class="text-xs text-muted-foreground">
									{trendAnalysis.volatility < 20 ? 'Low' : trendAnalysis.volatility < 40 ? 'Moderate' : 'High'}
								</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Momentum</p>
								<p class="text-lg font-semibold tabular-nums" class:text-destructive={trendAnalysis.momentum > 0} class:text-green-600={trendAnalysis.momentum < 0}>
									{trendAnalysis.momentum > 0 ? '+' : ''}{currencyFormatter.format(trendAnalysis.momentum)}
								</p>
								<p class="text-xs text-muted-foreground">Recent vs Earlier</p>
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Projections -->
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="flex items-center gap-2 text-base">
							<Calendar class="h-4 w-4" />
							Projected Values
						</Card.Title>
						<Card.Description>If current trend continues</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="grid grid-cols-3 gap-4">
							{#each trendAnalysis.projections as projection}
								<div class="rounded-lg border p-3 text-center">
									<p class="text-xs text-muted-foreground">
										+{projection.months} month{projection.months !== 1 ? 's' : ''}
									</p>
									<p class="text-lg font-semibold tabular-nums">
										{currencyFormatter.format(Math.max(0, projection.value))}
									</p>
									<p class="text-xs tabular-nums" class:text-destructive={projection.change > 0} class:text-green-600={projection.change < 0}>
										{projection.change > 0 ? '+' : ''}{currencyFormatter.format(projection.change)}
									</p>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Largest Changes -->
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-base">Largest Period Changes</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-3">
							{#if trendAnalysis.largestIncrease && trendAnalysis.largestIncrease.change > 0}
								<div class="flex items-center justify-between rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
									<div>
										<p class="text-sm font-medium">Largest Increase</p>
										<p class="text-xs text-muted-foreground">
											{trendAnalysis.largestIncrease.from} → {trendAnalysis.largestIncrease.to}
										</p>
									</div>
									<div class="text-right">
										<p class="font-semibold tabular-nums text-destructive">
											+{currencyFormatter.format(trendAnalysis.largestIncrease.change)}
										</p>
										<p class="text-xs text-destructive">
											+{formatPercentRaw(trendAnalysis.largestIncrease.percentChange, 1)}
										</p>
									</div>
								</div>
							{/if}

							{#if trendAnalysis.largestDecrease && trendAnalysis.largestDecrease.change < 0}
								<div class="flex items-center justify-between rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
									<div>
										<p class="text-sm font-medium">Largest Decrease</p>
										<p class="text-xs text-muted-foreground">
											{trendAnalysis.largestDecrease.from} → {trendAnalysis.largestDecrease.to}
										</p>
									</div>
									<div class="text-right">
										<p class="font-semibold tabular-nums text-green-600">
											{currencyFormatter.format(trendAnalysis.largestDecrease.change)}
										</p>
										<p class="text-xs text-green-600">
											{formatPercentRaw(trendAnalysis.largestDecrease.percentChange, 1)}
										</p>
									</div>
								</div>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Deviations from Trend -->
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-base">Largest Deviations from Trend</Card.Title>
						<Card.Description>Periods that differed most from the expected trend line</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="space-y-2">
							{#each trendAnalysis.largestDeviations as point}
								<div class="flex items-center justify-between rounded-md border p-2">
									<div>
										<span class="font-medium">{point.label}</span>
										<span class="ml-2 text-sm text-muted-foreground">
											Actual: {currencyFormatter.format(point.value)}
										</span>
									</div>
									<div class="text-right">
										<Badge variant={point.residual > 0 ? 'destructive' : 'secondary'} class={point.residual < 0 ? 'bg-green-600' : ''}>
											{point.residual > 0 ? '+' : ''}{currencyFormatter.format(point.residual)}
										</Badge>
										<p class="text-xs text-muted-foreground">
											Expected: {currencyFormatter.format(point.predicted)}
										</p>
									</div>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Period-by-Period Changes -->
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-base">Period-by-Period Changes</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="max-h-48 space-y-1 overflow-y-auto">
							{#each trendAnalysis.periodChanges as change}
								<div class="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-muted/50">
									<span class="text-muted-foreground">{change.to}</span>
									<span class="tabular-nums" class:text-destructive={change.change > 0} class:text-green-600={change.change < 0}>
										{change.change > 0 ? '+' : ''}{currencyFormatter.format(change.change)}
										<span class="ml-1 text-xs">
											({change.percentChange > 0 ? '+' : ''}{formatPercentRaw(change.percentChange, 1)})
										</span>
									</span>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		{:else}
			<div class="py-8 text-center text-muted-foreground">
				<p>Select at least 2 data points to analyze trends.</p>
			</div>
		{/if}
	{/snippet}

	{#snippet footer()}
		<Button variant="outline" onclick={handleClose}>Close</Button>
	{/snippet}
</ResponsiveSheet>
