<script lang="ts">
	import { AxisX, AxisY, GroupedBar, StackedBar } from '$lib/components/layercake';
	import { Button } from '$lib/components/ui/button';
	import { currencyFormatter } from '$lib/utils/formatters';
	import type { TransactionsFormat } from '$lib/types';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { LayerCake, Svg, Html } from 'layercake';
	import { scaleLinear } from 'd3-scale';
	import { AnalyticsChartShell } from '$lib/components/charts';
	import type { ComprehensiveStats } from '$lib/utils/comprehensive-statistics';

	interface Props {
		transactions: TransactionsFormat[];
	}

	let { transactions }: Props = $props();

	// Track hovered bar for tooltip
	let hoveredItem = $state<{ item: typeof chartData[0]; keyIndex: number; key: string } | null>(null);
	let hoveredStackedItem = $state<{ item: typeof chartData[0]; key: string; segmentIndex: number; seriesIndex: number } | null>(null);

	// Chart style: grouped or stacked
	type ChartStyle = 'grouped' | 'stacked';
	let chartStyle = $state<ChartStyle>('grouped');

	// Access effective time period for this chart
	const effectivePeriod = $derived(timePeriodFilter.getEffectivePeriod('year-over-year'));

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

	// View mode: expenses, income, or both
	type ViewMode = 'expenses' | 'income' | 'both';
	let viewMode = $state<ViewMode>('expenses');

	// Get unique years from filtered transactions
	const availableYears = $derived.by(() => {
		const years = new Set<number>();
		for (const tx of periodFilteredTransactions) {
			const date = tx.date instanceof Date ? tx.date : new Date(tx.date?.toString() || '');
			if (!isNaN(date.getTime())) {
				years.add(date.getFullYear());
			}
		}
		return Array.from(years).sort((a, b) => b - a).slice(0, 3); // Last 3 years
	});

	// Aggregate by month and year (for single metric modes)
	const monthlyByYear = $derived.by(() => {
		const data = new Map<string, Map<number, number>>();
		const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

		// Initialize all months
		for (const month of months) {
			data.set(month, new Map());
			for (const year of availableYears) {
				data.get(month)!.set(year, 0);
			}
		}

		for (const tx of periodFilteredTransactions) {
			const isExpense = tx.amount < 0;
			// Filter by viewMode: expenses only or income only
			if (viewMode === 'expenses' && !isExpense) continue;
			if (viewMode === 'income' && isExpense) continue;
			if (viewMode === 'both') continue; // Use separate aggregation for 'both'

			const date = tx.date instanceof Date ? tx.date : new Date(tx.date?.toString() || '');
			if (isNaN(date.getTime())) continue;

			const year = date.getFullYear();
			if (!availableYears.includes(year)) continue;

			const month = months[date.getMonth()];
			const current = data.get(month)!.get(year) || 0;
			data.get(month)!.set(year, current + Math.abs(tx.amount));
		}

		return data;
	});

	// Aggregate by month, year, and type (for 'both' mode)
	const monthlyByYearAndType = $derived.by(() => {
		const data = new Map<string, Map<string, number>>();
		const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

		// Initialize all months with income/expense keys per year
		for (const month of months) {
			data.set(month, new Map());
			for (const year of availableYears) {
				data.get(month)!.set(`${year}_income`, 0);
				data.get(month)!.set(`${year}_expenses`, 0);
			}
		}

		for (const tx of periodFilteredTransactions) {
			const date = tx.date instanceof Date ? tx.date : new Date(tx.date?.toString() || '');
			if (isNaN(date.getTime())) continue;

			const year = date.getFullYear();
			if (!availableYears.includes(year)) continue;

			const month = months[date.getMonth()];
			const isExpense = tx.amount < 0;
			const key = `${year}_${isExpense ? 'expenses' : 'income'}`;
			const current = data.get(month)!.get(key) || 0;
			data.get(month)!.set(key, current + Math.abs(tx.amount));
		}

		return data;
	});

	// Transform for chart - grouped bar data
	const chartData = $derived.by(() => {
		const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		const result: Array<{ month: string; index: number; [key: string]: string | number }> = [];

		for (let i = 0; i < months.length; i++) {
			const month = months[i];
			const monthData: { month: string; index: number; [key: string]: string | number } = { month, index: i };

			if (viewMode === 'both') {
				// Use year_type keys for 'both' mode
				const typeData = monthlyByYearAndType.get(month);
				if (typeData) {
					for (const year of availableYears) {
						monthData[`${year}_income`] = typeData.get(`${year}_income`) || 0;
						monthData[`${year}_expenses`] = typeData.get(`${year}_expenses`) || 0;
					}
				}
			} else {
				// Use year keys for single metric modes
				const yearData = monthlyByYear.get(month);
				if (yearData) {
					for (const year of availableYears) {
						monthData[year.toString()] = yearData.get(year) || 0;
					}
				}
			}
			result.push(monthData);
		}

		return result;
	});

	// Keys for the chart based on viewMode
	const chartKeys = $derived.by(() => {
		if (viewMode === 'both') {
			// Interleave income/expenses per year: [2024_income, 2024_expenses, 2023_income, 2023_expenses, ...]
			return availableYears.flatMap(y => [`${y}_income`, `${y}_expenses`]);
		}
		return availableYears.map(y => y.toString());
	});

	// Colors for the chart based on viewMode
	const chartColors = $derived.by(() => {
		if (viewMode === 'both') {
			// Green for income, red for expenses - different shades per year
			const incomeColors = ['var(--chart-2)', 'hsl(142 71% 35%)', 'hsl(142 71% 25%)'];
			const expenseColors = ['var(--destructive)', 'hsl(0 72% 41%)', 'hsl(0 72% 31%)'];
			return availableYears.flatMap((_, i) => [incomeColors[i % incomeColors.length], expenseColors[i % expenseColors.length]]);
		}
		return ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)'];
	});

	// Colors for each year (used in legend for single metric modes)
	const yearColors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)'];

	// Summary statistics
	const summaryStats = $derived.by(() => {
		if (availableYears.length === 0) {
			return [
				{ label: 'Years Compared', value: '0' },
				{ label: 'Highest Month', value: 'N/A' },
				{ label: 'YoY Change', value: 'N/A' },
				{ label: 'Best Year', value: 'N/A' }
			];
		}

		// Find highest spending month across all years
		let highestMonth = '';
		let highestAmount = 0;
		const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		for (const month of months) {
			const yearData = monthlyByYear.get(month);
			if (yearData) {
				for (const [, amount] of yearData) {
					if (amount > highestAmount) {
						highestAmount = amount;
						highestMonth = month;
					}
				}
			}
		}

		// Calculate YoY change (current year vs previous)
		const currentYear = availableYears[0];
		const previousYear = availableYears[1];
		let currentTotal = 0;
		let previousTotal = 0;

		for (const month of months) {
			const yearData = monthlyByYear.get(month);
			if (yearData) {
				currentTotal += yearData.get(currentYear) || 0;
				if (previousYear) {
					previousTotal += yearData.get(previousYear) || 0;
				}
			}
		}

		const yoyChange = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

		// Find best year (lowest expenses, highest income, or highest activity for both)
		const yearTotals = availableYears.map((year) => {
			let total = 0;
			for (const month of months) {
				total += monthlyByYear.get(month)?.get(year) || 0;
			}
			return { year, total };
		});

		const bestYear = viewMode === 'expenses'
			? yearTotals.reduce((a, b) => (a.total < b.total ? a : b))
			: yearTotals.reduce((a, b) => (a.total > b.total ? a : b));

		// Determine the label for best year based on viewMode
		const bestYearLabel = viewMode === 'expenses' ? 'Best Year' : viewMode === 'income' ? 'Top Year' : 'Most Active';

		return [
			{ label: 'Years Compared', value: availableYears.length.toString() },
			{ label: 'Highest Month', value: highestMonth, description: currencyFormatter.format(highestAmount) },
			{
				label: 'YoY Change',
				value: yoyChange > 0 ? `+${yoyChange.toFixed(1)}%` : `${yoyChange.toFixed(1)}%`,
				description: `${currentYear} vs ${previousYear || 'N/A'}`
			},
			{
				label: bestYearLabel,
				value: bestYear.year.toString(),
				description: currencyFormatter.format(bestYear.total)
			}
		];
	});

	// Comprehensive statistics for the Statistics tab
	const comprehensiveStats = $derived.by((): ComprehensiveStats | null => {
		if (availableYears.length === 0 || chartData.length === 0) return null;

		const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

		// Calculate yearly totals and monthly averages
		const yearTotals: { year: number; total: number; monthlyValues: number[] }[] = availableYears.map((year) => {
			const monthlyValues: number[] = [];
			let total = 0;
			for (const month of months) {
				const val = monthlyByYear.get(month)?.get(year) || 0;
				monthlyValues.push(val);
				total += val;
			}
			return { year, total, monthlyValues };
		});

		// Get all values for distribution calculations
		const allValues = yearTotals.flatMap(yt => yt.monthlyValues).filter(v => v > 0);
		if (allValues.length === 0) return null;

		const sortedValues = [...allValues].sort((a, b) => a - b);
		const mean = allValues.reduce((s, v) => s + v, 0) / allValues.length;
		const median = sortedValues[Math.floor(sortedValues.length / 2)];
		const total = allValues.reduce((s, v) => s + v, 0);

		// Find highest and lowest months across all years
		let highestValue = 0;
		let highestMonth = '';
		let lowestValue = Infinity;
		let lowestMonth = '';

		for (const month of months) {
			for (const year of availableYears) {
				const val = monthlyByYear.get(month)?.get(year) || 0;
				if (val > highestValue) {
					highestValue = val;
					highestMonth = `${month} ${year}`;
				}
				if (val > 0 && val < lowestValue) {
					lowestValue = val;
					lowestMonth = `${month} ${year}`;
				}
			}
		}

		// Percentiles
		const p25 = sortedValues[Math.floor(sortedValues.length * 0.25)] || 0;
		const p50 = median;
		const p75 = sortedValues[Math.floor(sortedValues.length * 0.75)] || 0;

		// Standard deviation
		const variance = allValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / allValues.length;
		const stdDev = Math.sqrt(variance);

		// YoY changes
		const currentYear = yearTotals[0];
		const previousYear = yearTotals[1];
		const yoyChange = previousYear && previousYear.total > 0
			? ((currentYear.total - previousYear.total) / previousYear.total) * 100
			: null;

		// Trend direction based on yearly totals
		let trendDirection: 'up' | 'down' | 'flat' = 'flat';
		if (yearTotals.length >= 2) {
			const diff = yearTotals[0].total - yearTotals[1].total;
			const threshold = yearTotals[1].total * 0.05;
			trendDirection = diff > threshold ? 'up' : diff < -threshold ? 'down' : 'flat';
		}

		return {
			summary: {
				average: mean,
				median: median,
				total: total,
				count: allValues.length
			},
			trend: {
				direction: trendDirection,
				growthRate: yoyChange,
				slope: yoyChange !== null ? (currentYear.total - (previousYear?.total || 0)) / 12 : 0,
				monthlyChange: 0
			},
			distribution: {
				highest: { value: highestValue, month: highestMonth, monthLabel: highestMonth },
				lowest: { value: lowestValue === Infinity ? 0 : lowestValue, month: lowestMonth, monthLabel: lowestMonth },
				range: highestValue - (lowestValue === Infinity ? 0 : lowestValue),
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
				vsLastYearTotal: previousYear ? currentYear.total - previousYear.total : null,
				vsLastYearPercent: yoyChange
			}
		};
	});

	const hasData = $derived(chartData.length > 0 && availableYears.length > 0);

	// Handle drill-down to view transactions for a specific month/year
	function handleDrillDown(info: { item: typeof chartData[0]; key?: string }) {
		const monthIndex = info.item.index;
		const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

		// Parse year from key if available (e.g., "2024" or "2024_income")
		let year: number | undefined;
		if (info.key) {
			const yearMatch = info.key.match(/^\d{4}/);
			if (yearMatch) {
				year = parseInt(yearMatch[0]);
			}
		}

		// If no year from key, use the most recent year
		if (!year && availableYears.length > 0) {
			year = availableYears[0];
		}

		if (year) {
			const monthStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
			chartInteractions.openDrillDown({
				type: 'month',
				value: monthStr,
				label: `${months[monthIndex]} ${year} Transactions`
			});
		}
	}

	// Track container dimensions
	let containerWidth = $state(0);
	let containerHeight = $state(0);
	const containerReady = $derived(containerWidth > 0 && containerHeight > 0);

	// Y domain
	const yMax = $derived.by(() => {
		if (!hasData) return 100;
		let max = 0;

		if (chartStyle === 'stacked') {
			// For stacked: sum all keys per month
			for (const d of chartData) {
				let sum = 0;
				for (const key of chartKeys) {
					sum += (d[key] as number) || 0;
				}
				if (sum > max) max = sum;
			}
		} else {
			// For grouped: find max individual value
			for (const d of chartData) {
				for (const key of chartKeys) {
					const val = d[key] as number;
					if (val > max) max = val;
				}
			}
		}
		return max * 1.1;
	});
</script>

<AnalyticsChartShell
	data={chartData}
	{comprehensiveStats}
	supportedChartTypes={['bar']}
	defaultChartType="bar"
	emptyMessage="No transaction data available for comparison"
	chartId="year-over-year"
	allowedPeriodGroups={['year', 'other']}
>
	{#snippet title()}
		Year over Year Comparison
	{/snippet}

	{#snippet subtitle()}
		Compare monthly {viewMode === 'both' ? 'income & expenses' : viewMode} across years
	{/snippet}

	{#snippet headerActions()}
		<div class="flex items-center gap-2">
			<div class="flex gap-1">
				<Button variant={viewMode === 'expenses' ? 'default' : 'ghost'} size="sm" onclick={() => (viewMode = 'expenses')}>
					Expenses
				</Button>
				<Button variant={viewMode === 'income' ? 'default' : 'ghost'} size="sm" onclick={() => (viewMode = 'income')}>
					Income
				</Button>
				<Button variant={viewMode === 'both' ? 'default' : 'ghost'} size="sm" onclick={() => (viewMode = 'both')}>
					Both
				</Button>
			</div>
			<div class="border-l pl-2 flex gap-1">
				<Button variant={chartStyle === 'grouped' ? 'default' : 'ghost'} size="sm" onclick={() => (chartStyle = 'grouped')}>
					Grouped
				</Button>
				<Button variant={chartStyle === 'stacked' ? 'default' : 'ghost'} size="sm" onclick={() => (chartStyle = 'stacked')}>
					Stacked
				</Button>
			</div>
		</div>
	{/snippet}

	{#snippet chart({ data }: { data: typeof chartData })}
		<div
			class="h-[450px] w-full pb-20"
			bind:clientWidth={containerWidth}
			bind:clientHeight={containerHeight}
		>
			{#if containerReady}
				{#key `${chartStyle}-${viewMode}`}
					{#if chartStyle === 'stacked'}
						<!-- Stacked mode: use month label for x-axis, no explicit scale -->
						<LayerCake
							{data}
							x="month"
							y={(d: Record<string, unknown>) => chartKeys.reduce((sum, key) => sum + ((d[key] as number) || 0), 0)}
							yDomain={[0, yMax]}
							padding={{ top: 20, right: 20, bottom: 40, left: 60 }}
						>
							<Svg>
								<AxisY ticks={5} gridlines={true} format={(d) => currencyFormatter.format(d)} />
								<AxisX ticks={12} />
								<StackedBar
									keys={chartKeys}
									colors={chartColors}
									opacity={0.85}
									hoverOpacity={1}
									radius={2}
									gap={4}
									onhover={(info) => (hoveredStackedItem = info)}
									onclick={(info) => handleDrillDown({ item: info.item, key: info.key })}
								/>
							</Svg>
							<Html pointerEvents={false}>
								{#if hoveredStackedItem}
									{@const point = hoveredStackedItem.item}
									{@const total = chartKeys.reduce((sum, key) => sum + ((point[key] as number) || 0), 0)}
									<div class="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
										<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
											<p class="font-medium">{point.month}</p>
											{#if viewMode === 'both'}
												{#each availableYears as year, yi}
													<div class="mt-1 {yi > 0 ? 'border-t pt-1' : ''}">
														<p class="text-xs font-medium text-muted-foreground">{year}</p>
														<p class="text-green-600">
															Income: {currencyFormatter.format((point[`${year}_income`] as number) || 0)}
														</p>
														<p class="text-red-600">
															Expenses: {currencyFormatter.format((point[`${year}_expenses`] as number) || 0)}
														</p>
													</div>
												{/each}
											{:else}
												{#each availableYears as year, yi}
													<p style="color: {yearColors[yi % yearColors.length]}">
														{year}: {currencyFormatter.format((point[year.toString()] as number) || 0)}
													</p>
												{/each}
											{/if}
											<p class="text-muted-foreground mt-1 border-t pt-1 text-xs">
												Total: {currencyFormatter.format(total)}
											</p>
										</div>
									</div>
								{/if}
							</Html>
						</LayerCake>
					{:else}
						<!-- Grouped mode: use numeric index with linear scale -->
						<LayerCake
							{data}
							x="index"
							y={(d: Record<string, unknown>) => Math.max(...chartKeys.map((key) => (d[key] as number) || 0))}
							xScale={scaleLinear()}
							xDomain={[-0.5, 11.5]}
							yScale={scaleLinear()}
							yDomain={[0, yMax]}
							padding={{ top: 20, right: 20, bottom: 40, left: 60 }}
						>
							<Svg>
								<AxisY ticks={5} gridlines={true} format={(d) => currencyFormatter.format(d)} />
								<AxisX
									ticks={12}
									format={(d) => {
										const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
										const idx = typeof d === 'number' ? Math.round(d) : 0;
										return months[idx] || '';
									}}
								/>
								<GroupedBar
									keys={chartKeys}
									colors={chartColors}
									xKey="index"
									groupGap={4}
									barGap={viewMode === 'both' ? 0 : 1}
									radius={2}
									opacity={0.85}
									hoverOpacity={1}
									onhover={(info) => (hoveredItem = info)}
									onclick={(info) => handleDrillDown({ item: info.item, key: info.key })}
								/>
							</Svg>
							<Html pointerEvents={false}>
								{#if hoveredItem}
									{@const point = hoveredItem.item}
									<div class="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
										<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
											<p class="font-medium">{point.month}</p>
											{#if viewMode === 'both'}
												{#each availableYears as year, yi}
													<div class="mt-1 {yi > 0 ? 'border-t pt-1' : ''}">
														<p class="text-xs font-medium text-muted-foreground">{year}</p>
														<p class="text-green-600">
															Income: {currencyFormatter.format((point[`${year}_income`] as number) || 0)}
														</p>
														<p class="text-red-600">
															Expenses: {currencyFormatter.format((point[`${year}_expenses`] as number) || 0)}
														</p>
													</div>
												{/each}
											{:else}
												{#each availableYears as year, yi}
													<p style="color: {yearColors[yi % yearColors.length]}">
														{year}: {currencyFormatter.format((point[year.toString()] as number) || 0)}
													</p>
												{/each}
											{/if}
										</div>
									</div>
								{/if}
							</Html>
						</LayerCake>
					{/if}
				{/key}
			{/if}

			<!-- Legend -->
			<div class="mt-4 flex flex-wrap justify-center gap-4">
			{#if viewMode === 'both'}
				<!-- Show income/expense legend with year groupings -->
				{#each availableYears as year, i}
					<div class="flex items-center gap-2 rounded border px-2 py-1">
						<span class="text-xs font-medium">{year}:</span>
						<div class="flex items-center gap-1">
							<div class="h-3 w-3 rounded-sm" style="background-color: {chartColors[i * 2]}"></div>
							<span class="text-xs">In</span>
						</div>
						<div class="flex items-center gap-1">
							<div class="h-3 w-3 rounded-sm" style="background-color: {chartColors[i * 2 + 1]}"></div>
							<span class="text-xs">Out</span>
						</div>
					</div>
				{/each}
			{:else}
				{#each availableYears as year, i}
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-sm" style="background-color: {yearColors[i % yearColors.length]}"></div>
						<span class="text-sm">{year}</span>
					</div>
				{/each}
			{/if}
			</div>
		</div>
	{/snippet}
</AnalyticsChartShell>
