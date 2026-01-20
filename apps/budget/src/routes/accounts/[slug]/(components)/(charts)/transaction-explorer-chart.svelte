<script lang="ts">
	import { Scatter, AxisX, AxisY, Tooltip } from '$lib/components/layercake';
	import { Button } from '$lib/components/ui/button';
	import { currencyFormatter } from '$lib/utils/formatters';
	import { formatShortDate } from '$lib/utils/date-formatters';
	import { median, standardDeviation } from '$lib/utils/chart-statistics';
	import type { TransactionsFormat } from '$lib/types';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import { LayerCake, Svg } from 'layercake';
	import { scaleTime, scaleLinear } from 'd3-scale';
	import { extent } from 'd3-array';
	import { AnalyticsChartShell } from '$lib/components/charts';
	import type { ComprehensiveStats } from '$lib/utils/comprehensive-statistics';

	interface Props {
		transactions: TransactionsFormat[];
	}

	let { transactions }: Props = $props();

	// View modes
	type ViewMode = 'all' | 'expenses' | 'income';
	let viewMode = $state<ViewMode>('expenses');

	// Access effective time period for this chart
	const effectivePeriod = $derived(timePeriodFilter.getEffectivePeriod('transaction-explorer'));

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

	// Transform transactions for scatter plot
	const scatterData = $derived.by(() => {
		const data: Array<{
			id: number | string;
			date: Date;
			amount: number;
			absAmount: number;
			payee: string;
			category: string;
			isExpense: boolean;
		}> = [];

		for (const tx of periodFilteredTransactions) {
			const dateObj =
				tx.date instanceof Date
					? tx.date
					: typeof tx.date === 'string'
						? new Date(tx.date)
						: new Date(tx.date?.toString() || '');

			if (isNaN(dateObj.getTime())) continue;

			const isExpense = tx.amount < 0;

			// Filter by view mode
			if (viewMode === 'expenses' && !isExpense) continue;
			if (viewMode === 'income' && isExpense) continue;

			data.push({
				id: tx.id,
				date: dateObj,
				amount: tx.amount,
				absAmount: Math.abs(tx.amount),
				payee: tx.payee?.name || 'Unknown',
				category: tx.category?.name || 'Uncategorized',
				isExpense
			});
		}

		return data.sort((a, b) => a.date.getTime() - b.date.getTime());
	});

	// Summary statistics
	const summaryStats = $derived.by(() => {
		if (scatterData.length === 0) {
			return [
				{ label: 'Transactions', value: '0' },
				{ label: 'Largest', value: '$0.00' },
				{ label: 'Smallest', value: '$0.00' },
				{ label: 'Average', value: '$0.00' }
			];
		}

		const amounts = scatterData.map((d) => d.absAmount);
		const total = amounts.reduce((sum, a) => sum + a, 0);
		const average = total / amounts.length;
		const largest = Math.max(...amounts);
		const smallest = Math.min(...amounts);

		const largestTx = scatterData.find((d) => d.absAmount === largest);

		return [
			{ label: 'Transactions', value: scatterData.length.toString() },
			{
				label: 'Largest',
				value: currencyFormatter.format(largest),
				description: largestTx?.payee
			},
			{ label: 'Smallest', value: currencyFormatter.format(smallest) },
			{ label: 'Average', value: currencyFormatter.format(average) }
		];
	});

	// Comprehensive statistics for the Statistics tab
	const comprehensiveStats = $derived.by((): ComprehensiveStats | null => {
		if (scatterData.length === 0) return null;

		const amounts = scatterData.map((d) => d.absAmount);
		const sortedAmounts = [...amounts].sort((a, b) => a - b);
		const n = amounts.length;

		const total = amounts.reduce((s, a) => s + a, 0);
		const mean = total / n;
		const med = median(sortedAmounts);

		// Standard deviation
		const stdDev = standardDeviation(amounts);

		// Percentiles
		const p25 = sortedAmounts[Math.floor(n * 0.25)] || 0;
		const p50 = med;
		const p75 = sortedAmounts[Math.floor(n * 0.75)] || 0;

		// Find largest and smallest
		const largest = Math.max(...amounts);
		const smallest = Math.min(...amounts);
		const largestTx = scatterData.find((d) => d.absAmount === largest);
		const smallestTx = scatterData.find((d) => d.absAmount === smallest);

		// Date range
		const dates = scatterData.map((d) => d.date.getTime());
		const dateRange = Math.max(...dates) - Math.min(...dates);
		const daysSpan = dateRange / (1000 * 60 * 60 * 24);

		return {
			summary: {
				average: mean,
				median: med,
				total: total,
				count: n
			},
			trend: {
				direction: 'flat',
				growthRate: daysSpan > 0 ? n / daysSpan : null, // Transactions per day
				slope: 0,
				monthlyChange: 0
			},
			distribution: {
				highest: { value: largest, month: largestTx?.payee || 'Largest', monthLabel: largestTx?.date.toLocaleDateString() || '' },
				lowest: { value: smallest, month: smallestTx?.payee || 'Smallest', monthLabel: smallestTx?.date.toLocaleDateString() || '' },
				range: largest - smallest,
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

	const hasData = $derived(scatterData.length > 0);

	// Date and amount domains - use timestamps for LayerCake compatibility
	const dateExtent = $derived.by((): [number, number] => {
		if (!hasData) return [Date.now(), Date.now()];
		const [min, max] = extent(scatterData, (d) => d.date.getTime()) as [number, number];
		return [min, max];
	});

	const amountExtent = $derived.by(() => {
		if (!hasData) return [0, 100];
		const amounts = scatterData.map((d) => d.absAmount);
		return [0, Math.max(...amounts) * 1.1];
	});

	// Track container dimensions
	let containerWidth = $state(0);
	let containerHeight = $state(0);
	const containerReady = $derived(containerWidth > 0 && containerHeight > 0);

	// Hovered point for tooltip
	let hoveredPoint = $state<(typeof scatterData)[0] | null>(null);
</script>

<AnalyticsChartShell
	data={scatterData}
	{comprehensiveStats}
	supportedChartTypes={['bar']}
	defaultChartType="bar"
	emptyMessage="No {viewMode === 'all' ? '' : viewMode} transactions to display"
	chartId="transaction-explorer"
	allowedPeriodGroups={['months', 'year', 'other']}
>
	{#snippet title()}
		Transaction Explorer
	{/snippet}

	{#snippet subtitle()}
		Visualize individual transactions by date and amount
	{/snippet}

	{#snippet headerActions()}
		<div class="flex gap-1">
			<Button
				variant={viewMode === 'expenses' ? 'default' : 'ghost'}
				size="sm"
				onclick={() => (viewMode = 'expenses')}
			>
				Expenses
			</Button>
			<Button
				variant={viewMode === 'income' ? 'default' : 'ghost'}
				size="sm"
				onclick={() => (viewMode = 'income')}
			>
				Income
			</Button>
			<Button
				variant={viewMode === 'all' ? 'default' : 'ghost'}
				size="sm"
				onclick={() => (viewMode = 'all')}
			>
				All
			</Button>
		</div>
	{/snippet}

	{#snippet chart({ data }: { data: typeof scatterData })}
		<div
			class="h-[450px] w-full pb-20"
			bind:clientWidth={containerWidth}
			bind:clientHeight={containerHeight}
		>
			{#if containerReady}
				<LayerCake
					{data}
					x="date"
					y="absAmount"
					xScale={scaleTime()}
					yScale={scaleLinear()}
					xDomain={dateExtent}
					yDomain={amountExtent}
					padding={{ top: 20, right: 20, bottom: 40, left: 60 }}
				>
					<Svg>
						<AxisY ticks={5} gridlines={true} format={(d) => currencyFormatter.format(d)} />
						<AxisX
							ticks={6}
							format={(d) => {
								const date = d instanceof Date ? d : new Date(d);
								return formatShortDate(date);
							}}
						/>
						<Scatter
							fill={viewMode === 'income' ? 'var(--chart-2)' : 'var(--chart-1)'}
							stroke="var(--background)"
							strokeWidth={1}
							radius={5}
							opacity={0.7}
						/>
						<Tooltip crosshair={true} dot={false}>
							{#snippet children({ point, x, y })}
								<foreignObject
									x={Math.min(x + 10, containerWidth - 180)}
									y={Math.max(y - 80, 10)}
									width="160"
									height="70"
								>
									<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
										<p class="font-medium">{point.payee}</p>
										<p class="text-muted-foreground text-xs">{point.category}</p>
										<p class="text-primary font-semibold">
											{currencyFormatter.format(point.absAmount)}
										</p>
										<p class="text-muted-foreground text-xs">
											{point.date.toLocaleDateString()}
										</p>
									</div>
								</foreignObject>
							{/snippet}
						</Tooltip>
					</Svg>
				</LayerCake>
			{/if}
		</div>

		<!-- Insight callouts -->
		<div class="text-muted-foreground mt-4 text-center text-xs">
			{#if viewMode === 'expenses'}
				Showing {scatterData.length} expense transactions. Larger dots represent higher amounts.
			{:else if viewMode === 'income'}
				Showing {scatterData.length} income transactions.
			{:else}
				Showing all {scatterData.length} transactions.
			{/if}
		</div>
	{/snippet}
</AnalyticsChartShell>
