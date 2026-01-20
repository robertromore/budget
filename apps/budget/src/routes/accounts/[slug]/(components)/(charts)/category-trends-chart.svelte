<script lang="ts">
	import { AnalyticsChartShell } from '$lib/components/charts';
	import { AxisX, AxisY, ComparisonDotPlot } from '$lib/components/layercake';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import type { TransactionsFormat } from '$lib/types';
	import { standardDeviation } from '$lib/utils/chart-statistics';
	import type { ComprehensiveStats } from '$lib/utils/comprehensive-statistics';
	import { getLastDayOfMonthUTC, parseDateStringToUTC } from '$lib/utils/date-formatters';
	import { currencyFormatter, formatPercentRaw } from '$lib/utils/formatters';
	import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Filter from '@lucide/svelte/icons/filter';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import { scaleBand, scaleLinear } from 'd3-scale';
	import { Html, LayerCake, Svg } from 'layercake';

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

	// Calculate date ranges based on comparison period
	// Uses today's date as the reference point for comparisons
	const dateRanges = $derived.by(() => {
		const validDates = transactions
			.map((tx) => parseDateStringToUTC(tx.date?.toString() || ''))
			.filter((d) => !isNaN(d.getTime()));

		if (validDates.length < 2) return null;

		// Use today's date as reference (in UTC)
		const today = new Date();
		let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date;

		const todayYear = today.getUTCFullYear();
		const todayMonth = today.getUTCMonth();
		const todayDay = today.getUTCDate();
		const todayDayOfWeek = today.getUTCDay();

		switch (comparisonPeriod) {
			case 'this-vs-last-week': {
				// Current week: Sunday to Saturday containing today
				const currentStartDay = todayDay - todayDayOfWeek;
				currentStart = new Date(Date.UTC(todayYear, todayMonth, currentStartDay, 0, 0, 0, 0));
				currentEnd = new Date(Date.UTC(todayYear, todayMonth, currentStartDay + 6, 23, 59, 59, 999));
				// Previous week
				previousStart = new Date(Date.UTC(todayYear, todayMonth, currentStartDay - 7, 0, 0, 0, 0));
				previousEnd = new Date(Date.UTC(todayYear, todayMonth, currentStartDay - 1, 23, 59, 59, 999));
				break;
			}
			case 'this-vs-last-quarter': {
				const currentQuarter = Math.floor(todayMonth / 3);
				const quarterStartMonth = currentQuarter * 3;
				const quarterEndMonth = quarterStartMonth + 2;
				currentStart = new Date(Date.UTC(todayYear, quarterStartMonth, 1, 0, 0, 0, 0));
				currentEnd = new Date(Date.UTC(todayYear, quarterEndMonth, getLastDayOfMonthUTC(todayYear, quarterEndMonth), 23, 59, 59, 999));

				const prevQuarter = currentQuarter - 1;
				const prevYear = prevQuarter < 0 ? todayYear - 1 : todayYear;
				const adjustedPrevQuarter = prevQuarter < 0 ? 3 : prevQuarter;
				const prevQuarterStartMonth = adjustedPrevQuarter * 3;
				const prevQuarterEndMonth = prevQuarterStartMonth + 2;
				previousStart = new Date(Date.UTC(prevYear, prevQuarterStartMonth, 1, 0, 0, 0, 0));
				previousEnd = new Date(Date.UTC(prevYear, prevQuarterEndMonth, getLastDayOfMonthUTC(prevYear, prevQuarterEndMonth), 23, 59, 59, 999));
				break;
			}
			case 'this-vs-same-month-last-year': {
				currentStart = new Date(Date.UTC(todayYear, todayMonth, 1, 0, 0, 0, 0));
				currentEnd = new Date(Date.UTC(todayYear, todayMonth, getLastDayOfMonthUTC(todayYear, todayMonth), 23, 59, 59, 999));
				previousStart = new Date(Date.UTC(todayYear - 1, todayMonth, 1, 0, 0, 0, 0));
				previousEnd = new Date(Date.UTC(todayYear - 1, todayMonth, getLastDayOfMonthUTC(todayYear - 1, todayMonth), 23, 59, 59, 999));
				break;
			}
			case 'this-vs-last-month':
			default: {
				currentStart = new Date(Date.UTC(todayYear, todayMonth, 1, 0, 0, 0, 0));
				currentEnd = new Date(Date.UTC(todayYear, todayMonth, getLastDayOfMonthUTC(todayYear, todayMonth), 23, 59, 59, 999));
				const prevMonth = todayMonth - 1;
				const prevMonthYear = prevMonth < 0 ? todayYear - 1 : todayYear;
				const adjustedPrevMonth = prevMonth < 0 ? 11 : prevMonth;
				previousStart = new Date(Date.UTC(prevMonthYear, adjustedPrevMonth, 1, 0, 0, 0, 0));
				previousEnd = new Date(Date.UTC(prevMonthYear, adjustedPrevMonth, getLastDayOfMonthUTC(prevMonthYear, adjustedPrevMonth), 23, 59, 59, 999));
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

		for (const tx of transactions) {
			if (tx.amount >= 0) continue;

			const date = parseDateStringToUTC(tx.date?.toString() || '');
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
				description: biggestIncrease ? `+${formatPercentRaw(biggestIncrease.change, 0)}` : undefined
			},
			{
				label: 'Biggest Decrease',
				value: biggestDecrease ? biggestDecrease.category : 'N/A',
				description: biggestDecrease ? formatPercentRaw(biggestDecrease.change, 0) : undefined
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
		const stdDev = standardDeviation(currentValues);

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
		<div class="h-125 w-full pb-20">
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
						labelFormat={(d) => `${d.change >= 0 ? '+' : ''}${formatPercentRaw(d.change, 0)}`}
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
										{hoveredItem.change >= 0 ? '+' : ''}{formatPercentRaw(hoveredItem.change, 1)} ({hoveredItem.changeAbs >= 0 ? '+' : ''}{currencyFormatter.format(hoveredItem.changeAbs)})
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
