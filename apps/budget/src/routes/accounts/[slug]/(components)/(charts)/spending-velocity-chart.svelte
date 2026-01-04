<script lang="ts">
	import { Line, Area, AxisX, AxisY, Brush, Tooltip, Scatter, HorizontalLine, CustomLine, PercentileBands } from '$lib/components/layercake';
	import { AnalysisDropdown, ChartSelectionPanel } from '$lib/components/charts';
	import { Button } from '$lib/components/ui/button';
	import { currencyFormatter } from '$lib/utils/formatters';
	import type { TransactionsFormat } from '$lib/types';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { chartSelection, type SelectedDataPoint } from '$lib/states/ui/chart-selection.svelte';
	import { calculateLinearTrend, calculateHistoricalAverage, calculatePercentileBands, type TrendLineData, type PercentileBands as PercentileBandsData } from '$lib/utils/chart-statistics';
	import { calculateComprehensiveStats } from '$lib/utils/comprehensive-statistics';
	import { LayerCake, Svg } from 'layercake';
	import { scaleLinear } from 'd3-scale';
	import { AnalyticsChartShell } from '$lib/components/charts';
	import type { ChartType } from '$lib/components/layercake';
	import { extractDateString, toDateString } from '$lib/utils/date-formatters';

	interface Props {
		transactions: TransactionsFormat[];
	}

	let { transactions }: Props = $props();

	// Rolling window options
	type WindowSize = 7 | 14 | 30;
	let windowSize = $state<WindowSize>(7);

	// Toggle states for analysis overlays
	let showLinearTrend = $state(false);
	let showForecast = $state(false);
	let showHistoricalAvg = $state(false);
	let showPercentileBands = $state(false);

	// Brush hover position for Tooltip crosshair
	let brushHoverX = $state<number | null>(null);

	// Convert a data point to SelectedDataPoint format
	function toSelectedPoint(d: { dateStr: string; monthLabel: string; date: Date; rolling: number }): SelectedDataPoint {
		return {
			id: d.dateStr,
			label: d.monthLabel,
			date: d.date,
			value: d.rolling
		};
	}

	// Handle click on data point - toggle selection
	function handlePointClick(d: { dateStr: string; monthLabel: string; date: Date; rolling: number }) {
		chartSelection.toggle(toSelectedPoint(d));
	}

	// Handle brush selection - select all points within the brushed range
	function handleBrushSelect(range: { start: Date | number; end: Date | number } | null) {
		if (!range) return;

		const startIdx = typeof range.start === 'number' ? range.start : 0;
		const endIdx = typeof range.end === 'number' ? range.end : 0;

		const pointsInRange = velocityData.filter((d) => d.index >= startIdx && d.index <= endIdx);

		if (pointsInRange.length > 0) {
			const selectedPoints = pointsInRange.map(toSelectedPoint);
			chartSelection.selectRange(selectedPoints);
		}
	}

	// Handle click from brush - find nearest point and toggle selection
	function handleBrushClick(_x: number, clickValue: Date | number) {
		const clickIndex = typeof clickValue === 'number' ? clickValue : 0;

		let nearestPoint = velocityData[0];
		let minDistance = Infinity;

		for (const point of velocityData) {
			const distance = Math.abs(point.index - clickIndex);
			if (distance < minDistance) {
				minDistance = distance;
				nearestPoint = point;
			}
		}

		if (nearestPoint) {
			chartSelection.toggle(toSelectedPoint(nearestPoint));
		}
	}

	// Access effective time period for this chart
	const effectivePeriod = $derived(timePeriodFilter.getEffectivePeriod('spending-velocity'));

	// Calculate daily spending totals
	const dailySpending = $derived.by(() => {
		const dailyMap = new Map<string, number>();

		for (const tx of transactions) {
			if (tx.amount >= 0) continue; // Only expenses

			const dateStr = extractDateString(tx.date);
			if (!dateStr) continue;

			dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + Math.abs(tx.amount));
		}

		return dailyMap;
	});

	// Calculate rolling average for ALL data
	const allVelocityData = $derived.by(() => {
		if (dailySpending.size === 0) return [];

		const sortedDates = Array.from(dailySpending.keys()).sort();
		if (sortedDates.length === 0) return [];

		// Get date range
		const startDate = new Date(sortedDates[0]);
		const endDate = new Date(sortedDates[sortedDates.length - 1]);

		// Generate all dates in range
		const allDates: string[] = [];
		const current = new Date(startDate);
		while (current <= endDate) {
			allDates.push(toDateString(current));
			current.setDate(current.getDate() + 1);
		}

		// Calculate rolling average for each date
		const result: Array<{ date: Date; dateStr: string; daily: number; rolling: number; index: number; month: string; monthLabel: string }> = [];

		for (let i = 0; i < allDates.length; i++) {
			const dateStr = allDates[i];
			const daily = dailySpending.get(dateStr) || 0;
			const date = new Date(dateStr);

			// Calculate rolling average
			let rollingSum = 0;
			let rollingCount = 0;
			for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
				rollingSum += dailySpending.get(allDates[j]) || 0;
				rollingCount++;
			}

			result.push({
				date,
				dateStr,
				daily,
				rolling: rollingSum / rollingCount,
				index: i,
				month: dateStr,
				monthLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
			});
		}

		return result;
	});

	// Filter data based on time period
	const velocityData = $derived.by(() => {
		const period = effectivePeriod;

		if (period.preset !== 'all-time') {
			const range = timePeriodFilter.getDateRange(period);
			if (range) {
				const filtered = allVelocityData.filter((item) => {
					return item.date >= range.start && item.date <= range.end;
				});
				// Recalculate indices after filtering
				return filtered.map((item, idx) => ({
					...item,
					index: idx,
				}));
			}
		}

		// Default to last 90 days for 'all-time'
		const last90 = allVelocityData.slice(-90);
		return last90.map((item, idx) => ({
			...item,
			index: idx,
		}));
	});

	// ===== Analysis Overlay Computed Data =====

	// Convert to spending format for trend calculations
	const velocityAsSpending = $derived(velocityData.map(d => ({
		month: d.dateStr,
		monthLabel: d.monthLabel,
		spending: d.rolling,
		date: d.date,
		index: d.index,
	})));

	// Linear regression line for rolling velocity
	const linearTrendData = $derived.by((): TrendLineData | null => {
		if (!showLinearTrend || velocityData.length < 2) return null;
		return calculateLinearTrend(velocityAsSpending);
	});

	// Historical average (across ALL data)
	const historicalAverage = $derived.by((): number | null => {
		if (!showHistoricalAvg || allVelocityData.length === 0) return null;
		const data = allVelocityData.map(d => ({ spending: d.rolling }));
		return calculateHistoricalAverage(data);
	});

	// Percentile bands (across ALL data)
	const percentileBands = $derived.by((): PercentileBandsData | null => {
		if (!showPercentileBands || allVelocityData.length < 4) return null;
		const data = allVelocityData.map(d => ({ ...d, spending: d.rolling }));
		return calculatePercentileBands(data);
	});

	// Summary statistics
	const summaryStats = $derived.by(() => {
		if (velocityData.length === 0) {
			return [
				{ label: 'Current Rate', value: '$0/day' },
				{ label: 'Peak Rate', value: '$0/day' },
				{ label: 'Low Rate', value: '$0/day' },
				{ label: 'Trend', value: 'N/A' }
			];
		}

		const currentRate = velocityData[velocityData.length - 1]?.rolling || 0;
		const peakRate = Math.max(...velocityData.map((d) => d.rolling));
		const lowRate = Math.min(...velocityData.map((d) => d.rolling));

		// Trend: compare last 7 days avg to previous 7 days
		const recent = velocityData.slice(-7);
		const previous = velocityData.slice(-14, -7);
		const recentAvg = recent.reduce((sum, d) => sum + d.rolling, 0) / recent.length;
		const previousAvg = previous.length > 0 ? previous.reduce((sum, d) => sum + d.rolling, 0) / previous.length : recentAvg;
		const trendPct = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

		return [
			{ label: 'Current Rate', value: `${currencyFormatter.format(currentRate)}/day` },
			{ label: 'Peak Rate', value: `${currencyFormatter.format(peakRate)}/day` },
			{ label: 'Low Rate', value: `${currencyFormatter.format(lowRate)}/day` },
			{
				label: 'Trend',
				value: trendPct > 0 ? `+${trendPct.toFixed(1)}%` : `${trendPct.toFixed(1)}%`,
				description: trendPct > 0 ? 'Spending increasing' : 'Spending decreasing'
			}
		];
	});

	// Comprehensive statistics for the Statistics tab
	const comprehensiveStats = $derived.by(() => {
		if (!velocityData.length) return null;

		const monthlyData = velocityData.map(d => ({
			month: d.dateStr,
			monthLabel: d.monthLabel,
			spending: d.rolling,
			date: d.date,
		}));

		const allTimeData = allVelocityData.map(d => ({
			month: d.dateStr,
			monthLabel: d.monthLabel,
			spending: d.rolling,
			date: d.date,
		}));

		return calculateComprehensiveStats(monthlyData, allTimeData, null, null);
	});

	const hasData = $derived(velocityData.length > 0);

	// Y domain (computed after forecastData is defined)
	const yMax = $derived.by(() => {
		if (!hasData) return 100;

		let maxValue = Math.max(...velocityData.map((d) => Math.max(d.daily, d.rolling)));

		// Include historical average in y-domain
		if (showHistoricalAvg && historicalAverage !== null && historicalAverage > maxValue) {
			maxValue = historicalAverage;
		}

		// Include percentile bands in y-domain
		if (showPercentileBands && percentileBands && percentileBands.p75 > maxValue) {
			maxValue = percentileBands.p75;
		}

		return maxValue * 1.1;
	});

	// Extended y-domain that includes forecast
	const yMaxWithForecast = $derived.by(() => {
		let max = yMax;

		// Include forecast in y-domain
		if (showForecast && forecastData.length > 0) {
			const forecastMax = Math.max(...forecastData.map(d => d.rolling));
			if (forecastMax > max) {
				max = forecastMax * 1.1;
			}
		}

		return max;
	});

	// Count active analysis overlays
	const activeAnalysisCount = $derived(
		(showLinearTrend ? 1 : 0) +
		(showForecast ? 1 : 0) +
		(showHistoricalAvg ? 1 : 0) +
		(showPercentileBands ? 1 : 0)
	);

	// ===== Forecast Calculation =====

	// Calculate linear trend for forecast (needs to be available even when showLinearTrend is off)
	const trendForForecast = $derived.by((): TrendLineData | null => {
		if (velocityData.length < 14) return null;
		return calculateLinearTrend(velocityAsSpending);
	});

	// Forecast: project trend line forward
	const forecastData = $derived.by(() => {
		if (!showForecast || !trendForForecast || velocityData.length < 14) return [];

		const lastPoint = velocityData[velocityData.length - 1];
		const forecastDays = 7; // Forecast 7 days ahead
		const forecast: Array<{ date: Date; dateStr: string; rolling: number; index: number; isForecast: boolean }> = [];

		for (let i = 1; i <= forecastDays; i++) {
			const nextDate = new Date(lastPoint.date);
			nextDate.setDate(nextDate.getDate() + i);

			// Use linear trend to predict
			const predictedValue = trendForForecast.intercept +
				trendForForecast.slope * (lastPoint.index + i);

			forecast.push({
				date: nextDate,
				dateStr: toDateString(nextDate),
				rolling: Math.max(0, predictedValue), // Don't allow negative spending
				index: lastPoint.index + i,
				isForecast: true
			});
		}

		return forecast;
	});

	// ===== Category Breakdown Per Day =====

	const dailyCategoryBreakdown = $derived.by(() => {
		const breakdown = new Map<string, Map<string, number>>();

		for (const tx of transactions) {
			if (tx.amount >= 0) continue;

			const dateStr = extractDateString(tx.date);
			const category = tx.category?.name ?? 'Uncategorized';

			if (!breakdown.has(dateStr)) {
				breakdown.set(dateStr, new Map());
			}

			const dayBreakdown = breakdown.get(dateStr)!;
			dayBreakdown.set(category, (dayBreakdown.get(category) || 0) + Math.abs(tx.amount));
		}

		return breakdown;
	});

	function getCategoryBreakdown(dateStr: string): Array<{ name: string; amount: number }> {
		const breakdown = dailyCategoryBreakdown.get(dateStr);
		if (!breakdown) return [];

		return Array.from(breakdown.entries())
			.map(([name, amount]) => ({ name, amount }))
			.sort((a, b) => b.amount - a.amount);
	}

	// ===== Drill-Down Handler =====

	function handlePointDblClick(point: { dateStr: string; monthLabel: string }) {
		// Create date range for single day
		const date = new Date(point.dateStr);
		const nextDay = new Date(date);
		nextDay.setDate(nextDay.getDate() + 1);

		chartInteractions.openDrillDown({
			type: 'date',
			value: { start: date, end: nextDay },
			label: `Transactions on ${point.monthLabel}`
		});
	}

	// Calculate historical average for tooltip comparison (always calculated)
	const historicalAvgForTooltip = $derived.by((): number | null => {
		if (allVelocityData.length === 0) return null;
		const data = allVelocityData.map(d => ({ spending: d.rolling }));
		return calculateHistoricalAverage(data);
	});
</script>

<AnalyticsChartShell
	data={velocityData}
	{comprehensiveStats}
	supportedChartTypes={['line', 'line-area', 'area']}
	defaultChartType="line-area"
	emptyMessage="No spending data available"
	chartId="spending-velocity"
	allowedPeriodGroups={['days', 'months', 'other']}
>
	{#snippet title()}
		Spending Velocity
	{/snippet}

	{#snippet subtitle()}
		Daily spending with {windowSize}-day rolling average
	{/snippet}

	{#snippet headerActions()}
		<div class="flex gap-1">
			<Button variant={windowSize === 7 ? 'default' : 'ghost'} size="sm" onclick={() => (windowSize = 7)}>
				7 Day
			</Button>
			<Button variant={windowSize === 14 ? 'default' : 'ghost'} size="sm" onclick={() => (windowSize = 14)}>
				14 Day
			</Button>
			<Button variant={windowSize === 30 ? 'default' : 'ghost'} size="sm" onclick={() => (windowSize = 30)}>
				30 Day
			</Button>
			<AnalysisDropdown
				bind:showLinearTrend
				bind:showForecast
				bind:showHistoricalAvg
				bind:showPercentileBands
				forecastEnabled={velocityData.length >= 14}
			/>
		</div>
	{/snippet}

	{#snippet chart({ data, chartType }: { data: typeof velocityData; chartType: ChartType })}
		<div class="h-full w-full pb-20">
			<LayerCake
				{data}
				x="index"
				y="rolling"
				yScale={scaleLinear()}
				yDomain={[0, yMaxWithForecast]}
				padding={{ top: 20, right: 20, bottom: 40, left: 60 }}
			>
				<Svg>
					<AxisY ticks={5} gridlines={true} format={(d) => currencyFormatter.format(d)} />
					<AxisX
						ticks={Math.min(data.length, 6)}
						format={(d) => {
							const idx = typeof d === 'number' ? Math.round(d) : 0;
							const point = data[idx];
							if (!point) return '';
							return point.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
							stroke="var(--chart-2)"
							strokeWidth={2}
							strokeDasharray="8 4"
							opacity={0.7}
						/>
					{/if}

					<!-- Forecast line -->
					{#if showForecast && forecastData.length > 0}
						<CustomLine
							data={forecastData.map(d => ({ x: d.index, y: d.rolling }))}
							stroke="var(--chart-4)"
							strokeWidth={2}
							strokeDasharray="4 2"
							opacity={0.8}
						/>
					{/if}

					{#if chartType === 'line-area'}
						<Area fill="var(--chart-1)" opacity={0.1} />
						<Line stroke="var(--chart-1)" strokeWidth={2} />
						<Scatter
							fill={(d) => chartSelection.isSelected(d.dateStr) ? 'var(--primary)' : 'var(--chart-1)'}
							radius={(d) => chartSelection.isSelected(d.dateStr) ? 6 : 4}
							hoverRadius={7}
							stroke={(d) => chartSelection.isSelected(d.dateStr) ? 'var(--primary-foreground)' : 'var(--background)'}
							strokeWidth={2}
							onclick={(d) => handlePointClick(d)}
							ondblclick={(d) => handlePointDblClick(d)}
						/>
					{:else if chartType === 'line'}
						<Line stroke="var(--chart-1)" strokeWidth={2} />
						<Scatter
							fill={(d) => chartSelection.isSelected(d.dateStr) ? 'var(--primary)' : 'var(--chart-1)'}
							radius={(d) => chartSelection.isSelected(d.dateStr) ? 6 : 4}
							hoverRadius={7}
							stroke={(d) => chartSelection.isSelected(d.dateStr) ? 'var(--primary-foreground)' : 'var(--background)'}
							strokeWidth={2}
							onclick={(d) => handlePointClick(d)}
							ondblclick={(d) => handlePointDblClick(d)}
						/>
					{:else if chartType === 'area'}
						<Area fill="var(--chart-1)" opacity={0.3} />
						<Scatter
							fill={(d) => chartSelection.isSelected(d.dateStr) ? 'var(--primary)' : 'var(--chart-1)'}
							radius={(d) => chartSelection.isSelected(d.dateStr) ? 6 : 4}
							hoverRadius={7}
							stroke={(d) => chartSelection.isSelected(d.dateStr) ? 'var(--primary-foreground)' : 'var(--background)'}
							strokeWidth={2}
							onclick={(d) => handlePointClick(d)}
							ondblclick={(d) => handlePointDblClick(d)}
						/>
					{/if}

					<!-- Tooltip for hover - uses external hover from Brush -->
					<Tooltip externalHoverX={brushHoverX}>
						{#snippet children({ point, x })}
							{@const categoryBreakdown = getCategoryBreakdown(point.dateStr)}
							{@const vsAvg = historicalAvgForTooltip ? ((point.rolling - historicalAvgForTooltip) / historicalAvgForTooltip) * 100 : null}
							<foreignObject x={Math.min(x + 10, 180)} y={10} width="200" height="220">
								<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
									<p class="font-medium">{point.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>

									<!-- Rolling vs Daily -->
									<div class="mt-1 space-y-0.5">
										<p class="text-primary">
											Rolling: {currencyFormatter.format(point.rolling)}/day
										</p>
										<p class="text-muted-foreground">
											Daily: {currencyFormatter.format(point.daily)}
										</p>
									</div>

									<!-- Comparison to historical average -->
									{#if vsAvg !== null}
										<p class="mt-1 text-xs {vsAvg > 0 ? 'text-destructive' : 'text-green-600'}">
											{vsAvg > 0 ? '+' : ''}{vsAvg.toFixed(1)}% vs avg
										</p>
									{/if}

									<!-- Category breakdown for this day -->
									{#if categoryBreakdown.length > 0}
										<div class="mt-2 border-t pt-2">
											<p class="text-muted-foreground mb-1 text-xs">Top Categories:</p>
											{#each categoryBreakdown.slice(0, 3) as cat}
												<p class="text-xs">{cat.name}: {currencyFormatter.format(cat.amount)}</p>
											{/each}
										</div>
									{/if}

									{#if point.daily > 0}
										<p class="text-muted-foreground mt-2 border-t pt-1 text-xs">Double-click for details</p>
									{/if}
								</div>
							</foreignObject>
						{/snippet}
					</Tooltip>

					<!-- Brush for drag selection - on top to capture all mouse events -->
					<Brush
						onbrush={handleBrushSelect}
						onclick={handleBrushClick}
						onhover={(x) => brushHoverX = x}
						fill="var(--primary)"
						opacity={0.15}
						cursor="crosshair"
					/>
				</Svg>
			</LayerCake>

			<!-- Legend -->
			<div class="mt-4 flex flex-wrap justify-center gap-4">
				<div class="flex items-center gap-2">
					<div class="h-0.5 w-4" style="background-color: var(--chart-1)"></div>
					<span class="text-sm">{windowSize}-Day Rolling Average</span>
				</div>
				{#if showForecast && forecastData.length > 0}
					<div class="flex items-center gap-2">
						<div class="h-0.5 w-4" style="background-color: var(--chart-4); border-style: dashed;"></div>
						<span class="text-sm">7-Day Forecast</span>
					</div>
				{/if}
			</div>

			<!-- Selection hint -->
			{#if !chartSelection.isActive}
				<p class="mt-2 text-center text-xs text-muted-foreground">
					Click points to select, or drag to select a range
				</p>
			{/if}
		</div>
	{/snippet}
</AnalyticsChartShell>

<!-- Chart selection floating panel -->
<ChartSelectionPanel />
