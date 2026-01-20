<script lang="ts">
	import { HorizontalBar, HorizontalBarLabels, AxisX, AxisY } from '$lib/components/layercake';
	import { Button } from '$lib/components/ui/button';
	import { currencyFormatter } from '$lib/utils/formatters';
	import type { TransactionsFormat } from '$lib/types';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { LayerCake, Svg, Html } from 'layercake';
	import { scaleBand, scaleLinear } from 'd3-scale';
	import { AnalyticsChartShell } from '$lib/components/charts';
	import type { ComprehensiveStats } from '$lib/utils/comprehensive-statistics';
	import { median, standardDeviation } from '$lib/utils/chart-statistics';

	interface Props {
		transactions: TransactionsFormat[];
	}

	let { transactions }: Props = $props();

	// Track hovered bar for tooltip
	let hoveredItem = $state<typeof payeeData[0] | null>(null);

	// Sort mode
	type SortMode = 'frequency' | 'total' | 'average';
	let sortMode = $state<SortMode>('frequency');

	// Access effective time period for this chart
	const effectivePeriod = $derived(timePeriodFilter.getEffectivePeriod('payee-frequency'));

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
		const payeeStats = new Map<string, { count: number; total: number; dates: Date[] }>();

		for (const tx of periodFilteredTransactions) {
			if (tx.amount >= 0) continue; // Only expenses

			const payee = tx.payee?.name || 'Unknown';
			const date = tx.date instanceof Date ? tx.date : new Date(tx.date?.toString() || '');

			if (!payeeStats.has(payee)) {
				payeeStats.set(payee, { count: 0, total: 0, dates: [] });
			}

			const stats = payeeStats.get(payee)!;
			stats.count += 1;
			stats.total += Math.abs(tx.amount);
			if (!isNaN(date.getTime())) {
				stats.dates.push(date);
			}
		}

		// Calculate average and frequency
		const result = Array.from(payeeStats.entries()).map(([payee, stats], idx) => {
			const average = stats.total / stats.count;

			// Calculate average days between visits
			let avgDaysBetween = 0;
			if (stats.dates.length > 1) {
				const sorted = stats.dates.sort((a, b) => a.getTime() - b.getTime());
				let totalDays = 0;
				for (let i = 1; i < sorted.length; i++) {
					totalDays += (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24);
				}
				avgDaysBetween = totalDays / (sorted.length - 1);
			}

			return {
				payee,
				count: stats.count,
				total: stats.total,
				average,
				avgDaysBetween,
				frequencyLabel:
					avgDaysBetween === 0
						? 'One-time'
						: avgDaysBetween <= 7
							? 'Weekly'
							: avgDaysBetween <= 14
								? 'Bi-weekly'
								: avgDaysBetween <= 35
									? 'Monthly'
									: 'Occasional',
				index: idx
			};
		});

		// Sort based on mode
		if (sortMode === 'frequency') {
			result.sort((a, b) => b.count - a.count);
		} else if (sortMode === 'total') {
			result.sort((a, b) => b.total - a.total);
		} else {
			result.sort((a, b) => b.average - a.average);
		}

		return result.slice(0, 15).map((item, idx) => ({ ...item, index: idx }));
	});

	// Summary statistics
	const summaryStats = $derived.by(() => {
		if (payeeData.length === 0) {
			return [
				{ label: 'Total Payees', value: '0' },
				{ label: 'Most Frequent', value: 'N/A' },
				{ label: 'Highest Spending', value: 'N/A' },
				{ label: 'Highest Avg', value: 'N/A' }
			];
		}

		const mostFrequent = [...payeeData].sort((a, b) => b.count - a.count)[0];
		const highestSpending = [...payeeData].sort((a, b) => b.total - a.total)[0];
		const highestAvg = [...payeeData].sort((a, b) => b.average - a.average)[0];

		return [
			{ label: 'Total Payees', value: payeeData.length.toString() },
			{
				label: 'Most Frequent',
				value: mostFrequent.payee.substring(0, 15),
				description: `${mostFrequent.count} visits`
			},
			{
				label: 'Highest Spending',
				value: highestSpending.payee.substring(0, 15),
				description: currencyFormatter.format(highestSpending.total)
			},
			{
				label: 'Highest Avg',
				value: highestAvg.payee.substring(0, 15),
				description: `${currencyFormatter.format(highestAvg.average)}/visit`
			}
		];
	});

	// Comprehensive statistics for the Statistics tab
	const comprehensiveStats = $derived.by((): ComprehensiveStats | null => {
		if (payeeData.length === 0) return null;

		const counts = payeeData.map((p) => p.count);
		const totals = payeeData.map((p) => p.total);
		const sortedCounts = [...counts].sort((a, b) => a - b);
		const n = payeeData.length;

		const totalTransactions = counts.reduce((s, c) => s + c, 0);
		const totalSpending = totals.reduce((s, t) => s + t, 0);
		const meanCount = totalTransactions / n;
		const medianCount = median(counts);
		const stdDev = standardDeviation(counts);

		// Frequency distribution
		const frequencyDist = {
			weekly: payeeData.filter((p) => p.frequencyLabel === 'Weekly').length,
			biweekly: payeeData.filter((p) => p.frequencyLabel === 'Bi-weekly').length,
			monthly: payeeData.filter((p) => p.frequencyLabel === 'Monthly').length,
			occasional: payeeData.filter((p) => ['Occasional', 'One-time'].includes(p.frequencyLabel)).length
		};

		const mostFrequent = [...payeeData].sort((a, b) => b.count - a.count)[0];
		const leastFrequent = payeeData[n - 1];

		return {
			summary: {
				average: totalSpending / n,
				median: median(totals),
				total: totalSpending,
				count: totalTransactions
			},
			trend: {
				direction: 'flat',
				growthRate: null,
				slope: 0,
				monthlyChange: 0
			},
			distribution: {
				highest: { value: mostFrequent.count, month: mostFrequent.payee, monthLabel: `${mostFrequent.count} visits` },
				lowest: { value: leastFrequent.count, month: leastFrequent.payee, monthLabel: `${leastFrequent.count} visits` },
				range: mostFrequent.count - leastFrequent.count,
				p25: sortedCounts[Math.floor(n * 0.25)] || 0,
				p50: medianCount,
				p75: sortedCounts[Math.floor(n * 0.75)] || 0,
				iqr: (sortedCounts[Math.floor(n * 0.75)] || 0) - (sortedCounts[Math.floor(n * 0.25)] || 0),
				stdDev,
				coefficientOfVariation: meanCount !== 0 ? (stdDev / meanCount) * 100 : 0
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

	// Handle drill-down to view transactions for a payee
	function handleDrillDown(point: typeof payeeData[0]) {
		chartInteractions.openDrillDown({
			type: 'payee',
			value: point.payee,
			label: `${point.payee} Transactions`
		});
	}

	// X domain based on sort mode
	const xDomain = $derived.by((): [number, number] => {
		if (!hasData) return [0, 10];
		if (sortMode === 'frequency') {
			return [0, Math.max(...payeeData.map((d) => d.count)) * 1.1];
		} else if (sortMode === 'total') {
			return [0, Math.max(...payeeData.map((d) => d.total)) * 1.1];
		} else {
			return [0, Math.max(...payeeData.map((d) => d.average)) * 1.1];
		}
	});

	// Value accessor based on sort mode
	const getValue = (d: (typeof payeeData)[0]) => {
		if (sortMode === 'frequency') return d.count;
		if (sortMode === 'total') return d.total;
		return d.average;
	};

	// Format value based on sort mode
	const formatValue = (v: number) => {
		if (sortMode === 'frequency') return v.toString();
		return currencyFormatter.format(v);
	};
</script>

<AnalyticsChartShell
	data={payeeData}
	{comprehensiveStats}
	supportedChartTypes={['bar']}
	defaultChartType="bar"
	emptyMessage="No payee data available"
	chartId="payee-frequency"
	allowedPeriodGroups={['months', 'year', 'other']}
>
	{#snippet title()}
		Payee Frequency
	{/snippet}

	{#snippet subtitle()}
		How often you transact with each payee
	{/snippet}

	{#snippet headerActions()}
		<div class="flex gap-1">
			<Button variant={sortMode === 'frequency' ? 'default' : 'ghost'} size="sm" onclick={() => (sortMode = 'frequency')}>
				Visits
			</Button>
			<Button variant={sortMode === 'total' ? 'default' : 'ghost'} size="sm" onclick={() => (sortMode = 'total')}>
				Total
			</Button>
			<Button variant={sortMode === 'average' ? 'default' : 'ghost'} size="sm" onclick={() => (sortMode = 'average')}>
				Average
			</Button>
		</div>
	{/snippet}

	{#snippet chart({ data }: { data: typeof payeeData })}
		<div class="h-125 w-full pb-20">
			<LayerCake
				{data}
				x={(d: (typeof payeeData)[0]) => getValue(d)}
				y="payee"
				xScale={scaleLinear()}
				yScale={scaleBand().padding(0.2)}
				xDomain={xDomain}
				padding={{ top: 10, right: 60, bottom: 40, left: 140 }}
			>
				<Svg>
					<AxisX ticks={5} gridlines={true} format={formatValue} />
					<AxisY />
					<HorizontalBar
						fill={(d) => {
							if (d.frequencyLabel === 'Weekly') return 'var(--chart-1)';
							if (d.frequencyLabel === 'Bi-weekly') return 'var(--chart-2)';
							if (d.frequencyLabel === 'Monthly') return 'var(--chart-3)';
							return 'var(--muted-foreground)';
						}}
						opacity={0.85}
						hoverOpacity={1}
						radius={4}
						onhover={(d) => (hoveredItem = d)}
						onclick={(d) => handleDrillDown(d)}
					/>
					<HorizontalBarLabels format={(d) => formatValue(getValue(d))} />
				</Svg>
				<Html pointerEvents={false}>
					{#if hoveredItem}
						<div class="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
							<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
								<p class="font-medium">{hoveredItem.payee}</p>
								<p class="text-muted-foreground">{hoveredItem.count} visit{hoveredItem.count !== 1 ? 's' : ''}</p>
								<p class="text-muted-foreground">Total: {currencyFormatter.format(hoveredItem.total)}</p>
								<p class="text-muted-foreground">Avg: {currencyFormatter.format(hoveredItem.average)}</p>
								<p class="text-xs text-muted-foreground">{hoveredItem.frequencyLabel}</p>
							</div>
						</div>
					{/if}
				</Html>
			</LayerCake>

			<!-- Legend -->
			<div class="mt-4 flex flex-wrap justify-center gap-4">
			<div class="flex items-center gap-2">
				<div class="h-3 w-3 rounded-sm" style="background-color: var(--chart-1)"></div>
				<span class="text-sm">Weekly</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="h-3 w-3 rounded-sm" style="background-color: var(--chart-2)"></div>
				<span class="text-sm">Bi-weekly</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="h-3 w-3 rounded-sm" style="background-color: var(--chart-3)"></div>
				<span class="text-sm">Monthly</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="bg-muted-foreground h-3 w-3 rounded-sm"></div>
				<span class="text-sm">Occasional/One-time</span>
			</div>
			</div>
		</div>
	{/snippet}
</AnalyticsChartShell>
