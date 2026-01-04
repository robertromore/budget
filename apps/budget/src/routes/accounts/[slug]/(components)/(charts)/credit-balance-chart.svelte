<script lang="ts">
	import {
		Line,
		Area,
		AxisX,
		AxisY,
		Tooltip,
		HorizontalLine,
		CustomLine,
		PercentileBands,
		Scatter,
		Brush
	} from '$lib/components/layercake';
	import { AnalysisDropdown, ChartSelectionPanel } from '$lib/components/charts';
	import { currencyFormatter } from '$lib/utils/formatters';
	import type { TransactionsFormat } from '$lib/types';
	import type { Account } from '$lib/schema/accounts';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import {
		calculateLinearTrend,
		calculateHistoricalAverage,
		calculatePercentileBands,
		type TrendLineData,
		type PercentileBands as PercentileBandsData
	} from '$lib/utils/chart-statistics';
	import { calculateBalanceHistory, type MonthlyUtilizationPoint } from '$lib/utils/credit-card-analytics';
	import { LayerCake, Svg } from 'layercake';
	import { scaleLinear } from 'd3-scale';
	import { AnalyticsChartShell } from '$lib/components/charts';
	import type { ChartType } from '$lib/components/layercake';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { chartSelection, type SelectedDataPoint } from '$lib/states/ui/chart-selection.svelte';

	interface Props {
		transactions: TransactionsFormat[];
		account?: Account;
	}

	let { transactions, account }: Props = $props();

	// View mode: balance or available credit
	type ViewMode = 'balance' | 'available';
	let viewMode = $state<ViewMode>('balance');

	// Toggle states for analysis overlays
	let showLinearTrend = $state(false);
	let showForecast = $state(false);
	let showHistoricalAvg = $state(false);
	let showPercentileBands = $state(false);
	let showMovingAvg = $state(false);

	// Brush hover position for Tooltip crosshair
	let brushHoverX = $state<number | null>(null);

	// Access effective time period for this chart (per-chart override or global)
	const effectivePeriod = $derived(
		timePeriodFilter.chartOverrides.get('credit-balance') ?? timePeriodFilter.globalPeriod
	);

	// Get credit limit and current balance from account
	const creditLimit = $derived(account?.debtLimit || 0);
	const currentBalance = $derived(Math.abs(account?.balance || 0));

	// Calculate balance history from ALL transactions, working backwards from current balance
	const allMonthlyData = $derived.by(() => {
		return calculateBalanceHistory(transactions, creditLimit, currentBalance);
	});

	// Filter data based on effective time period (chart override or global)
	const monthlyData = $derived.by(() => {
		const period = effectivePeriod;

		if (period.preset !== 'all-time') {
			const range = timePeriodFilter.getDateRange(period);
			if (range) {
				const filtered = allMonthlyData.filter((item) => {
					return item.date >= range.start && item.date <= range.end;
				});
				return filtered.map((item, idx) => ({
					...item,
					index: idx
				}));
			}
		}

		// Default to last 12 months for 'all-time'
		const last12 = allMonthlyData.slice(-12);
		return last12.map((item, idx) => ({
			...item,
			index: idx
		}));
	});

	// Get the display value based on view mode
	function getDisplayValue(d: MonthlyUtilizationPoint): number {
		return viewMode === 'balance' ? d.endingBalance : d.availableCredit;
	}

	// ===== Analysis Overlay Computed Data =====

	// Convert to spending format for trend calculations
	const dataAsSpending = $derived(
		monthlyData.map((d) => ({
			month: d.month,
			monthLabel: d.monthLabel,
			spending: getDisplayValue(d),
			date: d.date,
			index: d.index
		}))
	);

	// Linear regression line
	const linearTrendData = $derived.by((): TrendLineData | null => {
		if (!showLinearTrend || monthlyData.length < 2) return null;
		return calculateLinearTrend(dataAsSpending);
	});

	// Historical average (across ALL data)
	const historicalAverage = $derived.by((): number | null => {
		if (!showHistoricalAvg || allMonthlyData.length === 0) return null;
		const data = allMonthlyData.map((d) => ({ spending: getDisplayValue(d) }));
		return calculateHistoricalAverage(data);
	});

	// Percentile bands (across ALL data)
	const percentileBands = $derived.by((): PercentileBandsData | null => {
		if (!showPercentileBands || allMonthlyData.length < 4) return null;
		const data = allMonthlyData.map((d) => ({ ...d, spending: getDisplayValue(d) }));
		return calculatePercentileBands(data);
	});

	// Forecast
	const FORECAST_HORIZON = 3;
	const forecastData = $derived.by(() => {
		if (!showForecast || monthlyData.length < 6) return [];

		const trend = calculateLinearTrend(dataAsSpending);
		if (!trend) return [];

		const lastPoint = monthlyData[monthlyData.length - 1];
		const forecast: Array<{ x: number; y: number; month: string; monthLabel: string; isForecast: true }> = [];

		for (let i = 1; i <= FORECAST_HORIZON; i++) {
			const nextDate = new Date(lastPoint.date);
			nextDate.setUTCMonth(nextDate.getUTCMonth() + i);

			const predictedValue = trend.intercept + trend.slope * (lastPoint.index + i);
			const clampedValue = Math.max(0, predictedValue);

			const monthStr = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}`;
			const monthLabel = nextDate.toLocaleDateString('en-US', {
				month: 'long',
				year: 'numeric',
				timeZone: 'UTC'
			});

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

				let sum = 0;
				for (let j = 0; j < MOVING_AVG_WINDOW; j++) {
					sum += getDisplayValue(arr[i - j]);
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

	const hasData = $derived(monthlyData.length > 0);

	// Y domain
	const yDomain = $derived.by((): [number, number] => {
		if (!hasData) return [0, creditLimit || 1000];

		const values = monthlyData.map((d) => getDisplayValue(d));
		let max = Math.max(...values, 0);

		// Include credit limit in domain
		if (creditLimit > 0) {
			max = Math.max(max, creditLimit);
		}

		// Include overlays in domain
		if (showHistoricalAvg && historicalAverage !== null) {
			max = Math.max(max, historicalAverage);
		}

		if (showPercentileBands && percentileBands) {
			max = Math.max(max, percentileBands.p75);
		}

		if (showForecast && forecastData.length > 0) {
			const forecastMax = Math.max(...forecastData.map((d) => d.y));
			max = Math.max(max, forecastMax);
		}

		// Add 10% padding
		return [0, max * 1.1];
	});

	// Count active analysis overlays
	const activeAnalysisCount = $derived(
		(showLinearTrend ? 1 : 0) +
			(showForecast ? 1 : 0) +
			(showHistoricalAvg ? 1 : 0) +
			(showPercentileBands ? 1 : 0) +
			(showMovingAvg ? 1 : 0)
	);

	// Helper functions
	function getTrendValueAtIndex(index: number): number | null {
		if (monthlyData.length < 2) return null;
		const trend = calculateLinearTrend(dataAsSpending);
		if (!trend) return null;
		return trend.intercept + trend.slope * index;
	}

	function getMovingAvgForMonth(month: string): number | null {
		const mavgPoint = movingAvgData.find((d) => d.month === month);
		return mavgPoint?.y ?? null;
	}

	// Convert data point to selection format
	function toSelectedPoint(d: MonthlyUtilizationPoint): SelectedDataPoint {
		return {
			id: d.month,
			label: d.monthLabel,
			date: d.date,
			value: getDisplayValue(d),
			rawData: {
				balance: d.endingBalance,
				creditLimit: d.creditLimit,
				availableCredit: d.availableCredit,
				utilization: d.utilization,
				charges: d.charges,
				payments: d.payments
			}
		};
	}

	function handlePointClick(d: MonthlyUtilizationPoint) {
		chartSelection.toggle(toSelectedPoint(d));
	}

	function handlePointDblClick(point: MonthlyUtilizationPoint) {
		chartInteractions.openDrillDown({
			type: 'month',
			value: point.month,
			label: `${point.monthLabel} Transactions`
		});
	}

	// Get point fill color based on balance level
	function getPointFill(d: MonthlyUtilizationPoint): string {
		if (chartSelection.isSelected(d.month)) {
			return 'var(--primary)';
		}
		if (viewMode === 'balance') {
			// For balance: lower is better
			if (d.endingBalance === 0) return 'var(--chart-2)'; // Paid off - green
			if (d.utilization <= 30) return 'var(--chart-2)'; // Low balance - green
			if (d.utilization <= 70) return 'var(--chart-5)'; // Medium - amber
			if (d.utilization <= 100) return 'var(--chart-1)'; // High - orange
			return 'var(--destructive)'; // Over limit - red
		} else {
			// For available credit: higher is better
			if (d.availableCredit >= creditLimit * 0.7) return 'var(--chart-2)'; // Lots available - green
			if (d.availableCredit >= creditLimit * 0.3) return 'var(--chart-5)'; // Some available - amber
			if (d.availableCredit > 0) return 'var(--chart-1)'; // Low available - orange
			return 'var(--destructive)'; // No available - red
		}
	}

	function getPointRadius(d: MonthlyUtilizationPoint): number {
		return chartSelection.isSelected(d.month) ? 6 : 4;
	}

	function getPointStroke(d: MonthlyUtilizationPoint): string {
		return chartSelection.isSelected(d.month) ? 'var(--primary-foreground)' : 'var(--background)';
	}

	function handleBrushSelect(range: { start: Date | number; end: Date | number } | null) {
		if (!range) return;

		const startIdx = typeof range.start === 'number' ? range.start : 0;
		const endIdx = typeof range.end === 'number' ? range.end : 0;

		const pointsInRange = monthlyData.filter((d) => {
			return d.index >= startIdx && d.index <= endIdx;
		});

		if (pointsInRange.length > 0) {
			const selectedPoints = pointsInRange.map(toSelectedPoint);
			chartSelection.selectRange(selectedPoints);
		}
	}

	function handleBrushClick(_x: number, clickValue: Date | number) {
		const clickIndex = typeof clickValue === 'number' ? clickValue : 0;

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
			chartSelection.toggle(toSelectedPoint(nearestPoint));
		}
	}

	// Transform data for LayerCake based on view mode
	const chartData = $derived(
		monthlyData.map((d) => ({
			...d,
			displayValue: getDisplayValue(d)
		}))
	);
</script>

<AnalyticsChartShell
	data={monthlyData}
	supportedChartTypes={['line', 'line-area', 'area']}
	defaultChartType="line-area"
	emptyMessage="No transaction data available"
	chartId="credit-balance"
	allowedPeriodGroups={['months', 'year', 'other']}
>
	{#snippet title()}
		{viewMode === 'balance' ? 'Balance History' : 'Available Credit History'}
	{/snippet}

	{#snippet subtitle()}
		{viewMode === 'balance'
			? 'Credit card balance over time'
			: 'Available credit (limit minus balance) over time'}
	{/snippet}

	{#snippet headerActions()}
		<!-- View Mode Selector -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline" size="sm" class="gap-1">
						{viewMode === 'balance' ? 'Balance' : 'Available'}
						<ChevronDown class="h-3 w-3" />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-44">
				<DropdownMenu.Label>View Mode</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.CheckboxItem checked={viewMode === 'balance'} onCheckedChange={() => (viewMode = 'balance')}>
					Balance
					<span class="text-muted-foreground ml-1 text-xs">(owed)</span>
				</DropdownMenu.CheckboxItem>
				<DropdownMenu.CheckboxItem checked={viewMode === 'available'} onCheckedChange={() => (viewMode = 'available')}>
					Available Credit
					<span class="text-muted-foreground ml-1 text-xs">(remaining)</span>
				</DropdownMenu.CheckboxItem>
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<AnalysisDropdown
			bind:showLinearTrend
			bind:showForecast
			bind:showHistoricalAvg
			bind:showPercentileBands
			bind:showMovingAvg
			showYoYComparison={false}
			forecastEnabled={true}
			forecastHorizon={FORECAST_HORIZON}
			movingAvgEnabled={true}
			movingAvgWindow={MOVING_AVG_WINDOW}
		/>
	{/snippet}

	{#snippet chart({ data, chartType }: { data: typeof monthlyData; chartType: ChartType })}
		<div class="flex h-full w-full flex-col">
			<div class="min-h-0 flex-1">
				<LayerCake
					data={chartData}
					x="index"
					y="displayValue"
					yScale={scaleLinear()}
					{yDomain}
					padding={{ top: 20, right: 20, bottom: 40, left: 70 }}
				>
					<Svg>
						<AxisY ticks={5} gridlines={true} format={(d) => currencyFormatter.format(d)} />
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
							<PercentileBands p25={percentileBands.p25} p75={percentileBands.p75} fill="var(--chart-3)" opacity={0.15} />
						{/if}

						<!-- Historical average line -->
						{#if showHistoricalAvg && historicalAverage !== null}
							<HorizontalLine value={historicalAverage} stroke="var(--chart-6)" strokeWidth={1.5} strokeDasharray="6 3" label="Avg" />
						{/if}

						<!-- Linear regression line -->
						{#if showLinearTrend && linearTrendData}
							<CustomLine data={linearTrendData.data} stroke="var(--chart-4)" strokeWidth={2} strokeDasharray="8 4" opacity={0.7} />
						{/if}

						<!-- Forecast line -->
						{#if showForecast && forecastData.length > 0}
							<CustomLine data={forecastData} stroke="var(--chart-2)" strokeWidth={2} strokeDasharray="4 2" opacity={0.6} />
						{/if}

						<!-- 3-month moving average line -->
						{#if showMovingAvg && movingAvgData.length > 0}
							<CustomLine data={movingAvgData} stroke="var(--chart-1)" strokeWidth={2} opacity={0.8} />
						{/if}

						<!-- Credit Limit reference line -->
						{#if creditLimit > 0}
							<HorizontalLine
								value={viewMode === 'balance' ? creditLimit : 0}
								stroke="var(--destructive)"
								strokeWidth={1.5}
								strokeDasharray="6 3"
								label={viewMode === 'balance' ? 'Credit Limit' : '$0'}
							/>
						{/if}

						{#if chartType === 'line-area'}
							<Area fill={viewMode === 'balance' ? 'var(--chart-1)' : 'var(--chart-2)'} opacity={0.2} />
							<Line stroke={viewMode === 'balance' ? 'var(--chart-1)' : 'var(--chart-2)'} strokeWidth={2} />
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
							<Line stroke={viewMode === 'balance' ? 'var(--chart-1)' : 'var(--chart-2)'} strokeWidth={2} />
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
							<Area fill={viewMode === 'balance' ? 'var(--chart-1)' : 'var(--chart-2)'} opacity={0.3} />
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
								{@const histAvgDiff = historicalAverage !== null ? getDisplayValue(point) - historicalAverage : null}
								{@const trendValue = showLinearTrend ? getTrendValueAtIndex(point.index) : null}
								{@const trendDiff = trendValue !== null ? getDisplayValue(point) - trendValue : null}
								{@const mavgValue = showMovingAvg ? getMovingAvgForMonth(point.month) : null}
								<div class="min-w-52 rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
									<p class="font-medium">
										{point.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
									</p>
									<p class="font-semibold">
										{currencyFormatter.format(getDisplayValue(point))}
										<span class="text-muted-foreground font-normal">
											{viewMode === 'balance' ? 'balance' : 'available'}
										</span>
									</p>
									<div class="text-muted-foreground mt-1 text-xs">
										<p>Balance: {currencyFormatter.format(point.endingBalance)}</p>
										<p>Available: {currencyFormatter.format(point.availableCredit)}</p>
										<p>Utilization: {point.utilization.toFixed(1)}%</p>
										{#if creditLimit > 0}
											<p>Credit Limit: {currencyFormatter.format(creditLimit)}</p>
										{/if}
									</div>

									<!-- Activity this month -->
									<div class="text-muted-foreground mt-2 border-t pt-2 text-xs">
										<p>Charges: {currencyFormatter.format(point.charges)}</p>
										<p>Payments: {currencyFormatter.format(point.payments)}</p>
									</div>

									<!-- Overlay comparisons -->
									{#if activeAnalysisCount > 0}
										<div class="mt-2 space-y-1 border-t pt-2 text-xs">
											{#if showHistoricalAvg && histAvgDiff !== null}
												{@const isBetter = viewMode === 'balance' ? histAvgDiff <= 0 : histAvgDiff >= 0}
												<p class={isBetter ? 'text-green-600' : 'text-amber-600'}>
													{histAvgDiff >= 0 ? '+' : ''}{currencyFormatter.format(histAvgDiff)} vs avg
												</p>
											{/if}

											{#if showLinearTrend && trendDiff !== null}
												{@const isBetter = viewMode === 'balance' ? trendDiff <= 0 : trendDiff >= 0}
												<p class={isBetter ? 'text-green-600' : 'text-amber-600'}>
													{trendDiff >= 0 ? '+' : ''}{currencyFormatter.format(trendDiff)} vs trend
												</p>
											{/if}

											{#if showMovingAvg && mavgValue !== null}
												<p class="text-muted-foreground">
													{MOVING_AVG_WINDOW}-mo avg: {currencyFormatter.format(mavgValue)}
												</p>
											{/if}
										</div>
									{/if}

									<p class="text-muted-foreground mt-2 border-t pt-1 text-xs">Drag to select range, double-click for details</p>
								</div>
							{/snippet}
						</Tooltip>
						<Brush onbrush={handleBrushSelect} onclick={handleBrushClick} onhover={(x) => (brushHoverX = x)} fill="var(--primary)" opacity={0.15} />
					</Svg>
				</LayerCake>
			</div>

			<!-- Current balance summary -->
			{#if creditLimit > 0}
				<div class="text-muted-foreground mt-3 shrink-0 text-center text-xs">
					Current: {currencyFormatter.format(currentBalance)} of {currencyFormatter.format(creditLimit)} ({((currentBalance / creditLimit) * 100).toFixed(1)}% used)
				</div>
			{/if}

			<!-- Active overlays legend -->
			{#if activeAnalysisCount > 0}
				<div class="text-muted-foreground mt-2 flex shrink-0 flex-wrap justify-center gap-3 text-xs">
					{#if showMovingAvg}
						<div class="flex items-center gap-1.5">
							<div class="h-0.5 w-4" style="background-color: var(--chart-1);"></div>
							<span>{MOVING_AVG_WINDOW}-mo Avg</span>
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
				<p class="text-muted-foreground mt-2 shrink-0 text-center text-xs">Click or drag to select points, double-click for details</p>
			{/if}
		</div>
	{/snippet}
</AnalyticsChartShell>

<!-- Chart selection floating panel -->
<ChartSelectionPanel />
