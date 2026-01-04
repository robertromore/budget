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
	import Calendar from '@lucide/svelte/icons/calendar';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import Sun from '@lucide/svelte/icons/sun';
	import Snowflake from '@lucide/svelte/icons/snowflake';
	import Leaf from '@lucide/svelte/icons/leaf';
	import Flower2 from '@lucide/svelte/icons/flower-2';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}

	let { open = $bindable(false), onOpenChange }: Props = $props();

	const sortedPoints = $derived(chartSelection.sortedByDate);
	const mean = $derived(chartSelection.averageValue);

	const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const FULL_MONTH_NAMES = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	// Comprehensive seasonal analysis
	const seasonalAnalysis = $derived.by(() => {
		if (sortedPoints.length < 3) return null;

		// Group by month of year
		const monthGroups = new Map<number, { values: number[]; points: typeof sortedPoints }>();

		sortedPoints.forEach((p) => {
			const month = p.date.getMonth();
			if (!monthGroups.has(month)) {
				monthGroups.set(month, { values: [], points: [] });
			}
			const group = monthGroups.get(month)!;
			group.values.push(p.value);
			group.points.push(p);
		});

		// Calculate stats for each month
		const monthStats = Array.from(monthGroups.entries())
			.map(([month, data]) => {
				const avg = data.values.reduce((a, b) => a + b, 0) / data.values.length;
				const min = Math.min(...data.values);
				const max = Math.max(...data.values);
				const variance = data.values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / data.values.length;
				const stdDev = Math.sqrt(variance);
				const percentFromMean = mean !== 0 ? ((avg - mean) / mean) * 100 : 0;

				return {
					month,
					monthName: MONTH_NAMES[month],
					fullName: FULL_MONTH_NAMES[month],
					average: avg,
					min,
					max,
					range: max - min,
					stdDev,
					count: data.values.length,
					percentFromMean,
					values: data.values,
					points: data.points
				};
			})
			.sort((a, b) => a.month - b.month);

		// Find highest and lowest months
		const sortedByAvg = [...monthStats].sort((a, b) => b.average - a.average);
		const highestMonth = sortedByAvg[0];
		const lowestMonth = sortedByAvg[sortedByAvg.length - 1];

		// Calculate seasonal (quarter) patterns
		const quarters = [
			{ name: 'Q1 (Jan-Mar)', icon: Snowflake, months: [0, 1, 2], color: 'text-blue-500' },
			{ name: 'Q2 (Apr-Jun)', icon: Flower2, months: [3, 4, 5], color: 'text-green-500' },
			{ name: 'Q3 (Jul-Sep)', icon: Sun, months: [6, 7, 8], color: 'text-yellow-500' },
			{ name: 'Q4 (Oct-Dec)', icon: Leaf, months: [9, 10, 11], color: 'text-orange-500' }
		];

		const quarterStats = quarters.map((q) => {
			const monthsInQuarter = monthStats.filter((m) => q.months.includes(m.month));
			const allValues = monthsInQuarter.flatMap((m) => m.values);

			if (allValues.length === 0) {
				return { ...q, average: 0, count: 0, percentFromMean: 0 };
			}

			const avg = allValues.reduce((a, b) => a + b, 0) / allValues.length;
			const percentFromMean = mean !== 0 ? ((avg - mean) / mean) * 100 : 0;

			return {
				...q,
				average: avg,
				count: allValues.length,
				percentFromMean
			};
		});

		const sortedQuarters = [...quarterStats].sort((a, b) => b.average - a.average);
		const highestQuarter = sortedQuarters[0];
		const lowestQuarter = sortedQuarters[sortedQuarters.length - 1];

		// Calculate year-over-year for same months
		const yearOverYear = new Map<number, { years: number[]; values: number[]; change: number | null }>();
		sortedPoints.forEach((p) => {
			const month = p.date.getMonth();
			const year = p.date.getFullYear();

			if (!yearOverYear.has(month)) {
				yearOverYear.set(month, { years: [], values: [], change: null });
			}
			const yoy = yearOverYear.get(month)!;
			yoy.years.push(year);
			yoy.values.push(p.value);
		});

		// Calculate YoY changes for months with multiple years
		const yoyChanges = Array.from(yearOverYear.entries())
			.filter(([_, data]) => data.years.length >= 2)
			.map(([month, data]) => {
				const sortedByYear = data.years
					.map((y, i) => ({ year: y, value: data.values[i] }))
					.sort((a, b) => a.year - b.year);

				const firstYear = sortedByYear[0];
				const lastYear = sortedByYear[sortedByYear.length - 1];
				const change = lastYear.value - firstYear.value;
				const percentChange = firstYear.value !== 0 ? (change / firstYear.value) * 100 : 0;

				return {
					month,
					monthName: MONTH_NAMES[month],
					fullName: FULL_MONTH_NAMES[month],
					firstYear: firstYear.year,
					lastYear: lastYear.year,
					firstValue: firstYear.value,
					lastValue: lastYear.value,
					change,
					percentChange,
					yearCount: sortedByYear.length
				};
			})
			.sort((a, b) => b.percentChange - a.percentChange);

		// Calculate seasonality strength (how much variation between months)
		const monthAverages = monthStats.map((m) => m.average);
		const overallAvg = monthAverages.reduce((a, b) => a + b, 0) / monthAverages.length || 0;
		const seasonalVariance =
			monthAverages.reduce((sum, v) => sum + Math.pow(v - overallAvg, 2), 0) / monthAverages.length || 0;
		const seasonalityStrength = overallAvg !== 0 ? (Math.sqrt(seasonalVariance) / overallAvg) * 100 : 0;

		// Find the max value for scaling bars
		const maxAverage = Math.max(...monthStats.map((m) => m.average), 1);

		return {
			monthStats,
			highestMonth,
			lowestMonth,
			quarterStats,
			highestQuarter,
			lowestQuarter,
			yoyChanges,
			seasonalityStrength,
			maxAverage,
			monthsWithData: monthStats.length
		};
	});

	function getSeasonalityLabel(strength: number): { label: string; color: string } {
		if (strength >= 30) return { label: 'Strong', color: 'text-green-600' };
		if (strength >= 15) return { label: 'Moderate', color: 'text-yellow-600' };
		if (strength >= 5) return { label: 'Weak', color: 'text-orange-600' };
		return { label: 'None', color: 'text-muted-foreground' };
	}

	function handleClose() {
		open = false;
		onOpenChange?.(false);
	}
</script>

<ResponsiveSheet bind:open {onOpenChange} defaultWidth={800}>
	{#snippet header()}
		<Sheet.Title class="flex items-center gap-2">
			<Calendar class="h-5 w-5" />
			Seasonal Patterns
		</Sheet.Title>
		<Sheet.Description>
			Analyze patterns across months and seasons for {chartSelection.count} periods
		</Sheet.Description>
	{/snippet}

	{#snippet content()}
		{#if seasonalAnalysis}
			<div class="space-y-6">
				<!-- Seasonality Overview -->
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-base">Seasonality Overview</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
							<div>
								<p class="text-xs text-muted-foreground">Seasonality Strength</p>
								<p class="text-lg font-semibold tabular-nums">
									{seasonalAnalysis.seasonalityStrength.toFixed(0)}%
								</p>
								<p class="text-xs {getSeasonalityLabel(seasonalAnalysis.seasonalityStrength).color}">{getSeasonalityLabel(seasonalAnalysis.seasonalityStrength).label}</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Months with Data</p>
								<p class="text-lg font-semibold tabular-nums">
									{seasonalAnalysis.monthsWithData} of 12
								</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Highest Month</p>
								<p class="text-lg font-semibold text-destructive">
									{seasonalAnalysis.highestMonth?.fullName ?? 'N/A'}
								</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Lowest Month</p>
								<p class="text-lg font-semibold text-green-600">
									{seasonalAnalysis.lowestMonth?.fullName ?? 'N/A'}
								</p>
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Month-by-Month Breakdown -->
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="flex items-center gap-2 text-base">
							<BarChart3 class="h-4 w-4" />
							Monthly Averages
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-2">
							{#each seasonalAnalysis.monthStats as month}
								{@const barWidth = (month.average / seasonalAnalysis.maxAverage) * 100}
								{@const isHighest = month.month === seasonalAnalysis.highestMonth?.month}
								{@const isLowest = month.month === seasonalAnalysis.lowestMonth?.month}
								<div class="group">
									<div class="flex items-center justify-between text-sm">
										<div class="flex items-center gap-2">
											<span class="w-8 font-medium">{month.monthName}</span>
											{#if isHighest}
												<Badge variant="destructive" class="text-[10px] px-1 py-0">Highest</Badge>
											{:else if isLowest}
												<Badge class="bg-green-600 text-[10px] px-1 py-0">Lowest</Badge>
											{/if}
										</div>
										<div class="flex items-center gap-3">
											<span class="text-xs text-muted-foreground">
												({month.count} {month.count === 1 ? 'period' : 'periods'})
											</span>
											<span class="w-24 text-right tabular-nums font-medium">
												{currencyFormatter.format(month.average)}
											</span>
											<span class="w-16 text-right text-xs tabular-nums" class:text-destructive={month.percentFromMean > 0} class:text-green-600={month.percentFromMean < 0}>
												{month.percentFromMean > 0 ? '+' : ''}{month.percentFromMean.toFixed(0)}%
											</span>
										</div>
									</div>
									<div class="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
										<div
											class="h-full rounded-full transition-all"
											class:bg-destructive={isHighest}
											class:bg-green-600={isLowest}
											class:bg-primary={!isHighest && !isLowest}
											style="width: {barWidth}%"
										></div>
									</div>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Quarterly Patterns -->
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-base">Quarterly Patterns</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
							{#each seasonalAnalysis.quarterStats as quarter}
								{@const isHighest = quarter.name === seasonalAnalysis.highestQuarter?.name}
								{@const isLowest = quarter.name === seasonalAnalysis.lowestQuarter?.name}
								<div
									class="rounded-lg border p-3 {isHighest ? 'border-destructive bg-destructive/5' : ''} {isLowest ? 'border-green-600 bg-green-50 dark:bg-green-950' : ''}"
								>
									<div class="flex items-center gap-2">
										<quarter.icon class="h-4 w-4 {quarter.color}" />
										<span class="text-sm font-medium">{quarter.name}</span>
									</div>
									<p class="mt-2 text-lg font-semibold tabular-nums">
										{currencyFormatter.format(quarter.average)}
									</p>
									<p class="text-xs tabular-nums" class:text-destructive={quarter.percentFromMean > 0} class:text-green-600={quarter.percentFromMean < 0}>
										{quarter.percentFromMean > 0 ? '+' : ''}{quarter.percentFromMean.toFixed(0)}% vs avg
									</p>
									<p class="mt-1 text-xs text-muted-foreground">
										{quarter.count} periods
									</p>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Year-over-Year Comparison -->
				{#if seasonalAnalysis.yoyChanges.length > 0}
					<Card.Root>
						<Card.Header class="pb-2">
							<Card.Title class="text-base">Year-over-Year Changes</Card.Title>
							<Card.Description>
								Comparing same months across different years
							</Card.Description>
						</Card.Header>
						<Card.Content>
							<div class="space-y-2">
								{#each seasonalAnalysis.yoyChanges as yoy}
									<div class="flex items-center justify-between rounded-md border p-3">
										<div>
											<div class="flex items-center gap-2">
												{#if yoy.change > 0}
													<TrendingUp class="h-4 w-4 text-destructive" />
												{:else}
													<TrendingDown class="h-4 w-4 text-green-600" />
												{/if}
												<span class="font-medium">{yoy.fullName}</span>
											</div>
											<p class="mt-1 text-xs text-muted-foreground">
												{yoy.firstYear}: {currencyFormatter.format(yoy.firstValue)} → {yoy.lastYear}: {currencyFormatter.format(yoy.lastValue)}
											</p>
										</div>
										<div class="text-right">
											<p class="font-semibold tabular-nums" class:text-destructive={yoy.change > 0} class:text-green-600={yoy.change < 0}>
												{yoy.change > 0 ? '+' : ''}{currencyFormatter.format(yoy.change)}
											</p>
											<p class="text-xs tabular-nums" class:text-destructive={yoy.percentChange > 0} class:text-green-600={yoy.percentChange < 0}>
												{yoy.percentChange > 0 ? '+' : ''}{yoy.percentChange.toFixed(1)}%
											</p>
										</div>
									</div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				{/if}

				<!-- Detailed Month Stats -->
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-base">Detailed Monthly Statistics</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="overflow-x-auto">
							<table class="w-full text-sm">
								<thead>
									<tr class="border-b text-left text-muted-foreground">
										<th class="pb-2 font-medium">Month</th>
										<th class="pb-2 text-right font-medium">Avg</th>
										<th class="pb-2 text-right font-medium">Min</th>
										<th class="pb-2 text-right font-medium">Max</th>
										<th class="pb-2 text-right font-medium">Range</th>
										<th class="pb-2 text-right font-medium">Count</th>
									</tr>
								</thead>
								<tbody>
									{#each seasonalAnalysis.monthStats as month}
										<tr class="border-b last:border-0">
											<td class="py-2 font-medium">{month.fullName}</td>
											<td class="py-2 text-right tabular-nums">{currencyFormatter.format(month.average)}</td>
											<td class="py-2 text-right tabular-nums text-green-600">{currencyFormatter.format(month.min)}</td>
											<td class="py-2 text-right tabular-nums text-destructive">{currencyFormatter.format(month.max)}</td>
											<td class="py-2 text-right tabular-nums text-muted-foreground">{currencyFormatter.format(month.range)}</td>
											<td class="py-2 text-right tabular-nums">{month.count}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		{:else}
			<div class="py-8 text-center text-muted-foreground">
				<p>Select at least 3 data points to analyze seasonal patterns.</p>
			</div>
		{/if}
	{/snippet}

	{#snippet footer()}
		<Button variant="outline" onclick={handleClose}>Close</Button>
	{/snippet}
</ResponsiveSheet>
