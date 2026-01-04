<script lang="ts">
	import { CustomLine, HorizontalLine, PercentileBands } from '$lib/components/layercake';
	import type { TrendLineData, PercentileBands as PercentileBandsData } from '$lib/utils/chart-statistics';

	interface ForecastPoint {
		index: number;
		x: number;
		y: number;
		predicted: number;
		lower?: number;
		upper?: number;
		confidence?: number;
	}

	interface Props {
		// Toggle states
		showLinearTrend?: boolean;
		showForecast?: boolean;
		showHistoricalAvg?: boolean;
		showPercentileBands?: boolean;
		showBudgetLine?: boolean;

		// Data
		linearTrendData?: TrendLineData | null;
		forecastData?: ForecastPoint[];
		historicalAverage?: number | null;
		percentileBands?: PercentileBandsData | null;
		budgetTarget?: number | null;

		// Styling customization
		linearTrendColor?: string;
		forecastColor?: string;
		historicalAvgColor?: string;
		percentileBandsColor?: string;
		budgetLineColor?: string;
	}

	let {
		showLinearTrend = false,
		showForecast = false,
		showHistoricalAvg = false,
		showPercentileBands = false,
		showBudgetLine = false,
		linearTrendData = null,
		forecastData = [],
		historicalAverage = null,
		percentileBands = null,
		budgetTarget = null,
		linearTrendColor = 'var(--primary)',
		forecastColor = 'var(--chart-2)',
		historicalAvgColor = 'var(--chart-6)',
		percentileBandsColor = 'var(--chart-3)',
		budgetLineColor = 'var(--chart-5)'
	}: Props = $props();
</script>

<!-- Percentile bands (25th-75th shaded area) - lowest layer -->
{#if showPercentileBands && percentileBands}
	<PercentileBands
		p25={percentileBands.p25}
		p75={percentileBands.p75}
		fill={percentileBandsColor}
		opacity={0.15}
	/>
{/if}

<!-- Historical average horizontal line -->
{#if showHistoricalAvg && historicalAverage !== null}
	<HorizontalLine
		value={historicalAverage}
		stroke={historicalAvgColor}
		strokeWidth={1.5}
		strokeDasharray="6 3"
		label="Avg"
	/>
{/if}

<!-- Budget target line -->
{#if showBudgetLine && budgetTarget}
	<HorizontalLine
		value={budgetTarget}
		stroke={budgetLineColor}
		strokeWidth={1.5}
		strokeDasharray="8 4"
		label="Budget"
	/>
{/if}

<!-- Linear regression line -->
{#if showLinearTrend && linearTrendData}
	<CustomLine
		data={linearTrendData.data}
		stroke={linearTrendColor}
		strokeWidth={2}
		strokeDasharray="8 4"
		opacity={0.7}
	/>
{/if}

<!-- Forecast line (dashed to indicate predictions) -->
{#if showForecast && forecastData.length > 0}
	<CustomLine data={forecastData} stroke={forecastColor} strokeWidth={2} strokeDasharray="4 2" opacity={0.8} />
{/if}
