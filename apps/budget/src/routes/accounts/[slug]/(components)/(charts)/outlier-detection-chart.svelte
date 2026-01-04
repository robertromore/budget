<script lang="ts">
	import { Beeswarm, AxisX, AxisY, Histogram, VerticalLine, BoxPlot } from '$lib/components/layercake';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import CircleDot from '@lucide/svelte/icons/circle-dot';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import BoxSelect from '@lucide/svelte/icons/box-select';
	import { currencyFormatter } from '$lib/utils/formatters';
	import type { TransactionsFormat } from '$lib/types';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { LayerCake, Svg, Html } from 'layercake';
	import { scaleLinear } from 'd3-scale';
	import { AnalyticsChartShell } from '$lib/components/charts';
	import type { ComprehensiveStats } from '$lib/utils/comprehensive-statistics';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';

	interface Props {
		transactions: TransactionsFormat[];
	}

	let { transactions }: Props = $props();

	// View mode
	type ViewMode = 'all' | 'expenses' | 'income';
	let viewMode = $state<ViewMode>('all');

	// Sensitivity control for IQR multiplier
	type Sensitivity = 'strict' | 'normal' | 'relaxed';
	let sensitivity = $state<Sensitivity>('normal');
	const sensitivityConfig = {
		strict: { multiplier: 1.0, label: 'Strict', description: 'More outliers detected' },
		normal: { multiplier: 1.5, label: 'Normal', description: 'Standard detection' },
		relaxed: { multiplier: 2.5, label: 'Relaxed', description: 'Only extreme outliers' }
	};

	// Sort options
	type SortOption = 'amount-desc' | 'amount-asc' | 'date-desc' | 'date-asc' | 'deviation';
	let sortOption = $state<SortOption>('amount-desc');
	const sortConfig = {
		'amount-desc': { label: 'Largest First' },
		'amount-asc': { label: 'Smallest First' },
		'date-desc': { label: 'Most Recent' },
		'date-asc': { label: 'Oldest First' },
		deviation: { label: 'By Deviation' }
	};

	// Chart style toggle
	type ChartStyle = 'beeswarm' | 'histogram' | 'boxplot';
	let chartStyle = $state<ChartStyle>('beeswarm');

	// Histogram hover state
	let hoveredBin = $state<{ x0: number; x1: number; count: number } | null>(null);

	// Lower outliers toggle
	let detectLowerOutliers = $state(false);

	// Hover state for enhanced tooltip
	let hoveredItem = $state<typeof beeswarmData[0] | null>(null);

	// Color scheme for income vs expense
	// Expenses use red tones, income uses green tones
	// Outliers are more saturated
	function getPointColor(d: { amount: number; isOutlier: boolean; outlierType: 'high' | 'low' | null }): string {
		const isExpense = d.amount < 0;

		if (!d.isOutlier) {
			// Normal transactions
			return isExpense ? 'var(--destructive)' : 'var(--chart-2)';
		}

		// Outliers
		if (d.outlierType === 'high') {
			// High outliers - more saturated versions
			return isExpense ? 'var(--destructive)' : 'var(--chart-5)';
		} else {
			// Low outliers
			return isExpense ? 'var(--chart-4)' : 'var(--chart-6)';
		}
	}

	// Get opacity based on outlier status (outliers are more prominent)
	function getPointOpacity(d: { isOutlier: boolean }): number {
		return d.isOutlier ? 1 : 0.6;
	}

	// Access effective time period for this chart
	const effectivePeriod = $derived(timePeriodFilter.getEffectivePeriod('outlier-detection'));

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

	// Base transaction data filtered by view mode
	const baseTransactionData = $derived.by(() => {
		const data: Array<{
			id: number | string;
			amount: number;
			absAmount: number;
			payee: string;
			category: string;
			date: Date;
		}> = [];

		for (const tx of periodFilteredTransactions) {
			const isExpense = tx.amount < 0;
			if (viewMode === 'expenses' && !isExpense) continue;
			if (viewMode === 'income' && isExpense) continue;

			const date = tx.date instanceof Date ? tx.date : new Date(tx.date?.toString() || '');
			if (isNaN(date.getTime())) continue;

			data.push({
				id: tx.id,
				amount: tx.amount,
				absAmount: Math.abs(tx.amount),
				payee: tx.payee?.name || 'Unknown',
				category: tx.category?.name || 'Uncategorized',
				date
			});
		}

		return data;
	});

	// Calculate IQR statistics separately (derived, not state)
	const iqrStats = $derived.by(() => {
		if (baseTransactionData.length === 0) return null;

		const amounts = baseTransactionData.map((d) => d.absAmount).sort((a, b) => a - b);
		const n = amounts.length;
		const q1 = amounts[Math.floor(n * 0.25)];
		const median = amounts[Math.floor(n * 0.5)];
		const q3 = amounts[Math.floor(n * 0.75)];
		const iqr = q3 - q1;
		const multiplier = sensitivityConfig[sensitivity].multiplier;
		const upperBound = q3 + multiplier * iqr;
		const lowerBound = Math.max(0, q1 - multiplier * iqr);

		return { q1, median, q3, iqr, upperBound, lowerBound, sortedAmounts: amounts };
	});

	// Transform transactions for beeswarm with outlier calculations
	const beeswarmData = $derived.by(() => {
		if (!iqrStats) {
			return baseTransactionData.map((d) => ({
				...d,
				isOutlier: false,
				outlierType: null as 'high' | 'low' | null,
				deviationFromThreshold: 0,
				percentileRank: 0
			}));
		}

		const { upperBound, lowerBound, sortedAmounts } = iqrStats;
		const n = sortedAmounts.length;

		const data = baseTransactionData.map((d) => {
			const isHighOutlier = d.absAmount > upperBound;
			const isLowOutlier = detectLowerOutliers && d.absAmount < lowerBound;

			// Calculate deviation from threshold
			let deviationFromThreshold = 0;
			if (isHighOutlier && upperBound > 0) {
				deviationFromThreshold = d.absAmount / upperBound;
			} else if (isLowOutlier && lowerBound > 0) {
				deviationFromThreshold = lowerBound / d.absAmount;
			}

			// Calculate percentile rank
			const rank = sortedAmounts.filter((a) => a < d.absAmount).length;
			const percentileRank = (rank / n) * 100;

			return {
				...d,
				isOutlier: isHighOutlier || isLowOutlier,
				outlierType: isHighOutlier ? ('high' as const) : isLowOutlier ? ('low' as const) : null,
				deviationFromThreshold,
				percentileRank
			};
		});

		// Sort data based on selected option
		switch (sortOption) {
			case 'amount-desc':
				return data.sort((a, b) => b.absAmount - a.absAmount);
			case 'amount-asc':
				return data.sort((a, b) => a.absAmount - b.absAmount);
			case 'date-desc':
				return data.sort((a, b) => b.date.getTime() - a.date.getTime());
			case 'date-asc':
				return data.sort((a, b) => a.date.getTime() - b.date.getTime());
			case 'deviation':
				return data.sort((a, b) => b.deviationFromThreshold - a.deviationFromThreshold);
			default:
				return data;
		}
	});

	// Click handler for drill-down
	function handlePointClick(d: typeof beeswarmData[0], event: MouseEvent) {
		// Open drill-down with amount range filter centered on this transaction
		const range = {
			min: d.absAmount * 0.9,
			max: d.absAmount * 1.1
		};
		chartInteractions.openDrillDown({
			type: 'amount-range',
			value: range,
			label: `Transactions around ${currencyFormatter.format(d.absAmount)}`,
			context: {
				payee: d.payee,
				category: d.category,
				transactionId: d.id
			}
		});
	}

	// Get outliers
	const outliers = $derived(beeswarmData.filter((d) => d.isOutlier));

	// High and low outlier counts
	const highOutliers = $derived(outliers.filter((d) => d.outlierType === 'high'));
	const lowOutliers = $derived(outliers.filter((d) => d.outlierType === 'low'));

	// Category breakdown of outliers
	const outliersByCategory = $derived.by(() => {
		const grouped = new Map<string, { count: number; total: number; highCount: number; lowCount: number }>();
		for (const tx of outliers) {
			const cat = tx.category;
			const current = grouped.get(cat) || { count: 0, total: 0, highCount: 0, lowCount: 0 };
			grouped.set(cat, {
				count: current.count + 1,
				total: current.total + tx.absAmount,
				highCount: current.highCount + (tx.outlierType === 'high' ? 1 : 0),
				lowCount: current.lowCount + (tx.outlierType === 'low' ? 1 : 0)
			});
		}
		return Array.from(grouped.entries())
			.map(([category, stats]) => ({ category, ...stats }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 5);
	});

	// Summary statistics
	const summaryStats = $derived.by(() => {
		if (beeswarmData.length === 0) {
			return [
				{ label: 'Total Transactions', value: '0' },
				{ label: 'Outliers Found', value: '0' },
				{ label: 'Largest Outlier', value: '$0.00' },
				{ label: 'Outlier Total', value: '$0.00' }
			];
		}

		const outlierTotal = outliers.reduce((sum, d) => sum + d.absAmount, 0);
		const largestOutlier = outliers.length > 0 ? Math.max(...outliers.map((d) => d.absAmount)) : 0;
		const largestTx = outliers.find((d) => d.absAmount === largestOutlier);

		return [
			{ label: 'Total Transactions', value: beeswarmData.length.toString() },
			{
				label: 'Outliers Found',
				value: outliers.length.toString(),
				description: `${((outliers.length / beeswarmData.length) * 100).toFixed(1)}% of transactions`
			},
			{
				label: 'Largest Outlier',
				value: currencyFormatter.format(largestOutlier),
				description: largestTx?.payee
			},
			{
				label: 'Outlier Total',
				value: currencyFormatter.format(outlierTotal),
				description: `${((outlierTotal / beeswarmData.reduce((s, d) => s + d.absAmount, 0)) * 100).toFixed(1)}% of spending`
			}
		];
	});

	// Comprehensive statistics for the Statistics tab
	const comprehensiveStats = $derived.by((): ComprehensiveStats | null => {
		if (beeswarmData.length === 0) return null;

		const amounts = beeswarmData.map((d) => d.absAmount);
		const sortedAmounts = [...amounts].sort((a, b) => a - b);
		const n = amounts.length;

		const total = amounts.reduce((s, a) => s + a, 0);
		const mean = total / n;
		const median = sortedAmounts[Math.floor(n / 2)] || 0;

		// Standard deviation
		const variance = amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / n;
		const stdDev = Math.sqrt(variance);

		// Percentiles
		const p25 = sortedAmounts[Math.floor(n * 0.25)] || 0;
		const p50 = median;
		const p75 = sortedAmounts[Math.floor(n * 0.75)] || 0;

		// Outlier metrics
		const outlierTotal = outliers.reduce((sum, d) => sum + d.absAmount, 0);
		const outlierPercent = total > 0 ? (outlierTotal / total) * 100 : 0;

		const largestOutlier = outliers.length > 0 ? Math.max(...outliers.map((d) => d.absAmount)) : 0;
		const largestTx = outliers.find((d) => d.absAmount === largestOutlier);

		return {
			summary: {
				average: mean,
				median: median,
				total: total,
				count: n
			},
			trend: {
				direction: 'flat',
				growthRate: outlierPercent, // Use for outlier percentage
				slope: 0,
				monthlyChange: 0
			},
			distribution: {
				highest: { value: largestOutlier, month: largestTx?.payee || 'Largest Outlier', monthLabel: largestTx?.payee || '' },
				lowest: { value: sortedAmounts[0] || 0, month: 'Smallest', monthLabel: 'Minimum transaction' },
				range: (sortedAmounts[n - 1] || 0) - (sortedAmounts[0] || 0),
				p25,
				p50,
				p75,
				iqr: p75 - p25,
				stdDev,
				coefficientOfVariation: mean !== 0 ? (stdDev / mean) * 100 : 0
			},
			outliers: {
				count: outliers.length,
				months: outliers.slice(0, 5).map(o => ({
					month: o.payee,
					monthLabel: o.date.toLocaleDateString(),
					value: o.absAmount,
					type: 'high' as const
				}))
			},
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

	const hasData = $derived(beeswarmData.length > 0);

	// Track container dimensions
	let containerWidth = $state(0);
	let containerHeight = $state(0);
	const containerReady = $derived(containerWidth > 0 && containerHeight > 0);

	// X domain (amount)
	const xDomain = $derived.by((): [number, number] => {
		if (!hasData) return [0, 100];
		const max = Math.max(...beeswarmData.map((d) => d.absAmount));
		return [0, max * 1.05];
	});

	const chartPadding = $derived.by(() => {
		if (chartStyle === 'boxplot') {
			return { top: 60, right: 20, bottom: 40, left: 60 };
		}

		return { top: 40, right: 20, bottom: 40, left: 60 };
	});
</script>

<AnalyticsChartShell
	data={beeswarmData}
	{comprehensiveStats}
	supportedChartTypes={['bar']}
	defaultChartType="bar"
	emptyMessage="No transactions to analyze"
	chartId="outlier-detection"
	allowedPeriodGroups={['months', 'year', 'other']}
>
	{#snippet title()}
		Outlier Detection
	{/snippet}

	{#snippet subtitle()}
		Identify unusually large transactions using statistical analysis
	{/snippet}

	{#snippet headerActions()}
		<div class="flex flex-wrap items-center gap-2">
			<!-- Chart style toggle -->
			<div class="flex gap-0.5 rounded-md border p-0.5">
				<Button
					variant={chartStyle === 'beeswarm' ? 'secondary' : 'ghost'}
					size="sm"
					class="h-7 w-7 p-0"
					onclick={() => (chartStyle = 'beeswarm')}
					title="Beeswarm view"
				>
					<CircleDot class="h-4 w-4" />
				</Button>
				<Button
					variant={chartStyle === 'boxplot' ? 'secondary' : 'ghost'}
					size="sm"
					class="h-7 w-7 p-0"
					onclick={() => (chartStyle = 'boxplot')}
					title="Box plot view"
				>
					<BoxSelect class="h-4 w-4" />
				</Button>
				<Button
					variant={chartStyle === 'histogram' ? 'secondary' : 'ghost'}
					size="sm"
					class="h-7 w-7 p-0"
					onclick={() => (chartStyle = 'histogram')}
					title="Histogram view"
				>
					<BarChart3 class="h-4 w-4" />
				</Button>
			</div>

			<!-- View mode buttons -->
			<div class="flex gap-1">
				<Button variant={viewMode === 'all' ? 'default' : 'ghost'} size="sm" onclick={() => (viewMode = 'all')}>
					All
				</Button>
				<Button variant={viewMode === 'expenses' ? 'default' : 'ghost'} size="sm" onclick={() => (viewMode = 'expenses')}>
					Expenses
				</Button>
				<Button variant={viewMode === 'income' ? 'default' : 'ghost'} size="sm" onclick={() => (viewMode = 'income')}>
					Income
				</Button>
			</div>

			<!-- Sensitivity dropdown -->
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<Button variant="outline" size="sm" class="gap-1">
						<SlidersHorizontal class="h-4 w-4" />
						{sensitivityConfig[sensitivity].label}
						<ChevronDown class="h-3 w-3" />
					</Button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end">
					<DropdownMenu.Label>Detection Sensitivity</DropdownMenu.Label>
					<DropdownMenu.Separator />
					<DropdownMenu.RadioGroup bind:value={sensitivity}>
						{#each Object.entries(sensitivityConfig) as [key, config]}
							<DropdownMenu.RadioItem value={key}>
								<div class="flex flex-col">
									<span>{config.label} ({config.multiplier}×)</span>
									<span class="text-xs text-muted-foreground">{config.description}</span>
								</div>
							</DropdownMenu.RadioItem>
						{/each}
					</DropdownMenu.RadioGroup>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<!-- Sort dropdown -->
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<Button variant="outline" size="sm" class="gap-1">
						<ArrowUpDown class="h-4 w-4" />
						{sortConfig[sortOption].label}
						<ChevronDown class="h-3 w-3" />
					</Button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end">
					<DropdownMenu.Label>Sort Order</DropdownMenu.Label>
					<DropdownMenu.Separator />
					<DropdownMenu.RadioGroup bind:value={sortOption}>
						{#each Object.entries(sortConfig) as [key, config]}
							<DropdownMenu.RadioItem value={key}>
								{config.label}
							</DropdownMenu.RadioItem>
						{/each}
					</DropdownMenu.RadioGroup>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<!-- Lower outliers toggle -->
			<div class="flex items-center gap-2 px-2">
				<Switch id="lower-outliers" bind:checked={detectLowerOutliers} />
				<Label for="lower-outliers" class="text-xs cursor-pointer">Include Low</Label>
			</div>
		</div>
	{/snippet}

	{#snippet chart({ data }: { data: typeof beeswarmData })}
		<div
			class="h-112.5 w-full relative"
			bind:clientWidth={containerWidth}
			bind:clientHeight={containerHeight}
		>
			{#if containerReady}
				<LayerCake
					{data}
					x="absAmount"
					xScale={scaleLinear()}
					xDomain={xDomain}
					padding={chartPadding}
				>
					<Svg>
						<AxisX ticks={6} format={(d) => currencyFormatter.format(d)} />
						{#if chartStyle === 'beeswarm'}
							<Beeswarm
								radius={5}
								fill={(d) => getPointColor(d)}
								stroke={(d) => d.isOutlier ? 'var(--background)' : 'transparent'}
								strokeWidth={1.5}
								opacity={(d) => getPointOpacity(d)}
								hoverOpacity={1}
								onclick={handlePointClick}
								onhover={(d) => hoveredItem = d}
							/>
						{:else if chartStyle === 'histogram'}
							<Histogram
								bins={20}
								fill="var(--chart-1)"
								opacity={0.8}
								hoverOpacity={1}
								onclick={(bin) => {
									chartInteractions.openDrillDown({
										type: 'amount-range',
										value: { min: bin.x0, max: bin.x1 },
										label: `Transactions ${currencyFormatter.format(bin.x0)} - ${currencyFormatter.format(bin.x1)}`
									});
								}}
								onhover={(bin) => hoveredBin = bin}
							/>
							{#if iqrStats}
								<VerticalLine
									value={iqrStats.upperBound}
									stroke="var(--destructive)"
									strokeWidth={2}
									strokeDasharray="6,4"
								/>
							{/if}
						{:else}
							<BoxPlot
								valueKey="absAmount"
								multiplier={sensitivityConfig[sensitivity].multiplier}
								boxFill="var(--chart-1)"
								boxStroke="var(--chart-1)"
								medianStroke="var(--foreground)"
								outlierFill={(d) => getPointColor(d)}
								outlierRadius={5}
								boxWidthPercent={40}
								onOutlierClick={handlePointClick}
								onOutlierHover={(d) => hoveredItem = d}
							/>
						{/if}
					</Svg>
					<Html pointerEvents={false}>
						{#if chartStyle === 'beeswarm'}
							{#if hoveredItem}
								{@const isExpense = hoveredItem.amount < 0}
								<div class="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
									<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md min-w-50">
										<div class="flex items-center gap-2">
											<span class="font-medium">{hoveredItem.payee}</span>
											<span class="text-xs px-1.5 py-0.5 rounded {isExpense ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}">
												{isExpense ? 'Expense' : 'Income'}
											</span>
										</div>
										<p class="text-muted-foreground text-xs">{hoveredItem.category}</p>
										<p class="font-semibold" style="color: {getPointColor(hoveredItem)}">
											{currencyFormatter.format(hoveredItem.absAmount)}
											{#if hoveredItem.isOutlier}
												<span class="text-xs ml-1">(Outlier)</span>
											{/if}
										</p>
										<p class="text-muted-foreground text-xs">
											{hoveredItem.date.toLocaleDateString()}
										</p>

										{#if hoveredItem.isOutlier}
											<div class="mt-2 border-t pt-2 text-xs text-muted-foreground space-y-0.5">
												<p>{hoveredItem.deviationFromThreshold.toFixed(2)}× above threshold</p>
												<p>Top {(100 - hoveredItem.percentileRank).toFixed(1)}% of transactions</p>
											</div>
										{:else}
											<div class="mt-2 border-t pt-2 text-xs text-muted-foreground">
												<p>Percentile: {hoveredItem.percentileRank.toFixed(1)}%</p>
											</div>
										{/if}

										<p class="text-muted-foreground mt-2 border-t pt-1 text-xs">Click for details</p>
									</div>
								</div>
							{/if}
						{:else if chartStyle === 'histogram'}
							{#if hoveredBin}
								<div class="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
									<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md min-w-50">
										<p class="font-medium">
											{currencyFormatter.format(hoveredBin.x0)} - {currencyFormatter.format(hoveredBin.x1)}
										</p>
										<p class="text-primary font-semibold">{hoveredBin.count} transactions</p>
										{#if iqrStats && hoveredBin.x0 >= iqrStats.upperBound}
											<p class="text-destructive text-xs mt-1">Above outlier threshold</p>
										{/if}
										<p class="text-muted-foreground mt-2 border-t pt-1 text-xs">Click to view transactions</p>
									</div>
								</div>
							{/if}
						{:else}
							{#if hoveredItem}
								{@const isExpense = hoveredItem.amount < 0}
								<div class="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
									<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md min-w-50">
										<div class="flex items-center gap-2">
											<span class="font-medium">{hoveredItem.payee}</span>
											<span class="text-xs px-1.5 py-0.5 rounded {isExpense ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}">
												{isExpense ? 'Expense' : 'Income'}
											</span>
										</div>
										<p class="text-muted-foreground text-xs">{hoveredItem.category}</p>
										<p class="font-semibold" style="color: {getPointColor(hoveredItem)}">
											{currencyFormatter.format(hoveredItem.absAmount)}
											<span class="text-xs ml-1">(Outlier)</span>
										</p>
										<p class="text-muted-foreground text-xs">
											{hoveredItem.date.toLocaleDateString()}
										</p>
										<div class="mt-2 border-t pt-2 text-xs text-muted-foreground space-y-0.5">
											<p>{hoveredItem.deviationFromThreshold.toFixed(2)}× above threshold</p>
											<p>Top {(100 - hoveredItem.percentileRank).toFixed(1)}% of transactions</p>
										</div>
										<p class="text-muted-foreground mt-2 border-t pt-1 text-xs">Click for details</p>
									</div>
								</div>
							{/if}
							<!-- Box plot statistics -->
							{#if iqrStats}
								<div class="absolute bottom-12 left-1/2 -translate-x-1/2 text-xs text-muted-foreground flex gap-4">
									<span>Q1: {currencyFormatter.format(iqrStats.q1)}</span>
									{#if chartStyle === 'boxplot'}
										<span>Median: {currencyFormatter.format(iqrStats.median)}</span>
									{/if}
									<span>Q3: {currencyFormatter.format(iqrStats.q3)}</span>
									<span>IQR: {currencyFormatter.format(iqrStats.iqr)}</span>
								</div>
							{/if}
						{/if}
					</Html>
				</LayerCake>
			{/if}

			<!-- Legend and Outlier List -->
		<div class="mt-4 space-y-4">
			<div class="flex flex-wrap justify-center gap-4">
				{#if chartStyle === 'beeswarm'}
					<!-- Beeswarm legend: Expense/Income colors -->
					<div class="flex items-center gap-3 border-r pr-4">
						<span class="text-xs font-medium text-muted-foreground">Expenses:</span>
						<div class="flex items-center gap-1.5">
							<div class="h-3 w-3 rounded-full opacity-60" style="background-color: var(--destructive)"></div>
							<span class="text-xs">Normal</span>
						</div>
						<div class="flex items-center gap-1.5">
							<div class="h-3 w-3 rounded-full" style="background-color: var(--destructive)"></div>
							<span class="text-xs">High</span>
						</div>
						{#if detectLowerOutliers}
							<div class="flex items-center gap-1.5">
								<div class="h-3 w-3 rounded-full" style="background-color: var(--chart-4)"></div>
								<span class="text-xs">Low</span>
							</div>
						{/if}
					</div>
					<div class="flex items-center gap-3">
						<span class="text-xs font-medium text-muted-foreground">Income:</span>
						<div class="flex items-center gap-1.5">
							<div class="h-3 w-3 rounded-full opacity-60" style="background-color: var(--chart-2)"></div>
							<span class="text-xs">Normal</span>
						</div>
						<div class="flex items-center gap-1.5">
							<div class="h-3 w-3 rounded-full" style="background-color: var(--chart-5)"></div>
							<span class="text-xs">High</span>
						</div>
						{#if detectLowerOutliers}
							<div class="flex items-center gap-1.5">
								<div class="h-3 w-3 rounded-full" style="background-color: var(--chart-6)"></div>
								<span class="text-xs">Low</span>
							</div>
						{/if}
					</div>
				{:else if chartStyle === 'histogram'}
					<!-- Histogram legend -->
					<div class="flex items-center gap-4">
						<div class="flex items-center gap-1.5">
							<div class="h-3 w-3 rounded" style="background-color: var(--chart-1)"></div>
							<span class="text-xs">Transaction Count</span>
						</div>
						<div class="flex items-center gap-1.5">
							<div class="h-0.5 w-4 border-t-2 border-dashed" style="border-color: var(--destructive)"></div>
							<span class="text-xs">Outlier Threshold</span>
						</div>
					</div>
				{:else}
					<!-- Box plot legend -->
					<div class="flex items-center gap-4">
						<div class="flex items-center gap-1.5">
							<div class="h-3 w-5 rounded border" style="background-color: var(--chart-1); border-color: var(--chart-1)"></div>
							<span class="text-xs">IQR (Q1-Q3)</span>
						</div>
						<div class="flex items-center gap-1.5">
							<div class="h-0.5 w-4" style="background-color: var(--foreground)"></div>
							<span class="text-xs">Median</span>
						</div>
						<div class="flex items-center gap-1.5">
							<div class="h-0.5 w-4 border-t-2 border-dashed" style="border-color: var(--chart-1)"></div>
							<span class="text-xs">Whiskers</span>
						</div>
						<div class="flex items-center gap-1.5">
							<div class="h-3 w-3 rounded-full" style="background-color: var(--destructive)"></div>
							<span class="text-xs">Expense Outlier</span>
						</div>
						<div class="flex items-center gap-1.5">
							<div class="h-3 w-3 rounded-full" style="background-color: var(--chart-5)"></div>
							<span class="text-xs">Income Outlier</span>
						</div>
					</div>
				{/if}
			</div>
			{#if iqrStats}
				<div class="text-xs text-muted-foreground text-center">
					Threshold: >{currencyFormatter.format(iqrStats.upperBound)} ({sensitivityConfig[sensitivity].multiplier}×IQR)
					{#if detectLowerOutliers}
						 | Low: &lt;{currencyFormatter.format(iqrStats.lowerBound)}
					{/if}
				</div>
			{/if}

			<!-- Stats and Category breakdown -->
			<div class="grid gap-4 md:grid-cols-2">
				<!-- Top Outliers List -->
				{#if outliers.length > 0}
					<div class="rounded-lg border p-4">
						<h4 class="mb-2 text-sm font-medium">
							Top Outliers
							<span class="text-muted-foreground font-normal">
								({highOutliers.length} high{detectLowerOutliers && lowOutliers.length > 0 ? `, ${lowOutliers.length} low` : ''})
							</span>
						</h4>
						<div class="space-y-1">
							{#each outliers.slice(0, 5) as outlier}
								{@const isExpense = outlier.amount < 0}
								<button
									class="flex w-full items-center justify-between text-sm hover:bg-muted/50 rounded px-1 py-0.5 transition-colors cursor-pointer"
									onclick={(e) => handlePointClick(outlier, e)}
								>
									<div class="flex flex-col items-start">
										<div class="flex items-center gap-1.5">
											<div class="h-2 w-2 rounded-full" style="background-color: {getPointColor(outlier)}"></div>
											<span class="text-muted-foreground">{outlier.payee}</span>
											<span class="text-[10px] px-1 py-0.5 rounded {isExpense ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}">
												{isExpense ? 'E' : 'I'}
											</span>
										</div>
										<span class="text-xs text-muted-foreground/70 ml-3.5">{outlier.date.toLocaleDateString()}</span>
									</div>
									<div class="flex flex-col items-end">
										<span class="font-medium" style="color: {getPointColor(outlier)}">
											{currencyFormatter.format(outlier.absAmount)}
										</span>
										<span class="text-xs text-muted-foreground">
											{outlier.deviationFromThreshold.toFixed(2)}× {outlier.outlierType === 'low' ? 'below' : 'above'}
										</span>
									</div>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Category Breakdown -->
				{#if outliersByCategory.length > 0}
					<div class="rounded-lg border p-4">
						<h4 class="mb-2 text-sm font-medium">Outliers by Category</h4>
						<div class="space-y-2">
							{#each outliersByCategory as cat}
								{@const maxCount = Math.max(...outliersByCategory.map(c => c.count))}
								{@const widthPercent = (cat.count / maxCount) * 100}
								<div class="space-y-1">
									<div class="flex items-center justify-between text-sm">
										<span class="text-muted-foreground truncate max-w-32">{cat.category}</span>
										<div class="flex items-center gap-2">
											<span class="text-xs text-muted-foreground">{currencyFormatter.format(cat.total)}</span>
											<span class="font-medium">{cat.count}</span>
										</div>
									</div>
									<div class="h-1.5 w-full rounded-full bg-muted">
										<div
											class="h-full rounded-full bg-destructive/70"
											style="width: {widthPercent}%"
										></div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
		</div>
	{/snippet}
</AnalyticsChartShell>
