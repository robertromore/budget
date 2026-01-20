<script lang="ts">
	import { Line, Area, AxisX, AxisY, Tooltip, ZeroLine, HorizontalLine, CustomLine, PercentileBands, Scatter, Brush } from '$lib/components/layercake';
	import { AnalysisDropdown, ChartSelectionPanel } from '$lib/components/charts';
	import { timePeriodFilter, type TimePeriod } from '$lib/states/ui/time-period-filter.svelte';
	import { calculateLinearTrend, calculateHistoricalAverage, calculatePercentileBands, type TrendLineData, type PercentileBands as PercentileBandsData } from '$lib/utils/chart-statistics';
	import { formatMonthYear, toMonthString } from '$lib/utils/date-formatters';
	import { LayerCake, Svg } from 'layercake';
	import { scaleLinear } from 'd3-scale';
	import AnalyticsChartShell from './analytics-chart-shell.svelte';
	import type { ChartType } from '$lib/components/layercake';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { chartSelection, type SelectedDataPoint } from '$lib/states/ui/chart-selection.svelte';
	import type { Snippet } from 'svelte';
	import type { ComprehensiveStats } from '$lib/utils/comprehensive-statistics';
	import type { PeriodPresetGroup } from '$lib/utils/time-period';
	import type { TimeSeriesDataPoint, ThresholdLine, OverlayData } from './types';

	interface Props {
		/** Chart data points */
		data: TimeSeriesDataPoint[];
		/** All data (unfiltered) for historical comparisons */
		allData?: TimeSeriesDataPoint[];
		/** Unique chart ID for time period overrides */
		chartId: string;
		/** Y-axis value formatter */
		yFormatter?: (value: number) => string;
		/** Y-axis domain [min, max] */
		yDomain?: [number, number];
		/** Auto-calculate Y domain from data */
		autoYDomain?: boolean;
		/** Add padding to auto Y domain */
		yDomainPadding?: number;
		/** Include zero in Y domain */
		includeZeroInDomain?: boolean;
		/** Horizontal threshold lines */
		thresholdLines?: ThresholdLine[];
		/** Show zero line */
		showZeroLine?: boolean;
		/** Supported chart types */
		supportedChartTypes?: ChartType[];
		/** Default chart type */
		defaultChartType?: ChartType;
		/** Chart stroke color */
		strokeColor?: string;
		/** Fill color for area charts */
		fillColor?: string;
		/** Empty state message */
		emptyMessage?: string;
		/** Allowed time period groups */
		allowedPeriodGroups?: PeriodPresetGroup[];
		/** Show custom date range picker */
		showCustomRange?: boolean;
		/** Comprehensive statistics for stats tab */
		comprehensiveStats?: ComprehensiveStats | null;
		/** Analysis overlay configuration */
		overlays?: {
			linearTrend?: boolean;
			forecast?: boolean;
			historicalAvg?: boolean;
			percentileBands?: boolean;
			movingAvg?: boolean;
			yoyComparison?: boolean;
		};
		/** Forecast horizon in months */
		forecastHorizon?: number;
		/** Moving average window in months */
		movingAvgWindow?: number;
		/** Title snippet */
		title: Snippet;
		/** Subtitle snippet */
		subtitle?: Snippet;
		/** Additional header actions snippet */
		headerActions?: Snippet;
		/** Tooltip content snippet - receives current point data */
		tooltipContent: Snippet<[{ point: TimeSeriesDataPoint; overlayData: OverlayData }]>;
		/** Legend snippet */
		legend?: Snippet;
		/** Custom point fill color function */
		pointFill?: (d: TimeSeriesDataPoint) => string;
		/** Custom point radius function */
		pointRadius?: (d: TimeSeriesDataPoint) => number;
		/** Loading state */
		loading?: boolean;
		/** Error message */
		error?: string | null;
	}

	let {
		data,
		allData,
		chartId,
		yFormatter = (v) => String(v),
		yDomain: customYDomain,
		autoYDomain = true,
		yDomainPadding = 0.1,
		includeZeroInDomain = false,
		thresholdLines = [],
		showZeroLine = false,
		supportedChartTypes = ['line', 'line-area', 'area'],
		defaultChartType = 'line-area',
		strokeColor = 'var(--chart-2)',
		fillColor = 'var(--chart-2)',
		emptyMessage = 'No data available',
		allowedPeriodGroups = ['months', 'year', 'other'],
		showCustomRange = false,
		comprehensiveStats = null,
		overlays = {
			linearTrend: true,
			forecast: true,
			historicalAvg: true,
			percentileBands: true,
			movingAvg: false,
			yoyComparison: false
		},
		forecastHorizon = 3,
		movingAvgWindow = 3,
		title,
		subtitle,
		headerActions,
		tooltipContent,
		legend,
		pointFill,
		pointRadius,
		loading = false,
		error = null
	}: Props = $props();

	// Use allData for historical calculations, fall back to data
	const historicalData = $derived(allData ?? data);

	// Toggle states for analysis overlays
	let showLinearTrend = $state(false);
	let showForecast = $state(false);
	let showHistoricalAvg = $state(false);
	let showPercentileBands = $state(false);
	let showMovingAvg = $state(false);
	let showYoYComparison = $state(false);

	// Brush hover position for Tooltip crosshair
	let brushHoverX = $state<number | null>(null);

	// ===== Analysis Overlay Computed Data =====

	// Convert to spending format for trend calculations
	const dataAsSpending = $derived(data.map(d => ({
		month: d.month,
		monthLabel: d.monthLabel,
		spending: d.value,
		date: d.date,
		index: d.index,
	})));

	// Linear regression line
	const linearTrendData = $derived.by((): TrendLineData | null => {
		if (!showLinearTrend || data.length < 2) return null;
		return calculateLinearTrend(dataAsSpending);
	});

	// Historical average (across ALL data)
	const historicalAverage = $derived.by((): number | null => {
		if (!showHistoricalAvg || historicalData.length === 0) return null;
		const formattedData = historicalData.map(d => ({ spending: d.value }));
		return calculateHistoricalAverage(formattedData);
	});

	// Percentile bands (across ALL data)
	const percentileBands = $derived.by((): PercentileBandsData | null => {
		if (!showPercentileBands || historicalData.length < 4) return null;
		const formattedData = historicalData.map(d => ({ ...d, spending: d.value }));
		return calculatePercentileBands(formattedData);
	});

	// Forecast: project forward using linear regression
	const forecastData = $derived.by(() => {
		if (!showForecast || data.length < 6) return [];

		const trend = calculateLinearTrend(dataAsSpending);
		if (!trend) return [];

		const lastPoint = data[data.length - 1];
		const forecast: Array<{ x: number; y: number; month: string; monthLabel: string; isForecast: true }> = [];

		for (let i = 1; i <= forecastHorizon; i++) {
			const nextDate = new Date(lastPoint.date);
			nextDate.setUTCMonth(nextDate.getUTCMonth() + i);

			const predictedValue = trend.intercept + trend.slope * (lastPoint.index + i);

			const monthStr = toMonthString(nextDate);
			const monthLabel = formatMonthYear(nextDate, { long: true, utc: true });

			forecast.push({
				x: lastPoint.index + i,
				y: predictedValue,
				month: monthStr,
				monthLabel,
				isForecast: true
			});
		}

		return forecast;
	});

	// Moving average
	const movingAvgData = $derived.by(() => {
		if (!showMovingAvg || data.length < movingAvgWindow) return [];

		return data
			.map((d, i, arr) => {
				if (i < movingAvgWindow - 1) return null;

				let sum = 0;
				for (let j = 0; j < movingAvgWindow; j++) {
					sum += arr[i - j].value;
				}
				const avg = sum / movingAvgWindow;

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

		return data.map(d => {
			const [year, monthNum] = d.month.split('-');
			const prevYearMonth = `${parseInt(year) - 1}-${monthNum}`;
			const prevYearData = historicalData.find(m => m.month === prevYearMonth);

			if (!prevYearData) return null;

			return {
				x: d.index,
				y: prevYearData.value,
				month: d.month,
				prevYearMonth: prevYearMonth,
				prevYearValue: prevYearData.value,
				yoyChange: d.value - prevYearData.value
			};
		}).filter((d): d is NonNullable<typeof d> => d !== null);
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
		if (data.length < 2) return null;
		const trend = calculateLinearTrend(dataAsSpending);
		if (!trend) return null;
		return trend.intercept + trend.slope * index;
	}

	// Helper to get moving average value for a specific month
	function getMovingAvgForMonth(month: string): number | null {
		const mavgPoint = movingAvgData.find(d => d.month === month);
		return mavgPoint?.y ?? null;
	}

	// Helper to get YoY data for a specific month
	function getYoYDataForMonth(month: string): { prevYearValue: number; yoyChange: number } | null {
		const yoyPoint = yoyData.find(d => d.month === month);
		if (!yoyPoint) return null;
		return {
			prevYearValue: yoyPoint.prevYearValue,
			yoyChange: yoyPoint.yoyChange
		};
	}

	// Build overlay data for tooltip
	function buildOverlayData(point: TimeSeriesDataPoint): OverlayData {
		return {
			trendValue: showLinearTrend ? getTrendValueAtIndex(point.index) : null,
			historicalAvg: showHistoricalAvg ? historicalAverage : null,
			movingAvg: showMovingAvg ? getMovingAvgForMonth(point.month) : null,
			yoyData: showYoYComparison ? getYoYDataForMonth(point.month) : null
		};
	}

	// Y domain calculation
	const yDomain = $derived.by((): [number, number] => {
		if (customYDomain) return customYDomain;
		if (!autoYDomain || data.length === 0) return [0, 100];

		const values = data.map(d => d.value);
		let min = Math.min(...values);
		let max = Math.max(...values);

		if (includeZeroInDomain) {
			min = Math.min(min, 0);
			max = Math.max(max, 0);
		}

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
			const forecastValues = forecastData.map(d => d.y);
			const forecastMin = Math.min(...forecastValues);
			const forecastMax = Math.max(...forecastValues);
			if (forecastMin < min) min = forecastMin;
			if (forecastMax > max) max = forecastMax;
		}

		// Include threshold lines in y-domain
		for (const line of thresholdLines) {
			if (line.value < min) min = line.value;
			if (line.value > max) max = line.value;
		}

		// Add padding
		const range = max - min;
		const padding = range * yDomainPadding;
		return [min - padding, max + padding];
	});

	// Convert data point to selection format
	function toSelectedPoint(d: TimeSeriesDataPoint): SelectedDataPoint {
		return {
			id: d.month,
			label: d.monthLabel,
			date: d.date,
			value: d.value,
			rawData: d
		};
	}

	// Handle click on data point
	function handlePointClick(d: TimeSeriesDataPoint) {
		chartSelection.toggle(toSelectedPoint(d));
	}

	// Drill-down handler
	function handlePointDblClick(point: TimeSeriesDataPoint) {
		chartInteractions.openDrillDown({
			type: 'month',
			value: point.month,
			label: `${point.monthLabel} Transactions`
		});
	}

	// Get point fill color
	function getPointFill(d: TimeSeriesDataPoint): string {
		if (chartSelection.isSelected(d.month)) {
			return 'var(--primary)';
		}
		if (pointFill) {
			return pointFill(d);
		}
		return strokeColor;
	}

	// Get point radius
	function getPointRadius(d: TimeSeriesDataPoint): number {
		if (chartSelection.isSelected(d.month)) {
			return 6;
		}
		if (pointRadius) {
			return pointRadius(d);
		}
		return 4;
	}

	// Get point stroke
	function getPointStroke(d: TimeSeriesDataPoint): string {
		return chartSelection.isSelected(d.month) ? 'var(--primary-foreground)' : 'var(--background)';
	}

	// Handle brush selection
	function handleBrushSelect(range: { start: Date | number; end: Date | number } | null) {
		if (!range) return;

		const startIdx = typeof range.start === 'number' ? range.start : 0;
		const endIdx = typeof range.end === 'number' ? range.end : 0;

		const pointsInRange = data.filter((d) => {
			return d.index >= startIdx && d.index <= endIdx;
		});

		if (pointsInRange.length > 0) {
			const selectedPoints = pointsInRange.map(toSelectedPoint);
			chartSelection.selectRange(selectedPoints);
		}
	}

	// Handle click from brush
	function handleBrushClick(_x: number, clickValue: Date | number) {
		const clickIndex = typeof clickValue === 'number' ? clickValue : 0;

		let nearestPoint = data[0];
		let minDistance = Infinity;

		for (const point of data) {
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

	// Check which overlays are enabled
	const hasAnyOverlay = $derived(
		overlays.linearTrend ||
		overlays.forecast ||
		overlays.historicalAvg ||
		overlays.percentileBands ||
		overlays.movingAvg ||
		overlays.yoyComparison
	);
</script>

<AnalyticsChartShell
	{data}
	{comprehensiveStats}
	{supportedChartTypes}
	{defaultChartType}
	{emptyMessage}
	{chartId}
	{allowedPeriodGroups}
	{showCustomRange}
	{loading}
	{error}
>
	{#snippet title()}
		{@render title()}
	{/snippet}

	{#snippet subtitle()}
		{#if subtitle}
			{@render subtitle()}
		{/if}
	{/snippet}

	{#snippet headerActions()}
		{#if headerActions}
			{@render headerActions()}
		{/if}

		{#if hasAnyOverlay}
			<AnalysisDropdown
				bind:showLinearTrend
				bind:showForecast
				bind:showHistoricalAvg
				bind:showPercentileBands
				bind:showMovingAvg
				bind:showYoYComparison
				linearTrendEnabled={overlays.linearTrend}
				forecastEnabled={overlays.forecast}
				historicalAvgEnabled={overlays.historicalAvg}
				percentileBandsEnabled={overlays.percentileBands}
				movingAvgEnabled={overlays.movingAvg}
				yoyComparisonEnabled={overlays.yoyComparison}
				{forecastHorizon}
				{movingAvgWindow}
			/>
		{/if}
	{/snippet}

	{#snippet chart({ data: chartData, chartType }: { data: typeof data; chartType: ChartType })}
		<div class="flex h-full w-full flex-col">
			<div class="min-h-0 flex-1">
				<LayerCake
					data={chartData}
					x="index"
					y="value"
					yScale={scaleLinear()}
					{yDomain}
					padding={{ top: 20, right: 20, bottom: 40, left: 60 }}
				>
					<Svg>
						<AxisY ticks={5} gridlines={true} format={yFormatter} />
						<AxisX
							ticks={Math.min(chartData.length, 6)}
							format={(d) => {
								const idx = typeof d === 'number' ? Math.round(d) : 0;
								const point = chartData[idx];
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

						<!-- Moving average line -->
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

						<!-- Threshold lines -->
						{#each thresholdLines as line}
							<HorizontalLine
								value={line.value}
								stroke={line.color ?? 'var(--chart-5)'}
								strokeWidth={line.strokeWidth ?? 1}
								strokeDasharray={line.strokeDasharray ?? '4 2'}
								label={line.label}
							/>
						{/each}

						<!-- Zero line -->
						{#if showZeroLine}
							<ZeroLine strokeDasharray="4,4" />
						{/if}

						<!-- Chart visualization based on type -->
						{#if chartType === 'line-area'}
							<Area fill={fillColor} opacity={0.2} />
							<Line stroke={strokeColor} strokeWidth={2} />
							<Scatter
								fill={getPointFill}
								radius={getPointRadius}
								hoverRadius={7}
								stroke={getPointStroke}
								strokeWidth={2}
								onclick={(d) => handlePointClick(d as TimeSeriesDataPoint)}
								ondblclick={(d) => handlePointDblClick(d as TimeSeriesDataPoint)}
							/>
						{:else if chartType === 'line'}
							<Line stroke={strokeColor} strokeWidth={2} />
							<Scatter
								fill={getPointFill}
								radius={getPointRadius}
								hoverRadius={7}
								stroke={getPointStroke}
								strokeWidth={2}
								onclick={(d) => handlePointClick(d as TimeSeriesDataPoint)}
								ondblclick={(d) => handlePointDblClick(d as TimeSeriesDataPoint)}
							/>
						{:else if chartType === 'area'}
							<Area fill={fillColor} opacity={0.3} />
							<Scatter
								fill={getPointFill}
								radius={getPointRadius}
								hoverRadius={7}
								stroke={getPointStroke}
								strokeWidth={2}
								onclick={(d) => handlePointClick(d as TimeSeriesDataPoint)}
								ondblclick={(d) => handlePointDblClick(d as TimeSeriesDataPoint)}
							/>
						{/if}

						<Tooltip
							externalHoverX={brushHoverX}
							onclick={(point) => handlePointClick(point as TimeSeriesDataPoint)}
							ondblclick={(point) => handlePointDblClick(point as TimeSeriesDataPoint)}
						>
							{#snippet children({ point })}
								{@render tooltipContent({ point: point as TimeSeriesDataPoint, overlayData: buildOverlayData(point as TimeSeriesDataPoint) })}
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

			<!-- Legend -->
			{#if legend}
				{@render legend()}
			{/if}

			<!-- Active overlays legend -->
			{#if activeAnalysisCount > 0}
				<div class="mt-2 flex shrink-0 flex-wrap justify-center gap-3 text-xs text-muted-foreground">
					{#if showMovingAvg}
						<div class="flex items-center gap-1.5">
							<div class="h-0.5 w-4" style="background-color: var(--chart-1);"></div>
							<span>{movingAvgWindow}-mo Avg</span>
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
