<script lang="ts">
	import { StackedBar, AxisX, AxisY } from '$lib/components/layercake';
	import { currencyFormatter } from '$lib/utils/formatters';
	import type { TransactionsFormat } from '$lib/types';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { LayerCake, Svg, Html } from 'layercake';
	import { AnalyticsChartShell } from '$lib/components/charts';
	import type { ComprehensiveStats } from '$lib/utils/comprehensive-statistics';
	import { extractDateString } from '$lib/utils/date-formatters';

	interface Props {
		transactions: TransactionsFormat[];
	}

	let { transactions }: Props = $props();

	// Track hovered bar for tooltip
	let hoveredItem = $state<{ item: MonthData; key: string; segmentIndex: number; seriesIndex: number } | null>(null);

	type MonthData = {
		month: string;
		monthLabel: string;
		index: number;
		[key: string]: string | number;
	};

	// Access effective time period for this chart
	const effectivePeriod = $derived(timePeriodFilter.getEffectivePeriod('category-composition'));

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

	// Get top categories by spending
	const topCategories = $derived.by(() => {
		const categoryTotals = new Map<string, { id: number; name: string; total: number }>();

		for (const tx of periodFilteredTransactions) {
			if (tx.amount >= 0) continue; // Only expenses
			const categoryName = tx.category?.name || 'Uncategorized';
			const categoryId = tx.category?.id || 0;

			const current = categoryTotals.get(categoryName) || { id: categoryId, name: categoryName, total: 0 };
			current.total += Math.abs(tx.amount);
			categoryTotals.set(categoryName, current);
		}

		// Sort by total and take top 5
		return Array.from(categoryTotals.values())
			.sort((a, b) => b.total - a.total)
			.slice(0, 5)
			.map((c) => c.name);
	});

	// Aggregate by month and category
	const monthlyData = $derived.by(() => {
		const dataByMonth = new Map<string, Record<string, number>>();

		for (const tx of periodFilteredTransactions) {
			if (tx.amount >= 0) continue; // Only expenses

			const dateStr = extractDateString(tx.date);

			if (!dateStr) continue;

			const monthKey = dateStr.substring(0, 7); // YYYY-MM
			const categoryName = tx.category?.name || 'Uncategorized';

			if (!dataByMonth.has(monthKey)) {
				dataByMonth.set(monthKey, {});
			}

			const monthData = dataByMonth.get(monthKey)!;
			// Only track top categories, rest goes to "Other"
			const key = topCategories.includes(categoryName) ? categoryName : 'Other';
			monthData[key] = (monthData[key] || 0) + Math.abs(tx.amount);
		}

		// Convert to array and sort by date
		return Array.from(dataByMonth.entries())
			.sort((a, b) => a[0].localeCompare(b[0]))
			.slice(-6) // Last 6 months
			.map(([month, data], idx): MonthData => {
				const [year, monthNum] = month.split('-');
				const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
				return {
					month,
					monthLabel: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
					index: idx,
					...data
				};
			});
	});

	// Keys for stacking (top categories + Other)
	const stackKeys = $derived([...topCategories, 'Other'].filter((k) => monthlyData.some((d) => (d[k] as number) > 0)));

	// Color palette for categories
	const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--muted-foreground)'];

	// Summary statistics
	const summaryStats = $derived.by(() => {
		if (monthlyData.length === 0) {
			return [
				{ label: 'Months Shown', value: '0' },
				{ label: 'Categories', value: '0' },
				{ label: 'Avg Monthly', value: '$0.00' },
				{ label: 'Total', value: '$0.00' }
			];
		}

		const monthlyTotals = monthlyData.map((m) => {
			return stackKeys.reduce((sum, key) => sum + ((m[key] as number) || 0), 0);
		});
		const total = monthlyTotals.reduce((sum, v) => sum + v, 0);
		const average = total / monthlyTotals.length;

		return [
			{ label: 'Months Shown', value: monthlyData.length.toString() },
			{ label: 'Categories', value: stackKeys.length.toString() },
			{ label: 'Avg Monthly', value: currencyFormatter.format(average) },
			{ label: 'Total', value: currencyFormatter.format(total) }
		];
	});

	// Comprehensive statistics for the Statistics tab
	const comprehensiveStats = $derived.by((): ComprehensiveStats | null => {
		if (monthlyData.length === 0 || stackKeys.length === 0) return null;

		const monthlyTotals = monthlyData.map((m) => {
			return stackKeys.reduce((sum, key) => sum + ((m[key] as number) || 0), 0);
		});
		const sortedTotals = [...monthlyTotals].sort((a, b) => a - b);
		const n = monthlyTotals.length;

		const total = monthlyTotals.reduce((s, t) => s + t, 0);
		const mean = total / n;
		const median = sortedTotals[Math.floor(n / 2)] || 0;

		// Standard deviation
		const variance = monthlyTotals.reduce((s, t) => s + Math.pow(t - mean, 2), 0) / n;
		const stdDev = Math.sqrt(variance);

		// Find highest/lowest months
		const highestIdx = monthlyTotals.indexOf(Math.max(...monthlyTotals));
		const lowestIdx = monthlyTotals.indexOf(Math.min(...monthlyTotals));

		// Category breakdown totals
		const categoryTotals = stackKeys.map((key) => ({
			category: key,
			total: monthlyData.reduce((sum, m) => sum + ((m[key] as number) || 0), 0)
		})).sort((a, b) => b.total - a.total);

		const topCategory = categoryTotals[0];
		const topCategoryPercent = total > 0 ? (topCategory.total / total) * 100 : 0;

		return {
			summary: {
				average: mean,
				median: median,
				total: total,
				count: n
			},
			trend: {
				direction: 'flat',
				growthRate: topCategoryPercent,
				slope: 0,
				monthlyChange: 0
			},
			distribution: {
				highest: { value: monthlyTotals[highestIdx], month: monthlyData[highestIdx]?.monthLabel || '', monthLabel: monthlyData[highestIdx]?.monthLabel || '' },
				lowest: { value: monthlyTotals[lowestIdx], month: monthlyData[lowestIdx]?.monthLabel || '', monthLabel: monthlyData[lowestIdx]?.monthLabel || '' },
				range: Math.max(...monthlyTotals) - Math.min(...monthlyTotals),
				p25: sortedTotals[Math.floor(n * 0.25)] || 0,
				p50: median,
				p75: sortedTotals[Math.floor(n * 0.75)] || 0,
				iqr: (sortedTotals[Math.floor(n * 0.75)] || 0) - (sortedTotals[Math.floor(n * 0.25)] || 0),
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

	const hasData = $derived(monthlyData.length > 0 && stackKeys.length > 0);

	// Handle drill-down to view transactions for a category in a specific month
	function handleDrillDown(info: { item: MonthData; key: string }) {
		chartInteractions.openDrillDown({
			type: 'category-month',
			value: { category: info.key, month: info.item.month },
			label: `${info.key} - ${info.item.monthLabel}`
		});
	}

	// Track container dimensions
	let containerWidth = $state(0);
	let containerHeight = $state(0);
	const containerReady = $derived(containerWidth > 0 && containerHeight > 0);

	// Max value for y-scale
	const maxValue = $derived.by(() => {
		if (!hasData) return 100;
		return Math.max(
			...monthlyData.map((m) => stackKeys.reduce((sum, key) => sum + ((m[key] as number) || 0), 0))
		);
	});
</script>

<AnalyticsChartShell
	data={monthlyData}
	{comprehensiveStats}
	supportedChartTypes={['bar']}
	defaultChartType="bar"
	emptyMessage="No spending data available"
	chartId="category-composition"
	allowedPeriodGroups={['months', 'year', 'other']}
>
	{#snippet title()}
		Category Composition
	{/snippet}

	{#snippet subtitle()}
		Monthly spending breakdown by category
	{/snippet}

	{#snippet chart({ data }: { data: typeof monthlyData })}
		<div
			class="h-full w-full pb-20"
			bind:clientWidth={containerWidth}
			bind:clientHeight={containerHeight}
		>
			{#if containerReady}
				<LayerCake
					{data}
					x="monthLabel"
					y={(d: MonthData) => stackKeys.reduce((sum, key) => sum + ((d[key] as number) || 0), 0)}
					yDomain={[0, maxValue * 1.1]}
					padding={{ top: 10, right: 15, bottom: 30, left: 60 }}
				>
					<Svg>
						<AxisY ticks={5} gridlines={true} format={(d) => currencyFormatter.format(d)} />
						<AxisX ticks={data.length} />
						<StackedBar
							keys={stackKeys}
							{colors}
							opacity={0.85}
							hoverOpacity={1}
							radius={2}
							gap={8}
							onhover={(info) => (hoveredItem = info)}
							onclick={(info) => handleDrillDown(info)}
						/>
					</Svg>
					<Html pointerEvents={false}>
						{#if hoveredItem}
							{@const point = hoveredItem.item}
							<div class="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
								<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
									<p class="font-medium">{point.monthLabel}</p>
									{#each stackKeys as key, i}
										{@const value = (point[key] as number) || 0}
										{#if value > 0}
											<p style="color: {colors[i % colors.length]}">
												{key}: {currencyFormatter.format(value)}
											</p>
										{/if}
									{/each}
									<p class="text-muted-foreground mt-1 border-t pt-1 text-xs">
										Total: {currencyFormatter.format(stackKeys.reduce((sum, key) => sum + ((point[key] as number) || 0), 0))}
									</p>
								</div>
							</div>
						{/if}
					</Html>
				</LayerCake>
			{/if}

			<!-- Legend -->
			<div class="mt-4 flex flex-wrap justify-center gap-4">
			{#each stackKeys as key, i}
				<div class="flex items-center gap-2">
					<div class="h-3 w-3 rounded-sm" style="background-color: {colors[i % colors.length]}"></div>
					<span class="text-sm">{key}</span>
				</div>
			{/each}
		</div>
		</div>
	{/snippet}
</AnalyticsChartShell>
