# Chart Management

Create and manage chart components following established patterns.

## Usage

```
/chart new spending-by-payee --type area    # Create new domain chart
/chart add-drill-down payee-trends          # Add drill-down to existing chart
/chart add-overlays cash-flow               # Add analysis overlays
/chart add-tooltip category-radar           # Add tooltip support
/chart add-selection monthly-spending       # Add point selection
/chart list                                 # List all charts with feature matrix
```

## Arguments

Parse from `$ARGUMENTS`:
- First arg: Action (`new`, `add-drill-down`, `add-overlays`, `add-tooltip`, `add-selection`, `list`)
- Second arg: Chart name (kebab-case, e.g., `spending-by-payee`, `monthly-spending`)
- Flags:
  - `--type`: Visualization type (`line`, `area`, `bar`, `stacked-bar`, `horizontal-bar`, `radar`, `calendar`)
  - `--base`: Base component hint (`time-series`, `grouped-bar`, `horizontal-bar`)

---

## Process

### Action: `list`

Display the feature matrix of all existing charts:

```
Charts in src/routes/accounts/[slug]/(components)/(charts)/

| Chart                      | Selection | Drill-Down | Overlays | Tooltip |
|----------------------------|-----------|------------|----------|---------|
| cash-flow-chart            | No        | No         | 4/6      | No      |
| category-composition-chart | No        | No         | 0/6      | No      |
| category-radar-chart       | No        | No         | 0/6      | No      |
| category-trends-chart      | No        | No         | 0/6      | No      |
| credit-balance-chart       | Yes       | No         | 5/6      | Yes     |
| credit-payment-chart       | Yes       | Yes        | 0/6      | Yes     |
| credit-payoff-chart        | No        | No         | 0/6      | Yes     |
| credit-utilization-chart   | Yes       | Yes        | 5/6      | Yes     |
| daily-spending-calendar    | No        | Yes        | 0/6      | Yes     |
| income-vs-expenses-chart   | No        | Yes        | 4/6      | Yes     |
| monthly-spending-chart     | Yes       | Yes        | 4/6      | Yes     |
| new-payees-chart           | No        | No         | 0/6      | No      |
| outlier-detection-chart    | No        | Yes        | 0/6      | No      |
| payee-frequency-chart      | No        | No         | 0/6      | No      |
| payee-rankings-chart       | No        | Yes        | 0/6      | No      |
| payee-trends-chart         | No        | No         | 2/6      | Yes     |
| recurring-spending-chart   | Yes       | Yes        | 3/6      | Yes     |
| savings-rate-chart         | Yes       | Yes        | 6/6      | Yes     |
| spending-distribution-chart| No        | Yes        | 0/6      | No      |
| spending-velocity-chart    | No        | No         | 4/6      | Yes     |
| transaction-explorer-chart | No        | No         | 0/6      | Yes     |
| weekday-patterns-chart     | No        | No         | 0/6      | No      |
| year-over-year-chart       | No        | No         | 0/6      | No      |

Gold standard: savings-rate-chart.svelte (has ALL features)
```

---

### Action: `new`

1. **Validate** chart doesn't exist at:
   ```
   apps/budget/src/routes/accounts/[slug]/(components)/(charts)/{chart-name}-chart.svelte
   ```

2. **Determine template** based on `--type`:
   - `line`, `area`, `line-area` → Time Series Template
   - `bar`, `stacked-bar` → Vertical Bar Template
   - `horizontal-bar` → Horizontal Bar Template
   - `grouped-bar` → Grouped Bar Template
   - `radar` → Radar Template
   - `calendar` → Calendar Template

3. **Generate** chart file from appropriate template

4. **Output** next steps for the user

---

### Action: `add-drill-down`

Add drill-down capability to an existing chart.

**Steps:**
1. Read the chart file
2. Add import if not present:
   ```typescript
   import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
   ```
3. Add handler function:
   ```typescript
   function handleDblClick(point: DataPoint) {
     chartInteractions.openDrillDown({
       type: 'month',        // or 'category', 'payee', 'date'
       value: point.month,   // the filter value
       label: `${point.monthLabel} Transactions`
     });
   }
   ```
4. Wire handler to visualization (ondblclick or onclick depending on chart)

**Drill-Down Types:**
- `month` - Filter by YYYY-MM
- `category` - Filter by category ID
- `payee` - Filter by payee ID
- `date` - Filter by specific date
- `dateRange` - Filter by date range

---

### Action: `add-overlays`

Add analysis overlays to a time-series chart.

**Steps:**
1. Read the chart file
2. Add imports:
   ```typescript
   import { calculateLinearTrend, calculateHistoricalAverage, calculatePercentileBands } from '$lib/utils/chart-statistics';
   import { AnalysisDropdown } from '$lib/components/charts';
   import { PercentileBands, TrendDots, HorizontalLine } from '$lib/components/layercake';
   ```
3. Add toggle states:
   ```typescript
   let showLinearTrend = $state(true);
   let showHistoricalAvg = $state(true);
   let showPercentileBands = $state(false);
   let showForecast = $state(false);
   let showMovingAvg = $state(false);
   let showYoY = $state(false);
   ```
4. Add derived calculations:
   ```typescript
   const linearTrendData = $derived.by(() => {
     if (!showLinearTrend || data.length < 2) return null;
     return calculateLinearTrend(dataAsSpending);
   });

   const historicalAverage = $derived.by(() => {
     if (!showHistoricalAvg || allData.length === 0) return null;
     return calculateHistoricalAverage(allData.map(d => ({ spending: d.value })));
   });

   const percentileBands = $derived.by(() => {
     if (!showPercentileBands || allData.length < 4) return null;
     return calculatePercentileBands(allData.map(d => ({ spending: d.value })));
   });
   ```
5. Add AnalysisDropdown to header actions
6. Add overlay components to chart SVG

---

### Action: `add-tooltip`

Add tooltip support to a chart.

**Steps:**
1. Read the chart file
2. Add Tooltip or Brush import:
   ```typescript
   import { Tooltip, Brush } from '$lib/components/layercake';
   ```
3. Add tooltip snippet:
   ```svelte
   {#snippet tooltipContent({ point })}
     <div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
       <p class="font-medium">{point.label}</p>
       <p class="text-primary text-lg font-semibold">
         {currencyFormatter.format(point.value)}
       </p>
     </div>
   {/snippet}
   ```
4. Wire into chart HTML layer

**Tooltip Patterns:**
- **Brush-controlled**: For line/area charts with crosshair
- **Bar hover**: For bar charts with onhover callback
- **Multi-series**: Use MultiTooltip for multiple series

---

### Action: `add-selection`

Add point selection support to a chart.

**Steps:**
1. Read the chart file
2. Add imports:
   ```typescript
   import { chartSelection } from '$lib/states/ui/chart-selection.svelte';
   import { ChartSelectionPanel } from '$lib/components/charts';
   ```
3. Define CHART_ID constant:
   ```typescript
   const CHART_ID = 'my-chart-name';
   ```
4. Add click handler:
   ```typescript
   function handlePointClick(point: DataPoint) {
     chartSelection.toggle({
       chartId: CHART_ID,
       date: point.date,
       value: point.value,
       label: point.monthLabel,
     });
   }
   ```
5. Add ChartSelectionPanel after LayerCake:
   ```svelte
   <ChartSelectionPanel chartId={CHART_ID} />
   ```
6. Style selected points with primary color

---

## Templates

### Time Series Chart Template

For line/area charts showing values over time.

**File:** `apps/budget/src/routes/accounts/[slug]/(components)/(charts)/{name}-chart.svelte`

```svelte
<script lang="ts">
	import { currencyFormatter } from '$lib/utils/formatters';
	import type { TransactionsFormat } from '$lib/types';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { chartSelection } from '$lib/states/ui/chart-selection.svelte';
	import {
		calculateLinearTrend,
		calculateHistoricalAverage,
		calculatePercentileBands,
		type TrendLineData,
		type PercentileBands as PercentileBandsType
	} from '$lib/utils/chart-statistics';
	import { calculateComprehensiveStats } from '$lib/utils/comprehensive-statistics';
	import { LayerCake, Svg, Html } from 'layercake';
	import { scaleLinear } from 'd3-scale';
	import { AnalyticsChartShell, AnalysisDropdown, ChartSelectionPanel } from '$lib/components/charts';
	import {
		Line,
		Area,
		AxisX,
		AxisY,
		Brush,
		PercentileBands,
		TrendDots,
		HorizontalLine
	} from '$lib/components/layercake';
	import { extractDateString, formatShortDate, formatMonthYear } from '$lib/utils/date-formatters';

	interface Props {
		transactions: TransactionsFormat[];
	}

	let { transactions }: Props = $props();

	// Chart configuration
	const CHART_ID = '{chart-id}';

	// Toggle states for analysis overlays
	let showLinearTrend = $state(true);
	let showHistoricalAvg = $state(true);
	let showPercentileBands = $state(false);

	// Access effective time period
	const effectivePeriod = $derived(timePeriodFilter.getEffectivePeriod(CHART_ID));

	// Transform transactions to monthly data
	const allMonthlyData = $derived.by(() => {
		const byMonth = new Map<string, { total: number; count: number }>();

		for (const tx of transactions) {
			const dateStr = extractDateString(tx.date);
			if (!dateStr) continue;
			const monthKey = dateStr.slice(0, 7);

			const existing = byMonth.get(monthKey) || { total: 0, count: 0 };
			// Customize aggregation logic here
			existing.total += Math.abs(tx.amount);
			existing.count++;
			byMonth.set(monthKey, existing);
		}

		return Array.from(byMonth.entries())
			.map(([month, data]) => ({
				month,
				monthLabel: formatMonthYear(new Date(month + '-01')),
				value: data.total,
				count: data.count,
				date: new Date(month + '-01')
			}))
			.sort((a, b) => a.month.localeCompare(b.month));
	});

	// Filter by time period
	const chartData = $derived.by(() => {
		let filtered = allMonthlyData;
		if (effectivePeriod.start && effectivePeriod.end) {
			filtered = allMonthlyData.filter(
				(d) => d.date >= effectivePeriod.start! && d.date <= effectivePeriod.end!
			);
		}
		return filtered.map((d, i) => ({ ...d, index: i }));
	});

	// Convert for statistics calculations
	const dataAsSpending = $derived(
		chartData.map((d) => ({
			month: d.month,
			monthLabel: d.monthLabel,
			spending: d.value,
			date: d.date,
			index: d.index
		}))
	);

	// Analysis overlays
	const linearTrendData = $derived.by((): TrendLineData | null => {
		if (!showLinearTrend || chartData.length < 2) return null;
		return calculateLinearTrend(dataAsSpending);
	});

	const historicalAverage = $derived.by(() => {
		if (!showHistoricalAvg || allMonthlyData.length === 0) return null;
		return calculateHistoricalAverage(allMonthlyData.map((d) => ({ spending: d.value })));
	});

	const percentileBands = $derived.by((): PercentileBandsType | null => {
		if (!showPercentileBands || allMonthlyData.length < 4) return null;
		return calculatePercentileBands(allMonthlyData.map((d) => ({ spending: d.value })));
	});

	// Comprehensive statistics for Statistics tab
	const comprehensiveStats = $derived.by(() => {
		if (!chartData.length) return null;
		return calculateComprehensiveStats(
			dataAsSpending,
			allMonthlyData.map((d) => ({
				month: d.month,
				monthLabel: d.monthLabel,
				spending: d.value,
				date: d.date
			})),
			null,
			null
		);
	});

	// Event handlers
	function handlePointClick(point: (typeof chartData)[0]) {
		chartSelection.toggle({
			chartId: CHART_ID,
			date: point.date,
			value: point.value,
			label: point.monthLabel
		});
	}

	function handlePointDblClick(point: (typeof chartData)[0]) {
		chartInteractions.openDrillDown({
			type: 'month',
			value: point.month,
			label: `${point.monthLabel} Transactions`
		});
	}

	const hasData = $derived(chartData.length > 0);
</script>

<AnalyticsChartShell
	data={chartData}
	{comprehensiveStats}
	supportedChartTypes={['line', 'area', 'line-area']}
	defaultChartType="area"
	chartId={CHART_ID}
>
	{#snippet title()}
		{Chart Title}
	{/snippet}

	{#snippet subtitle()}
		{Chart subtitle description}
	{/snippet}

	{#snippet headerActions()}
		<AnalysisDropdown
			bind:showTrend={showLinearTrend}
			bind:showHistoricalAvg={showHistoricalAvg}
			bind:showPercentileBands={showPercentileBands}
		/>
	{/snippet}

	{#snippet chart({ data, chartType })}
		{#if hasData}
			<LayerCake
				{data}
				x="index"
				y="value"
				xScale={scaleLinear()}
				yScale={scaleLinear()}
				padding={{ top: 20, right: 20, bottom: 30, left: 60 }}
			>
				<Svg>
					<AxisY ticks={5} gridlines={true} format={(d) => currencyFormatter.format(d)} />
					<AxisX
						ticks={Math.min(data.length, 6)}
						format={(d) => {
							const point = data[Math.round(d)];
							return point ? formatShortDate(point.date) : '';
						}}
					/>

					{#if showPercentileBands && percentileBands}
						<PercentileBands bands={percentileBands} />
					{/if}

					{#if showHistoricalAvg && historicalAverage}
						<HorizontalLine value={historicalAverage} stroke="var(--chart-4)" strokeDasharray="4 4" />
					{/if}

					{#if chartType === 'area' || chartType === 'line-area'}
						<Area opacity={0.3} />
					{/if}
					<Line />

					{#if showLinearTrend && linearTrendData}
						<TrendDots data={linearTrendData.data} />
					{/if}
				</Svg>

				<Html>
					<Brush mode="click" onclick={handlePointClick} ondblclick={handlePointDblClick}>
						{#snippet tooltipContent({ point })}
							<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
								<p class="font-medium">{point.monthLabel}</p>
								<p class="text-primary text-lg font-semibold">
									{currencyFormatter.format(point.value)}
								</p>
								<p class="text-muted-foreground mt-1 text-xs">Double-click to view transactions</p>
							</div>
						{/snippet}
					</Brush>
				</Html>
			</LayerCake>

			<ChartSelectionPanel chartId={CHART_ID} />
		{:else}
			<div class="flex h-full items-center justify-center">
				<p class="text-muted-foreground">No data available</p>
			</div>
		{/if}
	{/snippet}
</AnalyticsChartShell>
```

---

### Horizontal Bar Chart Template

For ranked lists like top payees, category rankings.

```svelte
<script lang="ts">
	import { currencyFormatter } from '$lib/utils/formatters';
	import type { TransactionsFormat } from '$lib/types';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { LayerCake, Svg } from 'layercake';
	import { scaleBand, scaleLinear } from 'd3-scale';
	import { AnalyticsChartShell } from '$lib/components/charts';
	import { HorizontalBar, HorizontalBarLabels, AxisX } from '$lib/components/layercake';

	interface Props {
		transactions: TransactionsFormat[];
	}

	let { transactions }: Props = $props();

	const CHART_ID = '{chart-id}';
	const MAX_ITEMS = 10;

	const effectivePeriod = $derived(timePeriodFilter.getEffectivePeriod(CHART_ID));

	// Aggregate by dimension (payee, category, etc.)
	const rankedData = $derived.by(() => {
		const byKey = new Map<string, { id: string; label: string; value: number }>();

		for (const tx of transactions) {
			// Filter by period
			if (effectivePeriod.start && effectivePeriod.end) {
				const txDate = new Date(tx.date.toString());
				if (txDate < effectivePeriod.start || txDate > effectivePeriod.end) continue;
			}

			// Customize key extraction
			const key = tx.payeeId?.toString() ?? 'unknown';
			const label = tx.payee ?? 'Unknown';
			const value = Math.abs(tx.amount);

			const existing = byKey.get(key);
			if (existing) {
				existing.value += value;
			} else {
				byKey.set(key, { id: key, label, value });
			}
		}

		return Array.from(byKey.values())
			.sort((a, b) => b.value - a.value)
			.slice(0, MAX_ITEMS);
	});

	function handleBarClick(item: (typeof rankedData)[0]) {
		chartInteractions.openDrillDown({
			type: 'payee', // or 'category'
			value: item.id,
			label: `${item.label} Transactions`
		});
	}

	const hasData = $derived(rankedData.length > 0);
</script>

<AnalyticsChartShell
	data={rankedData}
	supportedChartTypes={['horizontal-bar']}
	defaultChartType="horizontal-bar"
	chartId={CHART_ID}
>
	{#snippet title()}
		{Chart Title}
	{/snippet}

	{#snippet subtitle()}
		Top {MAX_ITEMS} by total amount
	{/snippet}

	{#snippet chart({ data })}
		{#if hasData}
			<LayerCake
				{data}
				x="value"
				y="label"
				xScale={scaleLinear()}
				yScale={scaleBand().padding(0.2)}
				padding={{ top: 10, right: 100, bottom: 30, left: 120 }}
			>
				<Svg>
					<AxisX ticks={5} format={(d) => currencyFormatter.format(d)} />
					<HorizontalBar onclick={handleBarClick} />
					<HorizontalBarLabels format={(d) => currencyFormatter.format(d.value)} />
				</Svg>
			</LayerCake>
		{:else}
			<div class="flex h-full items-center justify-center">
				<p class="text-muted-foreground">No data available</p>
			</div>
		{/if}
	{/snippet}
</AnalyticsChartShell>
```

---

### Grouped/Stacked Bar Chart Template

For comparison charts like year-over-year, income vs expenses.

```svelte
<script lang="ts">
	import { currencyFormatter } from '$lib/utils/formatters';
	import type { TransactionsFormat } from '$lib/types';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { LayerCake, Svg, Html } from 'layercake';
	import { scaleBand, scaleLinear } from 'd3-scale';
	import { AnalyticsChartShell } from '$lib/components/charts';
	import { GroupedBar, StackedBar, AxisX, AxisY, InteractiveLegend } from '$lib/components/layercake';
	import { extractDateString } from '$lib/utils/date-formatters';

	interface Props {
		transactions: TransactionsFormat[];
	}

	let { transactions }: Props = $props();

	const CHART_ID = '{chart-id}';

	type ViewMode = 'grouped' | 'stacked';
	let viewMode = $state<ViewMode>('grouped');

	const keys = ['series1', 'series2']; // Customize series keys
	const colors = ['var(--chart-1)', 'var(--chart-2)'];

	const effectivePeriod = $derived(timePeriodFilter.getEffectivePeriod(CHART_ID));

	// Transform to grouped data structure
	const chartData = $derived.by(() => {
		const byGroup = new Map<string, Record<string, number>>();

		for (const tx of transactions) {
			const dateStr = extractDateString(tx.date);
			if (!dateStr) continue;

			// Filter by period
			const txDate = new Date(dateStr);
			if (effectivePeriod.start && effectivePeriod.end) {
				if (txDate < effectivePeriod.start || txDate > effectivePeriod.end) continue;
			}

			// Customize grouping logic
			const groupKey = dateStr.slice(0, 7); // YYYY-MM

			const existing = byGroup.get(groupKey) || { group: groupKey };
			// Customize series assignment
			if (tx.amount > 0) {
				existing.series1 = (existing.series1 || 0) + tx.amount;
			} else {
				existing.series2 = (existing.series2 || 0) + Math.abs(tx.amount);
			}
			byGroup.set(groupKey, existing);
		}

		return Array.from(byGroup.values()).sort((a, b) => a.group.localeCompare(b.group));
	});

	let hoveredItem = $state<{ item: any; key: string } | null>(null);

	function handleBarDblClick(item: any, key: string) {
		chartInteractions.openDrillDown({
			type: 'month',
			value: item.group,
			label: `${item.group} - ${key}`
		});
	}

	const hasData = $derived(chartData.length > 0);
</script>

<AnalyticsChartShell
	data={chartData}
	supportedChartTypes={['grouped-bar', 'stacked-bar']}
	defaultChartType="grouped-bar"
	chartId={CHART_ID}
	bind:chartType={viewMode}
>
	{#snippet title()}
		{Chart Title}
	{/snippet}

	{#snippet subtitle()}
		{Chart description}
	{/snippet}

	{#snippet chart({ data, chartType })}
		{#if hasData}
			<LayerCake
				{data}
				x="group"
				xScale={scaleBand().padding(0.2)}
				yScale={scaleLinear()}
				padding={{ top: 20, right: 20, bottom: 40, left: 60 }}
			>
				<Svg>
					<AxisY ticks={5} gridlines={true} format={(d) => currencyFormatter.format(d)} />
					<AxisX />

					{#if chartType === 'stacked'}
						<StackedBar
							{keys}
							{colors}
							onhover={(item, key) => (hoveredItem = { item, key })}
							onleave={() => (hoveredItem = null)}
							ondblclick={handleBarDblClick}
						/>
					{:else}
						<GroupedBar
							{keys}
							{colors}
							onhover={(item, key) => (hoveredItem = { item, key })}
							onleave={() => (hoveredItem = null)}
							ondblclick={handleBarDblClick}
						/>
					{/if}
				</Svg>

				<Html>
					<InteractiveLegend {keys} {colors} />

					{#if hoveredItem}
						<div
							class="pointer-events-none absolute rounded-md border bg-popover px-3 py-2 text-sm shadow-md"
							style="left: 50%; top: 10px; transform: translateX(-50%);"
						>
							<p class="font-medium">{hoveredItem.item.group} - {hoveredItem.key}</p>
							<p class="text-primary text-lg font-semibold">
								{currencyFormatter.format(hoveredItem.item[hoveredItem.key] || 0)}
							</p>
						</div>
					{/if}
				</Html>
			</LayerCake>
		{:else}
			<div class="flex h-full items-center justify-center">
				<p class="text-muted-foreground">No data available</p>
			</div>
		{/if}
	{/snippet}
</AnalyticsChartShell>
```

---

## Pattern References

### Gold Standard Implementation

**File:** `src/routes/accounts/[slug]/(components)/(charts)/savings-rate-chart.svelte`

Has ALL features:
- Point selection with ChartSelectionPanel
- Drill-down via chartInteractions
- All 6 analysis overlays (trend, forecast, historical avg, percentile bands, moving avg, YoY)
- Brush-controlled tooltip
- Comprehensive statistics

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/components/charts/analytics-chart-shell.svelte` | Shell wrapper with tabs |
| `src/lib/components/charts/time-series-chart-base.svelte` | Base for time series |
| `src/lib/components/charts/analysis-dropdown.svelte` | Overlay toggle menu |
| `src/lib/components/charts/chart-selection-panel.svelte` | Selected points panel |
| `src/lib/states/ui/chart-interactions.svelte.ts` | Drill-down state |
| `src/lib/states/ui/chart-selection.svelte.ts` | Selection state |
| `src/lib/utils/chart-statistics.ts` | Statistical calculations |
| `src/lib/utils/date-formatters.ts` | Date formatting utilities |
| `src/lib/utils/comprehensive-statistics.ts` | Statistics tab data |

### LayerCake Components

| Component | Use Case |
|-----------|----------|
| `Line` | Single-series line chart |
| `Area` | Filled area under line |
| `Bar` | Vertical bars |
| `HorizontalBar` | Horizontal bars (rankings) |
| `GroupedBar` | Multiple series side-by-side |
| `StackedBar` | Stacked series |
| `StackedArea` | Stacked area (composition) |
| `Scatter` | Point cloud |
| `Radar` | Radar/spider chart |
| `CalendarHeatmap` | Calendar grid |
| `Beeswarm` | Distribution as points |
| `BoxPlot` | Statistical box plot |
| `AxisX`, `AxisY` | Chart axes |
| `Brush` | Interactive selection |
| `Tooltip`, `MultiTooltip` | Hover information |
| `PercentileBands` | P25-P75 shaded region |
| `TrendDots` | Trend line endpoints |
| `HorizontalLine` | Reference line |

---

## Example Outputs

### New Chart Creation

```
## Created Chart: spending-by-payee-chart

File: `src/routes/accounts/[slug]/(components)/(charts)/spending-by-payee-chart.svelte`

Features included:
- Time period filtering via timePeriodFilter
- AnalyticsChartShell wrapper with Overview/Statistics tabs
- Point selection with chartSelection
- Drill-down with chartInteractions
- Analysis overlays (trend, historical avg, percentile bands)
- Brush-controlled tooltip

### Next Steps

1. Import the chart in analytics-dashboard.svelte
2. Customize the data transformation logic
3. Adjust the title and subtitle
4. Test with `/chart list` to verify feature matrix
```

### Add Feature

```
## Added Drill-Down to payee-trends-chart

Changes made:
1. Added import: `import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';`
2. Added handler:
   ```typescript
   function handlePointDblClick(point) {
     chartInteractions.openDrillDown({
       type: 'payee',
       value: point.payeeId,
       label: `${point.payeeName} Transactions`
     });
   }
   ```
3. Wired ondblclick to Line component

Test by double-clicking on a data point to open transaction drill-down sheet.
```

$ARGUMENTS
