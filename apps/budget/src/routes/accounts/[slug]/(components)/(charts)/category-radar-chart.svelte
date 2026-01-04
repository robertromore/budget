<script lang="ts">
	import { Radar } from '$lib/components/layercake';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import type { TransactionsFormat } from '$lib/types';
	import type { ComprehensiveStats } from '$lib/utils/comprehensive-statistics';
	import { currencyFormatter } from '$lib/utils/formatters';
	import { Html, LayerCake, Svg } from 'layercake';
	import { AnalyticsChartShell } from '$lib/components/charts';

	// Track hovered point for tooltip
	let hoveredPoint = $state<{ key: string; value: number; x: number; y: number } | null>(null);

	interface Props {
		transactions: TransactionsFormat[];
		maxCategories?: number;
	}

	let { transactions, maxCategories = 8 }: Props = $props();

	// Access effective time period for this chart
	const effectivePeriod = $derived(timePeriodFilter.getEffectivePeriod('category-radar'));

	// Filter transactions based on time period
	const periodFilteredTransactions = $derived.by(() => {
		const period = effectivePeriod;

		if (period.preset !== 'all-time') {
			const range = timePeriodFilter.getDateRange(period);
			if (range) {
				return transactions.filter((tx) => {
					const date = tx.date instanceof Date ? tx.date : new Date(tx.date?.toString() || '');
					return !isNaN(date.getTime()) && date >= range.start && date <= range.end;
				});
			}
		}

		return transactions;
	});

	// Aggregate spending by category
	const categoryData = $derived.by(() => {
		const categoryTotals = new Map<string, number>();

		for (const tx of periodFilteredTransactions) {
			if (tx.amount >= 0) continue; // Only expenses

			const categoryName = tx.category?.name || 'Uncategorized';
			const current = categoryTotals.get(categoryName) || 0;
			categoryTotals.set(categoryName, current + Math.abs(tx.amount));
		}

		// Sort by total and take top N
		const sorted = Array.from(categoryTotals.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, maxCategories);

		return sorted;
	});

	// Keys for radar axes (category names)
	const radarKeys = $derived(categoryData.map(([name]) => name));

	// Data point for radar (single data point with all categories)
	const radarData = $derived.by(() => {
		if (categoryData.length === 0) return [];

		const dataPoint: Record<string, number> = {};
		for (const [name, value] of categoryData) {
			dataPoint[name] = value;
		}
		return [dataPoint];
	});

	// Comprehensive statistics for the Statistics tab
	const comprehensiveStats = $derived.by((): ComprehensiveStats | null => {
		if (categoryData.length === 0) return null;

		const values = categoryData.map(([, val]) => val);
		const sortedValues = [...values].sort((a, b) => a - b);
		const n = values.length;

		const total = values.reduce((s, v) => s + v, 0);
		const mean = total / n;
		const median = sortedValues[Math.floor(n / 2)] || 0;

		// Standard deviation
		const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
		const stdDev = Math.sqrt(variance);

		// Percentiles
		const p25 = sortedValues[Math.floor(n * 0.25)] || 0;
		const p50 = median;
		const p75 = sortedValues[Math.floor(n * 0.75)] || 0;

		const [topName, topValue] = categoryData[0];
		const [lowName, lowValue] = categoryData[categoryData.length - 1];

		// Concentration metric (top category % of total)
		const concentration = total > 0 ? (topValue / total) * 100 : 0;

		return {
			summary: {
				average: mean,
				median: median,
				total: total,
				count: n
			},
			trend: {
				direction: 'flat',
				growthRate: concentration, // Use for concentration metric
				slope: 0,
				monthlyChange: 0
			},
			distribution: {
				highest: { value: topValue, month: topName, monthLabel: topName },
				lowest: { value: lowValue, month: lowName, monthLabel: lowName },
				range: topValue - lowValue,
				p25,
				p50,
				p75,
				iqr: p75 - p25,
				stdDev,
				coefficientOfVariation: mean !== 0 ? (stdDev / mean) * 100 : 0
			},
			outliers: { count: 0, months: [] },
			comparison: {
				vsHistoricalAvg: null,
				vsHistoricalAvgPercent: null,
				vsBudgetTarget: null,
				vsBudgetTargetPercent: null,
				vsLastYearTotal: null,
				vsLastYearPercent: null
			}
		};
	});

	const hasData = $derived(categoryData.length >= 3); // Need at least 3 points for a meaningful radar

	// Track container dimensions
	let containerWidth = $state(0);
	let containerHeight = $state(0);
	const containerReady = $derived(containerWidth > 0 && containerHeight > 0);
</script>

<AnalyticsChartShell
	data={categoryData}
	{comprehensiveStats}
	supportedChartTypes={['bar']}
	defaultChartType="bar"
	emptyMessage={categoryData.length < 3 ? 'Need at least 3 categories for radar chart' : 'No spending data available'}
	chartId="category-radar"
	allowedPeriodGroups={['months', 'year', 'other']}
>
	{#snippet title()}
		Category Overview
	{/snippet}

	{#snippet subtitle()}
		Spending distribution across categories
	{/snippet}

	{#snippet chart({ data }: { data: typeof categoryData })}
		{#if hasData}
			<div
				class="h-[450px] w-full pb-20"
				bind:clientWidth={containerWidth}
				bind:clientHeight={containerHeight}
			>
				{#if containerReady}
					<LayerCake data={radarData} padding={{ top: 40, right: 40, bottom: 40, left: 40 }}>
						<Svg>
							<Radar
								keys={radarKeys}
								fill="var(--chart-1)"
								stroke="var(--chart-1)"
								strokeWidth={2}
								fillOpacity={0.2}
								showGrid={true}
								showLabels={true}
								levels={5}
								gridColor="var(--muted-foreground)"
								labelColor="var(--foreground)"
								onhover={(point) => (hoveredPoint = point)}
							/>
						</Svg>
						<Html pointerEvents={false}>
							{#if hoveredPoint}
								<div
									class="pointer-events-none absolute z-10"
									style="left: {hoveredPoint.x}px; top: {hoveredPoint.y - 50}px; transform: translateX(-50%);"
								>
									<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
										<p class="font-medium">{hoveredPoint.key}</p>
										<p class="text-muted-foreground">{currencyFormatter.format(hoveredPoint.value)}</p>
									</div>
								</div>
							{/if}
						</Html>
					</LayerCake>
				{/if}
			</div>

			<!-- Category breakdown list -->
			<div class="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
				{#each categoryData as [name, value]}
					<div class="rounded-lg border p-2">
						<p class="truncate text-xs font-medium" title={name}>{name}</p>
						<p class="text-primary text-sm font-semibold">{currencyFormatter.format(value)}</p>
					</div>
				{/each}
			</div>
		{/if}
	{/snippet}
</AnalyticsChartShell>
