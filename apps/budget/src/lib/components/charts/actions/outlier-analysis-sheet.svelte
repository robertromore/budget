<script lang="ts">
	import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import { chartSelection, type SelectedDataPoint } from '$lib/states/ui/chart-selection.svelte';
	import { currencyFormatter } from '$lib/utils/formatters';

	// Icons
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}

	let { open = $bindable(false), onOpenChange }: Props = $props();

	const sortedPoints = $derived(chartSelection.sortedByDate);
	const mean = $derived(chartSelection.averageValue);
	const stdDev = $derived(chartSelection.standardDeviation);
	const median = $derived(chartSelection.medianValue);

	// Comprehensive outlier analysis
	const outlierAnalysis = $derived.by(() => {
		if (sortedPoints.length < 3) return null;

		// Calculate z-scores and categorize each point
		const pointsWithStats = sortedPoints.map((p) => {
			const zScore = stdDev !== 0 ? (p.value - mean) / stdDev : 0;
			const deviation = p.value - mean;
			const percentFromMean = mean !== 0 ? (deviation / mean) * 100 : 0;
			const percentFromMedian = median !== 0 ? ((p.value - median) / median) * 100 : 0;

			let category: 'extreme' | 'significant' | 'moderate' | 'normal';
			if (Math.abs(zScore) > 3) category = 'extreme';
			else if (Math.abs(zScore) > 2) category = 'significant';
			else if (Math.abs(zScore) > 1) category = 'moderate';
			else category = 'normal';

			return {
				...p,
				zScore,
				deviation,
				percentFromMean,
				percentFromMedian,
				category,
				isAbove: p.value > mean
			};
		});

		// Group by category
		const extreme = pointsWithStats.filter((p) => p.category === 'extreme');
		const significant = pointsWithStats.filter((p) => p.category === 'significant');
		const moderate = pointsWithStats.filter((p) => p.category === 'moderate');
		const normal = pointsWithStats.filter((p) => p.category === 'normal');

		// Calculate IQR-based outliers (alternative method)
		const sorted = [...sortedPoints].sort((a, b) => a.value - b.value);
		const q1Index = Math.floor(sorted.length * 0.25);
		const q3Index = Math.floor(sorted.length * 0.75);
		const q1 = sorted[q1Index]?.value ?? 0;
		const q3 = sorted[q3Index]?.value ?? 0;
		const iqr = q3 - q1;
		const lowerFence = q1 - 1.5 * iqr;
		const upperFence = q3 + 1.5 * iqr;

		const iqrOutliers = sortedPoints.filter(
			(p) => p.value < lowerFence || p.value > upperFence
		);

		// Distribution analysis
		const aboveMean = pointsWithStats.filter((p) => p.value > mean).length;
		const belowMean = pointsWithStats.filter((p) => p.value < mean).length;
		const skewness = aboveMean > belowMean ? 'right' : aboveMean < belowMean ? 'left' : 'symmetric';

		// Find consecutive outliers (potential trends, not random)
		const consecutivePatterns: { start: number; end: number; type: 'high' | 'low' }[] = [];
		let currentRun: { start: number; type: 'high' | 'low' } | null = null;

		for (let i = 0; i < pointsWithStats.length; i++) {
			const p = pointsWithStats[i];
			const isOutlier = Math.abs(p.zScore) > 1.5;
			const type = p.isAbove ? 'high' : 'low';

			if (isOutlier) {
				if (!currentRun || currentRun.type !== type) {
					if (currentRun && i - currentRun.start >= 2) {
						consecutivePatterns.push({ start: currentRun.start, end: i - 1, type: currentRun.type });
					}
					currentRun = { start: i, type };
				}
			} else {
				if (currentRun && i - currentRun.start >= 2) {
					consecutivePatterns.push({ start: currentRun.start, end: i - 1, type: currentRun.type });
				}
				currentRun = null;
			}
		}

		if (currentRun && sortedPoints.length - currentRun.start >= 2) {
			consecutivePatterns.push({
				start: currentRun.start,
				end: sortedPoints.length - 1,
				type: currentRun.type
			});
		}

		return {
			pointsWithStats,
			extreme,
			significant,
			moderate,
			normal,
			iqrOutliers,
			q1,
			q3,
			iqr,
			lowerFence,
			upperFence,
			aboveMean,
			belowMean,
			skewness,
			consecutivePatterns,
			totalOutliers: extreme.length + significant.length,
			outlierPercentage: ((extreme.length + significant.length) / sortedPoints.length) * 100
		};
	});

	function getCategoryColor(category: string): string {
		switch (category) {
			case 'extreme':
				return 'text-red-600';
			case 'significant':
				return 'text-orange-600';
			case 'moderate':
				return 'text-yellow-600';
			default:
				return 'text-green-600';
		}
	}

	function getCategoryBadge(category: string): 'destructive' | 'secondary' | 'outline' {
		switch (category) {
			case 'extreme':
				return 'destructive';
			case 'significant':
				return 'secondary';
			default:
				return 'outline';
		}
	}

	function handleClose() {
		open = false;
		onOpenChange?.(false);
	}
</script>

<ResponsiveSheet bind:open {onOpenChange} defaultWidth={800}>
	{#snippet header()}
		<Sheet.Title class="flex items-center gap-2">
			<AlertCircle class="h-5 w-5" />
			Outlier Analysis
		</Sheet.Title>
		<Sheet.Description>
			Identify unusual values in {chartSelection.count} selected periods
		</Sheet.Description>
	{/snippet}

	{#snippet content()}
		{#if outlierAnalysis}
			<div class="space-y-6">
				<!-- Summary Overview -->
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-base">Detection Summary</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
							<div>
								<p class="text-xs text-muted-foreground">Total Outliers</p>
								<p class="text-2xl font-bold tabular-nums">
									{outlierAnalysis.totalOutliers}
								</p>
								<p class="text-xs text-muted-foreground">
									of {chartSelection.count} periods
								</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Outlier Rate</p>
								<p class="text-2xl font-bold tabular-nums">
									{outlierAnalysis.outlierPercentage.toFixed(0)}%
								</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Mean</p>
								<p class="text-lg font-semibold tabular-nums">
									{currencyFormatter.format(mean)}
								</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Std Dev (σ)</p>
								<p class="text-lg font-semibold tabular-nums">
									{currencyFormatter.format(stdDev)}
								</p>
							</div>
						</div>

						<!-- Distribution bar -->
						<div class="mt-4 space-y-2">
							<div class="flex items-center justify-between text-xs">
								<span>Distribution</span>
								<span class="text-muted-foreground">
									{outlierAnalysis.aboveMean} above / {outlierAnalysis.belowMean} below mean
								</span>
							</div>
							<div class="flex h-2 overflow-hidden rounded-full">
								<div
									class="bg-destructive/70"
									style="width: {(outlierAnalysis.aboveMean / chartSelection.count) * 100}%"
								></div>
								<div
									class="bg-green-600/70"
									style="width: {(outlierAnalysis.belowMean / chartSelection.count) * 100}%"
								></div>
							</div>
							<p class="text-xs text-muted-foreground">
								Distribution is {outlierAnalysis.skewness === 'symmetric'
									? 'roughly symmetric'
									: `skewed ${outlierAnalysis.skewness}`}
							</p>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Category Breakdown -->
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="flex items-center gap-2 text-base">
							<BarChart3 class="h-4 w-4" />
							Outlier Categories
						</Card.Title>
						<Card.Description>Based on standard deviations from mean</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="space-y-3">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<div class="h-3 w-3 rounded-full bg-red-600"></div>
									<span class="text-sm">Extreme (>3σ)</span>
								</div>
								<div class="flex items-center gap-2">
									<Progress value={(outlierAnalysis.extreme.length / chartSelection.count) * 100} class="w-24 h-2" />
									<span class="w-8 text-right text-sm font-medium tabular-nums">{outlierAnalysis.extreme.length}</span>
								</div>
							</div>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<div class="h-3 w-3 rounded-full bg-orange-600"></div>
									<span class="text-sm">Significant (2-3σ)</span>
								</div>
								<div class="flex items-center gap-2">
									<Progress value={(outlierAnalysis.significant.length / chartSelection.count) * 100} class="w-24 h-2" />
									<span class="w-8 text-right text-sm font-medium tabular-nums">{outlierAnalysis.significant.length}</span>
								</div>
							</div>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<div class="h-3 w-3 rounded-full bg-yellow-600"></div>
									<span class="text-sm">Moderate (1-2σ)</span>
								</div>
								<div class="flex items-center gap-2">
									<Progress value={(outlierAnalysis.moderate.length / chartSelection.count) * 100} class="w-24 h-2" />
									<span class="w-8 text-right text-sm font-medium tabular-nums">{outlierAnalysis.moderate.length}</span>
								</div>
							</div>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<div class="h-3 w-3 rounded-full bg-green-600"></div>
									<span class="text-sm">Normal (&lt;1σ)</span>
								</div>
								<div class="flex items-center gap-2">
									<Progress value={(outlierAnalysis.normal.length / chartSelection.count) * 100} class="w-24 h-2" />
									<span class="w-8 text-right text-sm font-medium tabular-nums">{outlierAnalysis.normal.length}</span>
								</div>
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Extreme and Significant Outliers -->
				{#if outlierAnalysis.extreme.length > 0 || outlierAnalysis.significant.length > 0}
					<Card.Root>
						<Card.Header class="pb-2">
							<Card.Title class="flex items-center gap-2 text-base">
								<AlertTriangle class="h-4 w-4 text-destructive" />
								Detected Outliers
							</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="space-y-2">
								{#each [...outlierAnalysis.extreme, ...outlierAnalysis.significant].sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore)) as point}
									<div class="flex items-center justify-between rounded-md border p-3">
										<div class="space-y-1">
											<div class="flex items-center gap-2">
												{#if point.isAbove}
													<TrendingUp class="h-4 w-4 text-destructive" />
												{:else}
													<TrendingDown class="h-4 w-4 text-green-600" />
												{/if}
												<span class="font-medium">{point.label}</span>
												<Badge variant={getCategoryBadge(point.category)}>
													{point.category}
												</Badge>
											</div>
											<p class="text-sm text-muted-foreground">
												{currencyFormatter.format(point.value)}
												<span class={point.isAbove ? 'text-destructive' : 'text-green-600'}>
													({point.percentFromMean > 0 ? '+' : ''}{point.percentFromMean.toFixed(0)}% from mean)
												</span>
											</p>
										</div>
										<div class="text-right">
											<p class="text-lg font-bold tabular-nums {getCategoryColor(point.category)}">
												{point.zScore > 0 ? '+' : ''}{point.zScore.toFixed(2)}σ
											</p>
											<p class="text-xs text-muted-foreground">
												{point.deviation > 0 ? '+' : ''}{currencyFormatter.format(point.deviation)}
											</p>
										</div>
									</div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				{:else}
					<Card.Root>
						<Card.Content class="py-6">
							<div class="flex items-center justify-center gap-2 text-green-600">
								<CheckCircle class="h-5 w-5" />
								<span class="font-medium">No significant outliers detected</span>
							</div>
							<p class="mt-2 text-center text-sm text-muted-foreground">
								All values are within 2 standard deviations of the mean
							</p>
						</Card.Content>
					</Card.Root>
				{/if}

				<!-- IQR Method Comparison -->
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-base">IQR Method Analysis</Card.Title>
						<Card.Description>Alternative outlier detection using interquartile range</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
							<div>
								<p class="text-xs text-muted-foreground">Q1 (25th)</p>
								<p class="font-semibold tabular-nums">{currencyFormatter.format(outlierAnalysis.q1)}</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Q3 (75th)</p>
								<p class="font-semibold tabular-nums">{currencyFormatter.format(outlierAnalysis.q3)}</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">IQR</p>
								<p class="font-semibold tabular-nums">{currencyFormatter.format(outlierAnalysis.iqr)}</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">IQR Outliers</p>
								<p class="font-semibold tabular-nums">{outlierAnalysis.iqrOutliers.length}</p>
							</div>
						</div>
						<div class="mt-4 rounded-md bg-muted/50 p-3 text-sm">
							<p class="text-muted-foreground">
								Normal range: {currencyFormatter.format(outlierAnalysis.lowerFence)} to {currencyFormatter.format(outlierAnalysis.upperFence)}
							</p>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Consecutive Patterns -->
				{#if outlierAnalysis.consecutivePatterns.length > 0}
					<Card.Root>
						<Card.Header class="pb-2">
							<Card.Title class="text-base">Consecutive Patterns</Card.Title>
							<Card.Description>
								Runs of consecutive high or low values may indicate trends rather than random outliers
							</Card.Description>
						</Card.Header>
						<Card.Content>
							<div class="space-y-2">
								{#each outlierAnalysis.consecutivePatterns as pattern}
									{@const points = sortedPoints.slice(pattern.start, pattern.end + 1)}
									<div class="rounded-md border p-3">
										<div class="flex items-center gap-2">
											{#if pattern.type === 'high'}
												<TrendingUp class="h-4 w-4 text-destructive" />
												<span class="text-sm font-medium">Consecutive high values</span>
											{:else}
												<TrendingDown class="h-4 w-4 text-green-600" />
												<span class="text-sm font-medium">Consecutive low values</span>
											{/if}
										</div>
										<p class="mt-1 text-sm text-muted-foreground">
											{points[0]?.label} through {points[points.length - 1]?.label} ({points.length} periods)
										</p>
									</div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				{/if}

				<!-- All Points Table -->
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-base">All Points by Deviation</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="max-h-64 space-y-1 overflow-y-auto">
							{#each outlierAnalysis.pointsWithStats.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore)) as point}
								<div class="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted/50">
									<div class="flex items-center gap-2">
										<div
											class="h-2 w-2 rounded-full"
											class:bg-red-600={point.category === 'extreme'}
											class:bg-orange-600={point.category === 'significant'}
											class:bg-yellow-600={point.category === 'moderate'}
											class:bg-green-600={point.category === 'normal'}
										></div>
										<span>{point.label}</span>
									</div>
									<div class="flex items-center gap-4">
										<span class="tabular-nums text-muted-foreground">
											{currencyFormatter.format(point.value)}
										</span>
										<span class="w-16 text-right tabular-nums {getCategoryColor(point.category)}">
											{point.zScore > 0 ? '+' : ''}{point.zScore.toFixed(2)}σ
										</span>
									</div>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		{:else}
			<div class="py-8 text-center text-muted-foreground">
				<p>Select at least 3 data points to analyze outliers.</p>
			</div>
		{/if}
	{/snippet}

	{#snippet footer()}
		<Button variant="outline" onclick={handleClose}>Close</Button>
	{/snippet}
</ResponsiveSheet>
