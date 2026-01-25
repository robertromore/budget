<script lang="ts">
import { Area, AxisX, AxisY, Bar, Brush, CustomLine, HorizontalLine, Line, PercentileBands, Scatter, Tooltip, TrendDots, type ChartType } from '$lib/components/layercake';
import { ChartSelectionPanel } from '$lib/components/charts';
import { Button } from '$lib/components/ui/button';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import { getByAccount } from '$lib/query/budgets';
import { getMonthlySpendingAggregates, getMonthlySpendingForecast } from '$lib/query/transactions';
import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
import { chartSelection, type SelectedDataPoint } from '$lib/states/ui/chart-selection.svelte';
import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
import { currencyFormatter, formatPercentRaw } from '$lib/utils/formatters';
import { calculateLinearTrend, calculateHistoricalAverage, calculatePercentileBands, getTrendValueAtIndex, type TrendLineData, type PercentileBands as PercentileBandsData } from '$lib/utils/chart-statistics';
import { calculateComprehensiveStats } from '$lib/utils/comprehensive-statistics';
import { toDateString } from '$lib/utils/date-formatters';
import { LayerCake, Svg } from 'layercake';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import { AnalyticsChartShell } from '$lib/components/charts';

interface Props {
  accountId: number;
  slug?: string;
}

let { accountId, slug }: Props = $props();

// Toggle states for overlays - existing
let showComparison = $state(false);
let showTrendLine = $state(false);
let showBudgetLine = $state(true);

// Toggle states for analysis overlays - new
let showLinearTrend = $state(false);
let showForecast = $state(false);
let showHistoricalAvg = $state(false);
let showPercentileBands = $state(false);

// Brush hover position for Tooltip crosshair
let brushHoverX = $state<number | null>(null);

// Fetch monthly spending aggregates from dedicated endpoint
// svelte-ignore state_referenced_locally
const monthlySpendingQuery = getMonthlySpendingAggregates(accountId).options();

// Fetch budgets for this account to get monthly target
// svelte-ignore state_referenced_locally
const budgetsQuery = getByAccount(accountId).options();

// Fetch forecast data (enabled when showForecast toggle is on)
// svelte-ignore state_referenced_locally
const forecastQuery = getMonthlySpendingForecast(accountId, 3).options(() => ({
  enabled: showForecast
}));

// Get monthly budget target from budgets
const budgetTarget = $derived.by(() => {
  const budgets = budgetsQuery.data;
  if (!budgets?.length) return null;

  // Find a budget linked to this account (account-monthly or category-envelope types)
  const linkedBudget = budgets.find((b) => b.type === 'account-monthly' || b.type === 'category-envelope');
  if (!linkedBudget) return null;

  // Find a monthly period template
  const monthlyTemplate = linkedBudget.periodTemplates?.find((t) => t.type === 'monthly');
  if (!monthlyTemplate) return null;

  // Get the current period instance (most recent or the one containing today's date)
  const today = toDateString(new Date());
  const currentPeriod = monthlyTemplate.periods?.find(
    (p) => p.startDate <= today && p.endDate >= today
  );

  // Fallback to the most recent period if no current one
  const period = currentPeriod || monthlyTemplate.periods?.[monthlyTemplate.periods.length - 1];
  return period?.allocatedAmount ?? null;
});

// Helper function to get color based on budget status
function getStatusColor(d: { spending: number }): string {
  if (!budgetTarget) return 'var(--chart-1)';
  const ratio = d.spending / budgetTarget;
  if (ratio > 1) return 'var(--destructive)';
  if (ratio > 0.8) return 'var(--chart-4)'; // amber/warning
  return 'var(--chart-3)'; // green/success
}

// Convert a data point to SelectedDataPoint format
function toSelectedPoint(d: { month: string; monthLabel: string; date: Date; spending: number }): SelectedDataPoint {
  return {
    id: d.month,
    label: d.monthLabel,
    date: d.date,
    value: d.spending,
    accountId: accountId,
    accountSlug: slug,
    rawData: d as Record<string, unknown>
  };
}

// Handle click on data point - click to select, double-click for drill-down
function handlePointClick(d: { month: string; monthLabel: string; date: Date; spending: number }, event: MouseEvent) {
  // Toggle selection on click
  chartSelection.toggle(toSelectedPoint(d));
}

// Handle double-click for drill-down
function handlePointDblClick(d: { month: string; monthLabel: string }) {
  chartInteractions.openDrillDown({
    type: 'month',
    value: d.month,
    label: `${d.monthLabel} Transactions`
  });
}

// Handle brush selection - select all points within the brushed range (uses indices now)
function handleBrushSelect(range: { start: Date | number; end: Date | number } | null) {
  if (!range) {
    // Brush cleared - don't clear selection (let user do that manually)
    return;
  }

  // Convert to numbers (indices) - when using index-based x values, these are already numbers
  const startIdx = typeof range.start === 'number' ? range.start : 0;
  const endIdx = typeof range.end === 'number' ? range.end : 0;

  // Find all data points within the brush range (indices)
  const pointsInRange = filteredMonthlyData.filter((d) => {
    return d.index >= startIdx && d.index <= endIdx;
  });

  if (pointsInRange.length > 0) {
    // Convert to SelectedDataPoint format and select them all
    const selectedPoints = pointsInRange.map(toSelectedPoint);
    chartSelection.selectRange(selectedPoints);
  }
}

// Handle click from brush - find nearest point and toggle selection (uses indices now)
function handleBrushClick(_x: number, clickValue: Date | number) {
  // Convert to number (index)
  const clickIndex = typeof clickValue === 'number' ? clickValue : 0;

  // Find the nearest data point to the click position
  let nearestPoint = filteredMonthlyData[0];
  let minDistance = Infinity;

  for (const point of filteredMonthlyData) {
    const distance = Math.abs(point.index - clickIndex);
    if (distance < minDistance) {
      minDistance = distance;
      nearestPoint = point;
    }
  }

  if (nearestPoint) {
    // Toggle selection on the nearest point
    chartSelection.toggle(toSelectedPoint(nearestPoint));
  }
}

// Access effective time period for this chart (checks for per-chart override first)
const effectivePeriod = $derived(timePeriodFilter.getEffectivePeriod('monthly-spending'));

// Transform API data into chart format
const monthlySpendingData = $derived.by(() => {
  const response = monthlySpendingQuery.data;
  if (!response?.months?.length) return [];

  return response.months.map((item, idx) => {
    // Convert month string (YYYY-MM) to Date object (kept for filtering/comparisons)
    // Use UTC noon to avoid timezone boundary issues when formatting
    const [year, month] = item.month.split('-');
    const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1, 12, 0, 0));

    // Short label format: "Jun '25"
    const shortLabel = item.monthLabel
      .split(' ')
      .map((word: string, i: number) => (i === 0 ? word.slice(0, 3) : `'${word.slice(-2)}`))
      .join(' ');

    return {
      month: item.month,
      monthDisplay: item.monthLabel
        .split(' ')
        .map((word: string, i: number) => (i === 0 ? word.slice(0, 3) : word.slice(-2)))
        .join(' '),
      spending: item.spending,
      monthLabel: item.monthLabel,
      shortLabel: shortLabel,
      transactionCount: item.transactionCount,
      previousYearSpending: item.previousYearSpending,
      changeFromPrevious: item.changeFromPrevious,
      topCategories: item.topCategories,
      date: date,
      // Index-based positioning for even spacing (will be recalculated after filtering)
      index: idx,
      x: idx,
      y: item.spending,
    };
  });
});

// Helper to generate all months in a date range
function generateAllMonthsInRange(start: Date, end: Date): string[] {
  const months: string[] = [];
  const startYear = start.getUTCFullYear();
  const startMonth = start.getUTCMonth();
  const endYear = end.getUTCFullYear();
  const endMonth = end.getUTCMonth();

  let year = startYear;
  let month = startMonth;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month + 1).padStart(2, '0')}`);
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }

  return months;
}

// Helper to create a placeholder month data point
function createPlaceholderMonth(monthStr: string) {
  const [year, month] = monthStr.split('-');
  const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1, 12, 0, 0));

  // Generate labels
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = monthNames[parseInt(month) - 1];
  const shortMonth = monthName.slice(0, 3);

  return {
    month: monthStr,
    monthDisplay: `${shortMonth} ${year.slice(-2)}`,
    spending: 0,
    monthLabel: `${monthName} ${year}`,
    shortLabel: `${shortMonth} '${year.slice(-2)}`,
    transactionCount: 0,
    previousYearSpending: null,
    changeFromPrevious: null,
    topCategories: [],
    date: date,
    index: 0,
    x: 0,
    y: 0,
  };
}

// Filter monthly data based on time period and recalculate indices for even spacing
const filteredMonthlyData = $derived.by(() => {
  const period = effectivePeriod;

  // Create a map of actual data by month for quick lookup
  const dataByMonth = new Map<string, typeof monthlySpendingData[0]>();
  for (const item of monthlySpendingData) {
    dataByMonth.set(item.month, item);
  }

  if (period.preset !== 'all-time') {
    const range = timePeriodFilter.getDateRange(period);
    if (range) {
      // Generate all months in the range (including empty ones)
      const allMonthsInRange = generateAllMonthsInRange(range.start, range.end);

      // Map each month to either actual data or placeholder
      const result = allMonthsInRange.map((monthStr, idx) => {
        const actualData = dataByMonth.get(monthStr);
        if (actualData) {
          return {
            ...actualData,
            index: idx,
            x: idx,
          };
        }
        // Create placeholder for missing month
        const placeholder = createPlaceholderMonth(monthStr);
        return {
          ...placeholder,
          index: idx,
          x: idx,
        };
      });

      return result;
    }
  }

  // For 'all-time', return only actual data (no placeholders needed)
  return monthlySpendingData.map((item, idx) => ({
    ...item,
    index: idx,
    x: idx,
  }));
});

// Create month-to-index lookup from filtered data for overlay alignment
const monthToIndexMap = $derived.by((): Map<string, number> => {
  const map = new Map<string, number>();
  for (const d of filteredMonthlyData) {
    map.set(d.month, d.index);
  }
  return map;
});

// Transform rolling average data - align to filtered data indices
const rollingAverageData = $derived.by(() => {
  const response = monthlySpendingQuery.data;
  if (!response?.rollingAverage?.length) return [];

  // Only include rolling average points that have corresponding filtered data
  return response.rollingAverage
    .filter((item) => monthToIndexMap.has(item.month))
    .map((item) => {
      const index = monthToIndexMap.get(item.month)!;
      return {
        month: item.month,
        average: item.average,
        index: index,
        x: index,
        y: item.average,
      };
    });
});

// Year-over-year comparison data (uses filtered data)
const comparisonData = $derived.by(() => {
  return filteredMonthlyData
    .filter((d) => d.previousYearSpending !== null)
    .map((d) => ({
      ...d,
      y: d.previousYearSpending,
    }));
});

// ===== Analysis Overlay Computed Data =====

// Linear regression line (least squares fit)
const linearTrendData = $derived.by((): TrendLineData | null => {
  if (!showLinearTrend || filteredMonthlyData.length < 2) return null;
  return calculateLinearTrend(filteredMonthlyData);
});

// Historical average (across ALL data, not just filtered)
const historicalAverage = $derived.by((): number | null => {
  if (!showHistoricalAvg || monthlySpendingData.length === 0) return null;
  return calculateHistoricalAverage(monthlySpendingData);
});

// Percentile bands (across ALL data for consistent reference)
const percentileBands = $derived.by((): PercentileBandsData | null => {
  if (!showPercentileBands || monthlySpendingData.length < 4) return null;
  return calculatePercentileBands(monthlySpendingData);
});

// Forecast data points for chart rendering - continue from last filtered data index
const forecastData = $derived.by(() => {
  if (!showForecast || !forecastQuery.data?.predictions?.length) return [];

  // Get the last data point to connect forecast
  const lastPoint = filteredMonthlyData[filteredMonthlyData.length - 1];
  if (!lastPoint) return [];

  const startIndex = lastPoint.index + 1;

  return forecastQuery.data.predictions.map((pred: { date: string; value: number; lowerBound: number; upperBound: number; confidence: number }, i: number) => {
    // Parse date (expected format: "YYYY-MM-DD" or "YYYY-MM")
    // Use UTC noon to avoid timezone boundary issues
    const dateStr = pred.date || '';
    let date: Date;

    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        date = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, 1, 12, 0, 0));
      } else {
        // Fallback: offset from last point using UTC
        const baseDate = lastPoint.date;
        date = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + i + 1, 1, 12, 0, 0));
      }
    } else {
      // Fallback: offset from last point using UTC
      const baseDate = lastPoint.date;
      date = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + i + 1, 1, 12, 0, 0));
    }

    // Generate short label for forecast month
    const month = date.toLocaleString('default', { month: 'short', timeZone: 'UTC' });
    const year = String(date.getUTCFullYear()).slice(-2);
    const shortLabel = `${month} '${year}`;

    const index = startIndex + i;
    return {
      date,
      shortLabel,
      index,
      x: index,
      y: pred.value,
      predicted: pred.value,
      lower: pred.lowerBound,
      upper: pred.upperBound,
      confidence: pred.confidence
    };
  });
});

// Compute xDomain using indices for even spacing
const chartXDomain = $derived.by((): [number, number] | undefined => {
  if (!filteredMonthlyData.length) return undefined;

  const minIndex = 0;
  let maxIndex = filteredMonthlyData.length - 1;

  // Extend domain to include forecast indices if enabled
  if (showForecast && forecastData.length > 0) {
    const lastForecastIndex = forecastData[forecastData.length - 1].index;
    if (lastForecastIndex > maxIndex) {
      maxIndex = lastForecastIndex;
    }
  }

  // Add small padding to prevent points from being at the very edge
  return [minIndex - 0.5, maxIndex + 0.5];
});

// Compute yDomain max that includes forecast values
const chartYMax = $derived.by((): number | null => {
  if (!filteredMonthlyData.length) return null;

  let maxValue = Math.max(...filteredMonthlyData.map(d => d.spending));

  // Include forecast values in y-domain if enabled
  if (showForecast && forecastData.length > 0) {
    const maxForecastValue = Math.max(...forecastData.map(d => d.upper || d.y));
    if (maxForecastValue > maxValue) {
      maxValue = maxForecastValue;
    }
  }

  // Include budget target in y-domain
  if (showBudgetLine && budgetTarget && budgetTarget > maxValue) {
    maxValue = budgetTarget;
  }

  // Include historical average in y-domain
  if (showHistoricalAvg && historicalAverage !== null && historicalAverage > maxValue) {
    maxValue = historicalAverage;
  }

  // Include percentile bands (p75) in y-domain
  if (showPercentileBands && percentileBands && percentileBands.p75 > maxValue) {
    maxValue = percentileBands.p75;
  }

  // Add 10% padding
  return maxValue * 1.1;
});

// Create a lookup map from index to display label for axis formatting
const indexToLabelMap = $derived.by((): Map<number, string> => {
  const map = new Map<number, string>();

  // Add all monthly data points
  for (const d of filteredMonthlyData) {
    map.set(d.index, d.shortLabel);
  }

  // Add forecast points
  if (showForecast && forecastData.length > 0) {
    for (const d of forecastData) {
      map.set(d.index, d.shortLabel);
    }
  }

  return map;
});

// Compute x-axis tick values (indices) that align with data points
const xAxisTickValues = $derived.by((): number[] => {
  if (!filteredMonthlyData.length) return [];

  // Get all data point indices
  const allIndices = filteredMonthlyData.map(d => d.index);

  // If we have forecast data, include those indices too
  if (showForecast && forecastData.length > 0) {
    forecastData.forEach(d => allIndices.push(d.index));
  }

  // Dynamic max ticks based on data length:
  // - 12 or fewer months: show all
  // - 13-18 months: show every other (6-9 labels)
  // - 19-24 months: show every 3rd (6-8 labels)
  // - 25+ months: show every 4th or fewer
  const count = allIndices.length;

  if (count <= 12) {
    // Show all labels for a year or less
    return allIndices;
  }

  // Calculate step to get ~6-8 labels
  let step: number;
  if (count <= 18) {
    step = 2; // Every other month
  } else if (count <= 24) {
    step = 3; // Every 3 months
  } else if (count <= 36) {
    step = 4; // Every 4 months
  } else {
    step = Math.ceil(count / 8); // Dynamic for very long ranges
  }

  // Sample at regular intervals, always including first and last
  const sampled: number[] = [];
  for (let i = 0; i < count; i += step) {
    sampled.push(allIndices[i]);
  }

  // Always include the last index if not already included
  const lastIndex = allIndices[count - 1];
  if (sampled[sampled.length - 1] !== lastIndex) {
    sampled.push(lastIndex);
  }

  return sampled;
});

// Summary statistics for the shell component (uses filtered data)
const summaryStats = $derived.by(() => {
  if (!filteredMonthlyData.length) {
    return [
      { label: 'Average Monthly', value: '$0.00' },
      { label: 'Highest', value: '$0.00' },
      { label: 'Lowest', value: '$0.00' },
      { label: 'Total', value: '$0.00' },
    ];
  }

  const amounts = filteredMonthlyData.map((d) => d.spending);
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  const average = total / amounts.length;
  const highest = Math.max(...amounts);
  const lowest = Math.min(...amounts);

  // Find which months had highest/lowest spending
  const highestMonth = filteredMonthlyData.find((d) => d.spending === highest)?.monthLabel;
  const lowestMonth = filteredMonthlyData.find((d) => d.spending === lowest)?.monthLabel;

  // Sum total transaction count
  const totalTransactions = filteredMonthlyData.reduce((sum, d) => sum + d.transactionCount, 0);

  // Get latest month's change from previous
  const latestChange = filteredMonthlyData[filteredMonthlyData.length - 1]?.changeFromPrevious;
  const changeIndicator = latestChange !== null && latestChange !== undefined
    ? `${latestChange > 0 ? '+' : ''}${formatPercentRaw(latestChange, 1)} vs prev`
    : undefined;

  return [
    {
      label: 'Average Monthly',
      value: currencyFormatter.format(average),
      description: changeIndicator,
    },
    {
      label: 'Highest',
      value: currencyFormatter.format(highest),
      description: highestMonth || undefined,
    },
    {
      label: 'Lowest',
      value: currencyFormatter.format(lowest),
      description: lowestMonth || undefined,
    },
    {
      label: 'Total',
      value: currencyFormatter.format(total),
      description: `${totalTransactions} transactions`,
    },
  ];
});

// Comprehensive statistics for the Statistics tab
const comprehensiveStats = $derived.by(() => {
  if (!filteredMonthlyData.length) return null;

  // Transform data to the format expected by calculateComprehensiveStats
  const filtered = filteredMonthlyData.map(d => ({
    month: d.month,
    monthLabel: d.monthLabel,
    spending: d.spending,
    date: d.date
  }));

  const allTime = monthlySpendingData.map(d => ({
    month: d.month,
    monthLabel: d.monthLabel,
    spending: d.spending,
    date: d.date
  }));

  // Calculate year-over-year total from last year's data
  const lastYearTotal = filteredMonthlyData.reduce((sum, d) => {
    return sum + (d.previousYearSpending ?? 0);
  }, 0) || null;

  return calculateComprehensiveStats(filtered, allTime, budgetTarget, lastYearTotal);
});

// Count active overlays for legend
const activeOverlays = $derived.by(() => {
  const overlays: Array<{ label: string; color: string; dashed?: boolean }> = [];
  if (showComparison && comparisonData.length > 0) {
    overlays.push({ label: 'Same month last year', color: 'var(--chart-4)', dashed: true });
  }
  if (showTrendLine && rollingAverageData.length > 0) {
    overlays.push({ label: '3-mo moving avg', color: 'var(--chart-2)' });
  }
  if (showBudgetLine && budgetTarget) {
    overlays.push({ label: 'Monthly budget', color: 'var(--chart-5)', dashed: true });
  }
  // Analysis overlays
  if (showLinearTrend && linearTrendData) {
    overlays.push({ label: `Regression (${linearTrendData.direction})`, color: 'var(--chart-4)', dashed: true });
  }
  if (showForecast && forecastData.length > 0) {
    overlays.push({ label: 'Forecast', color: 'var(--chart-2)', dashed: true });
  }
  if (showHistoricalAvg && historicalAverage !== null) {
    overlays.push({ label: 'Historical avg', color: 'var(--chart-6)', dashed: true });
  }
  if (showPercentileBands && percentileBands) {
    overlays.push({ label: '25th-75th percentile', color: 'var(--chart-3)' });
  }
  return overlays;
});

// Count active analysis overlays for badge
const activeAnalysisCount = $derived(
  (showLinearTrend ? 1 : 0) +
  (showForecast ? 1 : 0) +
  (showHistoricalAvg ? 1 : 0) +
  (showPercentileBands ? 1 : 0)
);
</script>

<AnalyticsChartShell
  loading={monthlySpendingQuery.isLoading}
  error={monthlySpendingQuery.error?.message}
  data={filteredMonthlyData}
  {comprehensiveStats}
  supportedChartTypes={['line-area', 'line', 'area', 'bar']}
  defaultChartType="line-area"
  emptyMessage="Add some expense transactions to see spending trends"
  chartId="monthly-spending"
  allowedPeriodGroups={['months', 'year', 'other']}
>
  {#snippet title()}
    Monthly Spending Trends
  {/snippet}

  {#snippet subtitle()}
    Expense patterns and analytics over time
  {/snippet}

  {#snippet headerActions()}
    <div class="flex gap-1">
      {#if comparisonData.length > 0}
        <Button
          variant={showComparison ? 'default' : 'ghost'}
          size="sm"
          onclick={() => (showComparison = !showComparison)}
        >
          vs Last Year
        </Button>
      {/if}
      {#if rollingAverageData.length > 0}
        <Button
          variant={showTrendLine ? 'default' : 'ghost'}
          size="sm"
          onclick={() => (showTrendLine = !showTrendLine)}
        >
          Average
        </Button>
      {/if}
      {#if budgetTarget}
        <Button
          variant={showBudgetLine ? 'default' : 'ghost'}
          size="sm"
          onclick={() => (showBudgetLine = !showBudgetLine)}
        >
          Budget
        </Button>
      {/if}

      <!-- Analysis dropdown menu -->
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button {...props} variant={activeAnalysisCount > 0 ? 'default' : 'ghost'} size="sm" class="gap-1">
              <TrendingUp class="h-4 w-4" />
              Analysis
              {#if activeAnalysisCount > 0}
                <span class="ml-1 rounded-full bg-primary-foreground/20 px-1.5 text-xs">{activeAnalysisCount}</span>
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
          <DropdownMenu.CheckboxItem bind:checked={showForecast}>
            <span class="flex items-center gap-2">
              <span class="h-0.5 w-3" style="background: repeating-linear-gradient(90deg, var(--chart-2) 0px, var(--chart-2) 2px, transparent 2px, transparent 4px);"></span>
              Forecast (3 months)
            </span>
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.CheckboxItem bind:checked={showHistoricalAvg}>
            <span class="flex items-center gap-2">
              <span class="h-0.5 w-3" style="background: repeating-linear-gradient(90deg, var(--chart-6) 0px, var(--chart-6) 3px, transparent 3px, transparent 6px);"></span>
              Historical Average
            </span>
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.CheckboxItem bind:checked={showPercentileBands}>
            <span class="flex items-center gap-2">
              <span class="h-2 w-3 rounded-sm opacity-30" style="background-color: var(--chart-3);"></span>
              Percentile Bands
            </span>
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  {/snippet}

  {#snippet chart({ data, chartType }: { data: typeof filteredMonthlyData; chartType: ChartType })}
    <div class="h-full w-full pb-20">
      <LayerCake
        data={data}
        x="index"
        y="spending"
        xDomain={chartXDomain}
        yDomain={[0, chartYMax]}
        padding={{ top: 10, right: 15, bottom: 30, left: 55 }}
      >
        <Svg>
          <AxisY ticks={5} gridlines={true} format={(d) => currencyFormatter.format(d)} />
          <AxisX
            tickValues={xAxisTickValues}
            format={(d) => {
              // Look up label by index
              const index = typeof d === 'number' ? d : 0;
              return indexToLabelMap.get(index) ?? '';
            }}
          />

          <!-- ===== Analysis Overlays (rendered first, below main data) ===== -->

          <!-- Percentile bands (25th-75th shaded area) -->
          {#if showPercentileBands && percentileBands}
            <PercentileBands
              p25={percentileBands.p25}
              p75={percentileBands.p75}
              fill="var(--chart-3)"
              opacity={0.15}
            />
          {/if}

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

          <!-- Budget target line -->
          {#if showBudgetLine && budgetTarget}
            <HorizontalLine
              value={budgetTarget}
              stroke="var(--chart-5)"
              strokeWidth={1.5}
              strokeDasharray="8 4"
              label="Budget"
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

          <!-- Forecast line (dashed to indicate predictions) -->
          {#if showForecast && forecastData.length > 0}
            <CustomLine
              data={forecastData}
              stroke="var(--chart-2)"
              strokeWidth={2}
              strokeDasharray="4 2"
              opacity={0.8}
            />
          {/if}

          <!-- Main chart data -->
          {#if chartType === 'line-area'}
            <Area fill="var(--chart-1)" opacity={0.1} />
            <Line stroke="var(--chart-1)" strokeWidth={2} />
            <Scatter
              fill={(d) => chartSelection.isSelected(d.month) ? 'var(--primary)' : getStatusColor(d)}
              radius={(d) => chartSelection.isSelected(d.month) ? 6 : 4}
              hoverRadius={7}
              stroke={(d) => chartSelection.isSelected(d.month) ? 'var(--primary-foreground)' : 'var(--background)'}
              strokeWidth={2}
              onclick={(d, e) => handlePointClick(d, e)}
              ondblclick={(d) => handlePointDblClick(d)}
            />
          {:else if chartType === 'line'}
            <Line stroke="var(--chart-1)" strokeWidth={2} />
            <Scatter
              fill={(d) => chartSelection.isSelected(d.month) ? 'var(--primary)' : getStatusColor(d)}
              radius={(d) => chartSelection.isSelected(d.month) ? 6 : 4}
              hoverRadius={7}
              stroke={(d) => chartSelection.isSelected(d.month) ? 'var(--primary-foreground)' : 'var(--background)'}
              strokeWidth={2}
              onclick={(d, e) => handlePointClick(d, e)}
              ondblclick={(d) => handlePointDblClick(d)}
            />
          {:else if chartType === 'area'}
            <Area fill="var(--chart-1)" opacity={0.3} />
            <Scatter
              fill={(d) => chartSelection.isSelected(d.month) ? 'var(--primary)' : getStatusColor(d)}
              radius={(d) => chartSelection.isSelected(d.month) ? 6 : 4}
              hoverRadius={7}
              stroke={(d) => chartSelection.isSelected(d.month) ? 'var(--primary-foreground)' : 'var(--background)'}
              strokeWidth={2}
              onclick={(d, e) => handlePointClick(d, e)}
              ondblclick={(d) => handlePointDblClick(d)}
            />
          {:else if chartType === 'bar'}
            <Bar
              fill={(d) => chartSelection.isSelected(d.month) ? 'var(--primary)' : getStatusColor(d)}
              opacity={(d) => chartSelection.isSelected(d.month) ? 1 : 0.85}
              hoverOpacity={1}
              onclick={(d, e) => handlePointClick(d, e)}
              ondblclick={(d) => handlePointDblClick(d)}
            />
          {/if}

          <!-- Year-over-year comparison overlay -->
          {#if showComparison && comparisonData.length > 0}
            <CustomLine
              data={comparisonData}
              stroke="var(--chart-4)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              opacity={0.7}
            />
          {/if}

          <!-- Rolling average trend line -->
          {#if showTrendLine && rollingAverageData.length > 0}
            <CustomLine
              data={rollingAverageData}
              stroke="var(--chart-2)"
              strokeWidth={2}
              opacity={0.8}
            />
            <TrendDots
              trendData={rollingAverageData}
              fill="var(--chart-2)"
              radius={4}
            />
          {/if}

          <!-- Tooltip for hover - uses external hover from Brush -->
          <Tooltip
            barMode={chartType === 'bar'}
            dot={chartType !== 'bar'}
            externalHoverX={brushHoverX}
          >
            {#snippet children({ point, x, y })}
              <foreignObject
                x={Math.min(x + 20, 180)}
                y={0}
                width="180"
                height="250"
                style="overflow: visible; pointer-events: none;"
              >
                <div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md" style="pointer-events: none;">
                  <p class="font-medium">{point.monthLabel}</p>
                  <p class="font-semibold" style="color: {getStatusColor(point)};">{currencyFormatter.format(point.spending)}</p>

                  <!-- Budget progress bar -->
                  {#if budgetTarget}
                    {@const ratio = point.spending / budgetTarget}
                    {@const percentUsed = Math.round(ratio * 100)}
                    {@const overUnder = point.spending - budgetTarget}
                    <div class="mt-1 flex items-center gap-2">
                      <div class="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <div
                          class="h-full rounded-full"
                          style="width: {Math.min(percentUsed, 100)}%; background-color: {getStatusColor(point)};"
                        ></div>
                      </div>
                      <span class="text-xs tabular-nums">{percentUsed}%</span>
                    </div>
                    <p class="text-xs" style="color: {getStatusColor(point)}">
                      {overUnder > 0 ? `${currencyFormatter.format(overUnder)} over budget` : `${currencyFormatter.format(Math.abs(overUnder))} under budget`}
                    </p>
                  {/if}

                  <!-- Change from previous month -->
                  {#if point.changeFromPrevious !== null && point.changeFromPrevious !== undefined}
                    <p class="text-xs" class:text-destructive={point.changeFromPrevious > 0} class:text-green-600={point.changeFromPrevious < 0}>
                      {point.changeFromPrevious > 0 ? '↑' : '↓'} {formatPercentRaw(Math.abs(point.changeFromPrevious), 1)} vs prev month
                    </p>
                  {/if}

                  <!-- Previous year comparison -->
                  {#if point.previousYearSpending !== null && point.previousYearSpending !== undefined}
                    <p class="text-muted-foreground text-xs">
                      Last year: {currencyFormatter.format(point.previousYearSpending)}
                    </p>
                  {/if}

                  <!-- Rolling average trend -->
                  {#if showTrendLine}
                    {@const trendPoint = rollingAverageData.find(d => d.month === point.month)}
                    {#if trendPoint}
                      {@const diff = point.spending - trendPoint.average}
                      {@const diffPercent = ((diff / trendPoint.average) * 100)}
                      <p class="text-xs" style="color: var(--chart-2);">
                        3-mo avg: {currencyFormatter.format(trendPoint.average)}
                        <span class="text-muted-foreground">
                          ({diffPercent > 0 ? '+' : ''}{formatPercentRaw(diffPercent, 0)})
                        </span>
                      </p>
                    {/if}
                  {/if}

                  <!-- Analysis overlays section -->
                  {#if showLinearTrend || showHistoricalAvg || showPercentileBands}
                    <div class="mt-1 border-t pt-1 space-y-0.5">
                      <!-- Linear regression value at this point -->
                      {#if showLinearTrend && linearTrendData}
                        {@const pointIndex = filteredMonthlyData.findIndex(d => d.month === point.month)}
                        {@const regressionValue = getTrendValueAtIndex(linearTrendData, pointIndex)}
                        {@const diffFromRegression = point.spending - regressionValue}
                        {@const diffPercent = ((diffFromRegression / regressionValue) * 100)}
                        <p class="text-xs" style="color: var(--primary);">
                          Regression: {currencyFormatter.format(regressionValue)}
                          <span class="text-muted-foreground">
                            ({diffPercent > 0 ? '+' : ''}{formatPercentRaw(diffPercent, 0)})
                          </span>
                        </p>
                      {/if}

                      <!-- Historical average comparison -->
                      {#if showHistoricalAvg && historicalAverage !== null}
                        {@const diffFromAvg = point.spending - historicalAverage}
                        {@const diffPercent = ((diffFromAvg / historicalAverage) * 100)}
                        <p class="text-xs" style="color: var(--chart-6);">
                          Hist. avg: {currencyFormatter.format(historicalAverage)}
                          <span class="text-muted-foreground">
                            ({diffPercent > 0 ? '+' : ''}{formatPercentRaw(diffPercent, 0)})
                          </span>
                        </p>
                      {/if}

                      <!-- Percentile position -->
                      {#if showPercentileBands && percentileBands}
                        {@const spending = point.spending}
                        {@const position = spending < percentileBands.p25 ? 'below 25th' : spending > percentileBands.p75 ? 'above 75th' : spending < percentileBands.p50 ? '25th-50th' : '50th-75th'}
                        <p class="text-xs" style="color: var(--chart-3);">
                          Percentile: {position}
                        </p>
                      {/if}
                    </div>
                  {/if}

                  <!-- Top categories breakdown -->
                  {#if point.topCategories?.length}
                    <div class="mt-2 border-t pt-2">
                      <p class="text-muted-foreground text-xs mb-1">Top Categories</p>
                      {#each point.topCategories.slice(0, 3) as cat}
                        <p class="text-xs">
                          {cat.categoryName}: {currencyFormatter.format(cat.amount)} ({formatPercentRaw(cat.percentage, 0)})
                        </p>
                      {/each}
                    </div>
                  {/if}
                </div>
              </foreignObject>
            {/snippet}
          </Tooltip>

          <!-- Brush for drag selection - on top to capture all mouse events -->
          <Brush
            onbrush={handleBrushSelect}
            onclick={handleBrushClick}
            onhover={(x) => brushHoverX = x}
            fill="var(--primary)"
            opacity={0.15}
            cursor={chartType === 'bar' ? 'pointer' : 'crosshair'}
            captureEvents={chartType !== 'bar'}
          />
        </Svg>
      </LayerCake>

      <!-- Overlay legend -->
      {#if activeOverlays.length > 0}
        <div class="mt-2 flex flex-wrap justify-center gap-4">
          <div class="flex items-center gap-2">
            <div class="h-0.5 w-4" style="background-color: var(--chart-1);"></div>
            <span class="text-xs">Monthly spending</span>
          </div>
          {#each activeOverlays as overlay}
            <div class="flex items-center gap-2">
              <div
                class="h-0.5 w-4"
                style="background-color: {overlay.color}; {overlay.dashed ? 'background: repeating-linear-gradient(90deg, ' + overlay.color + ' 0px, ' + overlay.color + ' 4px, transparent 4px, transparent 8px);' : ''}"
              ></div>
              <span class="text-xs">{overlay.label}</span>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Budget status legend -->
      {#if budgetTarget}
        <div class="mt-2 flex flex-wrap justify-center gap-4 text-xs">
          <div class="flex items-center gap-1.5">
            <div class="h-3 w-3 rounded-sm" style="background-color: var(--chart-3);"></div>
            <span>Under budget</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="h-3 w-3 rounded-sm" style="background-color: var(--chart-4);"></div>
            <span>Near budget</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="h-3 w-3 rounded-sm" style="background-color: var(--destructive);"></div>
            <span>Over budget</span>
          </div>
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
