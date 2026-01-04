<script lang="ts">
import { AxisX, AxisY, MultiArea, MultiLine, MultiTooltip, Brush, InteractiveLegend, HorizontalLine, CustomLine, PercentileBands, type ChartType } from '$lib/components/layercake';
import { AnalysisDropdown, ChartOverlays } from '$lib/components/charts';
import type { TransactionsFormat } from '$lib/types';
import { monthYearFmt, monthYearShortFmt } from '$lib/utils/date-formatters';
import { timezone } from '$lib/utils/dates';
import { currencyFormatter } from '$lib/utils/formatters';
import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
import { calculateLinearTrend, calculateHistoricalAverage, calculatePercentileBands, type TrendLineData, type PercentileBands as PercentileBandsData } from '$lib/utils/chart-statistics';
import { calculateComprehensiveStatsForDualSeries } from '$lib/utils/comprehensive-statistics';
import { LayerCake, Svg } from 'layercake';
import { AnalyticsChartShell } from '$lib/components/charts';

interface Props {
  transactions: TransactionsFormat[];
}

let { transactions }: Props = $props();

// Toggle states for analysis overlays
let showLinearTrend = $state(false);
let showForecast = $state(false);
let showHistoricalAvg = $state(false);
let showPercentileBands = $state(false);

// Access effective time period for this chart
const effectivePeriod = $derived(timePeriodFilter.getEffectivePeriod('income-vs-expenses'));

// Transform transaction data into monthly income vs expenses
const allMonthlyData = $derived.by(() => {
  if (!transactions?.length) return [];

  // Group transactions by month and separate income/expenses
  const monthlyData: Array<{
    month: string;
    monthDisplay: string;
    income: number;
    expenses: number;
    monthLabel: string;
    date: Date;
    index: number;
  }> = [];
  const seenMonths = new Set<string>();

  transactions.forEach((transaction) => {
    const monthKey = `${transaction.date.year}-${String(transaction.date.month).padStart(2, '0')}`; // YYYY-MM format

    // If we haven't seen this month yet, create a new entry
    if (!seenMonths.has(monthKey)) {
      const monthLabel = monthYearFmt.format(transaction.date.toDate(timezone));
      const monthDisplay = monthYearShortFmt.format(transaction.date.toDate(timezone));
      const [year, month] = monthKey.split('-');
      const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1, 12, 0, 0));
      monthlyData.push({
        month: monthKey,
        monthDisplay,
        income: 0,
        expenses: 0,
        monthLabel,
        date,
        index: 0,
      });
      seenMonths.add(monthKey);
    }

    // Find existing entry and add to appropriate category
    const existing = monthlyData.find((item) => item.month === monthKey)!;
    if (transaction.amount >= 0) {
      existing.income += transaction.amount;
    } else {
      existing.expenses += Math.abs(transaction.amount);
    }
  });

  // Sort by month and add index for chart positioning
  return monthlyData
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((item, idx) => ({
      ...item,
      index: idx,
    }));
});

// Filter data based on time period
const chartData = $derived.by(() => {
  const period = effectivePeriod;

  if (period.preset !== 'all-time') {
    const range = timePeriodFilter.getDateRange(period);
    if (range) {
      const filtered = allMonthlyData.filter((item) => {
        return item.date >= range.start && item.date <= range.end;
      });
      // Recalculate indices after filtering
      return filtered.map((item, idx) => ({
        ...item,
        index: idx,
      }));
    }
  }

  return allMonthlyData;
});

// ===== Analysis Overlay Computed Data =====

// Linear regression line for expenses (least squares fit)
const expenseTrendData = $derived.by((): TrendLineData | null => {
  if (!showLinearTrend || chartData.length < 2) return null;
  const spendingData = chartData.map(d => ({ ...d, spending: d.expenses }));
  return calculateLinearTrend(spendingData);
});

// Linear regression line for income
const incomeTrendData = $derived.by((): TrendLineData | null => {
  if (!showLinearTrend || chartData.length < 2) return null;
  const spendingData = chartData.map(d => ({ ...d, spending: d.income }));
  return calculateLinearTrend(spendingData);
});

// Historical averages (across ALL data)
const historicalAvgExpenses = $derived.by((): number | null => {
  if (!showHistoricalAvg || allMonthlyData.length === 0) return null;
  const spendingData = allMonthlyData.map(d => ({ spending: d.expenses }));
  return calculateHistoricalAverage(spendingData);
});

const historicalAvgIncome = $derived.by((): number | null => {
  if (!showHistoricalAvg || allMonthlyData.length === 0) return null;
  const spendingData = allMonthlyData.map(d => ({ spending: d.income }));
  return calculateHistoricalAverage(spendingData);
});

// Percentile bands for expenses (across ALL data)
const expensePercentileBands = $derived.by((): PercentileBandsData | null => {
  if (!showPercentileBands || allMonthlyData.length < 4) return null;
  const spendingData = allMonthlyData.map(d => ({ ...d, spending: d.expenses }));
  return calculatePercentileBands(spendingData);
});

// Compute yDomain max including overlays
const chartYMax = $derived.by((): number | null => {
  if (!chartData.length) return null;

  let maxValue = Math.max(...chartData.flatMap((d) => [d.income, d.expenses]));

  // Include historical averages in y-domain
  if (showHistoricalAvg) {
    if (historicalAvgExpenses !== null && historicalAvgExpenses > maxValue) {
      maxValue = historicalAvgExpenses;
    }
    if (historicalAvgIncome !== null && historicalAvgIncome > maxValue) {
      maxValue = historicalAvgIncome;
    }
  }

  // Include percentile bands (p75) in y-domain
  if (showPercentileBands && expensePercentileBands && expensePercentileBands.p75 > maxValue) {
    maxValue = expensePercentileBands.p75;
  }

  // Add 10% padding
  return maxValue * 1.1;
});

// Summary statistics for the shell component
const summaryStats = $derived.by(() => {
  if (!chartData.length) {
    return [
      { label: 'Avg Monthly Income', value: '$0.00' },
      { label: 'Avg Monthly Expenses', value: '$0.00' },
      { label: 'Net Income', value: '$0.00' },
      { label: 'Income Ratio', value: '0%' },
    ];
  }

  const totalIncome = chartData.reduce((sum, d) => sum + d.income, 0);
  const totalExpenses = chartData.reduce((sum, d) => sum + d.expenses, 0);
  const netIncome = totalIncome - totalExpenses;
  const avgMonthlyIncome = totalIncome / chartData.length;
  const avgMonthlyExpenses = totalExpenses / chartData.length;

  const incomeRatio =
    avgMonthlyExpenses > 0 ? ((avgMonthlyIncome / avgMonthlyExpenses) * 100).toFixed(0) + '%' : '∞';

  return [
    {
      label: 'Avg Monthly Income',
      value: currencyFormatter.format(avgMonthlyIncome),
    },
    {
      label: 'Avg Monthly Expenses',
      value: currencyFormatter.format(avgMonthlyExpenses),
    },
    {
      label: 'Net Income',
      value: currencyFormatter.format(netIncome),
      description: `${chartData.length} months`,
    },
    {
      label: 'Income Ratio',
      value: incomeRatio,
    },
  ];
});

// Comprehensive statistics for the Statistics tab
const comprehensiveStats = $derived.by(() => {
  if (!chartData.length) return null;

  // Transform data to dual-series format
  const dualSeriesData = chartData.map(d => ({
    month: d.month,
    monthLabel: d.monthLabel,
    income: d.income,
    expenses: d.expenses,
    date: d.date,
  }));

  return calculateComprehensiveStatsForDualSeries(dualSeriesData);
});

// Count active analysis overlays for badge
const activeAnalysisCount = $derived(
  (showLinearTrend ? 1 : 0) +
  (showForecast ? 1 : 0) +
  (showHistoricalAvg ? 1 : 0) +
  (showPercentileBands ? 1 : 0)
);

// Drill-down handler for viewing transactions in a specific month
function handlePointDblClick(point: { month: string; monthLabel: string }) {
  chartInteractions.openDrillDown({
    type: 'month',
    value: point.month,
    label: `${point.monthLabel} Transactions`
  });
}
</script>

<AnalyticsChartShell
  data={chartData}
  comprehensiveStats={comprehensiveStats ? {
    summary: {
      average: comprehensiveStats.netFlow.average,
      median: 0,
      total: comprehensiveStats.netFlow.total,
      count: chartData.length
    },
    trend: {
      direction: comprehensiveStats.income.trend,
      growthRate: null,
      slope: 0,
      monthlyChange: 0
    },
    distribution: {
      highest: { value: comprehensiveStats.income.highest.value, month: '', monthLabel: comprehensiveStats.income.highest.month },
      lowest: { value: comprehensiveStats.expenses.highest.value, month: '', monthLabel: comprehensiveStats.expenses.highest.month },
      range: 0,
      p25: 0,
      p50: 0,
      p75: 0,
      iqr: 0,
      stdDev: 0,
      coefficientOfVariation: 0
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
  } : null}
  supportedChartTypes={['line', 'line-area', 'area']}
  defaultChartType="line"
  emptyMessage="Add some transactions to see income vs expense trends"
  chartId="income-vs-expenses"
  allowedPeriodGroups={['months', 'year', 'other']}
>
  {#snippet title()}
    Income vs Expenses
  {/snippet}

  {#snippet subtitle()}
    Monthly comparison of income and expense patterns
  {/snippet}

  {#snippet headerActions()}
    <AnalysisDropdown
      bind:showLinearTrend
      bind:showForecast
      bind:showHistoricalAvg
      bind:showPercentileBands
      forecastEnabled={false}
    />
  {/snippet}

  {#snippet chart({ data, chartType }: { data: typeof chartData; chartType: ChartType })}
    {@const series = [
      { key: 'income', color: 'var(--chart-2)', label: 'Income' },
      { key: 'expenses', color: 'var(--chart-1)', label: 'Expenses' },
    ]}
    {@const incomeHidden = chartInteractions.hiddenSeries.has('income')}
    {@const expensesHidden = chartInteractions.hiddenSeries.has('expenses')}
    {@const incomeHighlighted = chartInteractions.highlightedItem === 'income'}
    {@const expensesHighlighted = chartInteractions.highlightedItem === 'expenses'}
    {@const anyHighlighted = chartInteractions.highlightedItem !== null}
    <div class="flex h-full w-full flex-col gap-3 pb-20">
      <InteractiveLegend items={series} direction="horizontal" />
      <div class="h-full min-h-0 flex-1">
        <LayerCake
          {data}
          x="index"
          y="income"
          yDomain={[0, chartYMax]}
          padding={{ top: 10, right: 15, bottom: 30, left: 55 }}
        >
          <Svg>
            <AxisY ticks={5} gridlines={true} format={(d) => currencyFormatter.format(d)} />
            <AxisX
              ticks={Math.min(data.length, 6)}
              format={(d) => {
                const idx = typeof d === 'number' ? Math.round(d) : 0;
                const point = data[idx];
                if (!point) return '';
                return point.monthDisplay;
              }}
            />

            <!-- ===== Analysis Overlays (rendered first, below main data) ===== -->

            <!-- Percentile bands for expenses (25th-75th shaded area) -->
            {#if showPercentileBands && expensePercentileBands}
              <PercentileBands
                p25={expensePercentileBands.p25}
                p75={expensePercentileBands.p75}
                fill="var(--chart-1)"
                opacity={0.1}
              />
            {/if}

            <!-- Historical average lines -->
            {#if showHistoricalAvg && historicalAvgIncome !== null && !incomeHidden}
              <HorizontalLine
                value={historicalAvgIncome}
                stroke="var(--chart-2)"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                label="Avg Income"
              />
            {/if}
            {#if showHistoricalAvg && historicalAvgExpenses !== null && !expensesHidden}
              <HorizontalLine
                value={historicalAvgExpenses}
                stroke="var(--chart-1)"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                label="Avg Expenses"
              />
            {/if}

            <!-- Linear regression lines -->
            {#if showLinearTrend && incomeTrendData && !incomeHidden}
              <CustomLine
                data={incomeTrendData.data}
                stroke="var(--chart-2)"
                strokeWidth={2}
                strokeDasharray="8 4"
                opacity={0.7}
              />
            {/if}
            {#if showLinearTrend && expenseTrendData && !expensesHidden}
              <CustomLine
                data={expenseTrendData.data}
                stroke="var(--chart-1)"
                strokeWidth={2}
                strokeDasharray="8 4"
                opacity={0.7}
              />
            {/if}

            <!-- Main chart data -->
            {#if chartType === 'line'}
              {#if !incomeHidden}
                <MultiLine y="income" stroke={series[0].color} strokeWidth={2} opacity={anyHighlighted && !incomeHighlighted ? 0.3 : 1} />
              {/if}
              {#if !expensesHidden}
                <MultiLine y="expenses" stroke={series[1].color} strokeWidth={2} opacity={anyHighlighted && !expensesHighlighted ? 0.3 : 1} />
              {/if}
            {:else if chartType === 'line-area'}
              {#if !incomeHidden}
                <MultiArea y="income" fill={series[0].color} opacity={anyHighlighted && !incomeHighlighted ? 0.05 : 0.1} />
                <MultiLine y="income" stroke={series[0].color} strokeWidth={2} opacity={anyHighlighted && !incomeHighlighted ? 0.3 : 1} />
              {/if}
              {#if !expensesHidden}
                <MultiArea y="expenses" fill={series[1].color} opacity={anyHighlighted && !expensesHighlighted ? 0.05 : 0.1} />
                <MultiLine y="expenses" stroke={series[1].color} strokeWidth={2} opacity={anyHighlighted && !expensesHighlighted ? 0.3 : 1} />
              {/if}
            {:else if chartType === 'area'}
              {#if !incomeHidden}
                <MultiArea y="income" fill={series[0].color} opacity={anyHighlighted && !incomeHighlighted ? 0.1 : 0.3} />
              {/if}
              {#if !expensesHidden}
                <MultiArea y="expenses" fill={series[1].color} opacity={anyHighlighted && !expensesHighlighted ? 0.1 : 0.3} />
              {/if}
            {/if}

            <Brush
              onbrush={(range) => {
                if (range && range.start instanceof Date && range.end instanceof Date) {
                  chartInteractions.setDateRange(range.start, range.end);
                } else {
                  chartInteractions.clearDateRange();
                }
              }}
            />
            <MultiTooltip {series} ondblclick={(point) => handlePointDblClick(point)}>
              {#snippet children({ point, x })}
                <foreignObject
                  x={Math.min(x + 10, 160)}
                  y={10}
                  width="160"
                  height="100"
                >
                  <div class="rounded-md border bg-popover px-3 py-1.5 text-sm shadow-md">
                    <p class="font-medium">{point.monthLabel}</p>
                    {#if !incomeHidden}
                      <p style="color: {series[0].color}">Income: {currencyFormatter.format(point.income)}</p>
                    {/if}
                    {#if !expensesHidden}
                      <p style="color: {series[1].color}">Expenses: {currencyFormatter.format(point.expenses)}</p>
                    {/if}
                    <p class="text-muted-foreground mt-1 border-t pt-1 text-xs">Double-click for details</p>
                  </div>
                </foreignObject>
              {/snippet}
            </MultiTooltip>
          </Svg>
        </LayerCake>
      </div>
    </div>
  {/snippet}
</AnalyticsChartShell>
