<script lang="ts">
	import { AxisX, AxisY, ComparisonDotPlot } from '$lib/components/layercake';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { currencyFormatter } from '$lib/utils/formatters';
	import type { TransactionsFormat } from '$lib/types';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { LayerCake, Svg, Html } from 'layercake';
	import { scaleBand, scaleLinear } from 'd3-scale';
	import { AnalyticsChartShell } from '$lib/components/charts';
	import type { ComprehensiveStats } from '$lib/utils/comprehensive-statistics';
	import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
	import Filter from '@lucide/svelte/icons/filter';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	interface Props {
		transactions: TransactionsFormat[];
	}

	let { transactions }: Props = $props();

	// Comparison period options
	type ComparisonPeriod = 'this-vs-last-month' | 'this-vs-last-week' | 'this-vs-last-quarter' | 'this-vs-same-month-last-year';
	let comparisonPeriod = $state<ComparisonPeriod>('this-vs-last-month');

	// Sort options
	type SortOption = 'absolute-change' | 'percent-change' | 'current-amount' | 'alphabetical';
	let sortOption = $state<SortOption>('absolute-change');

	// Filter by change direction
	type ChangeFilter = 'all' | 'increased' | 'decreased';
	let changeFilter = $state<ChangeFilter>('all');

	// Track hovered item for tooltip
	let hoveredItem = $state<typeof categoryComparison[0] | null>(null);

	const comparisonPeriodLabels: Record<ComparisonPeriod, { label: string; current: string; previous: string }> = {
		'this-vs-last-month': { label: 'Month vs Month', current: 'This Month', previous: 'Last Month' },
		'this-vs-last-week': { label: 'Week vs Week', current: 'This Week', previous: 'Last Week' },
		'this-vs-last-quarter': { label: 'Quarter vs Quarter', current: 'This Quarter', previous: 'Last Quarter' },
		'this-vs-same-month-last-year': { label: 'Year over Year', current: 'This Month', previous: 'Same Month Last Year' }
	};

	const sortLabels: Record<SortOption, string> = {
		'absolute-change': 'Biggest Change',
		'percent-change': '% Change',
		'current-amount': 'Current Amount',
		'alphabetical': 'A-Z'
	};

	// Access effective time period for this chart
	const effectivePeriod = $derived(timePeriodFilter.getEffectivePeriod('category-trends'));

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

	// Helper to parse date
	function parseDate(tx: TransactionsFormat): Date {
		return tx.date instanceof Date ? tx.date : new Date(tx.date?.toString() || '');
	}

	// Calculate date ranges based on comparison period
	const dateRanges = $derived.by(() => {
		const dates = filteredTransactions
			.map(parseDate)
			.filter((d) => !isNaN(d.getTime()))
			.sort((a, b) => a.getTime() - b.getTime());

		if (dates.length < 2) return null;

		const latestDate = dates[dates.length - 1];
		let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date;

		switch (comparisonPeriod) {
			case 'this-vs-last-week': {
				// Current week: Sunday to Saturday containing latestDate
				const dayOfWeek = latestDate.getDay();
				currentStart = new Date(latestDate);
				currentStart.setDate(latestDate.getDate() - dayOfWeek);
				currentStart.setHours(0, 0, 0, 0);
				currentEnd = new Date(currentStart);
				currentEnd.setDate(currentStart.getDate() + 6);
				currentEnd.setHours(23, 59, 59, 999);
				// Previous week
				previousStart = new Date(currentStart);
				previousStart.setDate(currentStart.getDate() - 7);
				previousEnd = new Date(previousStart);
				previousEnd.setDate(previousStart.getDate() + 6);
				previousEnd.setHours(23, 59, 59, 999);
				break;
			}
			case 'this-vs-last-quarter': {
				const currentQuarter = Math.floor(latestDate.getMonth() / 3);
				currentStart = new Date(latestDate.getFullYear(), currentQuarter * 3, 1);
				currentEnd = new Date(latestDate.getFullYear(), currentQuarter * 3 + 3, 0, 23, 59, 59, 999);
				const prevQuarter = currentQuarter - 1;
				const prevYear = prevQuarter < 0 ? latestDate.getFullYear() - 1 : latestDate.getFullYear();
				const adjustedPrevQuarter = prevQuarter < 0 ? 3 : prevQuarter;
				previousStart = new Date(prevYear, adjustedPrevQuarter * 3, 1);
				previousEnd = new Date(prevYear, adjustedPrevQuarter * 3 + 3, 0, 23, 59, 59, 999);
				break;
			}
			case 'this-vs-same-month-last-year': {
				currentStart = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);
				currentEnd = new Date(latestDate.getFullYear(), latestDate.getMonth() + 1, 0, 23, 59, 59, 999);
				previousStart = new Date(latestDate.getFullYear() - 1, latestDate.getMonth(), 1);
				previousEnd = new Date(latestDate.getFullYear() - 1, latestDate.getMonth() + 1, 0, 23, 59, 59, 999);
				break;
			}
			case 'this-vs-last-month':
			default: {
				currentStart = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);
				currentEnd = new Date(latestDate.getFullYear(), latestDate.getMonth() + 1, 0, 23, 59, 59, 999);
				previousStart = new Date(latestDate.getFullYear(), latestDate.getMonth() - 1, 1);
				previousEnd = new Date(latestDate.getFullYear(), latestDate.getMonth(), 0, 23, 59, 59, 999);
				break;
			}
		}

		return { currentStart, currentEnd, previousStart, previousEnd };
	});

	// Calculate category spending for current and previous period
	const rawCategoryComparison = $derived.by(() => {
		if (!dateRanges) return [];

		const { currentStart, currentEnd, previousStart, previousEnd } = dateRanges;

		// Aggregate by category for each period
		const currentTotals = new Map<string, number>();
		const previousTotals = new Map<string, number>();

		for (const tx of filteredTransactions) {
			if (tx.amount >= 0) continue;

			const date = parseDate(tx);
			if (isNaN(date.getTime())) continue;

			const category = tx.category?.name || 'Uncategorized';
			const amount = Math.abs(tx.amount);

			if (date >= currentStart && date <= currentEnd) {
				currentTotals.set(category, (currentTotals.get(category) || 0) + amount);
			} else if (date >= previousStart && date <= previousEnd) {
				previousTotals.set(category, (previousTotals.get(category) || 0) + amount);
			}
		}

		// Combine and calculate changes
		const allCategories = new Set([...currentTotals.keys(), ...previousTotals.keys()]);
		return Array.from(allCategories).map((category) => {
			const current = currentTotals.get(category) || 0;
			const previous = previousTotals.get(category) || 0;
			const change = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

			return {
				category,
				current,
				previous,
				change,
				changeAbs: current - previous,
				index: 0
			};
		}).filter((c) => c.current > 0 || c.previous > 0);
	});

	// Apply filter and sort
	const categoryComparison = $derived.by(() => {
		let result = [...rawCategoryComparison];

		// Apply change filter
		if (changeFilter === 'increased') {
			result = result.filter((c) => c.changeAbs > 0);
		} else if (changeFilter === 'decreased') {
			result = result.filter((c) => c.changeAbs < 0);
		}

		// Apply sort
		switch (sortOption) {
			case 'percent-change':
				result.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
				break;
			case 'current-amount':
				result.sort((a, b) => b.current - a.current);
				break;
			case 'alphabetical':
				result.sort((a, b) => a.category.localeCompare(b.category));
				break;
			case 'absolute-change':
			default:
				result.sort((a, b) => Math.abs(b.changeAbs) - Math.abs(a.changeAbs));
				break;
		}

		// Take top 10 and re-index
		return result.slice(0, 10).map((item, idx) => ({ ...item, index: idx }));
	});

	// Handle category click for drill-down
	function handleCategoryClick(d: typeof categoryComparison[0]) {
		chartInteractions.openDrillDown({
			type: 'category',
			value: d.category,
			label: `${d.category} Transactions`
		});
	}

	// Summary statistics
	const summaryStats = $derived.by(() => {
		if (rawCategoryComparison.length === 0) {
			return [
				{ label: 'Categories', value: '0' },
				{ label: 'Biggest Increase', value: 'N/A' },
				{ label: 'Biggest Decrease', value: 'N/A' },
				{ label: 'Net Change', value: '$0.00' }
			];
		}

		const increases = rawCategoryComparison.filter((c) => c.change > 0);
		const decreases = rawCategoryComparison.filter((c) => c.change < 0);
		const biggestIncrease = increases.length > 0 ? increases.reduce((a, b) => (a.change > b.change ? a : b)) : null;
		const biggestDecrease = decreases.length > 0 ? decreases.reduce((a, b) => (a.change < b.change ? a : b)) : null;
		const netChange = rawCategoryComparison.reduce((s, c) => s + c.changeAbs, 0);

		return [
			{ label: 'Categories', value: rawCategoryComparison.length.toString() },
			{
				label: 'Biggest Increase',
				value: biggestIncrease ? biggestIncrease.category : 'N/A',
				description: biggestIncrease ? `+${biggestIncrease.change.toFixed(0)}%` : undefined
			},
			{
				label: 'Biggest Decrease',
				value: biggestDecrease ? biggestDecrease.category : 'N/A',
				description: biggestDecrease ? `${biggestDecrease.change.toFixed(0)}%` : undefined
			},
			{
				label: 'Net Change',
				value: currencyFormatter.format(netChange),
				description: netChange > 0 ? 'Spending increased' : netChange < 0 ? 'Spending decreased' : 'No change'
			}
		];
	});

	// Comprehensive statistics for the Statistics tab
	const comprehensiveStats = $derived.by((): ComprehensiveStats | null => {
		if (rawCategoryComparison.length === 0) return null;

		const currentValues = rawCategoryComparison.map(c => c.current);
		const previousValues = rawCategoryComparison.map(c => c.previous);

		const currentTotal = currentValues.reduce((s, v) => s + v, 0);
		const previousTotal = previousValues.reduce((s, v) => s + v, 0);
		const avgCurrent = currentTotal / rawCategoryComparison.length;
		const avgPrevious = previousTotal / rawCategoryComparison.length;

		// Find highest/lowest categories
		const highestCurrent = rawCategoryComparison.reduce((a, b) => a.current > b.current ? a : b);
		const lowestCurrent = rawCategoryComparison.filter(c => c.current > 0).reduce((a, b) => a.current < b.current ? a : b, rawCategoryComparison[0]);

		// Calculate distribution stats for current period
		const sortedCurrent = [...currentValues].sort((a, b) => a - b);
		const p25 = sortedCurrent[Math.floor(sortedCurrent.length * 0.25)] || 0;
		const p50 = sortedCurrent[Math.floor(sortedCurrent.length * 0.5)] || 0;
		const p75 = sortedCurrent[Math.floor(sortedCurrent.length * 0.75)] || 0;

		// Standard deviation
		const variance = currentValues.reduce((s, v) => s + Math.pow(v - avgCurrent, 2), 0) / currentValues.length;
		const stdDev = Math.sqrt(variance);

		// Overall change
		const overallChange = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

		// Trend direction
		const trendDirection: 'up' | 'down' | 'flat' = overallChange > 5 ? 'up' : overallChange < -5 ? 'down' : 'flat';

		return {
			summary: {
				average: avgCurrent,
				median: p50,
				total: currentTotal,
				count: rawCategoryComparison.length
			},
			trend: {
				direction: trendDirection,
				growthRate: overallChange,
				slope: (currentTotal - previousTotal) / rawCategoryComparison.length,
				monthlyChange: 0
			},
			distribution: {
				highest: { value: highestCurrent.current, month: highestCurrent.category, monthLabel: highestCurrent.category },
				lowest: { value: lowestCurrent?.current || 0, month: lowestCurrent?.category || '', monthLabel: lowestCurrent?.category || '' },
				range: highestCurrent.current - (lowestCurrent?.current || 0),
				p25,
				p50,
				p75,
				iqr: p75 - p25,
				stdDev,
				coefficientOfVariation: avgCurrent !== 0 ? (stdDev / avgCurrent) * 100 : 0
			},
			outliers: { count: 0, months: [] },
			comparison: {
				vsHistoricalAvg: avgCurrent - avgPrevious,
				vsHistoricalAvgPercent: avgPrevious > 0 ? ((avgCurrent - avgPrevious) / avgPrevious) * 100 : null,
				vsBudgetTarget: null,
				vsBudgetTargetPercent: null,
				vsLastYearTotal: null,
				vsLastYearPercent: null
			}
		};
	});

	const hasData = $derived(categoryComparison.length > 0);

	// X domain (amounts)
	const xDomain = $derived.by((): [number, number] => {
		if (!hasData) return [0, 100];
		const allValues = categoryComparison.flatMap((c) => [c.current, c.previous]);
		return [0, Math.max(...allValues) * 1.1];
	});

	// Count of increased/decreased for filter badges
	const increaseCount = $derived(rawCategoryComparison.filter(c => c.changeAbs > 0).length);
	const decreaseCount = $derived(rawCategoryComparison.filter(c => c.changeAbs < 0).length);
</script>

<AnalyticsChartShell
	data={categoryComparison}
	{comprehensiveStats}
	supportedChartTypes={['bar']}
	defaultChartType="bar"
	emptyMessage="Need at least 2 periods of data"
	chartId="category-trends"
	allowedPeriodGroups={['months', 'year', 'other']}
>
	{#snippet title()}
		Category Trends
	{/snippet}

	{#snippet subtitle()}
		{comparisonPeriodLabels[comparisonPeriod].label} comparison by category
	{/snippet}

	{#snippet headerActions()}
		<div class="flex gap-1">
			<!-- Comparison Period Dropdown -->
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button variant="ghost" size="sm" {...props}>
							{comparisonPeriodLabels[comparisonPeriod].label}
							<ChevronDown class="ml-1 h-3 w-3" />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end">
					<DropdownMenu.RadioGroup bind:value={comparisonPeriod}>
						<DropdownMenu.RadioItem value="this-vs-last-month">Month vs Month</DropdownMenu.RadioItem>
						<DropdownMenu.RadioItem value="this-vs-last-week">Week vs Week</DropdownMenu.RadioItem>
						<DropdownMenu.RadioItem value="this-vs-last-quarter">Quarter vs Quarter</DropdownMenu.RadioItem>
						<DropdownMenu.RadioItem value="this-vs-same-month-last-year">Year over Year</DropdownMenu.RadioItem>
					</DropdownMenu.RadioGroup>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<!-- Sort Dropdown -->
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button variant="ghost" size="sm" {...props}>
							<ArrowUpDown class="mr-1 h-3 w-3" />
							{sortLabels[sortOption]}
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end">
					<DropdownMenu.RadioGroup bind:value={sortOption}>
						<DropdownMenu.RadioItem value="absolute-change">Biggest Change ($)</DropdownMenu.RadioItem>
						<DropdownMenu.RadioItem value="percent-change">Biggest Change (%)</DropdownMenu.RadioItem>
						<DropdownMenu.RadioItem value="current-amount">Current Amount</DropdownMenu.RadioItem>
						<DropdownMenu.RadioItem value="alphabetical">Alphabetical</DropdownMenu.RadioItem>
					</DropdownMenu.RadioGroup>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<!-- Filter Dropdown -->
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button variant={changeFilter !== 'all' ? 'secondary' : 'ghost'} size="sm" {...props}>
							<Filter class="mr-1 h-3 w-3" />
							{changeFilter === 'all' ? 'All' : changeFilter === 'increased' ? 'Increased' : 'Decreased'}
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end">
					<DropdownMenu.RadioGroup bind:value={changeFilter}>
						<DropdownMenu.RadioItem value="all">
							All Categories ({rawCategoryComparison.length})
						</DropdownMenu.RadioItem>
						<DropdownMenu.RadioItem value="increased">
							<TrendingUp class="mr-2 h-4 w-4 text-destructive" />
							Increased ({increaseCount})
						</DropdownMenu.RadioItem>
						<DropdownMenu.RadioItem value="decreased">
							<TrendingDown class="mr-2 h-4 w-4 text-green-600" />
							Decreased ({decreaseCount})
						</DropdownMenu.RadioItem>
					</DropdownMenu.RadioGroup>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	{/snippet}

	{#snippet chart({ data }: { data: typeof categoryComparison })}
		<div class="h-[500px] w-full pb-20">
			<LayerCake
				{data}
				x="current"
				y="category"
				xScale={scaleLinear()}
				yScale={scaleBand().padding(0.3)}
				{xDomain}
				padding={{ top: 20, right: 100, bottom: 40, left: 120 }}
			>
				<Svg>
					<AxisX ticks={5} gridlines={true} format={(d) => currencyFormatter.format(d)} />
					<AxisY />
					<ComparisonDotPlot
						x1="previous"
						x2="current"
						y="category"
						fill1="var(--muted-foreground)"
						fill2={(d) => (d.change >= 0 ? 'var(--destructive)' : 'var(--chart-2)')}
						lineStroke={(d) => (d.change >= 0 ? 'var(--destructive)' : 'var(--chart-2)')}
						lineWidth={2}
						showLabels={true}
						labelFormat={(d) => `${d.change >= 0 ? '+' : ''}${d.change.toFixed(0)}%`}
						onclick={(d) => handleCategoryClick(d)}
						onhover={(d) => (hoveredItem = d)}
						hoverOpacity={1}
					/>
				</Svg>
				<Html pointerEvents={false}>
					{#if hoveredItem}
						<div class="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
							<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
								<p class="font-medium">{hoveredItem.category}</p>
								<p class="text-muted-foreground">
									{comparisonPeriodLabels[comparisonPeriod].previous}: {currencyFormatter.format(hoveredItem.previous)}
								</p>
								<p class={hoveredItem.change >= 0 ? 'text-destructive' : 'text-green-600'}>
									{comparisonPeriodLabels[comparisonPeriod].current}: {currencyFormatter.format(hoveredItem.current)}
								</p>
								<div class="mt-1 flex items-center gap-2 border-t pt-1">
									{#if hoveredItem.change >= 0}
										<TrendingUp class="h-3 w-3 text-destructive" />
									{:else}
										<TrendingDown class="h-3 w-3 text-green-600" />
									{/if}
									<p class={hoveredItem.change >= 0 ? 'text-destructive text-xs' : 'text-green-600 text-xs'}>
										{hoveredItem.change >= 0 ? '+' : ''}{hoveredItem.change.toFixed(1)}% ({hoveredItem.changeAbs >= 0 ? '+' : ''}{currencyFormatter.format(hoveredItem.changeAbs)})
									</p>
								</div>
								<p class="text-muted-foreground mt-1 text-xs">Click to view transactions</p>
							</div>
						</div>
					{/if}
				</Html>
			</LayerCake>

			<!-- Legend -->
		<div class="mt-4 flex justify-center gap-6">
			<div class="flex items-center gap-2">
				<div class="bg-muted-foreground h-3 w-3 rounded-full opacity-60"></div>
				<span class="text-sm">{comparisonPeriodLabels[comparisonPeriod].previous}</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="bg-destructive h-3 w-3 rounded-full"></div>
				<span class="text-sm">{comparisonPeriodLabels[comparisonPeriod].current} (increased)</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="h-3 w-3 rounded-full" style="background-color: var(--chart-2)"></div>
				<span class="text-sm">{comparisonPeriodLabels[comparisonPeriod].current} (decreased)</span>
			</div>
		</div>
		</div>
	{/snippet}
</AnalyticsChartShell>
