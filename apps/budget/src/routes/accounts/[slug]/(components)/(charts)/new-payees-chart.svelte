<script lang="ts">
	import { Bar, AxisX, AxisY } from '$lib/components/layercake';
	import { currencyFormatter } from '$lib/utils/formatters';
	import type { TransactionsFormat } from '$lib/types';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { LayerCake, Svg, Html } from 'layercake';
	import { scaleBand, scaleLinear } from 'd3-scale';
	import { AnalyticsChartShell } from '$lib/components/charts';
	import type { ComprehensiveStats } from '$lib/utils/comprehensive-statistics';

	interface Props {
		transactions: TransactionsFormat[];
	}

	let { transactions }: Props = $props();

	// Track hovered bar for tooltip
	let hoveredItem = $state<typeof monthlyNewPayees[0] | null>(null);

	// Access effective time period for this chart
	const effectivePeriod = $derived(timePeriodFilter.getEffectivePeriod('new-payees'));

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

	// Find first occurrence of each payee
	const payeeFirstAppearance = $derived.by(() => {
		const firstSeen = new Map<string, { date: Date; amount: number }>();

		// Sort transactions by date first
		const sorted = [...periodFilteredTransactions].sort((a, b) => {
			const dateA = a.date instanceof Date ? a.date : new Date(a.date?.toString() || '');
			const dateB = b.date instanceof Date ? b.date : new Date(b.date?.toString() || '');
			return dateA.getTime() - dateB.getTime();
		});

		for (const tx of sorted) {
			if (tx.amount >= 0) continue; // Only expenses

			const payee = tx.payee?.name || 'Unknown';
			const date = tx.date instanceof Date ? tx.date : new Date(tx.date?.toString() || '');

			if (isNaN(date.getTime())) continue;

			if (!firstSeen.has(payee)) {
				firstSeen.set(payee, { date, amount: Math.abs(tx.amount) });
			}
		}

		return firstSeen;
	});

	// Aggregate new payees by month
	const monthlyNewPayees = $derived.by(() => {
		const dataByMonth = new Map<string, { count: number; totalSpent: number; payees: string[] }>();

		for (const [payee, data] of payeeFirstAppearance) {
			const monthKey = data.date.toISOString().substring(0, 7);

			if (!dataByMonth.has(monthKey)) {
				dataByMonth.set(monthKey, { count: 0, totalSpent: 0, payees: [] });
			}

			const monthData = dataByMonth.get(monthKey)!;
			monthData.count += 1;
			monthData.totalSpent += data.amount;
			monthData.payees.push(payee);
		}

		return Array.from(dataByMonth.entries())
			.sort((a, b) => a[0].localeCompare(b[0]))
			.slice(-12)
			.map(([month, data]) => {
				const [year, monthNum] = month.split('-');
				const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
				return {
					month,
					monthLabel: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
					count: data.count,
					totalSpent: data.totalSpent,
					avgFirstPurchase: data.totalSpent / data.count,
					payees: data.payees
				};
			});
	});

	// Summary statistics
	const summaryStats = $derived.by(() => {
		if (monthlyNewPayees.length === 0) {
			return [
				{ label: 'Total New Payees', value: '0' },
				{ label: 'Avg per Month', value: '0' },
				{ label: 'Peak Month', value: 'N/A' },
				{ label: 'First Purchase Avg', value: '$0.00' }
			];
		}

		const totalNew = monthlyNewPayees.reduce((s, d) => s + d.count, 0);
		const avgPerMonth = totalNew / monthlyNewPayees.length;
		const peakMonth = monthlyNewPayees.reduce((a, b) => (a.count > b.count ? a : b));
		const avgFirstPurchase = monthlyNewPayees.reduce((s, d) => s + d.totalSpent, 0) / totalNew;

		return [
			{ label: 'Total New Payees', value: totalNew.toString(), description: `in ${monthlyNewPayees.length} months` },
			{ label: 'Avg per Month', value: avgPerMonth.toFixed(1) },
			{
				label: 'Peak Month',
				value: peakMonth.monthLabel,
				description: `${peakMonth.count} new payees`
			},
			{
				label: 'First Purchase Avg',
				value: currencyFormatter.format(avgFirstPurchase),
				description: 'initial transaction'
			}
		];
	});

	// Comprehensive statistics for the Statistics tab
	const comprehensiveStats = $derived.by((): ComprehensiveStats | null => {
		if (monthlyNewPayees.length === 0) return null;

		const counts = monthlyNewPayees.map((d) => d.count);
		const sortedCounts = [...counts].sort((a, b) => a - b);
		const n = counts.length;

		const totalNew = counts.reduce((s, c) => s + c, 0);
		const mean = totalNew / n;
		const median = sortedCounts[Math.floor(n / 2)] || 0;

		// Standard deviation
		const variance = counts.reduce((s, c) => s + Math.pow(c - mean, 2), 0) / n;
		const stdDev = Math.sqrt(variance);

		// Percentiles
		const p25 = sortedCounts[Math.floor(n * 0.25)] || 0;
		const p50 = median;
		const p75 = sortedCounts[Math.floor(n * 0.75)] || 0;

		// Find peak and lowest months
		const peakMonth = monthlyNewPayees.reduce((a, b) => (a.count > b.count ? a : b));
		const lowestMonth = monthlyNewPayees.reduce((a, b) => (a.count < b.count ? a : b));

		// Average first purchase amount
		const totalSpent = monthlyNewPayees.reduce((s, d) => s + d.totalSpent, 0);
		const avgFirstPurchase = totalNew > 0 ? totalSpent / totalNew : 0;

		return {
			summary: {
				average: mean,
				median: median,
				total: totalNew,
				count: n
			},
			trend: {
				direction: 'flat',
				growthRate: avgFirstPurchase, // Use for avg first purchase
				slope: 0,
				monthlyChange: 0
			},
			distribution: {
				highest: { value: peakMonth.count, month: peakMonth.monthLabel, monthLabel: `${peakMonth.count} new payees` },
				lowest: { value: lowestMonth.count, month: lowestMonth.monthLabel, monthLabel: `${lowestMonth.count} new payees` },
				range: peakMonth.count - lowestMonth.count,
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

	const hasData = $derived(monthlyNewPayees.length > 0);

	// Handle drill-down to view transactions for new payees in a month
	function handleDrillDown(point: typeof monthlyNewPayees[0]) {
		chartInteractions.openDrillDown({
			type: 'new-payees-month',
			value: { month: point.month, payees: point.payees },
			label: `New Payees - ${point.monthLabel}`
		});
	}

	// Track container dimensions
	let containerWidth = $state(0);
	let containerHeight = $state(0);
	const containerReady = $derived(containerWidth > 0 && containerHeight > 0);

	// Y domain
	const yMax = $derived.by(() => {
		if (!hasData) return 10;
		return Math.max(...monthlyNewPayees.map((d) => d.count)) * 1.1;
	});

	// Recent new payees for list
	const recentNewPayees = $derived.by(() => {
		return Array.from(payeeFirstAppearance.entries())
			.sort((a, b) => b[1].date.getTime() - a[1].date.getTime())
			.slice(0, 10)
			.map(([payee, data]) => ({
				payee,
				date: data.date,
				amount: data.amount
			}));
	});
</script>

<AnalyticsChartShell
	data={monthlyNewPayees}
	{comprehensiveStats}
	supportedChartTypes={['bar']}
	defaultChartType="bar"
	emptyMessage="No payee data available"
	chartId="new-payees"
	allowedPeriodGroups={['months', 'year', 'other']}
>
	{#snippet title()}
		New Payees Discovery
	{/snippet}

	{#snippet subtitle()}
		Track when you started transacting with new merchants
	{/snippet}

	{#snippet chart({ data }: { data: typeof monthlyNewPayees })}
		<div
			class="h-[450px] w-full pb-20"
			bind:clientWidth={containerWidth}
			bind:clientHeight={containerHeight}
		>
			{#if containerReady}
				<LayerCake
					{data}
					x="monthLabel"
					y="count"
					xScale={scaleBand().padding(0.3)}
					yScale={scaleLinear()}
					yDomain={[0, yMax]}
					padding={{ top: 20, right: 20, bottom: 40, left: 50 }}
				>
					<Svg>
						<AxisY ticks={5} gridlines={true} />
						<AxisX />
						<Bar
							fill="var(--chart-1)"
							opacity={0.85}
							hoverOpacity={1}
							radius={4}
							onhover={(d) => (hoveredItem = d)}
							onclick={(d) => handleDrillDown(d)}
						/>
					</Svg>
					<Html pointerEvents={false}>
						{#if hoveredItem}
							<div class="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
								<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
									<p class="font-medium">{hoveredItem.monthLabel}</p>
									<p class="text-primary font-semibold">{hoveredItem.count} new payees</p>
									<p class="text-muted-foreground text-xs">
										First purchases: {currencyFormatter.format(hoveredItem.totalSpent)}
									</p>
									{#if hoveredItem.payees.length <= 5}
										<div class="mt-1 text-xs">
											{#each hoveredItem.payees as payee}
												<p class="text-muted-foreground">{payee}</p>
											{/each}
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</Html>
				</LayerCake>
			{/if}
		</div>

		<!-- Recent new payees list -->
		<div class="mt-4 rounded-lg border p-4">
			<h4 class="mb-3 text-sm font-medium">Recently Discovered Payees</h4>
			<div class="grid gap-2 md:grid-cols-2">
				{#each recentNewPayees as item}
					<div class="flex items-center justify-between text-sm">
						<div>
							<span class="font-medium">{item.payee}</span>
							<span class="text-muted-foreground text-xs ml-2">
								{item.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
							</span>
						</div>
						<span class="text-muted-foreground">{currencyFormatter.format(item.amount)}</span>
					</div>
				{/each}
			</div>
		</div>
	{/snippet}
</AnalyticsChartShell>
