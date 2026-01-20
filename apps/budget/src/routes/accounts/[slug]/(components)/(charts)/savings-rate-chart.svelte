<script lang="ts">
	import { Line, Area, AxisX, AxisY, Tooltip, ZeroLine, HorizontalLine, CustomLine, PercentileBands, Scatter, Brush } from '$lib/components/layercake';
	import { AnalysisDropdown, ChartSelectionPanel } from '$lib/components/charts';
	import { currencyFormatter, formatPercentRaw } from '$lib/utils/formatters';
	import type { TransactionsFormat } from '$lib/types';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import { calculateLinearTrend, calculateHistoricalAverage, calculatePercentileBands, type TrendLineData, type PercentileBands as PercentileBandsData } from '$lib/utils/chart-statistics';
	import { calculateComprehensiveStatsForRate } from '$lib/utils/comprehensive-statistics';
	import { LayerCake, Svg } from 'layercake';
	import { scaleLinear } from 'd3-scale';
	import { AnalyticsChartShell } from '$lib/components/charts';
	import type { ChartType } from '$lib/components/layercake';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Target from '@lucide/svelte/icons/target';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { chartSelection, type SelectedDataPoint } from '$lib/states/ui/chart-selection.svelte';
	import { extractDateString, formatMonthYear, toMonthString } from '$lib/utils/date-formatters';

	interface Props {
		transactions: TransactionsFormat[];
	}

	let { transactions }: Props = $props();

	// Customizable savings target (default 20%)
	const SAVINGS_TARGET_OPTIONS = [10, 15, 20, 25, 30, 50] as const;
	let savingsTarget = $state<number>(20);

	// Toggle states for analysis overlays
	let showLinearTrend = $state(false);
	let showForecast = $state(false);
	let showHistoricalAvg = $state(false);
	let showPercentileBands = $state(false);
	let showMovingAvg = $state(false);
	let showYoYComparison = $state(false);

	// Brush hover position for Tooltip crosshair
	let brushHoverX = $state<number | null>(null);

	// Access effective time period for this chart
	// Direct access to SvelteMap to ensure proper reactivity tracking
	const effectivePeriod = $derived(
		timePeriodFilter.chartOverrides.get('savings-rate') ?? timePeriodFilter.globalPeriod
	);

	// Calculate monthly income, expenses, and savings rate from ALL data
	const allMonthlyData = $derived.by(() => {
		const dataByMonth = new Map<string, { income: number; expenses: number }>();

		for (const tx of transactions) {
			const dateStr = extractDateString(tx.date);

			if (!dateStr) continue;

			const monthKey = dateStr.substring(0, 7);

			if (!dataByMonth.has(monthKey)) {
				dataByMonth.set(monthKey, { income: 0, expenses: 0 });
			}

			const data = dataByMonth.get(monthKey)!;
			if (tx.amount > 0) {
				data.income += tx.amount;
			} else {
				data.expenses += Math.abs(tx.amount);
			}
		}

		return Array.from(dataByMonth.entries())
			.sort((a, b) => a[0].localeCompare(b[0]))
			.map(([month, data], idx) => {
				const [year, monthNum] = month.split('-');
				const savings = data.income - data.expenses;
				const savingsRate = data.income > 0 ? (savings / data.income) * 100 : 0;
				const date = new Date(Date.UTC(parseInt(year), parseInt(monthNum) - 1, 15, 12, 0, 0));

				return {
					month,
					monthLabel: formatMonthYear(date, { long: true, utc: true }),
					date,
					income: data.income,
					expenses: data.expenses,
					savings,
					savingsRate: Math.max(-100, Math.min(100, savingsRate)), // Clamp to -100% to 100%
					index: idx,
				};
			});
	});

	// Filter data based on time period
	const monthlyData = $derived.by(() => {
		const period = effectivePeriod;

		if (period.preset !== 'all-time') {
			const range = timePeriodFilter.getDateRange(period);
			if (range) {
				const filtered = allMonthlyData.filter((item) => {
					return item.date >= range.start && item.date <= range.end;
				});
				// Recalculate indices after filtering
				return filtered.map((item, idx) => ({
					...item,
					index: idx,
				}));
			}
		}

		// Default to last 12 months for 'all-time'
		const last12 = allMonthlyData.slice(-12);
		return last12.map((item, idx) => ({
			...item,
			index: idx,
		}));
	});

	// ===== Analysis Overlay Computed Data =====

	// Convert to spending format for trend calculations
	const rateAsSpending = $derived(monthlyData.map(d => ({
		month: d.month,
		monthLabel: d.monthLabel,
		spending: d.savingsRate,
		date: d.date,
		index: d.index,
	})));

	// Linear regression line for savings rate
	const linearTrendData = $derived.by((): TrendLineData | null => {
		if (!showLinearTrend || monthlyData.length < 2) return null;
		return calculateLinearTrend(rateAsSpending);
	});

	// Historical average (across ALL data)
	const historicalAverage = $derived.by((): number | null => {
		if (!showHistoricalAvg || allMonthlyData.length === 0) return null;
		const data = allMonthlyData.map(d => ({ spending: d.savingsRate }));
		return calculateHistoricalAverage(data);
	});

	// Percentile bands (across ALL data)
	const percentileBands = $derived.by((): PercentileBandsData | null => {
		if (!showPercentileBands || allMonthlyData.length < 4) return null;
		const data = allMonthlyData.map(d => ({ ...d, spending: d.savingsRate }));
		return calculatePercentileBands(data);
	});

	// Forecast: project savings rate forward using linear regression
	const FORECAST_HORIZON = 3; // months
	const forecastData = $derived.by(() => {
		if (!showForecast || monthlyData.length < 6) return [];

		// Calculate trend for forecast (regardless of showLinearTrend)
		const trend = calculateLinearTrend(rateAsSpending);
		if (!trend) return [];

		const lastPoint = monthlyData[monthlyData.length - 1];
		const forecast: Array<{ x: number; y: number; month: string; monthLabel: string; isForecast: true }> = [];

		for (let i = 1; i <= FORECAST_HORIZON; i++) {
			// Calculate next month date
			const nextDate = new Date(lastPoint.date);
			nextDate.setUTCMonth(nextDate.getUTCMonth() + i);

			// Use linear trend to predict
			const predictedValue = trend.intercept + trend.slope * (lastPoint.index + i);
			// Clamp to -100% to 100% range
			const clampedValue = Math.max(-100, Math.min(100, predictedValue));

			const monthStr = toMonthString(nextDate);
			const monthLabel = formatMonthYear(nextDate, { long: true, utc: true });

			forecast.push({
				x: lastPoint.index + i,
				y: clampedValue,
				month: monthStr,
				monthLabel,
				isForecast: true
			});
		}

		return forecast;
	});

	// 3-month moving average
	const MOVING_AVG_WINDOW = 3;
	const movingAvgData = $derived.by(() => {
		if (!showMovingAvg || monthlyData.length < MOVING_AVG_WINDOW) return [];

		return monthlyData
			.map((d, i, arr) => {
				if (i < MOVING_AVG_WINDOW - 1) return null;

				// Calculate average of last N months including current
				let sum = 0;
				for (let j = 0; j < MOVING_AVG_WINDOW; j++) {
					sum += arr[i - j].savingsRate;
				}
				const avg = sum / MOVING_AVG_WINDOW;

				return {
					x: d.index,
					y: avg,
					month: d.month
				};
			})
			.filter((d): d is NonNullable<typeof d> => d !== null);
	});

	// Year-over-Year comparison data
	const yoyData = $derived.by(() => {
		if (!showYoYComparison) return [];

		// Get previous year's data for the same months
		return monthlyData.map(d => {
			// Find the same month from previous year
			const [year, monthNum] = d.month.split('-');
			const prevYearMonth = `${parseInt(year) - 1}-${monthNum}`;
			const prevYearData = allMonthlyData.find(m => m.month === prevYearMonth);

			if (!prevYearData) return null;

			return {
				x: d.index,
				y: prevYearData.savingsRate,
				month: d.month,
				prevYearMonth: prevYearMonth,
				prevYearRate: prevYearData.savingsRate,
				yoyChange: d.savingsRate - prevYearData.savingsRate
			};
		}).filter((d): d is NonNullable<typeof d> => d !== null);
	});

	// Comprehensive statistics for the Statistics tab
	const comprehensiveStats = $derived.by(() => {
		if (!monthlyData.length) return null;

		// Transform to rate format for comprehensive stats
		const rateData = monthlyData.map(d => ({
			month: d.month,
			monthLabel: d.monthLabel,
			rate: d.savingsRate,
			date: d.date,
		}));

		const rateStats = calculateComprehensiveStatsForRate(rateData, savingsTarget);
		if (!rateStats) return null;

		// Convert RateStats to ComprehensiveStats format for the shell
		return {
			summary: {
				average: rateStats.summary.average,
				median: rateStats.summary.median,
				total: monthlyData.reduce((s, d) => s + d.savings, 0),
				count: rateStats.summary.count
			},
			trend: rateStats.trend,
			distribution: {
				highest: { value: rateStats.summary.highest.value, month: rateStats.summary.highest.month, monthLabel: rateStats.summary.highest.monthLabel },
				lowest: { value: rateStats.summary.lowest.value, month: rateStats.summary.lowest.month, monthLabel: rateStats.summary.lowest.monthLabel },
				range: rateStats.distribution.range,
				p25: rateStats.distribution.p25,
				p50: rateStats.distribution.p50,
				p75: rateStats.distribution.p75,
				iqr: rateStats.distribution.p75 - rateStats.distribution.p25,
				stdDev: rateStats.distribution.stdDev,
				coefficientOfVariation: rateStats.summary.average !== 0 ? (rateStats.distribution.stdDev / Math.abs(rateStats.summary.average)) * 100 : 0
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

	const hasData = $derived(monthlyData.length > 0);

	// Y domain for percentage
	const yDomain = $derived.by((): [number, number] => {
		if (!hasData) return [-50, 50];
		const rates = monthlyData.map((d) => d.savingsRate);
		let min = Math.min(...rates, 0);
		let max = Math.max(...rates, 0);

		// Include historical average in y-domain
		if (showHistoricalAvg && historicalAverage !== null) {
			if (historicalAverage < min) min = historicalAverage;
			if (historicalAverage > max) max = historicalAverage;
		}

		// Include percentile bands in y-domain
		if (showPercentileBands && percentileBands) {
			if (percentileBands.p25 < min) min = percentileBands.p25;
			if (percentileBands.p75 > max) max = percentileBands.p75;
		}

		// Include forecast values in y-domain
		if (showForecast && forecastData.length > 0) {
			const forecastRates = forecastData.map((d) => d.y);
			const forecastMin = Math.min(...forecastRates);
			const forecastMax = Math.max(...forecastRates);
			if (forecastMin < min) min = forecastMin;
			if (forecastMax > max) max = forecastMax;
		}

		return [Math.floor(min / 10) * 10 - 10, Math.ceil(max / 10) * 10 + 10];
	});

	// Count active analysis overlays
	const activeAnalysisCount = $derived(
		(showLinearTrend ? 1 : 0) +
		(showForecast ? 1 : 0) +
		(showHistoricalAvg ? 1 : 0) +
		(showPercentileBands ? 1 : 0) +
		(showMovingAvg ? 1 : 0) +
		(showYoYComparison ? 1 : 0)
	);

	// Helper to get trend value at a specific index
	function getTrendValueAtIndex(index: number): number | null {
		// Calculate trend internally (without relying on showLinearTrend)
		if (monthlyData.length < 2) return null;
		const trend = calculateLinearTrend(rateAsSpending);
		if (!trend) return null;
		return trend.intercept + trend.slope * index;
	}

	// Helper to get moving average value for a specific month
	function getMovingAvgForMonth(month: string): number | null {
		const mavgPoint = movingAvgData.find(d => d.month === month);
		return mavgPoint?.y ?? null;
	}

	// Helper to get YoY data for a specific month
	function getYoYDataForMonth(month: string): { prevYearRate: number; yoyChange: number } | null {
		const yoyPoint = yoyData.find(d => d.month === month);
		if (!yoyPoint) return null;
		return {
			prevYearRate: yoyPoint.prevYearRate,
			yoyChange: yoyPoint.yoyChange
		};
	}

	// Convert data point to selection format
	function toSelectedPoint(d: typeof monthlyData[0]): SelectedDataPoint {
		return {
			id: d.month,
			label: d.monthLabel,
			date: d.date,
			value: d.savingsRate,
			rawData: {
				income: d.income,
				expenses: d.expenses,
				savings: d.savings,
				savingsRate: d.savingsRate
			}
		};
	}

	// Handle click on data point - click to select
	function handlePointClick(d: typeof monthlyData[0]) {
		chartSelection.toggle(toSelectedPoint(d));
	}

	// Drill-down handler
	function handlePointDblClick(point: typeof monthlyData[0]) {
		chartInteractions.openDrillDown({
			type: 'month',
			value: point.month, // "YYYY-MM" format
			label: `${point.monthLabel} Transactions`
		});
	}

	// Get point fill color based on selection state
	function getPointFill(d: typeof monthlyData[0]): string {
		if (chartSelection.isSelected(d.month)) {
			return 'var(--primary)';
		}
		// Color based on savings rate
		if (d.savingsRate >= savingsTarget) return 'var(--chart-2)'; // On target
		if (d.savingsRate >= 0) return 'var(--chart-5)'; // Below target but positive
		return 'var(--destructive)'; // Negative
	}

	// Get point radius based on selection state
	function getPointRadius(d: typeof monthlyData[0]): number {
		return chartSelection.isSelected(d.month) ? 6 : 4;
	}

	// Get point stroke based on selection state
	function getPointStroke(d: typeof monthlyData[0]): string {
		return chartSelection.isSelected(d.month) ? 'var(--primary-foreground)' : 'var(--background)';
	}

	// Handle brush selection - select all points within the brushed range (uses indices)
	function handleBrushSelect(range: { start: Date | number; end: Date | number } | null) {
		if (!range) {
			// Brush cleared - don't clear selection (let user do that manually)
			return;
		}

		// Convert to numbers (indices) - when using index-based x values, these are already numbers
		const startIdx = typeof range.start === 'number' ? range.start : 0;
		const endIdx = typeof range.end === 'number' ? range.end : 0;

		// Find all data points within the brush range (indices)
		const pointsInRange = monthlyData.filter((d) => {
			return d.index >= startIdx && d.index <= endIdx;
		});

		if (pointsInRange.length > 0) {
			// Convert to SelectedDataPoint format and select them all
			const selectedPoints = pointsInRange.map(toSelectedPoint);
			chartSelection.selectRange(selectedPoints);
		}
	}

	// Handle click from brush - find nearest point and toggle selection (uses indices)
	function handleBrushClick(_x: number, clickValue: Date | number) {
		// Convert to number (index)
		const clickIndex = typeof clickValue === 'number' ? clickValue : 0;

		// Find the nearest data point to the click position
		let nearestPoint = monthlyData[0];
		let minDistance = Infinity;

		for (const point of monthlyData) {
			const distance = Math.abs(point.index - clickIndex);
			if (distance < minDistance) {
				minDistance = distance;
				nearestPoint = point;
			}
		}

		if (nearestPoint) {
			// Toggle selection on the nearest point
			chartSelection.toggle(toSelectedPoint(nearestPoint));
		}
	}
</script>

<AnalyticsChartShell
	data={monthlyData}
	{comprehensiveStats}
	supportedChartTypes={['line', 'line-area', 'area']}
	defaultChartType="line-area"
	emptyMessage="No transaction data available"
	chartId="savings-rate"
	allowedPeriodGroups={['months', 'year', 'other']}
>
	{#snippet title()}
		Savings Rate
	{/snippet}

	{#snippet subtitle()}
		Percentage of income saved each month (income - expenses) / income
	{/snippet}

	{#snippet headerActions()}
		<!-- Savings Target Selector -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline" size="sm" class="gap-1">
						<Target class="h-4 w-4" />
						{savingsTarget}%
						<ChevronDown class="h-3 w-3" />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-40">
				<DropdownMenu.Label>Savings Target</DropdownMenu.Label>
				<DropdownMenu.Separator />
				{#each SAVINGS_TARGET_OPTIONS as targetOption}
					<DropdownMenu.CheckboxItem
						checked={savingsTarget === targetOption}
						onCheckedChange={() => (savingsTarget = targetOption)}
					>
						{targetOption}%
						{#if targetOption === 20}
							<span class="text-muted-foreground ml-1 text-xs">(recommended)</span>
						{/if}
					</DropdownMenu.CheckboxItem>
				{/each}
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<AnalysisDropdown
			bind:showLinearTrend
			bind:showForecast
			bind:showHistoricalAvg
			bind:showPercentileBands
			bind:showMovingAvg
			bind:showYoYComparison
			forecastEnabled={true}
			forecastHorizon={FORECAST_HORIZON}
			movingAvgEnabled={true}
			movingAvgWindow={MOVING_AVG_WINDOW}
			yoyComparisonEnabled={true}
		/>
	{/snippet}

	{#snippet chart({ data, chartType }: { data: typeof monthlyData; chartType: ChartType })}
		<div class="flex h-full w-full flex-col">
			<div class="min-h-0 flex-1">
				<LayerCake
				{data}
				x="index"
				y="savingsRate"
				yScale={scaleLinear()}
				{yDomain}
				padding={{ top: 20, right: 20, bottom: 40, left: 60 }}
			>
				<Svg>
					<AxisY ticks={5} gridlines={true} format={(d) => `${d}%`} />
					<AxisX
						ticks={Math.min(data.length, 6)}
						format={(d) => {
							const idx = typeof d === 'number' ? Math.round(d) : 0;
							const point = data[idx];
							if (!point) return '';
							return point.date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
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

					<!-- Forecast line -->
					{#if showForecast && forecastData.length > 0}
						<CustomLine
							data={forecastData}
							stroke="var(--chart-2)"
							strokeWidth={2}
							strokeDasharray="4 2"
							opacity={0.6}
						/>
					{/if}

					<!-- 3-month moving average line -->
					{#if showMovingAvg && movingAvgData.length > 0}
						<CustomLine
							data={movingAvgData}
							stroke="var(--chart-1)"
							strokeWidth={2}
							opacity={0.8}
						/>
					{/if}

					<!-- Year-over-Year comparison line -->
					{#if showYoYComparison && yoyData.length > 0}
						<CustomLine
							data={yoyData}
							stroke="var(--muted-foreground)"
							strokeWidth={1.5}
							strokeDasharray="6 4"
							opacity={0.6}
						/>
					{/if}

					<!-- Customizable savings target line -->
					<HorizontalLine
						value={savingsTarget}
						stroke="var(--chart-5)"
						strokeWidth={1}
						strokeDasharray="4 2"
						label="{savingsTarget}% Target"
					/>

					<ZeroLine strokeDasharray="4,4" />
					{#if chartType === 'line-area'}
						<Area fill="var(--chart-2)" opacity={0.2} />
						<Line stroke="var(--chart-2)" strokeWidth={2} />
						<Scatter
							fill={getPointFill}
							radius={getPointRadius}
							hoverRadius={7}
							stroke={getPointStroke}
							strokeWidth={2}
							onclick={(d) => handlePointClick(d)}
							ondblclick={(d) => handlePointDblClick(d)}
						/>
					{:else if chartType === 'line'}
						<Line stroke="var(--chart-2)" strokeWidth={2} />
						<Scatter
							fill={getPointFill}
							radius={getPointRadius}
							hoverRadius={7}
							stroke={getPointStroke}
							strokeWidth={2}
							onclick={(d) => handlePointClick(d)}
							ondblclick={(d) => handlePointDblClick(d)}
						/>
					{:else if chartType === 'area'}
						<Area fill="var(--chart-2)" opacity={0.3} />
						<Scatter
							fill={getPointFill}
							radius={getPointRadius}
							hoverRadius={7}
							stroke={getPointStroke}
							strokeWidth={2}
							onclick={(d) => handlePointClick(d)}
							ondblclick={(d) => handlePointDblClick(d)}
						/>
					{/if}
					<Tooltip externalHoverX={brushHoverX} onclick={(point) => handlePointClick(point)} ondblclick={(point) => handlePointDblClick(point)}>
						{#snippet children({ point })}
							{@const targetDiff = point.savingsRate - savingsTarget}
							{@const histAvgDiff = historicalAverage !== null ? point.savingsRate - historicalAverage : null}
							{@const trendValue = showLinearTrend ? getTrendValueAtIndex(point.index) : null}
							{@const trendDiff = trendValue !== null ? point.savingsRate - trendValue : null}
							{@const mavgValue = showMovingAvg ? getMovingAvgForMonth(point.month) : null}
							{@const yoyInfo = showYoYComparison ? getYoYDataForMonth(point.month) : null}
							<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md min-w-50">
								<p class="font-medium">
									{formatMonthYear(point.date, { long: true, utc: true })}
								</p>
								<p class={point.savingsRate >= 0 ? 'font-semibold text-green-600' : 'font-semibold text-red-600'}>
									{formatPercentRaw(point.savingsRate, 1)} savings rate
								</p>
								<div class="text-muted-foreground mt-1 text-xs">
									<p>Income: {currencyFormatter.format(point.income)}</p>
									<p>Expenses: {currencyFormatter.format(point.expenses)}</p>
									<p>Saved: {currencyFormatter.format(point.savings)}</p>
								</div>

								<!-- Overlay comparisons -->
								<div class="mt-2 border-t pt-2 text-xs space-y-1">
									<!-- Target comparison -->
									<p class={targetDiff >= 0 ? 'text-green-600' : 'text-amber-600'}>
										{targetDiff >= 0 ? '+' : ''}{targetDiff.toFixed(1)}pp vs {savingsTarget}% target
									</p>

									<!-- Historical average comparison -->
									{#if showHistoricalAvg && histAvgDiff !== null}
										<p class={histAvgDiff >= 0 ? 'text-green-600' : 'text-amber-600'}>
											{histAvgDiff >= 0 ? '+' : ''}{histAvgDiff.toFixed(1)}pp vs historical avg
										</p>
									{/if}

									<!-- Trend comparison -->
									{#if showLinearTrend && trendDiff !== null}
										<p class={trendDiff >= 0 ? 'text-green-600' : 'text-amber-600'}>
											{trendDiff >= 0 ? '+' : ''}{trendDiff.toFixed(1)}pp vs trend
										</p>
									{/if}

									<!-- Moving average -->
									{#if showMovingAvg && mavgValue !== null}
										<p class="text-muted-foreground">
											{MOVING_AVG_WINDOW}-mo avg: {formatPercentRaw(mavgValue, 1)}
										</p>
									{/if}

									<!-- Year-over-Year comparison -->
									{#if showYoYComparison && yoyInfo}
										<p class={yoyInfo.yoyChange >= 0 ? 'text-green-600' : 'text-amber-600'}>
											{yoyInfo.yoyChange >= 0 ? '+' : ''}{yoyInfo.yoyChange.toFixed(1)}pp vs last year
											<span class="text-muted-foreground">({formatPercentRaw(yoyInfo.prevYearRate, 1)})</span>
										</p>
									{/if}
								</div>

								<p class="text-muted-foreground mt-2 border-t pt-1 text-xs">Drag to select range, double-click for details</p>
							</div>
						{/snippet}
					</Tooltip>
					<Brush
						onbrush={handleBrushSelect}
						onclick={handleBrushClick}
						onhover={(x) => (brushHoverX = x)}
						fill="var(--primary)"
						opacity={0.15}
					/>
				</Svg>
				</LayerCake>
			</div>

			<!-- Reference benchmarks -->
			<div class="text-muted-foreground mt-3 shrink-0 text-center text-xs">
				<span class="text-green-600">●</span> {savingsTarget}%+ On target |
				<span class="text-yellow-600">●</span> 0-{savingsTarget}% Below target |
				<span class="text-red-600">●</span> Below 0% Overspending
			</div>

			<!-- Active overlays legend -->
			{#if activeAnalysisCount > 0}
				<div class="mt-2 flex shrink-0 flex-wrap justify-center gap-3 text-xs text-muted-foreground">
					{#if showMovingAvg}
						<div class="flex items-center gap-1.5">
							<div class="h-0.5 w-4" style="background-color: var(--chart-1);"></div>
							<span>{MOVING_AVG_WINDOW}-mo Avg</span>
						</div>
					{/if}
					{#if showYoYComparison}
						<div class="flex items-center gap-1.5">
							<div class="h-0.5 w-4 border-t border-dashed border-muted-foreground"></div>
							<span>Last Year</span>
						</div>
					{/if}
					{#if showLinearTrend}
						<div class="flex items-center gap-1.5">
							<div class="h-0.5 w-4 border-t-2 border-dashed" style="border-color: var(--chart-4);"></div>
							<span>Trend</span>
						</div>
					{/if}
					{#if showHistoricalAvg}
						<div class="flex items-center gap-1.5">
							<div class="h-0.5 w-4 border-t-2 border-dashed" style="border-color: var(--chart-6);"></div>
							<span>Hist. Avg</span>
						</div>
					{/if}
					{#if showForecast}
						<div class="flex items-center gap-1.5">
							<div class="h-0.5 w-4 border-t-2 border-dashed" style="border-color: var(--chart-2);"></div>
							<span>Forecast</span>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Selection hint -->
			{#if !chartSelection.isActive}
				<p class="mt-2 shrink-0 text-center text-xs text-muted-foreground">
					Click or drag to select points, double-click for details
				</p>
			{/if}
		</div>
	{/snippet}
</AnalyticsChartShell>

<!-- Chart selection floating panel -->
<ChartSelectionPanel />
