<script lang="ts">
	import { StackedArea, AxisX, AxisY, Tooltip, Brush, Scatter, HorizontalLine, CustomLine } from '$lib/components/layercake';
	import { ChartSelectionPanel } from '$lib/components/charts';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { currencyFormatter, formatPercentRaw } from '$lib/utils/formatters';
	import type { TransactionsFormat } from '$lib/types';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { chartSelection, type SelectedDataPoint } from '$lib/states/ui/chart-selection.svelte';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import { calculateLinearTrend, calculateHistoricalAverage, calculateBasicStats, calculateExtendedPercentiles, type TrendLineData } from '$lib/utils/chart-statistics';
	import { LayerCake, Svg } from 'layercake';
	import { scaleLinear } from 'd3-scale';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import X from '@lucide/svelte/icons/x';
	import { AnalyticsChartShell } from '$lib/components/charts';
	import type { ComprehensiveStats } from '$lib/utils/comprehensive-statistics';
	import { extractDateString, formatMonthYearShort } from '$lib/utils/date-formatters';

	// Toggle states for analysis overlays
	let showLinearTrend = $state(false);
	let showHistoricalAvg = $state(false);

	// Payee management state
	let selectedPayee = $state<string | null>(null);

	interface Props {
		transactions: TransactionsFormat[];
	}

	let { transactions }: Props = $props();

	// Access effective time period for this chart
	const effectivePeriod = $derived(timePeriodFilter.getEffectivePeriod('recurring-spending'));

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

	// Enhanced recurring payee detection with confidence scoring
	interface RecurringPayee {
		name: string;
		occurrences: number;
		avgAmount: number;
		minAmount: number;
		maxAmount: number;
		amountVariance: number; // % variance in amounts
		avgIntervalDays: number; // Average days between transactions
		intervalVariance: number; // Variance in intervals
		isMonthly: boolean; // ~28-32 day intervals
		isBiweekly: boolean; // ~13-15 day intervals
		isWeekly: boolean; // ~6-8 day intervals
		confidence: number; // 0-100 score
		totalSpend: number;
		pattern: 'monthly' | 'bi-weekly' | 'weekly' | 'irregular';
	}

	// Detect recurring payees with enhanced algorithm
	const recurringPayeeDetails = $derived.by((): RecurringPayee[] => {
		const byPayee = new Map<string, { amounts: number[]; dates: Date[] }>();

		// Group transactions by payee
		for (const tx of periodFilteredTransactions) {
			if (tx.amount >= 0) continue; // expenses only
			const name = tx.payee?.name;
			if (!name) continue;

			const date = tx.date instanceof Date ? tx.date : new Date(tx.date?.toString() || '');
			if (isNaN(date.getTime())) continue;

			if (!byPayee.has(name)) byPayee.set(name, { amounts: [], dates: [] });
			const data = byPayee.get(name)!;
			data.amounts.push(Math.abs(tx.amount));
			data.dates.push(date);
		}

		const results: RecurringPayee[] = [];

		for (const [name, data] of byPayee) {
			if (data.amounts.length < 2) continue;

			// Sort by date
			const sortedDates = [...data.dates].sort((a, b) => a.getTime() - b.getTime());
			const sortedAmounts = sortedDates.map((d, i) => {
				const origIdx = data.dates.findIndex((od) => od.getTime() === d.getTime());
				return data.amounts[origIdx];
			});

			// Calculate amounts
			const amounts = sortedAmounts;
			const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
			const minAmount = Math.min(...amounts);
			const maxAmount = Math.max(...amounts);
			const amountVariance = avgAmount > 0 ? (maxAmount - minAmount) / avgAmount : 0;

			// Calculate intervals
			const intervals: number[] = [];
			for (let i = 1; i < sortedDates.length; i++) {
				const d1 = sortedDates[i - 1].getTime();
				const d2 = sortedDates[i].getTime();
				intervals.push((d2 - d1) / (1000 * 60 * 60 * 24));
			}

			const avgInterval =
				intervals.length > 0 ? intervals.reduce((s, i) => s + i, 0) / intervals.length : 0;

			const intervalVariance =
				intervals.length > 0
					? Math.sqrt(
							intervals.reduce((s, i) => s + Math.pow(i - avgInterval, 2), 0) / intervals.length
						) / (avgInterval || 1)
					: 1;

			// Classify pattern
			const isMonthly = avgInterval >= 28 && avgInterval <= 35 && intervalVariance < 0.25;
			const isBiweekly = avgInterval >= 13 && avgInterval <= 16 && intervalVariance < 0.2;
			const isWeekly = avgInterval >= 6 && avgInterval <= 8 && intervalVariance < 0.2;

			let pattern: RecurringPayee['pattern'] = 'irregular';
			if (isMonthly) pattern = 'monthly';
			else if (isBiweekly) pattern = 'bi-weekly';
			else if (isWeekly) pattern = 'weekly';

			// Calculate confidence score (0-100)
			let confidence = 0;
			confidence += Math.min(data.amounts.length * 10, 40); // More occurrences = higher
			confidence += (1 - Math.min(amountVariance, 1)) * 30; // Consistent amounts = higher
			confidence += (1 - Math.min(intervalVariance, 1)) * 30; // Regular intervals = higher

			// Only include if likely recurring
			if (confidence >= 40 || data.amounts.length >= 3) {
				results.push({
					name,
					occurrences: data.amounts.length,
					avgAmount,
					minAmount,
					maxAmount,
					amountVariance,
					avgIntervalDays: avgInterval,
					intervalVariance,
					isMonthly,
					isBiweekly,
					isWeekly,
					confidence: Math.round(confidence),
					totalSpend: amounts.reduce((s, a) => s + a, 0),
					pattern
				});
			}
		}

		return results.sort((a, b) => b.confidence - a.confidence);
	});

	// Simple Set for quick lookup (used in monthly aggregation)
	const recurringPayees = $derived.by(() => {
		return new Set(recurringPayeeDetails.map((p) => p.name));
	});

	// Aggregate by month: recurring vs one-time
	const monthlyData = $derived.by(() => {
		const dataByMonth = new Map<string, { recurring: number; oneTime: number }>();

		for (const tx of periodFilteredTransactions) {
			if (tx.amount >= 0) continue;

			const dateStr = extractDateString(tx.date);
			if (!dateStr) continue;

			const monthKey = dateStr.substring(0, 7);
			const payee = tx.payee?.name || 'Unknown';
			const isRecurring = recurringPayees.has(payee);
			const amount = Math.abs(tx.amount);

			if (!dataByMonth.has(monthKey)) {
				dataByMonth.set(monthKey, { recurring: 0, oneTime: 0 });
			}

			const data = dataByMonth.get(monthKey)!;
			if (isRecurring) {
				data.recurring += amount;
			} else {
				data.oneTime += amount;
			}
		}

		const entries = Array.from(dataByMonth.entries())
			.sort((a, b) => a[0].localeCompare(b[0]))
			.slice(-12);

		return entries.map(([month, data], idx) => {
			const [year, monthNum] = month.split('-');
			const date = new Date(parseInt(year), parseInt(monthNum) - 1, 15);
			const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
				'July', 'August', 'September', 'October', 'November', 'December'];

			return {
				month,
				date,
				monthLabel: `${monthNames[parseInt(monthNum) - 1]} ${year}`,
				recurring: data.recurring,
				oneTime: data.oneTime,
				total: data.recurring + data.oneTime,
				// Index for brush/selection handling
				index: idx,
				x: idx,
				y: data.recurring + data.oneTime
			};
		});
	});

	// Brush hover position for Tooltip crosshair
	let brushHoverX = $state<number | null>(null);

	// Format month for display
	function formatMonth(date: Date): string {
		return formatMonthYearShort(date);
	}

	// Convert a data point to SelectedDataPoint format
	function toSelectedPoint(d: typeof monthlyData[0]): SelectedDataPoint {
		return {
			id: d.month,
			label: d.monthLabel,
			date: d.date,
			value: d.total,
			rawData: {
				recurring: d.recurring,
				oneTime: d.oneTime,
				total: d.total
			}
		};
	}

	// Handle click on data point - toggle selection
	function handlePointClick(d: typeof monthlyData[0], _event: MouseEvent) {
		chartSelection.toggle(toSelectedPoint(d));
	}

	// Handle double-click for drill-down
	function handlePointDblClick(d: typeof monthlyData[0]) {
		chartInteractions.openDrillDown({
			type: 'month',
			value: d.month,
			label: `${d.monthLabel} Spending`
		});
	}

	// Handle brush selection - select all points within the brushed range
	function handleBrushSelect(range: { start: Date | number; end: Date | number } | null) {
		if (!range) return;

		const startIdx = typeof range.start === 'number' ? range.start : 0;
		const endIdx = typeof range.end === 'number' ? range.end : 0;

		const pointsInRange = monthlyData.filter((d) => d.index >= startIdx && d.index <= endIdx);

		if (pointsInRange.length > 0) {
			const selectedPoints = pointsInRange.map(toSelectedPoint);
			chartSelection.selectRange(selectedPoints);
		}
	}

	// Handle click from brush - find nearest point and toggle selection
	function handleBrushClick(_x: number, clickValue: Date | number) {
		const clickIndex = typeof clickValue === 'number' ? clickValue : 0;

		let nearestPoint = monthlyData[0];
		let minDistance = Infinity;

		for (const point of monthlyData) {
			const distance = Math.abs(point.index - clickIndex);
			if (distance < minDistance) {
				minDistance = distance;
				nearestPoint = point;
			}
		}

		if (nearestPoint) {
			chartSelection.toggle(toSelectedPoint(nearestPoint));
		}
	}

	// Helper: Get previous month data for comparison
	function getPreviousMonth(currentMonth: string): typeof monthlyData[0] | null {
		const idx = monthlyData.findIndex((d) => d.month === currentMonth);
		return idx > 0 ? monthlyData[idx - 1] : null;
	}

	// Helper: Get top recurring payees for a specific month
	function getTopPayeesForMonth(month: string): Array<{ name: string; amount: number }> {
		const payeeAmounts = new Map<string, number>();

		for (const tx of periodFilteredTransactions) {
			if (tx.amount >= 0) continue;

			const dateStr = extractDateString(tx.date);
			if (!dateStr) continue;

			const txMonth = dateStr.substring(0, 7);
			if (txMonth !== month) continue;

			const payeeName = tx.payee?.name || 'Unknown';
			if (!recurringPayees.has(payeeName)) continue;

			payeeAmounts.set(payeeName, (payeeAmounts.get(payeeName) || 0) + Math.abs(tx.amount));
		}

		return Array.from(payeeAmounts.entries())
			.map(([name, amount]) => ({ name, amount }))
			.sort((a, b) => b.amount - a.amount)
			.slice(0, 3);
	}

	// Summary statistics
	const summaryStats = $derived.by(() => {
		if (monthlyData.length === 0) {
			return [
				{ label: 'Recurring Payees', value: '0' },
				{ label: 'Avg Recurring', value: '$0.00' },
				{ label: 'Avg One-time', value: '$0.00' },
				{ label: 'Recurring %', value: '0%' }
			];
		}

		const totalRecurring = monthlyData.reduce((s, d) => s + d.recurring, 0);
		const totalOneTime = monthlyData.reduce((s, d) => s + d.oneTime, 0);
		const total = totalRecurring + totalOneTime;

		return [
			{ label: 'Recurring Payees', value: recurringPayees.size.toString() },
			{
				label: 'Avg Recurring',
				value: currencyFormatter.format(totalRecurring / monthlyData.length),
				description: 'per month'
			},
			{
				label: 'Avg One-time',
				value: currencyFormatter.format(totalOneTime / monthlyData.length),
				description: 'per month'
			},
			{
				label: 'Recurring %',
				value: formatPercentRaw((totalRecurring / total) * 100),
				description: 'of total spending'
			}
		];
	});

	// Comprehensive statistics for the Statistics tab
	const comprehensiveStats = $derived.by((): ComprehensiveStats | null => {
		if (monthlyData.length === 0) return null;

		const recurringTotals = monthlyData.map((d) => d.recurring);
		const oneTimeTotals = monthlyData.map((d) => d.oneTime);
		const totals = monthlyData.map((d) => d.total);

		// Use utility functions for statistics
		const basicStats = calculateBasicStats(totals);
		if (!basicStats) return null;

		const percentiles = calculateExtendedPercentiles(totals);

		const totalRecurring = recurringTotals.reduce((s, r) => s + r, 0);
		const totalOneTime = oneTimeTotals.reduce((s, o) => s + o, 0);

		// Find highest and lowest months
		const highestIdx = totals.indexOf(Math.max(...totals));
		const lowestIdx = totals.indexOf(Math.min(...totals));

		// Recurring percentage
		const recurringPercent = basicStats.total > 0 ? (totalRecurring / basicStats.total) * 100 : 0;

		return {
			summary: {
				average: basicStats.mean,
				median: basicStats.median,
				total: basicStats.total,
				count: basicStats.count
			},
			trend: {
				direction: 'flat',
				growthRate: recurringPercent, // Use for recurring percentage
				slope: 0,
				monthlyChange: 0
			},
			distribution: {
				highest: { value: totals[highestIdx], month: monthlyData[highestIdx]?.month || '', monthLabel: monthlyData[highestIdx]?.month || '' },
				lowest: { value: totals[lowestIdx], month: monthlyData[lowestIdx]?.month || '', monthLabel: monthlyData[lowestIdx]?.month || '' },
				range: basicStats.range,
				p25: percentiles?.p25 ?? 0,
				p50: percentiles?.p50 ?? basicStats.median,
				p75: percentiles?.p75 ?? 0,
				iqr: percentiles?.iqr ?? 0,
				stdDev: basicStats.stdDev,
				coefficientOfVariation: basicStats.mean !== 0 ? (basicStats.stdDev / basicStats.mean) * 100 : 0
			},
			outliers: { count: 0, months: [] },
			comparison: {
				vsHistoricalAvg: totalRecurring / basicStats.count,
				vsHistoricalAvgPercent: recurringPercent,
				vsBudgetTarget: null,
				vsBudgetTargetPercent: null,
				vsLastYearTotal: null,
				vsLastYearPercent: null
			}
		};
	});

	const hasData = $derived(monthlyData.length > 0);

	// Track container dimensions
	let containerWidth = $state(0);
	let containerHeight = $state(0);
	const containerReady = $derived(containerWidth > 0 && containerHeight > 0);

	// X domain (index-based for even spacing)
	const xDomain = $derived.by(() => {
		if (!hasData) return [0, 1];
		return [0, monthlyData.length - 1];
	});

	// Index to month label lookup
	const indexToLabelMap = $derived.by((): Map<number, string> => {
		const map = new Map<number, string>();
		for (const d of monthlyData) {
			map.set(d.index, formatMonth(d.date));
		}
		return map;
	});

	// Y domain
	const yMax = $derived.by(() => {
		if (!hasData) return 100;
		return Math.max(...monthlyData.map((d) => d.total)) * 1.1;
	});

	// ===== Analysis Overlay Computed Data =====

	// Transform data for trend calculations (uses total spending)
	const trendData = $derived.by(() => {
		return monthlyData.map((d) => ({
			month: d.month,
			monthLabel: d.monthLabel,
			spending: d.total,
			date: d.date,
			index: d.index
		}));
	});

	// Linear regression line for total spending
	const linearTrendData = $derived.by((): TrendLineData | null => {
		if (!showLinearTrend || monthlyData.length < 2) return null;
		return calculateLinearTrend(trendData);
	});

	// Historical average (total spending)
	const historicalAverage = $derived.by((): number | null => {
		if (!showHistoricalAvg || monthlyData.length === 0) return null;
		return calculateHistoricalAverage(trendData);
	});

	// Count active analysis overlays for badge
	const activeAnalysisCount = $derived((showLinearTrend ? 1 : 0) + (showHistoricalAvg ? 1 : 0));

	// Active overlays for legend
	const activeOverlays = $derived.by(() => {
		const overlays: Array<{ label: string; color: string; dashed?: boolean }> = [];
		if (showLinearTrend && linearTrendData) {
			overlays.push({
				label: `Trend (${linearTrendData.direction})`,
				color: 'var(--chart-4)',
				dashed: true
			});
		}
		if (showHistoricalAvg && historicalAverage !== null) {
			overlays.push({ label: 'Historical avg', color: 'var(--chart-6)', dashed: true });
		}
		return overlays;
	});

	// Stack keys and colors
	const stackKeys = ['recurring', 'oneTime'];
	const colors = ['var(--chart-1)', 'var(--chart-2)'];
</script>

<AnalyticsChartShell
	data={monthlyData}
	{comprehensiveStats}
	supportedChartTypes={['area']}
	defaultChartType="area"
	emptyMessage="No spending data available"
	chartId="recurring-spending"
	allowedPeriodGroups={['months', 'year', 'other']}
>
	{#snippet title()}
		Recurring vs One-time Spending
	{/snippet}

	{#snippet subtitle()}
		Compare predictable recurring expenses against discretionary spending
	{/snippet}

	{#snippet headerActions()}
		<div class="flex gap-1">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant={activeAnalysisCount > 0 ? 'default' : 'ghost'}
							size="sm"
							class="gap-1"
						>
							<TrendingUp class="h-4 w-4" />
							Analysis
							{#if activeAnalysisCount > 0}
								<span class="ml-1 rounded-full bg-primary-foreground/20 px-1.5 text-xs"
									>{activeAnalysisCount}</span
								>
							{/if}
							<ChevronDown class="h-3 w-3" />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end" class="w-56">
					<DropdownMenu.Label>Analysis Overlays</DropdownMenu.Label>
					<DropdownMenu.Separator />
					<DropdownMenu.CheckboxItem bind:checked={showLinearTrend}>
						<span class="flex items-center gap-2">
							<span class="h-0.5 w-3" style="background-color: var(--chart-4);"></span>
							Regression Line
						</span>
					</DropdownMenu.CheckboxItem>
					<DropdownMenu.CheckboxItem bind:checked={showHistoricalAvg}>
						<span class="flex items-center gap-2">
							<span
								class="h-0.5 w-3"
								style="background: repeating-linear-gradient(90deg, var(--chart-6) 0px, var(--chart-6) 3px, transparent 3px, transparent 6px);"
							></span>
							Historical Average
						</span>
					</DropdownMenu.CheckboxItem>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	{/snippet}

	{#snippet chart({ data }: { data: typeof monthlyData })}
		<div
			class="h-[450px] w-full pb-20"
			bind:clientWidth={containerWidth}
			bind:clientHeight={containerHeight}
		>
			{#if containerReady}
				<LayerCake
					{data}
					x="index"
					y="total"
					xDomain={xDomain}
					yDomain={[0, yMax]}
					yScale={scaleLinear()}
					padding={{ top: 20, right: 20, bottom: 40, left: 60 }}
				>
					<Svg>
						<AxisY ticks={5} gridlines={true} format={(d) => currencyFormatter.format(d)} />
						<AxisX
							ticks={Math.min(6, data.length)}
							format={(d) => {
								const index = typeof d === 'number' ? d : 0;
								return indexToLabelMap.get(Math.round(index)) ?? '';
							}}
						/>

						<!-- ===== Analysis Overlays (rendered below main data) ===== -->

						<!-- Historical average horizontal line -->
						{#if showHistoricalAvg && historicalAverage !== null}
							<HorizontalLine
								value={historicalAverage}
								stroke="var(--chart-6)"
								strokeWidth={1.5}
								strokeDasharray="6 3"
								label="Avg"
							/>
						{/if}

						<!-- Linear regression line -->
						{#if showLinearTrend && linearTrendData}
							<CustomLine
								data={linearTrendData.data}
								stroke="var(--chart-4)"
								strokeWidth={2}
								strokeDasharray="8 4"
								opacity={0.7}
							/>
						{/if}

						<StackedArea keys={stackKeys} {colors} opacity={0.7} curved={true} />

						<!-- Scatter points on top of stacked area for click interaction -->
						<Scatter
							fill={(d) => chartSelection.isSelected(d.month) ? 'var(--primary)' : 'var(--chart-1)'}
							radius={(d) => chartSelection.isSelected(d.month) ? 6 : 4}
							hoverRadius={7}
							stroke={(d) => chartSelection.isSelected(d.month) ? 'var(--primary-foreground)' : 'var(--background)'}
							strokeWidth={2}
							onclick={(d, e) => handlePointClick(d, e)}
							ondblclick={(d) => handlePointDblClick(d)}
						/>

						<!-- Tooltip with brush hover synchronization -->
						<Tooltip externalHoverX={brushHoverX}>
							{#snippet children({ point })}
								{@const prevMonth = getPreviousMonth(point.month)}
								{@const topPayees = getTopPayeesForMonth(point.month)}
								{@const recurringPercent = point.total > 0 ? (point.recurring / point.total) * 100 : 0}
								<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md min-w-56">
									<p class="font-medium">{point.monthLabel}</p>

									<!-- Spending breakdown -->
									<div class="mt-1 space-y-0.5">
										<p class="text-primary">
											<span class="inline-block h-2 w-2 rounded-sm bg-primary mr-1.5"></span>
											Recurring: {currencyFormatter.format(point.recurring)}
										</p>
										<p style="color: var(--chart-2)">
											<span class="inline-block h-2 w-2 rounded-sm mr-1.5" style="background-color: var(--chart-2)"></span>
											One-time: {currencyFormatter.format(point.oneTime)}
										</p>
									</div>

									<p class="font-semibold mt-1 pt-1 border-t">
										Total: {currencyFormatter.format(point.total)}
									</p>
									<p class="text-xs text-muted-foreground">
										{formatPercentRaw(recurringPercent, 0)} recurring
									</p>

									<!-- Previous month comparison -->
									{#if prevMonth}
										{@const change = point.total - prevMonth.total}
										{@const changePercent = prevMonth.total > 0 ? (change / prevMonth.total) * 100 : 0}
										<p class="text-xs mt-1 {change > 0 ? 'text-destructive' : 'text-green-600'}">
											{change > 0 ? '↑' : '↓'} {currencyFormatter.format(Math.abs(change))} ({changePercent > 0 ? '+' : ''}{formatPercentRaw(changePercent, 0)}) vs prev month
										</p>
									{/if}

									<!-- Historical average comparison -->
									{#if showHistoricalAvg && historicalAverage !== null}
										{@const diffFromAvg = point.total - historicalAverage}
										{@const diffPercent = (diffFromAvg / historicalAverage) * 100}
										<p class="text-xs" style="color: var(--chart-6);">
											{diffFromAvg > 0 ? '+' : ''}{formatPercentRaw(diffPercent, 0)} vs historical avg
										</p>
									{/if}

									<!-- Top recurring payees -->
									{#if topPayees.length > 0}
										<div class="mt-2 border-t pt-2">
											<p class="text-muted-foreground text-xs mb-1">Top Recurring:</p>
											{#each topPayees as payee}
												<p class="text-xs truncate max-w-48">{payee.name}: {currencyFormatter.format(payee.amount)}</p>
											{/each}
										</div>
									{/if}

									<p class="text-xs text-muted-foreground mt-2 pt-1 border-t">
										Click to select, double-click for details
									</p>
								</div>
							{/snippet}
						</Tooltip>

						<!-- Brush for drag selection -->
						<Brush
							onbrush={handleBrushSelect}
							onclick={handleBrushClick}
							onhover={(x) => brushHoverX = x}
							fill="var(--primary)"
							opacity={0.15}
						/>
					</Svg>
				</LayerCake>
			{/if}

			<!-- Legend -->
			<div class="mt-4 flex flex-wrap justify-center gap-4">
				<div class="flex items-center gap-2">
					<div class="h-3 w-3 rounded-sm bg-primary"></div>
					<span class="text-sm">Recurring</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="h-3 w-3 rounded-sm" style="background-color: var(--chart-2)"></div>
					<span class="text-sm">One-time</span>
				</div>
				{#each activeOverlays as overlay}
					<div class="flex items-center gap-2">
						<div
							class="h-0.5 w-4"
							style="background-color: {overlay.color}; {overlay.dashed
								? 'background: repeating-linear-gradient(90deg, ' +
									overlay.color +
									' 0px, ' +
									overlay.color +
									' 4px, transparent 4px, transparent 8px);'
								: ''}"
						></div>
						<span class="text-xs">{overlay.label}</span>
					</div>
				{/each}
			</div>

		<!-- Recurring payees list (enhanced with selection) -->
		{#if recurringPayeeDetails.length > 0}
			<div class="mt-4 rounded-lg border p-4">
				<div class="flex items-center justify-between mb-3">
					<h4 class="text-sm font-medium">Detected Recurring Payees</h4>
					<span class="text-xs text-muted-foreground">{recurringPayeeDetails.length} found</span>
				</div>
				<div class="space-y-1 max-h-48 overflow-y-auto">
					{#each recurringPayeeDetails.slice(0, 10) as payee}
						<button
							type="button"
							class="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors text-left
								{selectedPayee === payee.name ? 'bg-muted' : ''}"
							onclick={() => (selectedPayee = selectedPayee === payee.name ? null : payee.name)}
						>
							<div class="flex items-center gap-2">
								<!-- Confidence indicator -->
								<div
									class="h-2 w-2 rounded-full {payee.confidence >= 70
										? 'bg-green-500'
										: payee.confidence >= 50
											? 'bg-yellow-500'
											: 'bg-orange-500'}"
									title="{payee.confidence}% confidence"
								></div>
								<div>
									<span class="text-sm truncate max-w-32 block">{payee.name}</span>
									<span class="text-xs text-muted-foreground capitalize">{payee.pattern}</span>
								</div>
							</div>
							<div class="flex items-center gap-3 text-xs text-muted-foreground">
								<span>{payee.occurrences}×</span>
								<span class="tabular-nums">{currencyFormatter.format(payee.avgAmount)}/avg</span>
								<span class="text-[10px] tabular-nums w-8 text-right">{payee.confidence}%</span>
							</div>
						</button>
					{/each}
					{#if recurringPayeeDetails.length > 10}
						<p class="text-xs text-muted-foreground text-center pt-2">
							+{recurringPayeeDetails.length - 10} more recurring payees
						</p>
					{/if}
				</div>

				<!-- Selected payee details panel -->
				{#if selectedPayee}
					{@const payee = recurringPayeeDetails.find((p) => p.name === selectedPayee)}
					{#if payee}
						<div class="mt-3 pt-3 border-t">
							<div class="flex items-center justify-between mb-2">
								<span class="font-medium text-sm truncate max-w-48">{payee.name}</span>
								<Button variant="ghost" size="icon" class="h-6 w-6" onclick={() => (selectedPayee = null)}>
									<X class="h-4 w-4" />
								</Button>
							</div>
							<div class="grid grid-cols-2 gap-2 text-xs">
								<div>
									<p class="text-muted-foreground">Pattern</p>
									<p class="capitalize font-medium">{payee.pattern}</p>
								</div>
								<div>
									<p class="text-muted-foreground">Confidence</p>
									<p class="font-medium">{payee.confidence}%</p>
								</div>
								<div>
									<p class="text-muted-foreground">Avg Amount</p>
									<p class="font-medium tabular-nums">{currencyFormatter.format(payee.avgAmount)}</p>
								</div>
								<div>
									<p class="text-muted-foreground">Amount Range</p>
									<p class="font-medium tabular-nums">
										{currencyFormatter.format(payee.minAmount)} - {currencyFormatter.format(payee.maxAmount)}
									</p>
								</div>
								<div>
									<p class="text-muted-foreground">Occurrences</p>
									<p class="font-medium">{payee.occurrences} transactions</p>
								</div>
								<div>
									<p class="text-muted-foreground">Total Spend</p>
									<p class="font-medium tabular-nums">{currencyFormatter.format(payee.totalSpend)}</p>
								</div>
							</div>
							<div class="mt-3 flex gap-2">
								<Button
									variant="outline"
									size="sm"
									class="flex-1"
									onclick={() =>
										chartInteractions.openDrillDown({
											type: 'payee',
											value: payee.name,
											label: `${payee.name} Transactions`
										})}
								>
									View Transactions
								</Button>
							</div>
						</div>
					{/if}
				{/if}
			</div>
		{/if}

		<!-- Selection hint -->
		{#if !chartSelection.isActive}
			<p class="mt-2 text-center text-xs text-muted-foreground">
				Click points to select, or drag to select a range
			</p>
		{/if}
		</div>
	{/snippet}
</AnalyticsChartShell>

<!-- Chart selection floating panel -->
<ChartSelectionPanel />
