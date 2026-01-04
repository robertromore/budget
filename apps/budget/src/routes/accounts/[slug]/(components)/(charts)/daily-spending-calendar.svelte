<script lang="ts">
	import { CalendarHeatmap } from '$lib/components/layercake';
	import { currencyFormatter } from '$lib/utils/formatters';
	import type { TransactionsFormat } from '$lib/types';
	import { LayerCake, Svg } from 'layercake';
	import { scaleLinear } from 'd3-scale';
	import { extent } from 'd3-array';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { AnalyticsChartShell } from '$lib/components/charts';
	import type { ComprehensiveStats } from '$lib/utils/comprehensive-statistics';
	import { getLocalTimeZone } from '@internationalized/date';

	interface Props {
		transactions: TransactionsFormat[];
	}

	let { transactions }: Props = $props();

	// Access effective time period for this chart
	// Access state properties directly for proper Svelte 5 reactivity
	const effectivePeriod = $derived(
		timePeriodFilter.chartOverrides.get('daily-calendar') ?? timePeriodFilter.globalPeriod
	);

	// Filter transactions based on time period
	const periodFilteredTransactions = $derived.by(() => {
		const period = effectivePeriod;

		if (period.preset !== 'all-time') {
			const range = timePeriodFilter.getDateRange(period);
			if (range) {
				return transactions.filter((tx) => {
					const date =
						tx.date instanceof Date ? tx.date : tx.date?.toDate?.(getLocalTimeZone());
					return date && !isNaN(date.getTime()) && date >= range.start && date <= range.end;
				});
			}
		}

		return transactions;
	});

	// Helper to create local date string (YYYY-MM-DD) from a Date
	const toLocalDateStr = (d: Date): string => {
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	};

	// Helper to parse YYYY-MM-DD string to local Date
	const parseLocalDate = (dateStr: string): Date => {
		const [year, month, day] = dateStr.split('-').map(Number);
		return new Date(year, month - 1, day);
	};

	// Aggregate transactions by date
	const dailySpending = $derived.by(() => {
		const spendingByDate = new Map<string, { total: number; count: number }>();

		for (const tx of periodFilteredTransactions) {
			// Only count expenses (negative amounts)
			if (tx.amount >= 0) continue;

			// Get the date - handle both Date and DateValue (from @internationalized/date)
			const txDate =
				tx.date instanceof Date ? tx.date : tx.date?.toDate?.(getLocalTimeZone());

			if (!txDate || isNaN(txDate.getTime())) continue;

			// Use local date string to avoid timezone issues
			const dateStr = toLocalDateStr(txDate);

			const current = spendingByDate.get(dateStr) || { total: 0, count: 0 };
			spendingByDate.set(dateStr, {
				total: current.total + Math.abs(tx.amount),
				count: current.count + 1
			});
		}

		// Convert to array format for LayerCake - parse back to local Date
		return Array.from(spendingByDate.entries()).map(([dateStr, { total, count }]) => ({
			date: parseLocalDate(dateStr),
			value: total,
			transactionCount: count
		}));
	});

	// Summary statistics
	const summaryStats = $derived.by(() => {
		if (dailySpending.length === 0) {
			return [
				{ label: 'Days with Spending', value: '0' },
				{ label: 'Highest Day', value: '$0.00' },
				{ label: 'Average Daily', value: '$0.00' },
				{ label: 'Total Spending', value: '$0.00' }
			];
		}

		const values = dailySpending.map((d) => d.value);
		const total = values.reduce((sum, v) => sum + v, 0);
		const average = total / values.length;
		const highest = Math.max(...values);
		const highestDay = dailySpending.find((d) => d.value === highest);

		return [
			{ label: 'Days with Spending', value: dailySpending.length.toString() },
			{
				label: 'Highest Day',
				value: currencyFormatter.format(highest),
				description: highestDay?.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
			},
			{ label: 'Average Daily', value: currencyFormatter.format(average) },
			{ label: 'Total Spending', value: currencyFormatter.format(total) }
		];
	});

	// Comprehensive statistics for the Statistics tab
	const comprehensiveStats = $derived.by((): ComprehensiveStats | null => {
		if (dailySpending.length === 0) return null;

		const values = dailySpending.map((d) => d.value);
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

		// Find highest/lowest days
		const highestDay = dailySpending.reduce((a, b) => (a.value > b.value ? a : b));
		const lowestDay = dailySpending.reduce((a, b) => (a.value < b.value ? a : b));

		const formatDayLabel = (d: Date) =>
			d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

		// Calculate day-of-week patterns
		const weekdayTotals = new Map<number, { total: number; count: number }>();
		for (const d of dailySpending) {
			const dow = d.date.getDay();
			const current = weekdayTotals.get(dow) || { total: 0, count: 0 };
			weekdayTotals.set(dow, { total: current.total + d.value, count: current.count + 1 });
		}

		// Weekend vs weekday comparison
		let weekendTotal = 0,
			weekendCount = 0,
			weekdayTotal = 0,
			weekdayCount = 0;
		for (const [dow, data] of weekdayTotals) {
			if (dow === 0 || dow === 6) {
				weekendTotal += data.total;
				weekendCount += data.count;
			} else {
				weekdayTotal += data.total;
				weekdayCount += data.count;
			}
		}

		const weekendAvg = weekendCount > 0 ? weekendTotal / weekendCount : 0;
		const weekdayAvg = weekdayCount > 0 ? weekdayTotal / weekdayCount : 0;
		const weekendVsWeekday = weekdayAvg > 0 ? ((weekendAvg - weekdayAvg) / weekdayAvg) * 100 : null;

		return {
			summary: {
				average: mean,
				median: median,
				total: total,
				count: n
			},
			trend: {
				direction: 'flat',
				growthRate: weekendVsWeekday, // Reuse for weekend comparison
				slope: 0,
				monthlyChange: 0
			},
			distribution: {
				highest: {
					value: highestDay.value,
					month: highestDay.date.toISOString().split('T')[0],
					monthLabel: formatDayLabel(highestDay.date)
				},
				lowest: {
					value: lowestDay.value,
					month: lowestDay.date.toISOString().split('T')[0],
					monthLabel: formatDayLabel(lowestDay.date)
				},
				range: highestDay.value - lowestDay.value,
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

	const hasData = $derived(dailySpending.length > 0);

	// Get the actual chart-1 color from CSS at runtime as RGB
	// SVG fills don't support HSL with alpha, so we extract RGB components
	let chartColorRGB = $state({ r: 34, g: 197, b: 194 }); // Fallback teal

	$effect(() => {
		if (typeof window !== 'undefined') {
			// Create a temporary element to compute the actual RGB color
			const temp = document.createElement('div');
			temp.style.color = 'hsl(var(--chart-1))';
			document.body.appendChild(temp);
			const computedColor = getComputedStyle(temp).color;
			document.body.removeChild(temp);

			// Parse rgb(r, g, b) or rgba(r, g, b, a) string
			const match = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
			if (match) {
				chartColorRGB = {
					r: parseInt(match[1], 10),
					g: parseInt(match[2], 10),
					b: parseInt(match[3], 10)
				};
			}
		}
	});

	// Helper to get RGBA string from RGB object with opacity
	const getRgba = (opacity: number) => {
		const { r, g, b } = chartColorRGB;
		return `rgba(${r}, ${g}, ${b}, ${opacity})`;
	};

	const colorScale = $derived.by(() => {
		if (!hasData) return () => getRgba(0.1);
		const values = dailySpending.map((d) => d.value);
		const [min, max] = extent(values) as [number, number];

		// Create opacity scale from 0.3 to 1
		const normalizer = scaleLinear().domain([min || 0, max || 1]).range([0.3, 1]);

		return (value: number) => {
			const opacity = normalizer(value);
			return getRgba(opacity);
		};
	});

	// Computed empty color with low opacity
	const emptyColor = $derived(getRgba(0.1));

	// Get color with specific opacity for legend
	const getColorWithOpacity = (opacity: number) => getRgba(opacity);

	// Legend steps for display
	const legendSteps = $derived.by(() => {
		if (!hasData) return [];
		const values = dailySpending.map((d) => d.value);
		const [min, max] = extent(values) as [number, number];

		// Create 5 evenly spaced steps from min to max, with corresponding opacity from 0.3 to 1
		const steps = 5;
		return Array.from({ length: steps }, (_, i) => {
			const t = i / (steps - 1); // 0 to 1
			return {
				opacity: 0.3 + t * 0.7, // 0.3 to 1
				value: min + (max - min) * t // min to max
			};
		});
	});

	// Handle cell click for drill-down
	const handleCellClick = (cell: { date: Date; value: number | null }) => {
		if (cell.value === null) return;

		// Create start and end of the day for the date range filter
		const startOfDay = new Date(cell.date);
		startOfDay.setHours(0, 0, 0, 0);

		const endOfDay = new Date(cell.date);
		endOfDay.setHours(23, 59, 59, 999);

		chartInteractions.openDrillDown({
			type: 'date',
			value: { start: startOfDay, end: endOfDay },
			label: `Transactions on ${cell.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`
		});
	};

	// Get the filter's date range for the calendar display
	const filterDateRange = $derived(timePeriodFilter.getDateRange(effectivePeriod));

	// Track container dimensions
	let containerWidth = $state(0);
	let containerHeight = $state(0);
	const containerReady = $derived(containerWidth > 0 && containerHeight > 0);
</script>

<AnalyticsChartShell
	data={dailySpending}
	{comprehensiveStats}
	supportedChartTypes={['bar']}
	defaultChartType="bar"
	emptyMessage="No spending data available for this period"
	chartId="daily-calendar"
	allowedPeriodGroups={['months', 'year', 'other']}
>
	{#snippet title()}
		Daily Spending Calendar
	{/snippet}

	{#snippet subtitle()}
		Visual overview of spending intensity by day
	{/snippet}

	{#snippet chart({ data }: { data: typeof dailySpending })}
		<div
			class="h-[400px] w-full"
			bind:clientWidth={containerWidth}
			bind:clientHeight={containerHeight}
		>
			{#if containerReady && data.length > 0}
				<LayerCake {data}>
					<Svg>
						<CalendarHeatmap
							dateAccessor={(d) => d.date}
							valueAccessor={(d) => d.value}
							{colorScale}
							cellGap={4}
							cellRadius={4}
							minCellSize={14}
							showMonthLabels={true}
							showDayLabels={true}
							highlightWeekends={true}
							showTodayIndicator={true}
							emptyColor={emptyColor}
							startDate={filterDateRange?.start}
							endDate={filterDateRange?.end}
							onclick={handleCellClick}
						>
							{#snippet tooltipContent({ date, value })}
								{@const dayData = data.find((d) => d.date.toISOString().split('T')[0] === date.toISOString().split('T')[0])}
								<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
									<p class="font-medium">
										{date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
									</p>
									{#if value !== null}
										<p class="text-primary text-lg font-semibold">
											{currencyFormatter.format(value)}
										</p>
										<p class="text-muted-foreground text-xs">
											{dayData?.transactionCount ?? 0} transaction{(dayData?.transactionCount ?? 0) !== 1 ? 's' : ''}
										</p>
										<p class="text-muted-foreground mt-1 border-t pt-1 text-xs">Click to view details</p>
									{:else}
										<p class="text-muted-foreground">No spending</p>
									{/if}
								</div>
							{/snippet}
						</CalendarHeatmap>
					</Svg>
				</LayerCake>
			{/if}

			<!-- Legend -->
		{#if hasData && legendSteps.length > 0}
			<div class="mt-4 flex items-center justify-center gap-2 text-xs">
				<span class="text-muted-foreground">{currencyFormatter.format(legendSteps[0]?.value ?? 0)}</span>
				<div class="flex gap-0.5">
					{#each legendSteps as step}
						<div
							class="h-3.5 w-3.5 rounded-sm"
							style:background-color={getColorWithOpacity(step.opacity)}
							title={currencyFormatter.format(step.value)}
						></div>
					{/each}
				</div>
				<span class="text-muted-foreground">{currencyFormatter.format(legendSteps[legendSteps.length - 1]?.value ?? 0)}</span>
			</div>
		{/if}
		</div>
	{/snippet}
</AnalyticsChartShell>
