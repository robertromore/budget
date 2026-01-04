<script lang="ts">
	import { MultiLine, MultiScatter, AxisX, AxisY, Tooltip, CustomLine, HorizontalLine } from '$lib/components/layercake';
	import { AnalysisDropdown } from '$lib/components/charts';
	import { currencyFormatter } from '$lib/utils/formatters';
	import type { TransactionsFormat } from '$lib/types';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { calculateLinearTrend, calculateHistoricalAverage, type TrendLineData } from '$lib/utils/chart-statistics';
	import { LayerCake, Svg } from 'layercake';
	import { scaleLinear } from 'd3-scale';
	import { AnalyticsChartShell } from '$lib/components/charts';
	import type { ComprehensiveStats } from '$lib/utils/comprehensive-statistics';

	interface Props {
		transactions: TransactionsFormat[];
	}

	let { transactions }: Props = $props();

	// Toggle states for analysis overlays
	let showLinearTrend = $state(false);
	let showForecast = $state(false);
	let showHistoricalAvg = $state(false);
	let showPercentileBands = $state(false);

	// Access effective time period for this chart
	const effectivePeriod = $derived(timePeriodFilter.getEffectivePeriod('payee-trends'));

	// Helper to extract date string
	function getDateString(date: unknown): string {
		if (date instanceof Date) {
			return date.toISOString().split('T')[0];
		}
		if (typeof date === 'string') {
			return date.split('T')[0];
		}
		if (date) {
			return String(date).split('T')[0];
		}
		return '';
	}

	// Filter transactions based on time period
	const filteredTransactions = $derived.by(() => {
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

	// Get top payees by total spending
	const topPayees = $derived.by(() => {
		const payeeTotals = new Map<string, number>();

		for (const tx of filteredTransactions) {
			if (tx.amount >= 0) continue;
			const payee = tx.payee?.name || 'Unknown';
			payeeTotals.set(payee, (payeeTotals.get(payee) || 0) + Math.abs(tx.amount));
		}

		return Array.from(payeeTotals.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)
			.map(([name]) => name);
	});

	// Calculate monthly spending per payee from ALL data (for historical avg)
	const allMonthlyPayeeData = $derived.by(() => {
		const dataByMonth = new Map<string, Map<string, number>>();

		for (const tx of transactions) {
			if (tx.amount >= 0) continue;

			const payee = tx.payee?.name || 'Unknown';
			if (!topPayees.includes(payee)) continue;

			const dateStr = getDateString(tx.date);
			if (!dateStr) continue;

			const monthKey = dateStr.substring(0, 7);

			if (!dataByMonth.has(monthKey)) {
				dataByMonth.set(monthKey, new Map());
			}

			const monthData = dataByMonth.get(monthKey)!;
			monthData.set(payee, (monthData.get(payee) || 0) + Math.abs(tx.amount));
		}

		return Array.from(dataByMonth.entries())
			.sort((a, b) => a[0].localeCompare(b[0]))
			.map(([month, payeeData], idx) => {
				const [year, monthNum] = month.split('-');
				const result: { month: string; date: Date; index: number; [key: string]: string | number | Date } = {
					month,
					date: new Date(Date.UTC(parseInt(year), parseInt(monthNum) - 1, 15, 12, 0, 0)),
					index: idx
				};

				for (const payee of topPayees) {
					result[payee] = payeeData.get(payee) || 0;
				}

				return result;
			});
	});

	// Filter monthly data based on period
	const monthlyPayeeData = $derived.by(() => {
		const period = effectivePeriod;

		if (period.preset !== 'all-time') {
			const range = timePeriodFilter.getDateRange(period);
			if (range) {
				const filtered = allMonthlyPayeeData.filter((item) => {
					return item.date >= range.start && item.date <= range.end;
				});
				return filtered.map((item, idx) => ({ ...item, index: idx }));
			}
		}

		// Default to last 12 months
		const last12 = allMonthlyPayeeData.slice(-12);
		return last12.map((item, idx) => ({ ...item, index: idx }));
	});

	// Colors for each payee
	const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

	// Calculate historical average across all payees
	const historicalAverage = $derived.by((): number | null => {
		if (!showHistoricalAvg || allMonthlyPayeeData.length === 0) return null;
		const allValues: number[] = [];
		for (const d of allMonthlyPayeeData) {
			for (const payee of topPayees) {
				const val = d[payee] as number;
				if (val > 0) allValues.push(val);
			}
		}
		if (allValues.length === 0) return null;
		return allValues.reduce((s, v) => s + v, 0) / allValues.length;
	});

	// Calculate linear trend for the primary (top) payee
	const linearTrendData = $derived.by((): TrendLineData | null => {
		if (!showLinearTrend || monthlyPayeeData.length < 2 || topPayees.length === 0) return null;
		const primaryPayee = topPayees[0];
		const trendData = monthlyPayeeData.map((d) => ({
			month: d.month,
			monthLabel: d.month,
			spending: (d[primaryPayee] as number) || 0,
			date: d.date,
			index: d.index
		}));
		return calculateLinearTrend(trendData);
	});

	// Summary statistics
	const summaryStats = $derived.by(() => {
		if (topPayees.length === 0 || monthlyPayeeData.length === 0) {
			return [
				{ label: 'Top Payees', value: '0' },
				{ label: 'Months Shown', value: '0' },
				{ label: 'Trending Up', value: 'N/A' },
				{ label: 'Trending Down', value: 'N/A' }
			];
		}

		// Calculate trends for each payee
		const trends = topPayees.map((payee) => {
			const values = monthlyPayeeData.map((d) => (d[payee] as number) || 0);
			const recent = values.slice(-3);
			const previous = values.slice(-6, -3);

			const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
			const previousAvg = previous.length > 0 ? previous.reduce((s, v) => s + v, 0) / previous.length : recentAvg;
			const trend = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

			return { payee, trend };
		});

		const trendingUp = trends.filter((t) => t.trend > 10).sort((a, b) => b.trend - a.trend)[0];
		const trendingDown = trends.filter((t) => t.trend < -10).sort((a, b) => a.trend - b.trend)[0];

		return [
			{ label: 'Top Payees', value: topPayees.length.toString() },
			{ label: 'Months Shown', value: monthlyPayeeData.length.toString() },
			{
				label: 'Trending Up',
				value: trendingUp ? trendingUp.payee.substring(0, 12) : 'None',
				description: trendingUp ? `+${trendingUp.trend.toFixed(0)}%` : undefined
			},
			{
				label: 'Trending Down',
				value: trendingDown ? trendingDown.payee.substring(0, 12) : 'None',
				description: trendingDown ? `${trendingDown.trend.toFixed(0)}%` : undefined
			}
		];
	});

	// Comprehensive statistics for the Statistics tab
	const comprehensiveStats = $derived.by((): ComprehensiveStats | null => {
		if (topPayees.length === 0 || monthlyPayeeData.length === 0) return null;

		// Aggregate all spending values
		const allValues: number[] = [];
		const payeeTotals = new Map<string, number>();

		for (const d of monthlyPayeeData) {
			for (const payee of topPayees) {
				const val = (d[payee] as number) || 0;
				if (val > 0) {
					allValues.push(val);
					payeeTotals.set(payee, (payeeTotals.get(payee) || 0) + val);
				}
			}
		}

		if (allValues.length === 0) return null;

		const sortedValues = [...allValues].sort((a, b) => a - b);
		const mean = allValues.reduce((s, v) => s + v, 0) / allValues.length;
		const median = sortedValues[Math.floor(sortedValues.length / 2)];
		const total = allValues.reduce((s, v) => s + v, 0);

		// Find highest payee
		const highestPayee = Array.from(payeeTotals.entries()).reduce((a, b) => (a[1] > b[1] ? a : b));
		const lowestPayee = Array.from(payeeTotals.entries()).reduce((a, b) => (a[1] < b[1] ? a : b));

		// Percentiles
		const p25 = sortedValues[Math.floor(sortedValues.length * 0.25)] || 0;
		const p50 = median;
		const p75 = sortedValues[Math.floor(sortedValues.length * 0.75)] || 0;

		// Standard deviation
		const variance = allValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / allValues.length;
		const stdDev = Math.sqrt(variance);

		// Trend calculation
		const trends = topPayees.map((payee) => {
			const values = monthlyPayeeData.map((d) => (d[payee] as number) || 0);
			const recent = values.slice(-3);
			const previous = values.slice(-6, -3);
			const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
			const previousAvg = previous.length > 0 ? previous.reduce((s, v) => s + v, 0) / previous.length : recentAvg;
			return previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
		});
		const avgTrend = trends.reduce((s, t) => s + t, 0) / trends.length;
		const trendDirection: 'up' | 'down' | 'flat' = avgTrend > 5 ? 'up' : avgTrend < -5 ? 'down' : 'flat';

		return {
			summary: {
				average: mean,
				median: median,
				total: total,
				count: allValues.length
			},
			trend: {
				direction: trendDirection,
				growthRate: avgTrend,
				slope: linearTrendData?.slope || 0,
				monthlyChange: 0
			},
			distribution: {
				highest: { value: highestPayee[1], month: highestPayee[0], monthLabel: highestPayee[0] },
				lowest: { value: lowestPayee[1], month: lowestPayee[0], monthLabel: lowestPayee[0] },
				range: highestPayee[1] - lowestPayee[1],
				p25,
				p50,
				p75,
				iqr: p75 - p25,
				stdDev,
				coefficientOfVariation: mean !== 0 ? (stdDev / mean) * 100 : 0
			},
			outliers: { count: 0, months: [] },
			comparison: {
				vsHistoricalAvg: historicalAverage !== null ? mean - historicalAverage : null,
				vsHistoricalAvgPercent: historicalAverage !== null && historicalAverage > 0 ? ((mean - historicalAverage) / historicalAverage) * 100 : null,
				vsBudgetTarget: null,
				vsBudgetTargetPercent: null,
				vsLastYearTotal: null,
				vsLastYearPercent: null
			}
		};
	});

	const hasData = $derived(monthlyPayeeData.length > 0 && topPayees.length > 0);

	// Handle drill-down to view transactions for a payee in a specific month
	function handleDrillDown(point: typeof monthlyPayeeData[0], payee: string) {
		chartInteractions.openDrillDown({
			type: 'payee-month',
			value: { payee, month: point.month },
			label: `${payee} - ${point.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`
		});
	}

	// Y domain
	const yMax = $derived.by(() => {
		if (!hasData) return 100;
		let max = 0;
		for (const d of monthlyPayeeData) {
			for (const payee of topPayees) {
				const val = (d[payee] as number) || 0;
				if (val > max) max = val;
			}
		}
		// Include historical average in domain
		if (showHistoricalAvg && historicalAverage !== null && historicalAverage > max) {
			max = historicalAverage;
		}
		return max * 1.1;
	});
</script>

<AnalyticsChartShell
	data={monthlyPayeeData}
	{comprehensiveStats}
	supportedChartTypes={['line']}
	defaultChartType="line"
	emptyMessage="No payee data available"
	chartId="payee-trends"
	allowedPeriodGroups={['months', 'year', 'other']}
>
	{#snippet title()}
		Payee Spending Trends
	{/snippet}

	{#snippet subtitle()}
		Track spending patterns at your top payees over time
	{/snippet}

	{#snippet headerActions()}
		<AnalysisDropdown
			bind:showLinearTrend
			bind:showForecast
			bind:showHistoricalAvg
			bind:showPercentileBands
			forecastEnabled={false}
			percentileEnabled={false}
		/>
	{/snippet}

	{#snippet chart({ data }: { data: typeof monthlyPayeeData })}
		<div class="h-full w-full pb-20">
			<LayerCake
				{data}
				x="index"
				y={(d) => Math.max(...topPayees.map((p) => (d[p] as number) || 0))}
				xScale={scaleLinear()}
				xDomain={[0, Math.max(data.length - 1, 1)]}
				yScale={scaleLinear()}
				yDomain={[0, yMax]}
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
							return point.date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
						}}
					/>

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

					<!-- Linear trend line (for primary payee) -->
					{#if showLinearTrend && linearTrendData}
						<CustomLine
							data={linearTrendData.data}
							stroke="var(--chart-4)"
							strokeWidth={2}
							strokeDasharray="8 4"
							opacity={0.5}
						/>
					{/if}

					{#each topPayees as payee, pi}
						{@const color = colors[pi % colors.length]}
						<MultiLine y={payee} stroke={color} strokeWidth={2} />
						<MultiScatter y={payee} fill={color} radius={4} onclick={(point) => handleDrillDown(point, payee)} />
					{/each}
					<Tooltip>
						{#snippet children({ point })}
							<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
								<p class="font-medium">
									{point.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
								</p>
								{#each topPayees as payee, pi}
									<p style="color: {colors[pi % colors.length]}">
										{payee}: {currencyFormatter.format(point[payee] as number)}
									</p>
								{/each}
							</div>
						{/snippet}
					</Tooltip>
				</Svg>
			</LayerCake>

			<!-- Legend -->
			<div class="mt-4 flex flex-wrap justify-center gap-4">
			{#each topPayees as payee, i}
				<div class="flex items-center gap-2">
					<div class="h-0.5 w-4" style="background-color: {colors[i % colors.length]}"></div>
					<span class="text-sm">{payee}</span>
				</div>
			{/each}
			</div>
		</div>
	{/snippet}
</AnalyticsChartShell>
