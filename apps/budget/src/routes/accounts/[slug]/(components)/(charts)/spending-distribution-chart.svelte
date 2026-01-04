<script lang="ts">
	import { Histogram, AxisX, AxisY, VerticalLine, GroupedBar, StackedBar } from '$lib/components/layercake';
	import { Button } from '$lib/components/ui/button';
	import { currencyFormatter } from '$lib/utils/formatters';
	import type { TransactionsFormat } from '$lib/types';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import { LayerCake, Svg, Html } from 'layercake';
	import { scaleLinear } from 'd3-scale';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { AnalyticsChartShell } from '$lib/components/charts';
	import type { ComprehensiveStats } from '$lib/utils/comprehensive-statistics';

	// Bin data type for grouped/stacked
	interface BinData {
		binIndex: number;
		x0: number;
		x1: number;
		binLabel: string;
		expenses: number;
		income: number;
	}

	// Track hovered bin for tooltip
	let hoveredBin = $state<{ x0: number; x1: number; count: number } | null>(null);
	let hoveredGroupedBin = $state<{ item: BinData; keyIndex: number; key: string } | null>(null);
	let hoveredStackedBin = $state<{ item: BinData; key: string; segmentIndex: number; seriesIndex: number } | null>(null);

	interface Props {
		transactions: TransactionsFormat[];
	}

	let { transactions }: Props = $props();

	// View mode for single histogram
	type ViewMode = 'expenses' | 'income';
	let viewMode = $state<ViewMode>('expenses');

	// Chart style: histogram (single), grouped (side-by-side), stacked
	type ChartStyle = 'histogram' | 'grouped' | 'stacked';
	let chartStyle = $state<ChartStyle>('histogram');

	// Number of bins
	let binCount = $state(15);

	// Access effective time period for this chart
	const effectivePeriod = $derived(timePeriodFilter.getEffectivePeriod('spending-distribution'));

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

	// Filter and transform transactions by view mode (for histogram)
	const filteredTransactions = $derived.by(() => {
		return periodFilteredTransactions
			.filter((tx) => {
				const isExpense = tx.amount < 0;
				return viewMode === 'expenses' ? isExpense : !isExpense && tx.amount > 0;
			})
			.map((tx) => ({
				amount: Math.abs(tx.amount),
				payee: tx.payee?.name || 'Unknown',
				category: tx.category?.name || 'Uncategorized'
			}));
	});

	// Separate expense and income transactions (for grouped/stacked)
	const expenseTransactions = $derived(
		periodFilteredTransactions.filter((tx) => tx.amount < 0).map((tx) => Math.abs(tx.amount))
	);

	const incomeTransactions = $derived(
		periodFilteredTransactions.filter((tx) => tx.amount > 0).map((tx) => tx.amount)
	);

	// Calculate comparison bin data for grouped/stacked charts
	const comparisonBinData = $derived.by((): BinData[] => {
		const allAmounts = [...expenseTransactions, ...incomeTransactions];
		if (allAmounts.length === 0) return [];

		const minAmount = 0;
		const maxAmount = Math.max(...allAmounts);
		const binSize = (maxAmount - minAmount) / binCount;

		if (binSize === 0) return [];

		// Initialize bins
		const bins: BinData[] = [];
		for (let i = 0; i < binCount; i++) {
			const x0 = minAmount + i * binSize;
			const x1 = minAmount + (i + 1) * binSize;
			bins.push({
				binIndex: i,
				x0,
				x1,
				binLabel: currencyFormatter.format(x0),
				expenses: 0,
				income: 0
			});
		}

		// Count expenses per bin
		for (const amount of expenseTransactions) {
			const binIdx = Math.min(Math.floor((amount - minAmount) / binSize), binCount - 1);
			if (binIdx >= 0 && binIdx < binCount) {
				bins[binIdx].expenses++;
			}
		}

		// Count income per bin
		for (const amount of incomeTransactions) {
			const binIdx = Math.min(Math.floor((amount - minAmount) / binSize), binCount - 1);
			if (binIdx >= 0 && binIdx < binCount) {
				bins[binIdx].income++;
			}
		}

		return bins;
	});

	// Keys and colors for grouped/stacked
	const comparisonKeys = ['expenses', 'income'];
	const comparisonColors = ['var(--destructive)', 'var(--chart-2)'];

	// Y domain for comparison modes (max count across all bins)
	const comparisonYMax = $derived.by(() => {
		if (comparisonBinData.length === 0) return 10;

		if (chartStyle === 'stacked') {
			return Math.max(...comparisonBinData.map((b) => b.expenses + b.income)) * 1.1;
		}
		return Math.max(...comparisonBinData.flatMap((b) => [b.expenses, b.income])) * 1.1;
	});

	// Calculate distribution statistics
	const distributionStats = $derived.by(() => {
		if (filteredTransactions.length === 0) {
			return {
				mean: 0,
				median: 0,
				mode: 0,
				stdDev: 0,
				skewness: 'N/A' as string,
				percentile25: 0,
				percentile75: 0,
				percentile90: 0
			};
		}

		const amounts = filteredTransactions.map((t) => t.amount).sort((a, b) => a - b);
		const n = amounts.length;

		// Mean
		const mean = amounts.reduce((sum, a) => sum + a, 0) / n;

		// Median
		const median = n % 2 === 0 ? (amounts[n / 2 - 1] + amounts[n / 2]) / 2 : amounts[Math.floor(n / 2)];

		// Mode (most common range)
		const binSize = (Math.max(...amounts) - Math.min(...amounts)) / binCount;
		const bins = new Map<number, number>();
		for (const amount of amounts) {
			const bin = Math.floor(amount / binSize);
			bins.set(bin, (bins.get(bin) || 0) + 1);
		}
		let modebin = 0;
		let modeCount = 0;
		for (const [bin, count] of bins) {
			if (count > modeCount) {
				modeCount = count;
				modebin = bin;
			}
		}
		const mode = (modebin + 0.5) * binSize;

		// Standard deviation
		const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / n;
		const stdDev = Math.sqrt(variance);

		// Skewness indicator
		const skewness = mean > median ? 'Right-skewed' : mean < median ? 'Left-skewed' : 'Symmetric';

		// Percentiles
		const percentile25 = amounts[Math.floor(n * 0.25)];
		const percentile75 = amounts[Math.floor(n * 0.75)];
		const percentile90 = amounts[Math.floor(n * 0.9)];

		return { mean, median, mode, stdDev, skewness, percentile25, percentile75, percentile90 };
	});

	// Summary statistics
	const summaryStats = $derived.by(() => {
		if (filteredTransactions.length === 0) {
			return [
				{ label: 'Transactions', value: '0' },
				{ label: 'Average', value: '$0.00' },
				{ label: 'Median', value: '$0.00' },
				{ label: 'Distribution', value: 'N/A' }
			];
		}

		return [
			{ label: 'Transactions', value: filteredTransactions.length.toString() },
			{ label: 'Average', value: currencyFormatter.format(distributionStats.mean) },
			{
				label: 'Median',
				value: currencyFormatter.format(distributionStats.median),
				description: `50% below ${currencyFormatter.format(distributionStats.median)}`
			},
			{
				label: 'Distribution',
				value: distributionStats.skewness,
				description: distributionStats.skewness === 'Right-skewed' ? 'Many small, few large' : distributionStats.skewness === 'Left-skewed' ? 'Many large, few small' : 'Evenly distributed'
			}
		];
	});

	// Comprehensive statistics for the Statistics tab
	const comprehensiveStats = $derived.by((): ComprehensiveStats | null => {
		if (filteredTransactions.length === 0) return null;

		const amounts = filteredTransactions.map((t) => t.amount);
		const sortedAmounts = [...amounts].sort((a, b) => a - b);
		const n = amounts.length;

		const total = amounts.reduce((s, a) => s + a, 0);
		const mean = total / n;

		// Find min/max
		const minAmount = sortedAmounts[0];
		const maxAmount = sortedAmounts[n - 1];

		// Percentiles
		const p25 = sortedAmounts[Math.floor(n * 0.25)] || 0;
		const p50 = sortedAmounts[Math.floor(n * 0.5)] || 0;
		const p75 = sortedAmounts[Math.floor(n * 0.75)] || 0;

		return {
			summary: {
				average: mean,
				median: distributionStats.median,
				total: total,
				count: n
			},
			trend: {
				direction: 'flat',
				growthRate: null,
				slope: 0,
				monthlyChange: 0
			},
			distribution: {
				highest: { value: maxAmount, month: 'Max Transaction', monthLabel: 'Maximum' },
				lowest: { value: minAmount, month: 'Min Transaction', monthLabel: 'Minimum' },
				range: maxAmount - minAmount,
				p25,
				p50,
				p75,
				iqr: p75 - p25,
				stdDev: distributionStats.stdDev,
				coefficientOfVariation: mean !== 0 ? (distributionStats.stdDev / mean) * 100 : 0
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

	const hasData = $derived(filteredTransactions.length > 0);

	// Amount extent
	const amountExtent = $derived.by((): [number, number] => {
		if (!hasData) return [0, 100];
		const amounts = filteredTransactions.map((t) => t.amount);
		return [0, Math.max(...amounts)];
	});
</script>

<AnalyticsChartShell
	data={filteredTransactions}
	{comprehensiveStats}
	supportedChartTypes={['bar']}
	defaultChartType="bar"
	emptyMessage="No {viewMode} transactions to analyze"
	chartId="spending-distribution"
	allowedPeriodGroups={['months', 'year', 'other']}
>
	{#snippet title()}
		Spending Distribution
	{/snippet}

	{#snippet subtitle()}
		How your transaction amounts are distributed
	{/snippet}

	{#snippet headerActions()}
		<div class="flex gap-2">
			<!-- Chart style toggles -->
			<div class="flex gap-1">
				<Button variant={chartStyle === 'histogram' ? 'default' : 'ghost'} size="sm" onclick={() => (chartStyle = 'histogram')}>
					Single
				</Button>
				<Button variant={chartStyle === 'grouped' ? 'default' : 'ghost'} size="sm" onclick={() => (chartStyle = 'grouped')}>
					Grouped
				</Button>
				<Button variant={chartStyle === 'stacked' ? 'default' : 'ghost'} size="sm" onclick={() => (chartStyle = 'stacked')}>
					Stacked
				</Button>
			</div>
			<!-- View mode for histogram only -->
			{#if chartStyle === 'histogram'}
				<div class="border-l pl-2 flex gap-1">
					<Button variant={viewMode === 'expenses' ? 'secondary' : 'ghost'} size="sm" onclick={() => (viewMode = 'expenses')}>
						Expenses
					</Button>
					<Button variant={viewMode === 'income' ? 'secondary' : 'ghost'} size="sm" onclick={() => (viewMode = 'income')}>
						Income
					</Button>
				</div>
			{/if}
		</div>
	{/snippet}

	{#snippet chart({ data }: { data: typeof filteredTransactions })}
		<div class="h-full w-full pb-20">
			{#key chartStyle}
				{#if chartStyle === 'histogram'}
					<!-- Single histogram (expenses or income) -->
					<LayerCake
						{data}
						x="amount"
						xScale={scaleLinear()}
						xDomain={amountExtent}
						padding={{ top: 20, right: 20, bottom: 40, left: 60 }}
					>
						<Svg>
							<AxisY ticks={5} gridlines={true} />
							<AxisX ticks={6} format={(d) => currencyFormatter.format(d)} />
							<Histogram
								bins={binCount}
								fill={viewMode === 'expenses' ? 'var(--destructive)' : 'var(--chart-2)'}
								opacity={0.85}
								radius={2}
								onclick={(bin) => {
									chartInteractions.openDrillDown({
										type: 'amount-range',
										value: { min: bin.x0, max: bin.x1 },
										label: `${currencyFormatter.format(bin.x0)} - ${currencyFormatter.format(bin.x1)}`
									});
								}}
								onhover={(bin) => (hoveredBin = bin)}
							/>
							<VerticalLine value={distributionStats.mean} stroke="var(--chart-4)" strokeWidth={2} strokeDasharray="4,4" />
							<VerticalLine value={distributionStats.median} stroke="var(--chart-3)" strokeWidth={2} strokeDasharray="4,4" />
						</Svg>
						<Html pointerEvents={false}>
							{#if hoveredBin}
								<div class="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 transform">
									<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
										<p class="font-medium">
											{currencyFormatter.format(hoveredBin.x0)} - {currencyFormatter.format(hoveredBin.x1)}
										</p>
										<p class="text-muted-foreground">
											{hoveredBin.count} transaction{hoveredBin.count !== 1 ? 's' : ''}
										</p>
									</div>
								</div>
							{/if}
						</Html>
					</LayerCake>
				{:else if chartStyle === 'grouped'}
					<!-- Grouped bars: expenses and income side-by-side -->
					<LayerCake
						data={comparisonBinData}
						x="binIndex"
						y={(d: BinData) => Math.max(d.expenses, d.income)}
						xScale={scaleLinear()}
						xDomain={[-0.5, binCount - 0.5]}
						yScale={scaleLinear()}
						yDomain={[0, comparisonYMax]}
						padding={{ top: 20, right: 20, bottom: 40, left: 60 }}
					>
						<Svg>
							<AxisY ticks={5} gridlines={true} />
							<AxisX
								ticks={Math.min(binCount, 8)}
								format={(d) => {
									const idx = Math.round(d as number);
									const bin = comparisonBinData[idx];
									return bin ? currencyFormatter.format(bin.x0) : '';
								}}
							/>
							<GroupedBar
								keys={comparisonKeys}
								colors={comparisonColors}
								xKey="binIndex"
								groupGap={4}
								barGap={1}
								radius={2}
								opacity={0.85}
								hoverOpacity={1}
								onhover={(info) => (hoveredGroupedBin = info as typeof hoveredGroupedBin)}
								onclick={(info) => {
									const bin = info.item as BinData;
									chartInteractions.openDrillDown({
										type: 'amount-range',
										value: { min: bin.x0, max: bin.x1 },
										label: `${currencyFormatter.format(bin.x0)} - ${currencyFormatter.format(bin.x1)}`
									});
								}}
							/>
						</Svg>
						<Html pointerEvents={false}>
							{#if hoveredGroupedBin}
								{@const bin = hoveredGroupedBin.item}
								<div class="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 transform">
									<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
										<p class="font-medium">
											{currencyFormatter.format(bin.x0)} - {currencyFormatter.format(bin.x1)}
										</p>
										<p class="text-red-600">
											Expenses: {bin.expenses} transaction{bin.expenses !== 1 ? 's' : ''}
										</p>
										<p class="text-green-600">
											Income: {bin.income} transaction{bin.income !== 1 ? 's' : ''}
										</p>
									</div>
								</div>
							{/if}
						</Html>
					</LayerCake>
				{:else}
					<!-- Stacked bars: expenses and income stacked -->
					<LayerCake
						data={comparisonBinData}
						x="binIndex"
						y={(d: BinData) => d.expenses + d.income}
						xScale={scaleLinear()}
						xDomain={[-0.5, binCount - 0.5]}
						yScale={scaleLinear()}
						yDomain={[0, comparisonYMax]}
						padding={{ top: 20, right: 20, bottom: 40, left: 60 }}
					>
						<Svg>
							<AxisY ticks={5} gridlines={true} />
							<AxisX
								ticks={Math.min(binCount, 8)}
								format={(d) => {
									const idx = Math.round(d as number);
									const bin = comparisonBinData[idx];
									return bin ? currencyFormatter.format(bin.x0) : '';
								}}
							/>
							<StackedBar
								keys={comparisonKeys}
								colors={comparisonColors}
								radius={2}
								gap={4}
								opacity={0.85}
								hoverOpacity={1}
								onhover={(info) => (hoveredStackedBin = info as typeof hoveredStackedBin)}
								onclick={(info) => {
									const bin = info.item as BinData;
									chartInteractions.openDrillDown({
										type: 'amount-range',
										value: { min: bin.x0, max: bin.x1 },
										label: `${currencyFormatter.format(bin.x0)} - ${currencyFormatter.format(bin.x1)}`
									});
								}}
							/>
						</Svg>
						<Html pointerEvents={false}>
							{#if hoveredStackedBin}
								{@const bin = hoveredStackedBin.item}
								<div class="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 transform">
									<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
										<p class="font-medium">
											{currencyFormatter.format(bin.x0)} - {currencyFormatter.format(bin.x1)}
										</p>
										<p class="text-red-600">
											Expenses: {bin.expenses} transaction{bin.expenses !== 1 ? 's' : ''}
										</p>
										<p class="text-green-600">
											Income: {bin.income} transaction{bin.income !== 1 ? 's' : ''}
										</p>
										<p class="text-muted-foreground mt-1 border-t pt-1 text-xs">
											Total: {bin.expenses + bin.income} transactions
										</p>
									</div>
								</div>
							{/if}
						</Html>
					</LayerCake>
				{/if}
			{/key}

			<!-- Legend -->
			<div class="mt-4 space-y-2">
			{#if chartStyle === 'histogram'}
				<!-- Histogram legend with mean/median -->
				<div class="flex flex-wrap justify-center gap-4">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-sm" style="background-color: {viewMode === 'expenses' ? 'var(--destructive)' : 'var(--chart-2)'}"></div>
						<span class="text-sm">{viewMode === 'expenses' ? 'Expenses' : 'Income'}</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="h-0.5 w-4" style="background-color: var(--chart-4)"></div>
						<span class="text-sm">Mean ({currencyFormatter.format(distributionStats.mean)})</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="h-0.5 w-4" style="background-color: var(--chart-3)"></div>
						<span class="text-sm">Median ({currencyFormatter.format(distributionStats.median)})</span>
					</div>
				</div>
				<div class="text-muted-foreground text-center text-xs">
					25th: {currencyFormatter.format(distributionStats.percentile25)} |
					75th: {currencyFormatter.format(distributionStats.percentile75)} |
					90th: {currencyFormatter.format(distributionStats.percentile90)}
				</div>
			{:else}
				<!-- Grouped/Stacked legend -->
				<div class="flex flex-wrap justify-center gap-4">
					<div class="flex items-center gap-2">
						<div class="bg-destructive h-3 w-3 rounded-sm"></div>
						<span class="text-sm">Expenses ({expenseTransactions.length})</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-sm" style="background-color: var(--chart-2)"></div>
						<span class="text-sm">Income ({incomeTransactions.length})</span>
					</div>
				</div>
				<div class="text-muted-foreground text-center text-xs">
					Compare how expense and income transaction amounts are distributed
				</div>
			{/if}
			</div>
		</div>
	{/snippet}
</AnalyticsChartShell>
