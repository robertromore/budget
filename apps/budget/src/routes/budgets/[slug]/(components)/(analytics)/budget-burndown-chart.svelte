<!--
  Budget Burndown Chart

  Shows daily spending against budget allocation with cumulative tracking.
-->
<script lang="ts">
import * as Card from '$lib/components/ui/card';
import { Progress } from '$lib/components/ui/progress';
import { Skeleton } from '$lib/components/ui/skeleton';
import { Badge } from '$lib/components/ui/badge';
import { getDailySpending, getPeriodAnalytics } from '$lib/query/budgets';
import { currencyFormatter, formatPercentRaw } from '$lib/utils/formatters';
import { today, getLocalTimeZone } from '@internationalized/date';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import Target from '@lucide/svelte/icons/target';
import Calendar from '@lucide/svelte/icons/calendar';

interface Props {
  budgetId: number;
  startDate?: string;
  endDate?: string;
  periodId?: number;
}

let { budgetId, startDate, endDate, periodId }: Props = $props();

// Fetch period analytics for allocation info
const periodQuery = $derived(
  periodId ? getPeriodAnalytics(periodId).options() : null
);
const periodData = $derived(periodQuery?.data);
const allocation = $derived(periodData?.totalAllocated ?? 0);

// Fetch daily spending data
const dailyQuery = $derived(
  startDate && endDate ? getDailySpending(budgetId, startDate, endDate).options() : null
);
const dailyData = $derived(dailyQuery?.data ?? []);
const isLoading = $derived(dailyQuery?.isLoading || periodQuery?.isLoading);

// Calculate period duration in days
const periodDays = $derived.by(() => {
  if (!startDate || !endDate) return 0;
  return Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
});

// Calculate ideal daily burn rate
const idealDailyBurn = $derived(
  periodDays > 0 && allocation > 0 ? allocation / periodDays : 0
);

// Transform data with cumulative spending
const chartData = $derived.by(() => {
  if (!startDate || !dailyData) return [];

  // Create a map of actual daily spending
  const spendingByDate = new Map<string, number>();
  for (const day of dailyData) {
    spendingByDate.set(day.date, day.amount);
  }

  // Generate all days in the period
  const result: Array<{
    index: number;
    date: string;
    label: string;
    dailySpending: number;
    cumulativeSpending: number;
    idealRemaining: number;
    actualRemaining: number;
    isToday: boolean;
    isFuture: boolean;
  }> = [];

  const todayDate = today(getLocalTimeZone()).toString();
  let cumulative = 0;

  // Parse start date to iterate
  const startParts = startDate.split('-').map(Number);
  const endParts = endDate!.split('-').map(Number);
  const startDt = new Date(startParts[0], startParts[1] - 1, startParts[2]);
  const endDt = new Date(endParts[0], endParts[1] - 1, endParts[2]);

  let dayIndex = 0;
  for (let d = new Date(startDt); d <= endDt; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dailyAmount = spendingByDate.get(dateStr) ?? 0;
    cumulative += dailyAmount;

    const isToday = dateStr === todayDate;
    const isFuture = dateStr > todayDate;

    result.push({
      index: dayIndex,
      date: dateStr,
      label: new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      dailySpending: dailyAmount,
      cumulativeSpending: cumulative,
      idealRemaining: allocation - idealDailyBurn * (dayIndex + 1),
      actualRemaining: allocation - cumulative,
      isToday,
      isFuture,
    });

    dayIndex++;
  }

  return result;
});

// Calculate current progress
const currentSpent = $derived(
  chartData.length > 0
    ? chartData.filter((d) => !d.isFuture).reduce((sum, d) => sum + d.dailySpending, 0)
    : 0
);
const remaining = $derived(allocation - currentSpent);
const daysElapsed = $derived(chartData.filter((d) => !d.isFuture).length);
const daysRemaining = $derived(periodDays - daysElapsed);
const projectedTotal = $derived(
  daysElapsed > 0 ? (currentSpent / daysElapsed) * periodDays : 0
);
const utilizationRate = $derived(
  allocation > 0 ? (currentSpent / allocation) * 100 : 0
);

// Get status info
function getStatusColor(rate: number): string {
  if (rate > 100) return 'text-red-500';
  if (rate > 80) return 'text-yellow-500';
  return 'text-green-500';
}

function getProgressClass(rate: number): string {
  if (rate > 100) return '[&>div]:bg-red-500';
  if (rate > 80) return '[&>div]:bg-yellow-500';
  return '[&>div]:bg-green-500';
}

// Filter to show only days with spending or today/nearby
const displayDays = $derived.by(() => {
  if (!chartData.length) return [];

  // Show days with spending, plus today
  const withSpending = chartData.filter((d) => d.dailySpending > 0 || d.isToday);

  // If less than 10 days with spending, show recent days too
  if (withSpending.length < 10) {
    const todayIdx = chartData.findIndex((d) => d.isToday);
    const startIdx = Math.max(0, todayIdx - 5);
    const endIdx = Math.min(chartData.length, todayIdx + 3);
    const recentDays = chartData.slice(startIdx, endIdx);

    // Merge and dedupe
    const seen = new Set<string>();
    const merged = [...withSpending, ...recentDays].filter((d) => {
      if (seen.has(d.date)) return false;
      seen.add(d.date);
      return true;
    });

    return merged.sort((a, b) => a.index - b.index);
  }

  return withSpending.sort((a, b) => a.index - b.index);
});
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Daily Burndown</Card.Title>
    <Card.Description>Track daily spending against your budget allocation</Card.Description>
  </Card.Header>
  <Card.Content>
    {#if isLoading}
      <div class="space-y-4">
        <div class="grid gap-4 md:grid-cols-4">
          <Skeleton class="h-20" />
          <Skeleton class="h-20" />
          <Skeleton class="h-20" />
          <Skeleton class="h-20" />
        </div>
        <Skeleton class="h-64" />
      </div>
    {:else if !startDate || !endDate}
      <div class="text-muted-foreground py-12 text-center">
        <p>No period selected for this budget.</p>
        <p class="text-sm mt-1">Select a period to view daily spending breakdown.</p>
      </div>
    {:else if !chartData.length}
      <div class="text-muted-foreground py-12 text-center">
        <p>No spending data available for this period.</p>
        <p class="text-sm mt-1">Transactions will appear here once recorded.</p>
      </div>
    {:else}
      <!-- Summary Stats -->
      <div class="grid gap-4 md:grid-cols-4 mb-6">
        <div class="rounded-lg border p-4">
          <div class="flex items-center gap-2 text-muted-foreground text-sm font-medium">
            <Target class="h-4 w-4" />
            Allocated
          </div>
          <div class="text-2xl font-bold mt-1">
            {currencyFormatter.format(allocation)}
          </div>
        </div>

        <div class="rounded-lg border p-4">
          <div class="flex items-center gap-2 text-muted-foreground text-sm font-medium">
            <TrendingDown class="h-4 w-4" />
            Spent
          </div>
          <div class="text-2xl font-bold mt-1 {getStatusColor(utilizationRate)}">
            {currencyFormatter.format(currentSpent)}
          </div>
          <div class="text-xs text-muted-foreground mt-1">
            {formatPercentRaw(utilizationRate, 1)} of budget
          </div>
        </div>

        <div class="rounded-lg border p-4">
          <div class="flex items-center gap-2 text-muted-foreground text-sm font-medium">
            <TrendingUp class="h-4 w-4" />
            Remaining
          </div>
          <div class="text-2xl font-bold mt-1 {remaining < 0 ? 'text-red-500' : 'text-green-500'}">
            {currencyFormatter.format(remaining)}
          </div>
          <div class="text-xs text-muted-foreground mt-1">
            {currencyFormatter.format(idealDailyBurn)}/day ideal pace
          </div>
        </div>

        <div class="rounded-lg border p-4">
          <div class="flex items-center gap-2 text-muted-foreground text-sm font-medium">
            <Calendar class="h-4 w-4" />
            Days
          </div>
          <div class="text-2xl font-bold mt-1">
            {daysRemaining}
          </div>
          <div class="text-xs text-muted-foreground mt-1">
            {daysElapsed} elapsed of {periodDays}
          </div>
        </div>
      </div>

      <!-- Overall Progress -->
      <div class="mb-6">
        <div class="flex items-center justify-between text-sm mb-2">
          <span class="text-muted-foreground">Budget Progress</span>
          <span class="font-medium {getStatusColor(utilizationRate)}">
            {formatPercentRaw(utilizationRate, 1)}
          </span>
        </div>
        <Progress
          value={Math.min(utilizationRate, 100)}
          class="h-3 {getProgressClass(utilizationRate)}"
        />
      </div>

      <!-- Daily Spending List -->
      <div class="space-y-2 max-h-75 overflow-y-auto pr-2">
        {#each displayDays as day}
          {@const dayPercent = allocation > 0 ? (day.dailySpending / idealDailyBurn) * 100 : 0}
          <div
            class="rounded-lg border p-3 {day.isToday ? 'ring-2 ring-primary' : ''} {day.isFuture ? 'opacity-50' : ''}"
          >
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium">{day.label}</span>
                {#if day.isToday}
                  <Badge variant="secondary" class="text-xs">Today</Badge>
                {/if}
              </div>
              <div class="text-right">
                <span class="font-medium">{currencyFormatter.format(day.dailySpending)}</span>
                {#if day.dailySpending > 0}
                  <span class="text-muted-foreground text-xs ml-1">
                    ({dayPercent > 100 ? '+' : ''}{formatPercentRaw(dayPercent - 100, 0)} vs ideal)
                  </span>
                {/if}
              </div>
            </div>
            {#if !day.isFuture}
              <div class="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Cumulative: {currencyFormatter.format(day.cumulativeSpending)}</span>
                <span>•</span>
                <span class={day.actualRemaining < 0 ? 'text-red-500' : ''}>
                  Remaining: {currencyFormatter.format(day.actualRemaining)}
                </span>
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <!-- Projection -->
      {#if daysElapsed > 0 && daysRemaining > 0}
        <div class="mt-6 rounded-lg border p-4 bg-muted/50">
          <div class="text-sm font-medium mb-2">Projected End of Period</div>
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground text-sm">At current pace:</span>
            <span class="font-bold text-lg {projectedTotal > allocation ? 'text-red-500' : 'text-green-500'}">
              {currencyFormatter.format(projectedTotal)}
            </span>
          </div>
          <div class="mt-2 text-sm {projectedTotal > allocation ? 'text-red-500' : 'text-green-500'}">
            {#if projectedTotal > allocation}
              {currencyFormatter.format(projectedTotal - allocation)} over budget
            {:else}
              {currencyFormatter.format(allocation - projectedTotal)} under budget
            {/if}
          </div>
        </div>
      {/if}
    {/if}
  </Card.Content>
</Card.Root>
