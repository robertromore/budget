<script lang="ts">
	import { Area, Line, AxisX, AxisY, BiDirectionalBar, ZeroLine, HorizontalLine, CustomLine, PercentileBands, StackedBar } from '$lib/components/layercake';
	import { AnalysisDropdown } from '$lib/components/charts';
	import { Button } from '$lib/components/ui/button';
	import { currencyFormatter } from '$lib/utils/formatters';
	import type { TransactionsFormat } from '$lib/types';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { calculateLinearTrend, calculateHistoricalAverage, calculatePercentileBands, type TrendLineData, type PercentileBands as PercentileBandsData } from '$lib/utils/chart-statistics';
	import { calculateComprehensiveStats } from '$lib/utils/comprehensive-statistics';
	import { LayerCake, Svg, Html } from 'layercake';
	import { scaleLinear } from 'd3-scale';
	import { AnalyticsChartShell } from '$lib/components/charts';
	import type { ChartType } from '$lib/components/layercake';
	import { toDateString, formatShortDate } from '$lib/utils/date-formatters';

	interface Props {
		transactions: TransactionsFormat[];
	}

	let { transactions }: Props = $props();

	// Toggle states for analysis overlays
	let showLinearTrend = $state(false);
	let showForecast = $state(false);
	let showHistoricalAvg = $state(false);
	let showPercentileBands = $state(false);

	// Track hovered bar for tooltip
	let hoveredItem = $state<typeof dailyCashFlow[0] | null>(null);
	let hoveredStackedItem = $state<{ item: typeof dailyCashFlow[0]; key: string; segmentIndex: number; seriesIndex: number } | null>(null);

	// Access effective time period for this chart
	const effectivePeriod = $derived(timePeriodFilter.getEffectivePeriod('cash-flow'));

	// Helper to extract date string from various input types
	function getDateString(date: unknown): string {
		if (date instanceof Date) {
			return toDateString(date);
		}
		if (typeof date === 'string') {
			return date.split('T')[0];
		}
		if (date) {
			return String(date).split('T')[0];
		}
		return '';
	}

	// View mode
	type ViewMode = 'net' | 'cumulative' | 'stacked';
	let viewMode = $state<ViewMode>('net');

	// Stacked bar keys and colors
	const stackedKeys = ['income', 'expenses'];
	const stackedColors = ['var(--chart-2)', 'var(--destructive)'];

	// Calculate daily cash flow from ALL data
	const allDailyCashFlow = $derived.by(() => {
		const dataByDate = new Map<string, { income: number; expenses: number }>();

		for (const tx of transactions) {
			const dateStr = getDateString(tx.date);
			if (!dateStr) continue;

			if (!dataByDate.has(dateStr)) {
				dataByDate.set(dateStr, { income: 0, expenses: 0 });
			}

			const data = dataByDate.get(dateStr)!;
			if (tx.amount > 0) {
				data.income += tx.amount;
			} else {
				data.expenses += Math.abs(tx.amount);
			}
		}

		// Sort and convert to array (all data, no slicing)
		const sorted = Array.from(dataByDate.entries())
			.sort((a, b) => a[0].localeCompare(b[0]));

		let cumulative = 0;
		return sorted.map(([dateStr, data], idx) => {
			const net = data.income - data.expenses;
			cumulative += net;

			return {
				date: new Date(dateStr),
				dateStr,
				income: data.income,
				expenses: data.expenses,
				net,
				cumulative,
				index: idx,
			};
		});
	});

	// Filter data based on time period
	const dailyCashFlow = $derived.by(() => {
		const period = effectivePeriod;

		if (period.preset !== 'all-time') {
			const range = timePeriodFilter.getDateRange(period);
			if (range) {
				const filtered = allDailyCashFlow.filter((item) => {
					return item.date >= range.start && item.date <= range.end;
				});
				// Recalculate indices and cumulative after filtering
				let cumulative = 0;
				return filtered.map((item, idx) => {
					cumulative += item.net;
					return {
						...item,
						cumulative,
						index: idx,
					};
				});
			}
		}

		// Default to last 90 days for 'all-time' to keep chart readable
		const last90 = allDailyCashFlow.slice(-90);
		let cumulative = 0;
		return last90.map((item, idx) => {
			cumulative += item.net;
			return {
				...item,
				cumulative,
				index: idx,
			};
		});
	});

	// ===== Analysis Overlay Computed Data =====

	// Convert to spending format for trend calculations
	const netAsSpending = $derived(dailyCashFlow.map(d => ({
		month: d.dateStr,
		monthLabel: formatShortDate(d.date),
		spending: d.net,
		date: d.date,
		index: d.index,
	})));

	const cumulativeAsSpending = $derived(dailyCashFlow.map(d => ({
		month: d.dateStr,
		monthLabel: formatShortDate(d.date),
		spending: d.cumulative,
		date: d.date,
		index: d.index,
	})));

	// Linear regression line (for net or cumulative based on view)
	const linearTrendData = $derived.by((): TrendLineData | null => {
		if (!showLinearTrend || dailyCashFlow.length < 2) return null;
		const data = viewMode === 'cumulative' ? cumulativeAsSpending : netAsSpending;
		return calculateLinearTrend(data);
	});

	// Historical average (across ALL data)
	const historicalAverage = $derived.by((): number | null => {
		if (!showHistoricalAvg || allDailyCashFlow.length === 0) return null;
		const data = viewMode === 'cumulative'
			? allDailyCashFlow.map(d => ({ spending: d.cumulative }))
			: allDailyCashFlow.map(d => ({ spending: d.net }));
		return calculateHistoricalAverage(data);
	});

	// Percentile bands (across ALL data)
	const percentileBands = $derived.by((): PercentileBandsData | null => {
		if (!showPercentileBands || allDailyCashFlow.length < 4) return null;
		const data = viewMode === 'cumulative'
			? allDailyCashFlow.map(d => ({ ...d, spending: d.cumulative }))
			: allDailyCashFlow.map(d => ({ ...d, spending: d.net }));
		return calculatePercentileBands(data);
	});

	// Summary statistics
	const summaryStats = $derived.by(() => {
		if (dailyCashFlow.length === 0) {
			return [
				{ label: 'Total Inflow', value: '$0.00' },
				{ label: 'Total Outflow', value: '$0.00' },
				{ label: 'Net Cash Flow', value: '$0.00' },
				{ label: 'Positive Days', value: '0' }
			];
		}

		const totalIncome = dailyCashFlow.reduce((s, d) => s + d.income, 0);
		const totalExpenses = dailyCashFlow.reduce((s, d) => s + d.expenses, 0);
		const netCashFlow = totalIncome - totalExpenses;
		const positiveDays = dailyCashFlow.filter((d) => d.net > 0).length;

		return [
			{ label: 'Total Inflow', value: currencyFormatter.format(totalIncome) },
			{ label: 'Total Outflow', value: currencyFormatter.format(totalExpenses) },
			{
				label: 'Net Cash Flow',
				value: currencyFormatter.format(netCashFlow),
				description: netCashFlow >= 0 ? 'Positive flow' : 'Negative flow'
			},
			{
				label: 'Positive Days',
				value: `${positiveDays}/${dailyCashFlow.length}`,
				description: `${((positiveDays / dailyCashFlow.length) * 100).toFixed(0)}% of days`
			}
		];
	});

	// Comprehensive statistics for the Statistics tab
	const comprehensiveStats = $derived.by(() => {
		if (!dailyCashFlow.length) return null;

		// Transform to monthly format for comprehensive stats
		const monthlyData = dailyCashFlow.map(d => ({
			month: d.dateStr,
			monthLabel: formatShortDate(d.date),
			spending: viewMode === 'cumulative' ? d.cumulative : d.net,
			date: d.date,
		}));

		const allTimeData = allDailyCashFlow.map(d => ({
			month: d.dateStr,
			monthLabel: formatShortDate(d.date),
			spending: viewMode === 'cumulative' ? d.cumulative : d.net,
			date: d.date,
		}));

		return calculateComprehensiveStats(monthlyData, allTimeData, null, null);
	});

	const hasData = $derived(dailyCashFlow.length > 0);

	// Y domain - ensure zero is always included
	const yDomain = $derived.by((): [number, number] => {
		if (!hasData) return [-1000, 1000];

		let min: number, max: number;
		if (viewMode === 'cumulative') {
			const values = dailyCashFlow.map((d) => d.cumulative);
			min = Math.min(...values, 0);
			max = Math.max(...values, 0);
		} else if (viewMode === 'stacked') {
			// For stacked, y domain is 0 to max(income + expenses)
			const values = dailyCashFlow.map((d) => d.income + d.expenses);
			min = 0;
			max = Math.max(...values, 0);
		} else {
			const values = dailyCashFlow.map((d) => d.net);
			min = Math.min(...values, 0);
			max = Math.max(...values, 0);
		}

		// Include historical average in y-domain (not applicable for stacked)
		if (viewMode !== 'stacked' && showHistoricalAvg && historicalAverage !== null) {
			if (historicalAverage < min) min = historicalAverage;
			if (historicalAverage > max) max = historicalAverage;
		}

		// Include percentile bands in y-domain (not applicable for stacked)
		if (viewMode !== 'stacked' && showPercentileBands && percentileBands) {
			if (percentileBands.p25 < min) min = percentileBands.p25;
			if (percentileBands.p75 > max) max = percentileBands.p75;
		}

		const padding = (max - min) * 0.1 || 100;
		return [min - padding, max + padding];
	});

	// Count active analysis overlays
	const activeAnalysisCount = $derived(
		(showLinearTrend ? 1 : 0) +
		(showForecast ? 1 : 0) +
		(showHistoricalAvg ? 1 : 0) +
		(showPercentileBands ? 1 : 0)
	);

	// Handle drill-down to view transactions for a specific day
	function handleDrillDown(point: typeof dailyCashFlow[0]) {
		const startOfDay = new Date(point.date);
		startOfDay.setHours(0, 0, 0, 0);
		const endOfDay = new Date(point.date);
		endOfDay.setHours(23, 59, 59, 999);

		chartInteractions.openDrillDown({
			type: 'date',
			value: { start: startOfDay, end: endOfDay },
			label: `Transactions on ${point.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`
		});
	}

	// Supported chart types depend on view mode
	// - net: both bar and line work well
	// - cumulative: only line makes sense (running totals)
	// - stacked: only bar makes sense (comparing income/expenses)
	const supportedChartTypes = $derived.by((): ('bar' | 'line')[] => {
		if (viewMode === 'cumulative') return ['line'];
		if (viewMode === 'stacked') return ['bar'];
		return ['bar', 'line'];
	});
</script>

<AnalyticsChartShell
	data={dailyCashFlow}
	{comprehensiveStats}
	{supportedChartTypes}
	defaultChartType="bar"
	emptyMessage="No transaction data available"
	chartId="cash-flow"
	allowedPeriodGroups={['days', 'months', 'other']}
>
	{#snippet title()}
		Cash Flow
	{/snippet}

	{#snippet subtitle()}
		Track money flowing in and out over time
	{/snippet}

	{#snippet headerActions()}
		<div class="flex gap-1">
			<Button variant={viewMode === 'net' ? 'default' : 'ghost'} size="sm" onclick={() => (viewMode = 'net')}>
				Daily Net
			</Button>
			<Button variant={viewMode === 'stacked' ? 'default' : 'ghost'} size="sm" onclick={() => (viewMode = 'stacked')}>
				Stacked
			</Button>
			<Button variant={viewMode === 'cumulative' ? 'default' : 'ghost'} size="sm" onclick={() => (viewMode = 'cumulative')}>
				Cumulative
			</Button>
			<AnalysisDropdown
				bind:showLinearTrend
				bind:showForecast
				bind:showHistoricalAvg
				bind:showPercentileBands
				forecastEnabled={false}
			/>
		</div>
	{/snippet}

	{#snippet chart({ data, chartType }: { data: typeof dailyCashFlow; chartType: ChartType })}
		<div class="h-full w-full pb-20">
			{#key `${viewMode}-${chartType}`}
				<LayerCake
					{data}
					x="index"
					y={viewMode === 'stacked' ? (d: typeof dailyCashFlow[0]) => d.income + d.expenses : viewMode === 'cumulative' ? 'cumulative' : 'net'}
					xScale={scaleLinear()}
					xDomain={[-0.5, Math.max(data.length - 0.5, 0.5)]}
					yScale={scaleLinear()}
					{yDomain}
					padding={{ top: 20, right: 20, bottom: 40, left: 95 }}
				>
				<Svg>
					<AxisY ticks={5} gridlines={true} format={(d) => currencyFormatter.format(d)} />
					<AxisX
						ticks={Math.min(data.length, 6)}
						format={(d) => {
							const idx = typeof d === 'number' ? Math.round(d) : 0;
							const point = data[idx];
							if (!point) return '';
							return formatShortDate(point.date);
						}}
					/>

					<!-- ===== Analysis Overlays ===== -->

					<!-- Percentile bands -->
					{#if showPercentileBands && percentileBands}
						<PercentileBands
							p25={percentileBands.p25}
							p75={percentileBands.p75}
							fill="var(--chart-3)"
							opacity={0.15}
						/>
					{/if}

					<!-- Historical average line -->
					{#if showHistoricalAvg && historicalAverage !== null}
						<HorizontalLine
							value={historicalAverage}
							stroke="var(--chart-6)"
							strokeWidth={1.5}
							strokeDasharray="6 3"
							label="Avg"
						/>
					{/if}

					<!-- Linear regression line -->
					{#if showLinearTrend && linearTrendData}
						<CustomLine
							data={linearTrendData.data}
							stroke="var(--chart-4)"
							strokeWidth={2}
							strokeDasharray="8 4"
							opacity={0.7}
						/>
					{/if}

					{#if viewMode !== 'stacked'}
						<ZeroLine />
					{/if}
					{#if viewMode === 'cumulative'}
						<Area fill="var(--chart-2)" opacity={0.2} />
						<Line stroke="var(--chart-2)" strokeWidth={2} />
					{:else if viewMode === 'stacked'}
						<!-- Stacked view always uses bars - line mode shows net instead -->
						<StackedBar
							keys={stackedKeys}
							colors={stackedColors}
							opacity={0.85}
							hoverOpacity={1}
							radius={2}
							gap={2}
							onhover={(info) => (hoveredStackedItem = info)}
							onclick={(info) => handleDrillDown(info.item)}
						/>
					{:else}
						<!-- Net view mode -->
						{#if chartType === 'line'}
							<Area fill="var(--chart-1)" opacity={0.2} />
							<Line stroke="var(--chart-1)" strokeWidth={2} />
						{:else}
							<BiDirectionalBar
								fillPositive="var(--chart-2)"
								fillNegative="var(--destructive)"
								opacity={0.7}
								radius={1}
								gap={1}
								onhover={(d) => (hoveredItem = d)}
								onclick={(d) => handleDrillDown(d)}
							/>
						{/if}
					{/if}
				</Svg>
				<Html pointerEvents={false}>
					{#if hoveredItem && viewMode !== 'stacked'}
						<div class="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
							<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
								<p class="font-medium">{hoveredItem.date.toLocaleDateString()}</p>
								{#if viewMode === 'cumulative'}
									<p class={hoveredItem.cumulative >= 0 ? 'font-semibold text-green-600' : 'font-semibold text-red-600'}>
										Cumulative: {currencyFormatter.format(hoveredItem.cumulative)}
									</p>
								{/if}
								<p class={hoveredItem.net >= 0 ? 'text-green-600' : 'text-red-600'}>
									Net: {currencyFormatter.format(hoveredItem.net)}
								</p>
								<div class="text-muted-foreground text-xs">
									<p>In: {currencyFormatter.format(hoveredItem.income)}</p>
									<p>Out: {currencyFormatter.format(hoveredItem.expenses)}</p>
								</div>
							</div>
						</div>
					{/if}
					{#if hoveredStackedItem && viewMode === 'stacked'}
						{@const point = hoveredStackedItem.item}
						<div class="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
							<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
								<p class="font-medium">{point.date.toLocaleDateString()}</p>
								<p class="text-green-600">
									Income: {currencyFormatter.format(point.income)}
								</p>
								<p class="text-red-600">
									Expenses: {currencyFormatter.format(point.expenses)}
								</p>
								<p class="text-muted-foreground mt-1 border-t pt-1 text-xs">
									Net: {currencyFormatter.format(point.net)}
								</p>
								<p class="text-muted-foreground text-xs">
									Total: {currencyFormatter.format(point.income + point.expenses)}
								</p>
							</div>
						</div>
					{/if}
				</Html>
				</LayerCake>
			{/key}

			<!-- Legend -->
			<div class="mt-4 flex justify-center gap-6">
			{#if viewMode === 'net'}
				<div class="flex items-center gap-2">
					<div class="h-3 w-3 rounded-sm" style="background-color: var(--chart-2)"></div>
					<span class="text-sm">Positive (income > expenses)</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="bg-destructive h-3 w-3 rounded-sm"></div>
					<span class="text-sm">Negative (expenses > income)</span>
				</div>
			{:else if viewMode === 'stacked'}
				<div class="flex items-center gap-2">
					<div class="h-3 w-3 rounded-sm" style="background-color: var(--chart-2)"></div>
					<span class="text-sm">Income</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="bg-destructive h-3 w-3 rounded-sm"></div>
					<span class="text-sm">Expenses</span>
				</div>
			{:else}
				<div class="flex items-center gap-2">
					<div class="h-0.5 w-4" style="background-color: var(--chart-2)"></div>
					<span class="text-sm">Running total</span>
				</div>
			{/if}
			</div>
		</div>
	{/snippet}
</AnalyticsChartShell>
