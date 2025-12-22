<script lang="ts">
	import type { SpendingTrend } from '$lib/hooks/use-payee-insights.svelte';
	import type { PayeeStats } from '$lib/query/payees-types';
// Icons
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
		stats: PayeeStats | null;
		trend: SpendingTrend | null;
		patterns?: Patterns | null;
	}

	let { stats, trend, patterns }: Props = $props();

	// Format currency
	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount);
	}

	// Day names
	const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const monthNames = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

	// Get trend icon and color
	const trendConfig = $derived(() => {
		if (!trend) return null;
		switch (trend.direction) {
			case 'up':
				return {
					icon: TrendingUp,
					class: 'text-red-600',
					bgClass: 'bg-red-100 dark:bg-red-950',
				};
			case 'down':
				return {
					icon: TrendingDown,
					class: 'text-green-600',
					bgClass: 'bg-green-100 dark:bg-green-950',
				};
			default:
				return {
					icon: Minus,
					class: 'text-muted-foreground',
					bgClass: 'bg-muted',
				};
		}
	});

	// Calculate day of week distribution (mock for visualization)
	const dayDistribution = $derived(() => {
		if (!patterns?.mostCommonDay) return null;
		// Create a distribution centered on the most common day
		const dist = [0.2, 0.3, 0.4, 0.5, 0.6, 0.4, 0.3];
		// Rotate to put most common day at peak
		const rotated = [...dist.slice(7 - patterns.mostCommonDay), ...dist.slice(0, 7 - patterns.mostCommonDay)];
		return rotated;
	});

	// Normalize seasonal data for heatmap
	const seasonalHeatmap = $derived(() => {
		if (!patterns?.seasonalTrends || patterns.seasonalTrends.length === 0) return null;

		const amounts = patterns.seasonalTrends.map((t) => t.avgAmount);
		const max = Math.max(...amounts);
		const min = Math.min(...amounts);
		const range = max - min || 1;

		// Create 12-month array with normalized values
		const heatmap = Array(12).fill(0);
		patterns.seasonalTrends.forEach((t) => {
			heatmap[t.month - 1] = (t.avgAmount - min) / range;
		});

		return heatmap;
	});

	// Get heat color
	function getHeatColor(value: number): string {
		if (value > 0.7) return 'bg-red-400 dark:bg-red-600';
		if (value > 0.5) return 'bg-orange-300 dark:bg-orange-500';
		if (value > 0.3) return 'bg-yellow-200 dark:bg-yellow-600';
		if (value > 0) return 'bg-green-100 dark:bg-green-800';
		return 'bg-muted';
	}
</script>

<div class="space-y-6">
	{#if stats}
		<!-- Stats Grid -->
		<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
			<div class="text-center">
				<div class="text-muted-foreground mb-1 flex items-center justify-center gap-1 text-xs">
					<DollarSign class="h-3 w-3" />
					Total Spent
				</div>
				<div class="text-xl font-bold">{formatCurrency(stats.totalAmount)}</div>
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
		</div>

		<!-- Trend Indicator -->
		{#if trendConfig()}
			{@const config = trendConfig()!}
			{@const TrendIcon = config.icon}
			<div class="flex items-center gap-2 rounded-lg p-3 {config.bgClass}">
				<TrendIcon class="h-4 w-4 {config.class}" />
				<span class="text-sm">
					{#if trend!.direction === 'up'}
						Spending increased {Math.abs(trend!.percentChange)}%
					{:else if trend!.direction === 'down'}
						Spending decreased {Math.abs(trend!.percentChange)}%
					{:else}
						Spending stable
					{/if}
					<span class="text-muted-foreground ml-1">({trend!.period})</span>
				</span>
			</div>
		{/if}

		<!-- Pattern Indicators -->
		{#if patterns}
			<div class="grid gap-4 md:grid-cols-2">
				<!-- Day of Week Pattern -->
				{#if dayDistribution()}
					<div>
						<p class="text-muted-foreground mb-2 text-xs font-medium">Day Pattern</p>
						<div class="flex items-end justify-between gap-1">
							{#each dayDistribution()! as value, i}
								<div class="flex flex-col items-center gap-1">
									<div
										class="w-6 rounded bg-primary/20 transition-all"
										style="height: {Math.max(4, value * 32)}px; opacity: {0.3 + value * 0.7}"
									></div>
									<span class="text-muted-foreground text-[10px]">{dayNames[i]}</span>
								</div>
							{/each}
						</div>
						{#if patterns.mostCommonDay !== null}
							<p class="text-muted-foreground mt-2 text-center text-xs">
								Most common: {dayNames[patterns.mostCommonDay]}
							</p>
						{/if}
					</div>
				{/if}

				<!-- Seasonal Heatmap -->
				{#if seasonalHeatmap()}
					<div>
						<p class="text-muted-foreground mb-2 text-xs font-medium">Seasonality</p>
						<div class="flex items-center justify-between gap-0.5">
							{#each seasonalHeatmap()! as value, i}
								<div class="flex flex-col items-center gap-1">
									<div
										class="h-6 w-4 rounded-sm {getHeatColor(value)}"
										title={`${monthNames[i]}: ${Math.round(value * 100)}%`}
									></div>
									<span class="text-muted-foreground text-[10px]">{monthNames[i]}</span>
								</div>
							{/each}
						</div>
						<div class="mt-2 flex items-center justify-center gap-2 text-[10px]">
							<span class="flex items-center gap-1">
								<span class="h-2 w-2 rounded bg-green-100 dark:bg-green-800"></span>
								Low
							</span>
							<span class="flex items-center gap-1">
								<span class="h-2 w-2 rounded bg-red-400 dark:bg-red-600"></span>
								High
							</span>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Amount Range -->
		<div class="bg-muted/50 rounded-lg p-3">
			<div class="flex items-center justify-between text-sm">
				<span class="text-muted-foreground">Amount range</span>
				<span>
					{formatCurrency(stats.minAmount)} - {formatCurrency(stats.maxAmount)}
				</span>
			</div>
		</div>
	{:else}
		<p class="text-muted-foreground py-8 text-center text-sm">
			No spending data available yet.
		</p>
	{/if}
</div>
