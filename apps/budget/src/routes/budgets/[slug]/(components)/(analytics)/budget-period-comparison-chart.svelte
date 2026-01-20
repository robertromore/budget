<!--
  Budget Period Comparison Chart

  Compares current period with previous period metrics.
-->
<script lang="ts">
import * as Card from '$lib/components/ui/card';
import { Badge } from '$lib/components/ui/badge';
import { Progress } from '$lib/components/ui/progress';
import { Skeleton } from '$lib/components/ui/skeleton';
import { comparePeriods, getPeriodAnalytics } from '$lib/query/budgets';
import { currencyFormatter, formatPercentRaw } from '$lib/utils/formatters';
import ArrowDown from '@lucide/svelte/icons/arrow-down';
import ArrowUp from '@lucide/svelte/icons/arrow-up';
import Minus from '@lucide/svelte/icons/minus';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import Lightbulb from '@lucide/svelte/icons/lightbulb';
import type { Component } from 'svelte';

interface Props {
  budgetId: number;
  currentPeriodId?: number;
  previousPeriodId?: number;
}

let { budgetId, currentPeriodId, previousPeriodId }: Props = $props();

// Fetch period analytics if only one period available
const currentAnalyticsQuery = $derived(
  currentPeriodId ? getPeriodAnalytics(currentPeriodId).options() : null
);
const currentAnalytics = $derived(currentAnalyticsQuery?.data);

// Fetch comparison if both periods available
const comparisonQuery = $derived(
  currentPeriodId && previousPeriodId
    ? comparePeriods(currentPeriodId, previousPeriodId).options()
    : null
);
const comparison = $derived(comparisonQuery?.data);

const isLoading = $derived(
  currentAnalyticsQuery?.isLoading || comparisonQuery?.isLoading
);
const hasComparison = $derived(!!comparison);

// Format percentage change
function formatChange(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatPercentRaw(value, 1)}`;
}

// Get trend info
function getTrendIcon(change: number): Component<any> {
  if (change > 5) return ArrowUp;
  if (change < -5) return ArrowDown;
  return Minus;
}

function getTrendColor(change: number): string {
  if (change > 5) return 'text-red-500';
  if (change < -5) return 'text-green-500';
  return 'text-muted-foreground';
}

// Get utilization color
function getUtilizationColor(rate: number): string {
  if (rate > 100) return 'text-red-500';
  if (rate > 80) return 'text-yellow-500';
  return 'text-green-500';
}

// Get performance score color
function getPerformanceColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Period Comparison</Card.Title>
    <Card.Description>
      {#if hasComparison}
        Compare current period performance with previous period
      {:else}
        Current period performance metrics
      {/if}
    </Card.Description>
  </Card.Header>
  <Card.Content>
    {#if isLoading}
      <div class="space-y-4">
        <Skeleton class="h-24 w-full" />
        <Skeleton class="h-24 w-full" />
        <Skeleton class="h-24 w-full" />
      </div>
    {:else if !currentPeriodId}
      <div class="text-muted-foreground py-12 text-center">
        <p>No period data available for this budget.</p>
        <p class="text-sm mt-1">Create a period to start tracking.</p>
      </div>
    {:else if hasComparison && comparison}
      <!-- Full comparison view -->
      <div class="space-y-6">
        <!-- Key Metrics Grid -->
        <div class="grid gap-4 md:grid-cols-2">
          <!-- Allocated -->
          <div class="rounded-lg border p-4">
            <div class="text-muted-foreground text-sm font-medium">Allocated</div>
            <div class="mt-1 flex items-baseline justify-between">
              <span class="text-2xl font-bold">
                {currencyFormatter.format(comparison.currentPeriod.totalAllocated)}
              </span>
              <div class="flex items-center gap-1 {getTrendColor(comparison.changes.allocatedChange)}">
                <svelte:component this={getTrendIcon(comparison.changes.allocatedChange)} class="h-4 w-4" />
                <span class="text-sm">{formatChange(comparison.changes.allocatedChange)}</span>
              </div>
            </div>
            <div class="text-muted-foreground mt-1 text-xs">
              Previous: {currencyFormatter.format(comparison.previousPeriod.totalAllocated)}
            </div>
          </div>

          <!-- Spent -->
          <div class="rounded-lg border p-4">
            <div class="text-muted-foreground text-sm font-medium">Spent</div>
            <div class="mt-1 flex items-baseline justify-between">
              <span class="text-2xl font-bold">
                {currencyFormatter.format(Math.abs(comparison.currentPeriod.totalSpent))}
              </span>
              <div class="flex items-center gap-1 {getTrendColor(comparison.changes.spentChange)}">
                <svelte:component this={getTrendIcon(comparison.changes.spentChange)} class="h-4 w-4" />
                <span class="text-sm">{formatChange(comparison.changes.spentChange)}</span>
              </div>
            </div>
            <div class="text-muted-foreground mt-1 text-xs">
              Previous: {currencyFormatter.format(Math.abs(comparison.previousPeriod.totalSpent))}
            </div>
          </div>

          <!-- Utilization Rate -->
          <div class="rounded-lg border p-4">
            <div class="text-muted-foreground text-sm font-medium">Utilization Rate</div>
            <div class="mt-1 flex items-baseline justify-between">
              <span class="text-2xl font-bold {getUtilizationColor(comparison.currentPeriod.utilizationRate)}">
                {formatPercentRaw(comparison.currentPeriod.utilizationRate, 1)}
              </span>
              <div class="flex items-center gap-1 {getTrendColor(comparison.changes.utilizationChange)}">
                <svelte:component this={getTrendIcon(comparison.changes.utilizationChange)} class="h-4 w-4" />
                <span class="text-sm">{formatChange(comparison.changes.utilizationChange)}</span>
              </div>
            </div>
            <Progress
              value={Math.min(comparison.currentPeriod.utilizationRate, 100)}
              class="mt-2 h-2"
            />
          </div>

          <!-- Performance Score -->
          <div class="rounded-lg border p-4">
            <div class="text-muted-foreground text-sm font-medium">Performance Score</div>
            <div class="mt-1 flex items-baseline justify-between">
              <span class="text-2xl font-bold">
                {comparison.currentPeriod.performanceScore.toFixed(0)}
              </span>
              <div class="flex items-center gap-1 {getTrendColor(comparison.changes.performanceChange)}">
                <svelte:component this={getTrendIcon(comparison.changes.performanceChange)} class="h-4 w-4" />
                <span class="text-sm">{formatChange(comparison.changes.performanceChange)}</span>
              </div>
            </div>
            <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                class="h-full transition-all {getPerformanceColor(comparison.currentPeriod.performanceScore)}"
                style="width: {comparison.currentPeriod.performanceScore}%"
              ></div>
            </div>
          </div>
        </div>

        <!-- Trends -->
        <div class="rounded-lg border p-4">
          <div class="text-sm font-medium mb-3">Trends</div>
          <div class="flex flex-wrap gap-2">
            <Badge variant="outline" class="gap-1">
              {#if comparison.currentPeriod.trends.spendingTrend === 'increasing'}
                <TrendingUp class="h-3 w-3 text-red-500" />
              {:else if comparison.currentPeriod.trends.spendingTrend === 'decreasing'}
                <TrendingDown class="h-3 w-3 text-green-500" />
              {:else}
                <Minus class="h-3 w-3" />
              {/if}
              Spending: {comparison.currentPeriod.trends.spendingTrend}
            </Badge>
            <Badge variant="outline" class="gap-1">
              {#if comparison.currentPeriod.trends.efficiencyTrend === 'improving'}
                <TrendingUp class="h-3 w-3 text-green-500" />
              {:else if comparison.currentPeriod.trends.efficiencyTrend === 'declining'}
                <TrendingDown class="h-3 w-3 text-red-500" />
              {:else}
                <Minus class="h-3 w-3" />
              {/if}
              Efficiency: {comparison.currentPeriod.trends.efficiencyTrend}
            </Badge>
          </div>
        </div>

        <!-- Insights -->
        {#if comparison.insights.length > 0}
          <div class="rounded-lg border p-4">
            <div class="flex items-center gap-2 text-sm font-medium mb-3">
              <Lightbulb class="h-4 w-4 text-yellow-500" />
              Insights
            </div>
            <ul class="space-y-2 text-sm text-muted-foreground">
              {#each comparison.insights as insight}
                <li class="flex items-start gap-2">
                  <span class="text-primary mt-1">•</span>
                  <span>{insight}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    {:else if currentAnalytics}
      <!-- Single period view (no comparison available) -->
      <div class="space-y-6">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded-lg border p-4">
            <div class="text-muted-foreground text-sm font-medium">Allocated</div>
            <div class="text-2xl font-bold mt-1">
              {currencyFormatter.format(currentAnalytics.totalAllocated)}
            </div>
          </div>

          <div class="rounded-lg border p-4">
            <div class="text-muted-foreground text-sm font-medium">Spent</div>
            <div class="text-2xl font-bold mt-1">
              {currencyFormatter.format(Math.abs(currentAnalytics.totalSpent))}
            </div>
          </div>

          <div class="rounded-lg border p-4">
            <div class="text-muted-foreground text-sm font-medium">Utilization</div>
            <div class="text-2xl font-bold mt-1 {getUtilizationColor(currentAnalytics.utilizationRate)}">
              {formatPercentRaw(currentAnalytics.utilizationRate, 1)}
            </div>
            <Progress
              value={Math.min(currentAnalytics.utilizationRate, 100)}
              class="mt-2 h-2"
            />
          </div>

          <div class="rounded-lg border p-4">
            <div class="text-muted-foreground text-sm font-medium">Performance</div>
            <div class="text-2xl font-bold mt-1">
              {currentAnalytics.performanceScore.toFixed(0)}
            </div>
            <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                class="h-full transition-all {getPerformanceColor(currentAnalytics.performanceScore)}"
                style="width: {currentAnalytics.performanceScore}%"
              ></div>
            </div>
          </div>
        </div>

        <p class="text-muted-foreground text-sm text-center">
          Add more periods to see comparison trends.
        </p>
      </div>
    {/if}
  </Card.Content>
</Card.Root>
