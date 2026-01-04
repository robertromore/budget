<script lang="ts">
	import { Bar, AxisX, AxisY } from '$lib/components/layercake';
	import { currencyFormatter } from '$lib/utils/formatters';
	import type { TransactionsFormat } from '$lib/types';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { LayerCake, Svg, Html } from 'layercake';
	import { scaleBand, scaleLinear } from 'd3-scale';
	import { AnalyticsChartShell } from '$lib/components/charts';
	import type { ComprehensiveStats } from '$lib/utils/comprehensive-statistics';

	interface Props {
		transactions: TransactionsFormat[];
	}

	let { transactions }: Props = $props();

	// Track hovered bar for tooltip
	let hoveredItem = $state<typeof weekdayData[0] | null>(null);

	const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	const weekdaysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	// Access effective time period for this chart
	const effectivePeriod = $derived(timePeriodFilter.getEffectivePeriod('weekday-patterns'));

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

	// Aggregate spending by day of week
	const weekdayData = $derived.by(() => {
		const totals = new Map<number, { total: number; count: number; transactions: number }>();

		// Initialize all days
		for (let i = 0; i < 7; i++) {
			totals.set(i, { total: 0, count: 0, transactions: 0 });
		}

		for (const tx of periodFilteredTransactions) {
			if (tx.amount >= 0) continue; // Only expenses

			const date = tx.date instanceof Date ? tx.date : new Date(tx.date?.toString() || '');
			if (isNaN(date.getTime())) continue;

			const dayOfWeek = date.getDay();
			const current = totals.get(dayOfWeek)!;
			current.total += Math.abs(tx.amount);
			current.transactions += 1;
		}

		// Calculate number of each weekday in the data range
		const dates = periodFilteredTransactions
			.map((tx) => (tx.date instanceof Date ? tx.date : new Date(tx.date?.toString() || '')))
			.filter((d) => !isNaN(d.getTime()))
			.sort((a, b) => a.getTime() - b.getTime());

		if (dates.length > 1) {
			const start = dates[0];
			const end = dates[dates.length - 1];
			const current = new Date(start);
			while (current <= end) {
				const dayOfWeek = current.getDay();
				totals.get(dayOfWeek)!.count += 1;
				current.setDate(current.getDate() + 1);
			}
		}

		return weekdaysShort.map((day, i) => ({
			day,
			dayFull: weekdays[i],
			total: totals.get(i)!.total,
			average: totals.get(i)!.count > 0 ? totals.get(i)!.total / totals.get(i)!.count : 0,
			transactions: totals.get(i)!.transactions,
			count: totals.get(i)!.count,
			isWeekend: i === 0 || i === 6,
			index: i
		}));
	});

	// Find patterns
	const patterns = $derived.by(() => {
		const sorted = [...weekdayData].sort((a, b) => b.average - a.average);
		const highest = sorted[0];
		const lowest = sorted[sorted.length - 1];

		const weekendAvg = (weekdayData[0].average + weekdayData[6].average) / 2;
		const weekdayAvg = weekdayData.slice(1, 6).reduce((sum, d) => sum + d.average, 0) / 5;

		return {
			highest,
			lowest,
			weekendAvg,
			weekdayAvg,
			weekendVsWeekday: weekdayAvg > 0 ? ((weekendAvg - weekdayAvg) / weekdayAvg) * 100 : 0
		};
	});

	// Summary statistics
	const summaryStats = $derived.by(() => {
		return [
			{
				label: 'Highest Day',
				value: patterns.highest.dayFull,
				description: `${currencyFormatter.format(patterns.highest.average)}/day avg`
			},
			{
				label: 'Lowest Day',
				value: patterns.lowest.dayFull,
				description: `${currencyFormatter.format(patterns.lowest.average)}/day avg`
			},
			{
				label: 'Weekend vs Weekday',
				value: patterns.weekendVsWeekday > 0 ? `+${patterns.weekendVsWeekday.toFixed(0)}%` : `${patterns.weekendVsWeekday.toFixed(0)}%`,
				description: patterns.weekendVsWeekday > 0 ? 'More on weekends' : 'More on weekdays'
			},
			{
				label: 'Total Transactions',
				value: weekdayData.reduce((sum, d) => sum + d.transactions, 0).toString()
			}
		];
	});

	// Comprehensive statistics for the Statistics tab
	const comprehensiveStats = $derived.by((): ComprehensiveStats | null => {
		if (!weekdayData.some((d) => d.total > 0)) return null;

		const averages = weekdayData.map((d) => d.average);
		const totals = weekdayData.map((d) => d.total);
		const sortedAverages = [...averages].sort((a, b) => a - b);

		const mean = averages.reduce((s, a) => s + a, 0) / averages.length;
		const total = totals.reduce((s, t) => s + t, 0);
		const median = sortedAverages[Math.floor(sortedAverages.length / 2)];

		// Standard deviation
		const variance = averages.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / averages.length;
		const stdDev = Math.sqrt(variance);

		// Percentiles (for 7 values)
		const p25 = sortedAverages[1] || 0;
		const p50 = median;
		const p75 = sortedAverages[5] || 0;

		return {
			summary: {
				average: mean,
				median: median,
				total: total,
				count: weekdayData.reduce((sum, d) => sum + d.transactions, 0)
			},
			trend: {
				direction: 'flat',
				growthRate: null,
				slope: 0,
				monthlyChange: 0
			},
			distribution: {
				highest: { value: patterns.highest.average, month: patterns.highest.dayFull, monthLabel: patterns.highest.dayFull },
				lowest: { value: patterns.lowest.average, month: patterns.lowest.dayFull, monthLabel: patterns.lowest.dayFull },
				range: patterns.highest.average - patterns.lowest.average,
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
				vsLastYearPercent: patterns.weekendVsWeekday
			}
		};
	});

	const hasData = $derived(weekdayData.some((d) => d.total > 0));

	// Handle drill-down to view transactions for a specific day of week
	function handleDrillDown(point: typeof weekdayData[0]) {
		chartInteractions.openDrillDown({
			type: 'weekday',
			value: point.index, // 0-6 for Sun-Sat
			label: `${point.dayFull} Transactions`
		});
	}

	// Y domain
	const yMax = $derived.by(() => {
		if (!hasData) return 100;
		return Math.max(...weekdayData.map((d) => d.average)) * 1.1;
	});
</script>

<AnalyticsChartShell
	data={weekdayData}
	{comprehensiveStats}
	supportedChartTypes={['bar']}
	defaultChartType="bar"
	emptyMessage="No spending data available"
	chartId="weekday-patterns"
	allowedPeriodGroups={['months', 'year', 'other']}
>
	{#snippet title()}
		Spending by Day of Week
	{/snippet}

	{#snippet subtitle()}
		Average daily spending for each day of the week
	{/snippet}

	{#snippet chart({ data }: { data: typeof weekdayData })}
		<div class="h-full w-full pb-20">
			<LayerCake
				{data}
				x="day"
				y="average"
				xScale={scaleBand().padding(0.3)}
				yScale={scaleLinear()}
				yDomain={[0, yMax]}
				padding={{ top: 20, right: 20, bottom: 40, left: 60 }}
			>
				<Svg>
					<AxisY ticks={5} gridlines={true} format={(d) => currencyFormatter.format(d)} />
					<AxisX />
					<Bar
						fill={(d) => (d.isWeekend ? 'var(--chart-2)' : 'var(--chart-1)')}
						opacity={0.85}
						hoverOpacity={1}
						radius={4}
						onhover={(d) => (hoveredItem = d)}
						onclick={(d) => handleDrillDown(d)}
					/>
				</Svg>
				<Html pointerEvents={false}>
					{#if hoveredItem}
						<div class="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
							<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
								<p class="font-medium">{hoveredItem.dayFull}</p>
								<p class="text-primary">
									Avg: {currencyFormatter.format(hoveredItem.average)}/day
								</p>
								<p class="text-muted-foreground">
									Total: {currencyFormatter.format(hoveredItem.total)}
								</p>
								<p class="text-muted-foreground text-xs">
									{hoveredItem.transactions} transactions over {hoveredItem.count} {hoveredItem.dayFull}s
								</p>
							</div>
						</div>
					{/if}
				</Html>
			</LayerCake>

			<!-- Legend -->
			<div class="mt-4 flex justify-center gap-6">
			<div class="flex items-center gap-2">
				<div class="h-3 w-3 rounded-sm" style="background-color: var(--chart-1)"></div>
				<span class="text-sm">Weekdays</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="h-3 w-3 rounded-sm" style="background-color: var(--chart-2)"></div>
				<span class="text-sm">Weekends</span>
			</div>
			</div>
		</div>
	{/snippet}
</AnalyticsChartShell>
