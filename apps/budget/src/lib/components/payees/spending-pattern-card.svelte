<script lang="ts">
	import type { InsightsStats, SpendingTrend } from '$lib/hooks/use-payee-insights.svelte';
	import { LayerCake, Svg } from 'layercake';
	import { Bar, AxisX } from '$lib/components/layercake';
	import { scaleBand } from 'd3-scale';
	import { formatCurrency, formatCurrencyAbs } from '$lib/utils/formatters';
	// Icons
	import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
	import Calendar from '@lucide/svelte/icons/calendar';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import Hash from '@lucide/svelte/icons/hash';
	import Minus from '@lucide/svelte/icons/minus';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import TrendingUp from '@lucide/svelte/icons/trending-up';

	interface Patterns {
		isRegular: boolean;
		averageDaysBetween: number | null;
		mostCommonDay: number | null;
		seasonalTrends: Array<{ month: number; avgAmount: number; count: number }>;
	}

	interface Props {
		stats: InsightsStats | null;
		trend: SpendingTrend | null;
		patterns?: Patterns | null;
		showStats?: boolean;
		/** Whether the component is visible (prevents LayerCake zero-height warnings) */
		visible?: boolean;
	}

	let { stats, trend, patterns, showStats = true, visible = true }: Props = $props();

	// Determine if this is primarily an income payee (positive amounts) or expense payee (negative amounts)
	const isIncomePayee = $derived((stats?.totalAmount ?? 0) > 0);

	// Day names
	const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const monthNamesShort = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

	// Get trend icon and color (inverted for income - up is good, down is bad)
	const trendConfig = $derived(() => {
		if (!trend) return null;
		switch (trend.direction) {
			case 'up':
				return {
					icon: TrendingUp,
					// For income: up is good (green), for expenses: up is bad (red)
					class: isIncomePayee ? 'text-green-600' : 'text-red-600',
					bgClass: isIncomePayee ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950',
				};
			case 'down':
				return {
					icon: TrendingDown,
					// For income: down is bad (red), for expenses: down is good (green)
					class: isIncomePayee ? 'text-red-600' : 'text-green-600',
					bgClass: isIncomePayee ? 'bg-red-100 dark:bg-red-950' : 'bg-green-100 dark:bg-green-950',
				};
			default:
				return {
					icon: Minus,
					class: 'text-muted-foreground',
					bgClass: 'bg-muted',
				};
		}
	});

	// Calculate day of week distribution for chart
	const dayChartData = $derived.by(() => {
		if (patterns?.mostCommonDay === null || patterns?.mostCommonDay === undefined) return null;
		// Create a distribution centered on the most common day
		const baseDist = [0.2, 0.3, 0.4, 0.5, 0.6, 0.4, 0.3];
		// Rotate to put most common day at peak
		const rotated = [...baseDist.slice(7 - patterns.mostCommonDay), ...baseDist.slice(0, 7 - patterns.mostCommonDay)];
		return rotated.map((value, i) => ({
			day: dayNames[i],
			value,
			isMax: i === patterns.mostCommonDay
		}));
	});

	// Calculate seasonal data for chart
	const seasonalChartData = $derived.by(() => {
		if (!patterns?.seasonalTrends || patterns.seasonalTrends.length === 0) return null;

		const amounts = patterns.seasonalTrends.map((t) => t.avgAmount);
		const max = Math.max(...amounts);
		const min = Math.min(...amounts);
		const range = max - min || 1;

		// Create 12-month array with data
		const data = Array(12).fill(null).map((_, i) => {
			const trend = patterns.seasonalTrends.find((t) => t.month === i + 1);
			const value = trend ? (trend.avgAmount - min) / range : 0;
			return {
				month: monthNamesShort[i],
				monthFull: monthNames[i],
				value,
				amount: trend?.avgAmount ?? 0,
				count: trend?.count ?? 0,
				hasData: !!trend
			};
		});

		return data;
	});

	// Hovered states
	let hoveredDay = $state<string | null>(null);
	let hoveredMonth = $state<string | null>(null);
</script>

<div class="space-y-6">
	{#if stats}
		<!-- Stats Grid -->
		{#if showStats}
		<div class="grid grid-cols-2 gap-4 md:grid-cols-6">
			<div class="text-center">
				<div class="text-muted-foreground mb-1 flex items-center justify-center gap-1 text-xs">
					<DollarSign class="h-3 w-3" />
					{isIncomePayee ? 'Total Received' : 'Total Spent'}
				</div>
				<div class="text-xl font-bold">{formatCurrencyAbs(stats.totalAmount)}</div>
			</div>
			<div class="text-center">
				<div class="text-muted-foreground mb-1 flex items-center justify-center gap-1 text-xs">
					<Hash class="h-3 w-3" />
					Transactions
				</div>
				<div class="text-xl font-bold">{stats.transactionCount}</div>
			</div>
			<div class="text-center">
				<div class="text-muted-foreground mb-1 flex items-center justify-center gap-1 text-xs">
					<Calendar class="h-3 w-3" />
					Avg Amount
				</div>
				<div class="text-xl font-bold">{formatCurrency(stats.avgAmount)}</div>
			</div>
			<div class="text-center">
				<div class="text-muted-foreground mb-1 flex items-center justify-center gap-1 text-xs">
					<Calendar class="h-3 w-3" />
					Monthly Avg
				</div>
				<div class="text-xl font-bold">{formatCurrency(stats.monthlyAverage)}</div>
			</div>
			{#if trendConfig()}
				{@const config = trendConfig()!}
				{@const TrendIcon = config.icon}
				<div class="text-center">
					<div class="text-muted-foreground mb-1 flex items-center justify-center gap-1 text-xs">
						<TrendIcon class="h-3 w-3" />
						Trend
					</div>
					<div class="text-xl font-bold">
						{#if trend!.direction === 'up'}
							+{Math.abs(trend!.percentChange)}%
						{:else if trend!.direction === 'down'}
							-{Math.abs(trend!.percentChange)}%
						{:else}
							Stable
						{/if}
					</div>
				</div>
			{/if}
			<div class="text-center">
				<div class="text-muted-foreground mb-1 flex items-center justify-center gap-1 text-xs">
					<ArrowUpDown class="h-3 w-3" />
					Range
				</div>
				<div class="text-lg font-bold">
					{formatCurrency(stats.minAmount)} - {formatCurrency(stats.maxAmount)}
				</div>
			</div>
		</div>
		{/if}

		<!-- Pattern Indicators -->
		{#if patterns}
			<div class="grid gap-4 md:grid-cols-2">
				<!-- Day of Week Pattern -->
				{#if dayChartData}
					<div>
						<p class="text-muted-foreground mb-2 text-xs font-medium">Day Pattern</p>
						<div class="h-24">
							{#if visible}
								<LayerCake
									data={dayChartData}
									x="day"
									y="value"
									xScale={scaleBand().paddingInner(0.2).paddingOuter(0.1)}
									yDomain={[0, 1]}
									padding={{ bottom: 20 }}
								>
									<Svg>
										<Bar
											fill={(d) => d.isMax ? 'var(--chart-1)' : 'var(--chart-1)'}
											opacity={(d) => d.isMax ? 1 : 0.4}
											radius={3}
											onhover={(d) => hoveredDay = d?.day ?? null}
										/>
										<AxisX
											gridlines={false}
											tickMarks={false}
											format={(d) => d}
										/>
									</Svg>
								</LayerCake>
							{/if}
						</div>
						{#if patterns.mostCommonDay !== null}
							<p class="text-muted-foreground mt-1 text-center text-xs">
								Most common: <span class="font-medium text-foreground">{dayNames[patterns.mostCommonDay]}</span>
							</p>
						{/if}
					</div>
				{/if}

				<!-- Seasonal Chart -->
				{#if seasonalChartData}
					<div>
						<p class="text-muted-foreground mb-2 text-xs font-medium">Seasonality</p>
						<div class="h-24">
							{#if visible}
								<LayerCake
									data={seasonalChartData}
									x="month"
									y="value"
									xScale={scaleBand().paddingInner(0.15).paddingOuter(0.05)}
									yDomain={[0, 1]}
									padding={{ bottom: 20 }}
								>
									<Svg>
										<Bar
											fill={(d) => {
												if (!d.hasData) return 'var(--muted)';
												if (d.value > 0.7) return 'var(--chart-1)';
												if (d.value > 0.4) return 'var(--chart-2)';
												return 'var(--chart-3)';
											}}
											opacity={(d) => d.hasData ? 0.8 : 0.3}
											radius={2}
											onhover={(d) => hoveredMonth = d?.month ?? null}
										/>
										<AxisX
											gridlines={false}
											tickMarks={false}
											format={(d) => d}
										/>
									</Svg>
								</LayerCake>
							{/if}
						</div>
						<div class="mt-1 flex items-center justify-center gap-3 text-[10px]">
							<span class="flex items-center gap-1">
								<span class="h-2 w-2 rounded" style="background: var(--chart-3);"></span>
								Low
							</span>
							<span class="flex items-center gap-1">
								<span class="h-2 w-2 rounded" style="background: var(--chart-2);"></span>
								Medium
							</span>
							<span class="flex items-center gap-1">
								<span class="h-2 w-2 rounded" style="background: var(--chart-1);"></span>
								High
							</span>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	{:else}
		<p class="text-muted-foreground py-8 text-center text-sm">
			No spending data available yet.
		</p>
	{/if}
</div>
