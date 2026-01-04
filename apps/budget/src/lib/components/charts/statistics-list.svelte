<script lang="ts">
	import type { Component } from 'svelte';
	import type { ComprehensiveStats } from '$lib/utils/comprehensive-statistics';
	import {
		formatStatCurrency,
		formatStatPercent,
		getTrendIndicator
	} from '$lib/utils/comprehensive-statistics';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Activity from '@lucide/svelte/icons/activity';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import Scale from '@lucide/svelte/icons/scale';

	interface Props {
		stats: ComprehensiveStats | null;
		loading?: boolean;
	}

	let { stats, loading = false }: Props = $props();
</script>

{#if loading}
	<div class="space-y-6 p-4">
		{#each [1, 2, 3, 4] as _}
			<div class="space-y-2">
				<div class="h-4 w-24 animate-pulse rounded bg-muted"></div>
				<div class="divide-y rounded-lg border bg-card">
					{#each [1, 2, 3] as __}
						<div class="flex items-center justify-between px-4 py-3">
							<div class="h-4 w-32 animate-pulse rounded bg-muted"></div>
							<div class="h-4 w-20 animate-pulse rounded bg-muted"></div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
{:else if stats}
	<div class="space-y-6 overflow-y-auto p-4">
		<!-- Summary Section -->
		<div class="space-y-2">
			<h3 class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
				<BarChart3 class="h-4 w-4" />
				Summary
			</h3>
			<div class="divide-y rounded-lg border bg-card">
				<div class="flex items-center justify-between px-4 py-3">
					<div>
						<p class="text-sm font-medium">Average Monthly</p>
						<p class="text-xs text-muted-foreground">Mean spending per month</p>
					</div>
					<div class="text-right">
						<p class="text-sm font-semibold tabular-nums">
							{formatStatCurrency(stats.summary.average)}
						</p>
						{#if stats.comparison.vsHistoricalAvgPercent !== null}
							<p
								class="text-xs tabular-nums"
								class:text-red-600={stats.comparison.vsHistoricalAvgPercent > 0}
								class:text-green-600={stats.comparison.vsHistoricalAvgPercent < 0}
								class:text-muted-foreground={stats.comparison.vsHistoricalAvgPercent === 0}
							>
								{formatStatPercent(stats.comparison.vsHistoricalAvgPercent)} vs historical
							</p>
						{/if}
					</div>
				</div>
				<div class="flex items-center justify-between px-4 py-3">
					<div>
						<p class="text-sm font-medium">Median Monthly</p>
						<p class="text-xs text-muted-foreground">Middle value (less affected by outliers)</p>
					</div>
					<p class="text-sm font-semibold tabular-nums">
						{formatStatCurrency(stats.summary.median)}
					</p>
				</div>
				<div class="flex items-center justify-between px-4 py-3">
					<div>
						<p class="text-sm font-medium">Total Spending</p>
						<p class="text-xs text-muted-foreground">Sum across {stats.summary.count} months</p>
					</div>
					<div class="text-right">
						<p class="text-sm font-semibold tabular-nums">
							{formatStatCurrency(stats.summary.total)}
						</p>
						{#if stats.comparison.vsLastYearPercent !== null}
							<p
								class="text-xs tabular-nums"
								class:text-red-600={stats.comparison.vsLastYearPercent > 0}
								class:text-green-600={stats.comparison.vsLastYearPercent < 0}
								class:text-muted-foreground={stats.comparison.vsLastYearPercent === 0}
							>
								{formatStatPercent(stats.comparison.vsLastYearPercent)} vs last year
							</p>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Trend Analysis Section -->
		<div class="space-y-2">
			<h3 class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
				<TrendingUp class="h-4 w-4" />
				Trend Analysis
			</h3>
			<div class="divide-y rounded-lg border bg-card">
				<div class="flex items-center justify-between px-4 py-3">
					<div>
						<p class="text-sm font-medium">Trend Direction</p>
						<p class="text-xs text-muted-foreground">Overall spending trajectory</p>
					</div>
					<p
						class="text-sm font-semibold"
						class:text-red-600={stats.trend.direction === 'up'}
						class:text-green-600={stats.trend.direction === 'down'}
						class:text-muted-foreground={stats.trend.direction === 'flat'}
					>
						{getTrendIndicator(stats.trend.direction)}
						{stats.trend.direction === 'up'
							? 'Increasing'
							: stats.trend.direction === 'down'
								? 'Decreasing'
								: 'Stable'}
					</p>
				</div>
				{#if stats.trend.growthRate !== null}
					<div class="flex items-center justify-between px-4 py-3">
						<div>
							<p class="text-sm font-medium">Monthly Growth Rate</p>
							<p class="text-xs text-muted-foreground">Compound growth percentage</p>
						</div>
						<p
							class="text-sm font-semibold tabular-nums"
							class:text-red-600={stats.trend.growthRate > 0}
							class:text-green-600={stats.trend.growthRate < 0}
						>
							{formatStatPercent(stats.trend.growthRate)}
						</p>
					</div>
				{/if}
				<div class="flex items-center justify-between px-4 py-3">
					<div>
						<p class="text-sm font-medium">Monthly Change</p>
						<p class="text-xs text-muted-foreground">Average change per month</p>
					</div>
					<p
						class="text-sm font-semibold tabular-nums"
						class:text-red-600={stats.trend.monthlyChange > 0}
						class:text-green-600={stats.trend.monthlyChange < 0}
					>
						{stats.trend.monthlyChange > 0 ? '+' : ''}{formatStatCurrency(stats.trend.monthlyChange)}/mo
					</p>
				</div>
			</div>
		</div>

		<!-- Distribution Section -->
		<div class="space-y-2">
			<h3 class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
				<Activity class="h-4 w-4" />
				Distribution
			</h3>
			<div class="divide-y rounded-lg border bg-card">
				<div class="flex items-center justify-between px-4 py-3">
					<div>
						<p class="text-sm font-medium">Highest Month</p>
						<p class="text-xs text-muted-foreground">{stats.distribution.highest.monthLabel}</p>
					</div>
					<p class="text-sm font-semibold tabular-nums text-red-600">
						{formatStatCurrency(stats.distribution.highest.value)}
					</p>
				</div>
				<div class="flex items-center justify-between px-4 py-3">
					<div>
						<p class="text-sm font-medium">Lowest Month</p>
						<p class="text-xs text-muted-foreground">{stats.distribution.lowest.monthLabel}</p>
					</div>
					<p class="text-sm font-semibold tabular-nums text-green-600">
						{formatStatCurrency(stats.distribution.lowest.value)}
					</p>
				</div>
				<div class="flex items-center justify-between px-4 py-3">
					<div>
						<p class="text-sm font-medium">Range</p>
						<p class="text-xs text-muted-foreground">Difference between highest and lowest</p>
					</div>
					<p class="text-sm font-semibold tabular-nums">
						{formatStatCurrency(stats.distribution.range)}
					</p>
				</div>
				<div class="flex items-center justify-between px-4 py-3">
					<div>
						<p class="text-sm font-medium">25th Percentile</p>
						<p class="text-xs text-muted-foreground">Lower quartile boundary</p>
					</div>
					<p class="text-sm font-semibold tabular-nums">
						{formatStatCurrency(stats.distribution.p25)}
					</p>
				</div>
				<div class="flex items-center justify-between px-4 py-3">
					<div>
						<p class="text-sm font-medium">75th Percentile</p>
						<p class="text-xs text-muted-foreground">Upper quartile boundary</p>
					</div>
					<p class="text-sm font-semibold tabular-nums">
						{formatStatCurrency(stats.distribution.p75)}
					</p>
				</div>
				<div class="flex items-center justify-between px-4 py-3">
					<div>
						<p class="text-sm font-medium">Standard Deviation</p>
						<p class="text-xs text-muted-foreground">Spending variability</p>
					</div>
					<p class="text-sm font-semibold tabular-nums">
						{formatStatCurrency(stats.distribution.stdDev)}
					</p>
				</div>
				{#if stats.distribution.coefficientOfVariation > 0}
					<div class="flex items-center justify-between px-4 py-3">
						<div>
							<p class="text-sm font-medium">Coefficient of Variation</p>
							<p class="text-xs text-muted-foreground">Relative variability (lower is more consistent)</p>
						</div>
						<p class="text-sm font-semibold tabular-nums">
							{stats.distribution.coefficientOfVariation.toFixed(1)}%
						</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Outliers Section -->
		{#if stats.outliers.count > 0}
			<div class="space-y-2">
				<h3 class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
					<AlertTriangle class="h-4 w-4" />
					Outliers
				</h3>
				<div class="divide-y rounded-lg border bg-card">
					<div class="flex items-center justify-between px-4 py-3">
						<div>
							<p class="text-sm font-medium">Unusual Months</p>
							<p class="text-xs text-muted-foreground">Outside normal spending range (1.5x IQR)</p>
						</div>
						<p class="text-sm font-semibold tabular-nums text-amber-600">
							{stats.outliers.count}
						</p>
					</div>
					{#each stats.outliers.months as outlier}
						<div class="flex items-center justify-between px-4 py-3">
							<div>
								<p class="text-sm font-medium">{outlier.monthLabel}</p>
								<p class="text-xs text-muted-foreground">
									{outlier.type === 'high' ? 'Unusually high' : 'Unusually low'} spending
								</p>
							</div>
							<p
								class="text-sm font-semibold tabular-nums"
								class:text-red-600={outlier.type === 'high'}
								class:text-green-600={outlier.type === 'low'}
							>
								{formatStatCurrency(outlier.value)}
							</p>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Comparison Section -->
		{#if stats.comparison.vsHistoricalAvgPercent !== null || stats.comparison.vsBudgetTargetPercent !== null}
			<div class="space-y-2">
				<h3 class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
					<Scale class="h-4 w-4" />
					Comparisons
				</h3>
				<div class="divide-y rounded-lg border bg-card">
					{#if stats.comparison.vsHistoricalAvg !== null}
						<div class="flex items-center justify-between px-4 py-3">
							<div>
								<p class="text-sm font-medium">vs Historical Average</p>
								<p class="text-xs text-muted-foreground">Compared to all-time average</p>
							</div>
							<div class="text-right">
								<p
									class="text-sm font-semibold tabular-nums"
									class:text-red-600={stats.comparison.vsHistoricalAvg > 0}
									class:text-green-600={stats.comparison.vsHistoricalAvg < 0}
								>
									{stats.comparison.vsHistoricalAvg > 0 ? '+' : ''}{formatStatCurrency(stats.comparison.vsHistoricalAvg)}
								</p>
								<p class="text-xs text-muted-foreground tabular-nums">
									{formatStatPercent(stats.comparison.vsHistoricalAvgPercent)}
								</p>
							</div>
						</div>
					{/if}
					{#if stats.comparison.vsBudgetTarget !== null}
						<div class="flex items-center justify-between px-4 py-3">
							<div>
								<p class="text-sm font-medium">vs Budget Target</p>
								<p class="text-xs text-muted-foreground">Monthly avg vs monthly budget</p>
							</div>
							<div class="text-right">
								<p
									class="text-sm font-semibold tabular-nums"
									class:text-red-600={stats.comparison.vsBudgetTarget > 0}
									class:text-green-600={stats.comparison.vsBudgetTarget < 0}
								>
									{stats.comparison.vsBudgetTarget > 0 ? '+' : ''}{formatStatCurrency(stats.comparison.vsBudgetTarget)}
								</p>
								<p class="text-xs text-muted-foreground tabular-nums">
									{stats.comparison.vsBudgetTargetPercent?.toFixed(0)}% of budget
								</p>
							</div>
						</div>
					{/if}
					{#if stats.comparison.vsLastYearTotal !== null}
						<div class="flex items-center justify-between px-4 py-3">
							<div>
								<p class="text-sm font-medium">vs Same Period Last Year</p>
								<p class="text-xs text-muted-foreground">Year-over-year comparison</p>
							</div>
							<div class="text-right">
								<p
									class="text-sm font-semibold tabular-nums"
									class:text-red-600={stats.comparison.vsLastYearTotal > 0}
									class:text-green-600={stats.comparison.vsLastYearTotal < 0}
								>
									{stats.comparison.vsLastYearTotal > 0 ? '+' : ''}{formatStatCurrency(stats.comparison.vsLastYearTotal)}
								</p>
								<p class="text-xs text-muted-foreground tabular-nums">
									{formatStatPercent(stats.comparison.vsLastYearPercent)}
								</p>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{:else}
	<div class="flex h-64 items-center justify-center text-muted-foreground">
		<p>No data available for statistics</p>
	</div>
{/if}
