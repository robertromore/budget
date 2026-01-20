<!--
  Budget Spending Trends Chart

  Shows allocated vs actual spending across budget periods.
-->
<script lang="ts">
import * as Card from '$lib/components/ui/card';
import { Progress } from '$lib/components/ui/progress';
import { Skeleton } from '$lib/components/ui/skeleton';
import { Badge } from '$lib/components/ui/badge';
import { getSpendingTrends } from '$lib/query/budgets';
import { currencyFormatter, formatPercentRaw } from '$lib/utils/formatters';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import Minus from '@lucide/svelte/icons/minus';

interface Props {
  budgetId: number;
  limit?: number;
}

let { budgetId, limit = 12 }: Props = $props();

// Fetch spending trends data
const trendsQuery = $derived(getSpendingTrends(budgetId, limit).options());
const trendsData = $derived(trendsQuery.data);
const isLoading = $derived(trendsQuery.isLoading);

// Transform data for display
const chartData = $derived.by(() => {
  if (!trendsData) return [];

  return trendsData.map((period, index) => ({
    index,
    periodId: period.periodId,
    label: formatPeriodLabel(period.startDate, period.endDate),
    allocated: period.allocated,
    actual: Math.abs(period.actual),
    remaining: period.remaining,
    utilizationRate: period.allocated > 0 ? (Math.abs(period.actual) / period.allocated) * 100 : 0,
  }));
});

// Calculate summary stats
const summary = $derived.by(() => {
  if (!chartData.length) return null;

  const totalAllocated = chartData.reduce((sum, p) => sum + p.allocated, 0);
  const totalActual = chartData.reduce((sum, p) => sum + p.actual, 0);
  const avgUtilization = chartData.reduce((sum, p) => sum + p.utilizationRate, 0) / chartData.length;

  // Calculate trend (comparing last 3 periods if available)
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (chartData.length >= 3) {
    const recent = chartData.slice(-3);
    const first = recent[0].actual;
    const last = recent[recent.length - 1].actual;
    const change = ((last - first) / first) * 100;
    if (change > 5) trend = 'up';
    else if (change < -5) trend = 'down';
  }

  return { totalAllocated, totalActual, avgUtilization, trend };
});

// Format period label (e.g., "Jan 2024")
function formatPeriodLabel(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  return start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Get utilization color
function getUtilizationColor(rate: number): string {
  if (rate > 100) return 'text-red-500';
  if (rate > 80) return 'text-yellow-500';
  return 'text-green-500';
}

// Get progress color class
function getProgressClass(rate: number): string {
  if (rate > 100) return '[&>div]:bg-red-500';
  if (rate > 80) return '[&>div]:bg-yellow-500';
  return '[&>div]:bg-green-500';
}
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Spending Trends</Card.Title>
    <Card.Description>Allocated vs actual spending across periods</Card.Description>
  </Card.Header>
  <Card.Content>
    {#if isLoading}
      <div class="space-y-4">
        <div class="grid gap-4 md:grid-cols-3">
          <Skeleton class="h-20" />
          <Skeleton class="h-20" />
          <Skeleton class="h-20" />
        </div>
        <Skeleton class="h-64" />
      </div>
    {:else if !chartData.length}
      <div class="text-muted-foreground py-12 text-center">
        <p>No spending history available for this budget.</p>
        <p class="text-sm mt-1">Add periods to start tracking spending trends.</p>
      </div>
    {:else}
      <!-- Summary Cards -->
      {#if summary}
        <div class="grid gap-4 md:grid-cols-3 mb-6">
          <div class="rounded-lg border p-4">
            <div class="text-muted-foreground text-sm font-medium">Total Allocated</div>
            <div class="text-2xl font-bold mt-1">
              {currencyFormatter.format(summary.totalAllocated)}
            </div>
            <div class="text-muted-foreground text-xs mt-1">
              Across {chartData.length} periods
            </div>
          </div>

          <div class="rounded-lg border p-4">
            <div class="text-muted-foreground text-sm font-medium">Total Spent</div>
            <div class="text-2xl font-bold mt-1">
              {currencyFormatter.format(summary.totalActual)}
            </div>
            <div class="flex items-center gap-1 mt-1">
              {#if summary.trend === 'up'}
                <TrendingUp class="h-4 w-4 text-red-500" />
                <span class="text-red-500 text-xs">Trending up</span>
              {:else if summary.trend === 'down'}
                <TrendingDown class="h-4 w-4 text-green-500" />
                <span class="text-green-500 text-xs">Trending down</span>
              {:else}
                <Minus class="h-4 w-4 text-muted-foreground" />
                <span class="text-muted-foreground text-xs">Stable</span>
              {/if}
            </div>
          </div>

          <div class="rounded-lg border p-4">
            <div class="text-muted-foreground text-sm font-medium">Avg. Utilization</div>
            <div class="text-2xl font-bold mt-1 {getUtilizationColor(summary.avgUtilization)}">
              {formatPercentRaw(summary.avgUtilization, 1)}
            </div>
            <Progress
              value={Math.min(summary.avgUtilization, 100)}
              class="mt-2 h-2 {getProgressClass(summary.avgUtilization)}"
            />
          </div>
        </div>
      {/if}

      <!-- Period List -->
      <div class="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {#each chartData as period}
          <div class="rounded-lg border p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium">{period.label}</span>
              <Badge
                variant="outline"
                class={period.utilizationRate > 100 ? 'border-red-500 text-red-500' : period.utilizationRate > 80 ? 'border-yellow-500 text-yellow-500' : 'border-green-500 text-green-500'}
              >
                {formatPercentRaw(period.utilizationRate, 0)}
              </Badge>
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm mb-2">
              <div>
                <span class="text-muted-foreground">Allocated: </span>
                <span class="font-medium">{currencyFormatter.format(period.allocated)}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Actual: </span>
                <span class="font-medium {getUtilizationColor(period.utilizationRate)}">
                  {currencyFormatter.format(period.actual)}
                </span>
              </div>
            </div>
            <Progress
              value={Math.min(period.utilizationRate, 100)}
              class="h-2 {getProgressClass(period.utilizationRate)}"
            />
          </div>
        {/each}
      </div>
    {/if}
  </Card.Content>
</Card.Root>
