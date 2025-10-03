<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import ChartPlaceholder from "$lib/components/ui/chart-placeholder.svelte";
  import {TrendingDown, Target, AlertTriangle} from "@lucide/svelte/icons";
  import {currencyFormatter} from "$lib/utils/formatters";
  import type {BudgetWithRelations} from "$lib/server/domains/budgets";
  import {getDailySpending, getSpendingTrends} from "$lib/query/budgets";

  interface Props {
    budget: BudgetWithRelations;
    className?: string;
  }

  let {budget, className}: Props = $props();

  // Fetch spending trends to get current period date range
  const spendingTrendsQuery = $derived.by(() => {
    if (!budget?.id) return null;
    return getSpendingTrends(budget.id).options();
  });

  const currentPeriod = $derived.by(() => {
    const trends = spendingTrendsQuery ? $spendingTrendsQuery.data : null;
    if (!trends || trends.length === 0) return null;
    // Get the most recent period
    return trends[trends.length - 1];
  });

  // Fetch daily spending for the current period
  const dailySpendingQuery = $derived.by(() => {
    if (!budget?.id || !currentPeriod) return null;
    return getDailySpending(
      budget.id,
      currentPeriod.startDate,
      currentPeriod.endDate
    ).options();
  });

  // Generate burn-down data
  const burndownData = $derived.by(() => {
    const allocatedAmount = (budget.metadata as Record<string, unknown>)?.allocatedAmount as number ?? 0;

    if (!currentPeriod || !dailySpendingQuery) {
      return [];
    }

    const dailyData = $dailySpendingQuery.data ?? [];
    const startDate = new Date(currentPeriod.startDate);
    const endDate = new Date(currentPeriod.endDate);
    const today = new Date();

    const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentDay = Math.min(
      daysInPeriod,
      Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    const data = [];
    let cumulativeSpent = 0;

    // Create a map of dates to spending amounts
    const spendingByDate = new Map(
      dailyData.map(d => [d.date, d.amount])
    );

    // Calculate actual spending and remaining for each day
    for (let day = 0; day <= daysInPeriod; day++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];

      // Accumulate spending up to this day
      if (day > 0) {
        const prevDate = new Date(startDate);
        prevDate.setDate(prevDate.getDate() + day - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];
        const dailyAmount = spendingByDate.get(prevDateStr) ?? 0;
        cumulativeSpent += dailyAmount;
      }

      const remaining = allocatedAmount - cumulativeSpent;
      const planned = allocatedAmount - (allocatedAmount * (day / daysInPeriod));

      // If this day is in the past/present, show actual
      if (day <= currentDay) {
        data.push({
          day,
          date: dateStr,
          actual: remaining,
          planned: planned,
          projected: null,
        });
      } else {
        // Future days: project based on average daily burn rate
        const avgDailyBurn = currentDay > 0 ? cumulativeSpent / currentDay : 0;
        const daysFromToday = day - currentDay;
        const projectedSpent = cumulativeSpent + (avgDailyBurn * daysFromToday);
        const projected = Math.max(0, allocatedAmount - projectedSpent);

        data.push({
          day,
          date: dateStr,
          actual: null,
          planned: planned,
          projected: projected,
        });
      }
    }

    return data;
  });

  const chartConfig = {
    planned: {
      label: "Planned Budget",
      color: "hsl(var(--muted-foreground) / 0.3)"
    },
    actual: {
      label: "Actual Remaining",
      color: "hsl(var(--primary))"
    },
    projected: {
      label: "Projected Remaining",
      color: "hsl(var(--accent))"
    }
  };

  const allocatedAmount = $derived((budget.metadata as Record<string, unknown>)?.allocatedAmount as number ?? 0);
  const currentRemaining = $derived.by(() => {
    const actualData = burndownData.filter(d => d.actual !== null);
    return actualData.length > 0 ? actualData[actualData.length - 1].actual : allocatedAmount;
  });

  const projectedEndBalance = $derived.by(() => {
    const projectedData = burndownData.filter(d => d.projected !== null);
    return projectedData.length > 0 ? projectedData[projectedData.length - 1].projected : 0;
  });

  const burnRate = $derived.by(() => {
    const actualData = burndownData.filter(d => d.actual !== null);
    if (actualData.length < 2) return 0;
    const spent = allocatedAmount - (currentRemaining ?? 0);
    return spent / actualData.length;
  });

  const status = $derived.by(() => {
    if (projectedEndBalance < 0) return 'danger';
    if (projectedEndBalance < allocatedAmount * 0.1) return 'warning';
    return 'good';
  });

  const statusColor = $derived.by(() => {
    switch (status) {
      case 'danger': return 'text-destructive';
      case 'warning': return 'text-orange-600';
      default: return 'text-green-600';
    }
  });
</script>

<Card.Root class={className}>
  <Card.Header>
    <div class="flex items-center justify-between">
      <div>
        <Card.Title class="flex items-center gap-2">
          <TrendingDown class="h-5 w-5" />
          Budget Burn-Down
        </Card.Title>
        <Card.Description>Actual vs planned budget consumption</Card.Description>
      </div>
      <div class="text-right">
        <div class="text-2xl font-bold {statusColor}">
          {currencyFormatter.format(currentRemaining ?? 0)}
        </div>
        <div class="text-sm text-muted-foreground">Remaining</div>
      </div>
    </div>
  </Card.Header>
  <Card.Content class="space-y-4">
    <!-- Chart -->
    <ChartPlaceholder class="h-[300px]" title="Budget Burn-Down Chart" />

    <!-- Metrics -->
    <div class="grid grid-cols-3 gap-4 pt-4 border-t">
      <div class="space-y-1">
        <div class="flex items-center gap-1 text-sm text-muted-foreground">
          <Target class="h-3 w-3" />
          <span>Allocated</span>
        </div>
        <div class="text-lg font-bold">{currencyFormatter.format(allocatedAmount)}</div>
      </div>

      <div class="space-y-1">
        <div class="flex items-center gap-1 text-sm text-muted-foreground">
          <TrendingDown class="h-3 w-3" />
          <span>Daily Burn Rate</span>
        </div>
        <div class="text-lg font-bold">{currencyFormatter.format(burnRate)}</div>
      </div>

      <div class="space-y-1">
        <div class="flex items-center gap-1 text-sm text-muted-foreground">
          {#if status === 'danger'}
            <AlertTriangle class="h-3 w-3 text-destructive" />
          {:else if status === 'warning'}
            <AlertTriangle class="h-3 w-3 text-orange-600" />
          {:else}
            <Target class="h-3 w-3 text-green-600" />
          {/if}
          <span>Projected End</span>
        </div>
        <div class="text-lg font-bold {statusColor}">
          {currencyFormatter.format(Math.abs(projectedEndBalance))}
        </div>
      </div>
    </div>

    <!-- Status Alert -->
    {#if status === 'danger'}
      <div class="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
        <div class="flex items-center gap-2 text-destructive">
          <AlertTriangle class="h-4 w-4" />
          <span class="text-sm font-medium">Budget is projected to be exceeded</span>
        </div>
        <p class="text-sm text-muted-foreground mt-1">
          At current burn rate, you'll exceed the budget by {currencyFormatter.format(Math.abs(projectedEndBalance))}
        </p>
      </div>
    {:else if status === 'warning'}
      <div class="bg-orange-50 border border-orange-200 rounded-lg p-3 dark:bg-orange-950 dark:border-orange-800">
        <div class="flex items-center gap-2 text-orange-700 dark:text-orange-300">
          <AlertTriangle class="h-4 w-4" />
          <span class="text-sm font-medium">Budget is running tight</span>
        </div>
        <p class="text-sm text-muted-foreground mt-1">
          Only {currencyFormatter.format(projectedEndBalance)} projected to remain at period end
        </p>
      </div>
    {/if}
  </Card.Content>
</Card.Root>
