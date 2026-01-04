<script lang="ts">
	import { HorizontalBar, AxisX } from '$lib/components/layercake';
	import { currencyFormatter } from '$lib/utils/formatters';
	import type { TransactionsFormat } from '$lib/types';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import { LayerCake, Svg, Html } from 'layercake';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { AnalyticsChartShell } from '$lib/components/charts';
	import type { ComprehensiveStats } from '$lib/utils/comprehensive-statistics';

	interface Props {
		transactions: TransactionsFormat[];
		limit?: number;
	}

	let { transactions, limit = 10 }: Props = $props();

	// Track hovered bar for tooltip
	let hoveredItem = $state<typeof payeeData[0] | null>(null);

	// Access effective time period for this chart
	const effectivePeriod = $derived(timePeriodFilter.getEffectivePeriod('payee-rankings'));

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

	// Aggregate by payee
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

		// Sort by total and take top N
		return Array.from(payeeTotals.values())
			.sort((a, b) => b.total - a.total)
			.slice(0, limit)
			.map((p, index) => ({
				...p,
				rank: index + 1,
				y: p.name,
				x: p.total,
				index
			}));
	});

	// Summary statistics
	const summaryStats = $derived.by(() => {
		if (payeeData.length === 0) {
			return [
				{ label: 'Total Payees', value: '0' },
				{ label: 'Top Payee', value: '-' },
				{ label: 'Top Amount', value: '$0.00' },
				{ label: 'Avg per Payee', value: '$0.00' }
			];
		}

		const total = payeeData.reduce((sum, p) => sum + p.total, 0);
		const topPayee = payeeData[0];

		return [
			{ label: 'Payees Shown', value: payeeData.length.toString() },
			{
				label: 'Top Payee',
				value: topPayee?.name || '-',
				description: `${topPayee?.count || 0} transactions`
			},
			{ label: 'Top Amount', value: currencyFormatter.format(topPayee?.total || 0) },
			{ label: 'Avg per Payee', value: currencyFormatter.format(total / payeeData.length) }
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
		Ranked by total spending amount
	{/snippet}

	{#snippet chart({ data }: { data: typeof payeeData })}
		<div
			class="w-full pb-20"
			style="height: {Math.max(300, data.length * 40)}px"
			bind:clientWidth={containerWidth}
			bind:clientHeight={containerHeight}
		>
			{#if containerReady}
				<LayerCake
					{data}
					x="total"
					y="name"
					xDomain={[0, maxValue * 1.15]}
					padding={{ top: 10, right: 80, bottom: 30, left: 120 }}
				>
					<Svg>
						<AxisX ticks={5} gridlines={true} format={(d) => currencyFormatter.format(d)} />
						<HorizontalBar
							fill="var(--chart-1)"
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
								<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
									<p class="font-medium">{hoveredItem.name}</p>
									<p class="text-muted-foreground">Total: {currencyFormatter.format(hoveredItem.total)}</p>
									<p class="text-muted-foreground">{hoveredItem.count} transaction{hoveredItem.count !== 1 ? 's' : ''}</p>
								</div>
							</div>
						{/if}
					</Html>

					<!-- Payee labels on left -->
					{#each data as payee, i}
						{@const y = (containerHeight - 40) / data.length}
						<text
							x={115}
							y={10 + i * y + y / 2}
							text-anchor="end"
							dominant-baseline="middle"
							class="fill-foreground text-xs"
						>
							{payee.name.length > 15 ? payee.name.slice(0, 15) + '...' : payee.name}
						</text>
					{/each}
				</LayerCake>
			{/if}
		</div>

		<!-- Transaction count breakdown -->
		<div class="mt-4 flex flex-wrap gap-2">
			{#each data.slice(0, 5) as payee}
				<div
					class="bg-muted rounded-full px-3 py-1 text-xs"
					title="{payee.name}: {payee.count} transactions"
				>
					<span class="font-medium">{payee.name.slice(0, 12)}</span>
					<span class="text-muted-foreground ml-1">({payee.count})</span>
				</div>
			{/each}
		</div>
	{/snippet}
</AnalyticsChartShell>
