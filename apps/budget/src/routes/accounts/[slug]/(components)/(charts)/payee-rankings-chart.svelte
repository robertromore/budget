<script lang="ts">
	import { HorizontalBar, AxisX } from '$lib/components/layercake';
	import { currencyFormatter } from '$lib/utils/formatters';
	import type { TransactionsFormat } from '$lib/types';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import { LayerCake, Svg, Html } from 'layercake';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { AnalyticsChartShell } from '$lib/components/charts';
	import type { ComprehensiveStats } from '$lib/utils/comprehensive-statistics';
	import { parseDateStringToUTC } from '$lib/utils/date-formatters';

	interface Props {
		transactions: TransactionsFormat[];
		limit?: number;
	}

	let { transactions, limit = 10 }: Props = $props();

	// Track hovered bar for tooltip
	let hoveredItem = $state<typeof payeeData[0] | null>(null);

	// Access effective time period for this chart
	const effectivePeriod = $derived(timePeriodFilter.getEffectivePeriod('payee-rankings'));

	// Helper to parse transaction date
	function getTxDate(tx: TransactionsFormat): Date {
		return tx.date instanceof Date ? tx.date : parseDateStringToUTC(tx.date?.toString() || '');
	}

	// Calculate current and previous period date ranges using global utilities
	const periodRanges = $derived.by(() => {
		const period = effectivePeriod;

		if (period.preset === 'all-time') {
			return null; // No comparison for all-time
		}

		const currentRange = timePeriodFilter.getDateRange(period);
		const previousRange = timePeriodFilter.getPreviousPeriodRange(period);

		if (!currentRange || !previousRange) return null;

		return {
			current: currentRange,
			previous: previousRange
		};
	});

	// Filter transactions for current period
	const periodFilteredTransactions = $derived.by(() => {
		if (!periodRanges) return transactions;

		return transactions.filter((tx) => {
			const date = getTxDate(tx);
			return !isNaN(date.getTime()) && date >= periodRanges.current.start && date <= periodRanges.current.end;
		});
	});

	// Filter transactions for previous period (for comparison)
	const previousPeriodTransactions = $derived.by(() => {
		if (!periodRanges) return [];

		return transactions.filter((tx) => {
			const date = getTxDate(tx);
			return !isNaN(date.getTime()) && date >= periodRanges.previous.start && date <= periodRanges.previous.end;
		});
	});

	// Aggregate previous period by payee for comparison
	const previousPayeeTotals = $derived.by(() => {
		const totals = new Map<string, number>();

		for (const tx of previousPeriodTransactions) {
			if (tx.amount >= 0) continue;
			const payeeName = tx.payee?.name || 'Unknown';
			totals.set(payeeName, (totals.get(payeeName) || 0) + Math.abs(tx.amount));
		}

		return totals;
	});

	// Aggregate by payee with comparison data
	const payeeData = $derived.by(() => {
		const payeeTotals = new Map<
			string,
			{ id: number; name: string; total: number; count: number }
		>();

		for (const tx of periodFilteredTransactions) {
			if (tx.amount >= 0) continue; // Only expenses

			const payeeName = tx.payee?.name || 'Unknown';
			const payeeId = tx.payee?.id || 0;

			const current = payeeTotals.get(payeeName) || {
				id: payeeId,
				name: payeeName,
				total: 0,
				count: 0
			};
			current.total += Math.abs(tx.amount);
			current.count += 1;
			payeeTotals.set(payeeName, current);
		}

		// Sort by total and take top N, adding comparison metrics
		return Array.from(payeeTotals.values())
			.sort((a, b) => b.total - a.total)
			.slice(0, limit)
			.map((p, index) => {
				const previousTotal = previousPayeeTotals.get(p.name) || 0;
				const change = previousTotal > 0 ? ((p.total - previousTotal) / previousTotal) * 100 : null;
				const avgTransaction = p.count > 0 ? p.total / p.count : 0;

				return {
					...p,
					rank: index + 1,
					y: p.name,
					x: p.total,
					index,
					previousTotal,
					change,
					avgTransaction,
					isNew: previousTotal === 0 && periodRanges !== null
				};
			});
	});

	// Summary statistics - more actionable metrics
	const summaryStats = $derived.by(() => {
		if (payeeData.length === 0) {
			return [
				{ label: 'Total Payees', value: '0' },
				{ label: 'Top Payee', value: '-' },
				{ label: 'Avg Transaction', value: '$0.00' },
				{ label: 'New This Period', value: '0' }
			];
		}

		const total = payeeData.reduce((sum, p) => sum + p.total, 0);
		const topPayee = payeeData[0];
		const totalTransactions = payeeData.reduce((sum, p) => sum + p.count, 0);
		const avgTransaction = totalTransactions > 0 ? total / totalTransactions : 0;
		const newPayees = payeeData.filter((p) => p.isNew).length;
		const increasedPayees = payeeData.filter((p) => p.change !== null && p.change > 0).length;

		// Determine the most notable change
		const biggestIncrease = payeeData
			.filter((p) => p.change !== null && p.change > 0)
			.sort((a, b) => (b.change || 0) - (a.change || 0))[0];

		return [
			{
				label: 'Top Payee',
				value: topPayee?.name || '-',
				description: topPayee?.change !== null
					? `${topPayee.change >= 0 ? '+' : ''}${topPayee.change.toFixed(0)}% vs prev`
					: `${topPayee?.count || 0} transactions`
			},
			{
				label: 'Avg Transaction',
				value: currencyFormatter.format(avgTransaction),
				description: `${totalTransactions} total`
			},
			{
				label: 'Spending Up',
				value: increasedPayees.toString(),
				description: biggestIncrease
					? `${biggestIncrease.name.slice(0, 10)}... +${biggestIncrease.change?.toFixed(0)}%`
					: 'payees'
			},
			{
				label: 'New Payees',
				value: newPayees.toString(),
				description: periodRanges ? 'this period' : 'all time'
			}
		];
	});

	// Comprehensive statistics for the Statistics tab
	const comprehensiveStats = $derived.by((): ComprehensiveStats | null => {
		if (payeeData.length === 0) return null;

		const totals = payeeData.map((p) => p.total);
		const sortedTotals = [...totals].sort((a, b) => a - b);
		const n = totals.length;

		const total = totals.reduce((s, t) => s + t, 0);
		const mean = total / n;
		const median = sortedTotals[Math.floor(n / 2)] || 0;

		// Standard deviation
		const variance = totals.reduce((s, t) => s + Math.pow(t - mean, 2), 0) / n;
		const stdDev = Math.sqrt(variance);

		// Percentiles
		const p25 = sortedTotals[Math.floor(n * 0.25)] || 0;
		const p50 = median;
		const p75 = sortedTotals[Math.floor(n * 0.75)] || 0;

		// Concentration - top 3 payees as % of total
		const top3Total = payeeData.slice(0, 3).reduce((s, p) => s + p.total, 0);
		const concentration = total > 0 ? (top3Total / total) * 100 : 0;

		return {
			summary: {
				average: mean,
				median: median,
				total: total,
				count: payeeData.reduce((s, p) => s + p.count, 0)
			},
			trend: {
				direction: 'flat',
				growthRate: concentration,
				slope: 0,
				monthlyChange: 0
			},
			distribution: {
				highest: { value: payeeData[0].total, month: payeeData[0].name, monthLabel: payeeData[0].name },
				lowest: { value: payeeData[n - 1].total, month: payeeData[n - 1].name, monthLabel: payeeData[n - 1].name },
				range: payeeData[0].total - payeeData[n - 1].total,
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

	const hasData = $derived(payeeData.length > 0);

	// Track container dimensions
	let containerWidth = $state(0);
	let containerHeight = $state(0);
	const containerReady = $derived(containerWidth > 0 && containerHeight > 0);

	// Max value for x-scale
	const maxValue = $derived(hasData ? Math.max(...payeeData.map((p) => p.total)) : 100);

	// Color function for bars based on trend
	function getBarColor(payee: typeof payeeData[0]): string {
		if (payee.change !== null) {
			if (payee.change > 20) return 'var(--destructive)'; // Significant increase
			if (payee.change < -20) return 'var(--chart-4)'; // Significant decrease (good)
		}
		if (payee.isNew) return 'var(--chart-3)'; // New payee
		return 'var(--chart-1)'; // Default
	}
</script>

<AnalyticsChartShell
	data={payeeData}
	{comprehensiveStats}
	supportedChartTypes={['bar']}
	defaultChartType="bar"
	emptyMessage="No spending data available"
	chartId="payee-rankings"
	allowedPeriodGroups={['months', 'year', 'other']}
>
	{#snippet title()}
		Top Payees
	{/snippet}

	{#snippet subtitle()}
		Ranked by total spending with period comparison
	{/snippet}

	{#snippet chart({ data }: { data: typeof payeeData })}
		<div
			class="w-full pb-8"
			style="height: {Math.max(300, data.length * 44)}px"
			bind:clientWidth={containerWidth}
			bind:clientHeight={containerHeight}
		>
			{#if containerReady}
				<LayerCake
					{data}
					x="total"
					y="name"
					xDomain={[0, maxValue * 1.15]}
					padding={{ top: 10, right: 80, bottom: 30, left: 140 }}
				>
					<Svg>
						<AxisX ticks={5} gridlines={true} format={(d) => currencyFormatter.format(d)} />
						<HorizontalBar
							fill={(d) => getBarColor(d)}
							opacity={0.85}
							hoverOpacity={1}
							radius={4}
							gap={8}
							onhover={(d) => (hoveredItem = d)}
							onclick={(d) => {
								chartInteractions.openDrillDown({
									type: 'payee',
									value: d.name,
									label: `${d.name} Transactions`
								});
							}}
						/>
					</Svg>
					<Html pointerEvents={false}>
						{#if hoveredItem}
							<div class="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
								<div class="min-w-55 rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
									<p class="font-medium">{hoveredItem.name}</p>
									<div class="mt-1 space-y-0.5">
										<p class="text-muted-foreground">
											Total: {currencyFormatter.format(hoveredItem.total)}
											{#if hoveredItem.change !== null}
												<span class={hoveredItem.change >= 0 ? 'text-destructive' : 'text-green-600'}>
													({hoveredItem.change >= 0 ? '+' : ''}{hoveredItem.change.toFixed(0)}%)
												</span>
											{:else if hoveredItem.isNew}
												<span class="text-blue-600">(new)</span>
											{/if}
										</p>
										<p class="text-muted-foreground">
											{hoveredItem.count} txn{hoveredItem.count !== 1 ? 's' : ''} @ {currencyFormatter.format(hoveredItem.avgTransaction)} avg
										</p>
										{#if hoveredItem.previousTotal > 0}
											<p class="text-muted-foreground text-xs border-t pt-1 mt-1">
												Prev period: {currencyFormatter.format(hoveredItem.previousTotal)}
											</p>
										{/if}
									</div>
								</div>
							</div>
						{/if}
					</Html>

					<!-- Payee labels on left with trend indicators -->
					{#each data as payee, i}
						{@const slotHeight = (containerHeight - 40) / data.length}
						{@const yPos = 10 + i * slotHeight + slotHeight / 2}
						<g>
							<text
								x={135}
								y={yPos}
								text-anchor="end"
								dominant-baseline="middle"
								class="fill-foreground text-xs"
							>
								{payee.name.length > 18 ? payee.name.slice(0, 18) + '...' : payee.name}
							</text>
							<!-- Trend indicator next to name -->
							{#if payee.change !== null}
								<text
									x={138}
									y={yPos}
									dominant-baseline="middle"
									class="text-[9px] font-medium {payee.change >= 0 ? 'fill-destructive' : 'fill-green-600'}"
								>
									{payee.change >= 0 ? '+' : ''}{payee.change.toFixed(0)}%
								</text>
							{:else if payee.isNew}
								<text
									x={138}
									y={yPos}
									dominant-baseline="middle"
									class="fill-blue-600 text-[9px] font-medium"
								>
									NEW
								</text>
							{/if}
						</g>
					{/each}
				</LayerCake>
			{/if}
		</div>

		<!-- Insights summary instead of redundant badges -->
		{#if periodRanges}
			{@const increasing = data.filter((p) => p.change !== null && p.change > 0)}
			{@const decreasing = data.filter((p) => p.change !== null && p.change < 0)}
			{@const newPayees = data.filter((p) => p.isNew)}
			<div class="mt-2 flex flex-wrap gap-3 text-xs">
				{#if increasing.length > 0}
					<div class="flex items-center gap-1.5 text-destructive">
						<span class="font-medium">{increasing.length} spending more</span>
						<span class="text-muted-foreground">vs prev period</span>
					</div>
				{/if}
				{#if decreasing.length > 0}
					<div class="flex items-center gap-1.5 text-green-600">
						<span class="font-medium">{decreasing.length} spending less</span>
						<span class="text-muted-foreground">vs prev period</span>
					</div>
				{/if}
				{#if newPayees.length > 0}
					<div class="flex items-center gap-1.5 text-blue-600">
						<span class="font-medium">{newPayees.length} new</span>
						<span class="text-muted-foreground">this period</span>
					</div>
				{/if}
			</div>
		{:else}
			<p class="mt-2 text-xs text-muted-foreground">
				Select a time period to see spending trends vs previous period
			</p>
		{/if}
	{/snippet}
</AnalyticsChartShell>
