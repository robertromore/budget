<script lang="ts">
import { TrendingUp, TrendingDown, Target, ChartPie, ChartBar } from '@lucide/svelte/icons';
import * as Card from '$lib/components/ui/card';
import { Badge } from '$lib/components/ui/badge';
import * as Tabs from '$lib/components/ui/tabs';
import { cn } from '$lib/utils';
import { currencyFormatter } from '$lib/utils/formatters';
import { calculateActualSpent } from '$lib/utils/budget-calculations';
import type { BudgetWithRelations } from '$lib/server/domains/budgets';

// LayerChart imports
import { Chart, Svg, Area, Spline, Axis, Grid, Highlight } from 'layerchart';
import ChartContainer from '$lib/components/ui/chart/chart-container.svelte';
import { colorUtils } from '$lib/utils/colors';
import { pie, arc as d3arc } from 'd3-shape';

interface Props {
  budgets: BudgetWithRelations[];
  selectedBudgetId?: number | null;
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
  class?: string;
}

let {
  budgets = [],
  selectedBudgetId = null,
  timeRange = 'month',
  class: className,
}: Props = $props();

// Filter budgets if a specific one is selected
const filteredBudgets = $derived.by(() => {
  if (selectedBudgetId) {
    return budgets.filter((b) => b.id === selectedBudgetId);
  }
  return budgets;
});

// Calculate budget progress data
const budgetProgressData = $derived.by(() => {
  return filteredBudgets.map((budget) => {
    const allocated = Math.abs((budget.metadata as any)?.allocatedAmount ?? 0);
    const spent = calculateActualSpent(budget);
    const remaining = allocated - spent;
    const progressPercentage = allocated > 0 ? (spent / allocated) * 100 : 0;

    // Determine status and color
    let status: 'excellent' | 'good' | 'warning' | 'danger' = 'excellent';
    let statusColor = 'text-green-600';
    let progressColor = 'hsl(var(--primary))';

    if (progressPercentage > 100) {
      status = 'danger';
      statusColor = 'text-red-600';
      progressColor = 'hsl(var(--destructive))';
    } else if (progressPercentage > 80) {
      status = 'warning';
      statusColor = 'text-orange-600';
      progressColor = 'hsl(var(--warning))';
    } else if (progressPercentage > 60) {
      status = 'good';
      statusColor = 'text-blue-600';
      progressColor = 'hsl(var(--primary))';
    }

    // Generate trend data (simulated for demo)
    const trendData = Array.from({ length: 30 }, (_, i) => {
      const day = i + 1;
      const expectedDaily = allocated / 30;
      const actualSpent = (spent / 30) * day + (Math.random() - 0.5) * expectedDaily * 0.3;

      return {
        day,
        date: new Date(2024, 0, day),
        allocated: expectedDaily * day,
        spent: Math.max(0, actualSpent),
        remaining: Math.max(0, allocated - actualSpent),
      };
    });

    return {
      ...budget,
      allocated,
      spent,
      remaining,
      progressPercentage,
      status,
      statusColor,
      progressColor,
      trendData,
    };
  });
});

// Aggregate data for multiple budgets
const aggregateData = $derived.by(() => {
  if (budgetProgressData.length === 0) return null;

  const totalAllocated = budgetProgressData.reduce((sum, b) => sum + b.allocated, 0);
  const totalSpent = budgetProgressData.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalAllocated - totalSpent;
  const overallProgress = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  // Create combined trend data
  const combinedTrend = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const allocated = budgetProgressData.reduce(
      (sum, b) => sum + (b.trendData[i]?.allocated ?? 0),
      0
    );
    const spent = budgetProgressData.reduce((sum, b) => sum + (b.trendData[i]?.spent ?? 0), 0);

    return {
      day,
      date: new Date(2024, 0, day),
      allocated,
      spent,
      remaining: allocated - spent,
    };
  });

  return {
    totalAllocated,
    totalSpent,
    totalRemaining,
    overallProgress,
    combinedTrend,
    budgetCount: budgetProgressData.length,
  };
});

// Chart configurations
const progressChartConfig = {
  allocated: {
    label: 'Allocated',
    color: 'hsl(var(--primary))',
  },
  spent: {
    label: 'Spent',
    color: 'hsl(var(--destructive))',
  },
  remaining: {
    label: 'Remaining',
    color: 'hsl(var(--muted-foreground))',
  },
};

const statusBadgeVariant = (status: string) => {
  const variants = {
    excellent: 'default' as const,
    good: 'secondary' as const,
    warning: 'outline' as const,
    danger: 'destructive' as const,
  };
  return variants[status as keyof typeof variants] || 'default';
};

// Donut chart data for budget breakdown
const donutChartData = $derived.by(() => {
  return budgetProgressData.map((budget) => ({
    name: budget.name,
    value: budget.allocated,
    spent: budget.spent,
    color: budget.progressColor,
  }));
});

const donutChartConfig = $derived.by(() => {
  return donutChartData.reduce(
    (config, item) => {
      config[item.name.toLowerCase().replace(/\s+/g, '-')] = {
        label: item.name,
        color: item.color,
      };
      return config;
    },
    {} as Record<string, { label: string; color: string }>
  );
});
</script>

<div class={cn('space-y-6', className)}>
  <!-- Summary Cards -->
  {#if aggregateData}
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <!-- Total Allocated -->
      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-sm font-medium">Total Allocated</Card.Title>
          <Target class="text-muted-foreground h-4 w-4" />
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold">
            {currencyFormatter.format(aggregateData.totalAllocated)}
          </div>
          <p class="text-muted-foreground text-xs">
            Across {aggregateData.budgetCount} budget{aggregateData.budgetCount !== 1 ? 's' : ''}
          </p>
        </Card.Content>
      </Card.Root>

      <!-- Total Spent -->
      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-sm font-medium">Total Spent</Card.Title>
          <TrendingUp class="text-muted-foreground h-4 w-4" />
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold">{currencyFormatter.format(aggregateData.totalSpent)}</div>
          <p class="text-muted-foreground text-xs">
            {aggregateData.overallProgress.toFixed(1)}% of allocated
          </p>
        </Card.Content>
      </Card.Root>

      <!-- Remaining -->
      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-sm font-medium">Remaining</Card.Title>
          <TrendingDown class="text-muted-foreground h-4 w-4" />
        </Card.Header>
        <Card.Content>
          <div
            class={cn(
              'text-2xl font-bold',
              aggregateData.totalRemaining < 0 ? 'text-destructive' : 'text-green-600'
            )}>
            {currencyFormatter.format(Math.abs(aggregateData.totalRemaining))}
          </div>
          <p class="text-muted-foreground text-xs">
            {aggregateData.totalRemaining < 0 ? 'Over budget' : 'Available'}
          </p>
        </Card.Content>
      </Card.Root>

      <!-- Average Progress -->
      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-sm font-medium">Progress</Card.Title>
          <ChartBar class="text-muted-foreground h-4 w-4" />
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold">{aggregateData.overallProgress.toFixed(0)}%</div>
          <div class="bg-muted mt-2 h-2 overflow-hidden rounded-full">
            <div
              class={cn(
                'h-full rounded-full transition-all',
                aggregateData.overallProgress > 100
                  ? 'bg-destructive'
                  : aggregateData.overallProgress > 80
                    ? 'bg-orange-500'
                    : 'bg-primary'
              )}
              style="width: {Math.min(100, aggregateData.overallProgress)}%">
            </div>
          </div>
        </Card.Content>
      </Card.Root>
    </div>
  {/if}

  <!-- Charts and Detailed Progress -->
  <Tabs.Root value="progress" class="space-y-4">
    <Tabs.List class="grid w-full grid-cols-3">
      <Tabs.Trigger value="progress">
        <ChartBar class="mr-2 h-4 w-4" />
        Progress Details
      </Tabs.Trigger>
      <Tabs.Trigger value="trends">
        <TrendingUp class="mr-2 h-4 w-4" />
        Spending Trends
      </Tabs.Trigger>
      <Tabs.Trigger value="breakdown">
        <ChartPie class="mr-2 h-4 w-4" />
        Budget Breakdown
      </Tabs.Trigger>
    </Tabs.List>

    <!-- Progress Details Tab -->
    <Tabs.Content value="progress" class="space-y-4">
      <div class="grid gap-4">
        {#each budgetProgressData as budget (budget.id)}
          <Card.Root>
            <Card.Header>
              <div class="flex items-center justify-between">
                <Card.Title class="text-lg">{budget.name}</Card.Title>
                <Badge variant={statusBadgeVariant(budget.status)}>
                  {budget.status}
                </Badge>
              </div>
              <Card.Description>{budget.type} • {budget.scope}</Card.Description>
            </Card.Header>
            <Card.Content class="space-y-4">
              <!-- Progress Bar -->
              <div class="space-y-2">
                <div class="flex items-center justify-between text-sm">
                  <span>Progress</span>
                  <span class={budget.statusColor}>
                    {budget.progressPercentage.toFixed(1)}%
                  </span>
                </div>
                <div class="bg-muted relative h-3 overflow-hidden rounded-full">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    style="width: {Math.min(
                      100,
                      budget.progressPercentage
                    )}%; background-color: {budget.progressColor}">
                  </div>
                  {#if budget.progressPercentage > 100}
                    <div
                      class="bg-destructive absolute top-0 left-0 h-full rounded-full opacity-75"
                      style="width: 100%">
                    </div>
                  {/if}
                </div>
              </div>

              <!-- Financial Details -->
              <div class="grid grid-cols-3 gap-4 text-sm">
                <div class="text-center">
                  <div class="font-medium">{currencyFormatter.format(budget.allocated)}</div>
                  <div class="text-muted-foreground">Allocated</div>
                </div>
                <div class="text-center">
                  <div class="font-medium">{currencyFormatter.format(budget.spent)}</div>
                  <div class="text-muted-foreground">Spent</div>
                </div>
                <div class="text-center">
                  <div
                    class={cn(
                      'font-medium',
                      budget.remaining < 0 ? 'text-destructive' : 'text-green-600'
                    )}>
                    {currencyFormatter.format(Math.abs(budget.remaining))}
                  </div>
                  <div class="text-muted-foreground">
                    {budget.remaining < 0 ? 'Over' : 'Remaining'}
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>
    </Tabs.Content>

    <!-- Spending Trends Tab -->
    <Tabs.Content value="trends" class="space-y-4">
      <Card.Root>
        <Card.Header>
          <Card.Title>Spending Trends</Card.Title>
          <Card.Description>Daily spending progression vs allocated budget</Card.Description>
        </Card.Header>
        <Card.Content>
          {#if aggregateData && aggregateData.combinedTrend.length > 0}
            <ChartContainer config={progressChartConfig} class="h-[300px] w-full">
              <Chart
                data={aggregateData.combinedTrend}
                x="day"
                y="allocated"
                yDomain={[0, null]}
                padding={{ left: 48, bottom: 24, right: 12, top: 12 }}
                tooltip={{ mode: 'bisect-x' }}>
                <Svg>
                  <Grid class="stroke-muted/20" />

                  <Axis
                    placement="left"
                    label="Amount ($)"
                    format={(value: number) => currencyFormatter.format(value).replace('$', '')}
                    labelProps={{ class: 'text-xs fill-muted-foreground' }} />
                  <Axis
                    placement="bottom"
                    label="Day of Month"
                    labelProps={{ class: 'text-xs fill-muted-foreground' }} />

                  <!-- Allocated budget line (target) -->
                  <Spline
                    y="allocated"
                    class="stroke-2"
                    style="stroke: {colorUtils.getChartColor(0)}; fill: none; opacity: 0.5;" />

                  <!-- Actual spending area and line -->
                  <Area
                    y="spent"
                    style="fill: {colorUtils.getFinancialColor('negative')}; opacity: 0.3;" />
                  <Spline
                    y="spent"
                    class="stroke-2"
                    style="stroke: {colorUtils.getFinancialColor('negative')}; fill: none;" />

                  <Highlight points lines>
                    {#snippet tooltip({ data })}
                      <div
                        class="bg-background/95 pointer-events-none rounded-lg border px-3 py-2 shadow-xl backdrop-blur-sm">
                        <div class="space-y-1 text-xs">
                          <div class="flex items-center justify-between gap-4">
                            <span class="text-muted-foreground">Day {data.day}</span>
                          </div>
                          <div class="flex items-center justify-between gap-4">
                            <div class="flex items-center gap-1.5">
                              <div
                                class="h-2 w-2 rounded-full"
                                style="background-color: {colorUtils.getChartColor(0)}">
                              </div>
                              <span class="text-muted-foreground">Allocated</span>
                            </div>
                            <span class="font-mono font-medium"
                              >{currencyFormatter.format(data.allocated)}</span>
                          </div>
                          <div class="flex items-center justify-between gap-4">
                            <div class="flex items-center gap-1.5">
                              <div
                                class="h-2 w-2 rounded-full"
                                style="background-color: {colorUtils.getFinancialColor(
                                  'negative'
                                )}">
                              </div>
                              <span class="text-muted-foreground">Spent</span>
                            </div>
                            <span class="font-mono font-medium"
                              >{currencyFormatter.format(data.spent)}</span>
                          </div>
                          <div class="flex items-center justify-between gap-4">
                            <div class="flex items-center gap-1.5">
                              <div
                                class="h-2 w-2 rounded-full"
                                style="background-color: {colorUtils.getFinancialColor(
                                  'positive'
                                )}">
                              </div>
                              <span class="text-muted-foreground">Remaining</span>
                            </div>
                            <span class="font-mono font-medium"
                              >{currencyFormatter.format(data.remaining)}</span>
                          </div>
                        </div>
                      </div>
                    {/snippet}
                  </Highlight>
                </Svg>
              </Chart>
            </ChartContainer>
          {:else}
            <div class="text-muted-foreground flex h-[300px] items-center justify-center">
              No data available for spending trends
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    </Tabs.Content>

    <!-- Budget Breakdown Tab -->
    <Tabs.Content value="breakdown" class="space-y-4">
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <!-- Donut Chart -->
        <Card.Root>
          <Card.Header>
            <Card.Title>Budget Allocation</Card.Title>
            <Card.Description>Distribution of allocated amounts</Card.Description>
          </Card.Header>
          <Card.Content>
            {#if donutChartData.length > 0}
              {@const pieGenerator = pie<(typeof donutChartData)[0]>()
                .value((d) => d.value)
                .padAngle(0.02)}
              {@const arcGenerator = d3arc<any, any>().innerRadius(60).outerRadius(90)}
              {@const arcs = pieGenerator(donutChartData)}

              <div class="flex h-[250px] w-full items-center justify-center">
                <svg viewBox="-125 -125 250 250" class="h-full max-h-[250px] w-full max-w-[250px]">
                  <g>
                    {#each arcs as arc, i}
                      {@const path = arcGenerator(arc as any)}
                      {@const item = arc.data}
                      {#if path}
                        <path
                          d={path}
                          fill={item.color}
                          stroke="white"
                          stroke-width="2"
                          class="cursor-pointer transition-all hover:opacity-80"
                          role="img"
                          aria-label="{item.name}: {currencyFormatter.format(
                            item.value
                          )} allocated">
                          <title>
                            {item.name}: {currencyFormatter.format(item.value)} allocated, {currencyFormatter.format(
                              item.spent
                            )} spent
                          </title>
                        </path>
                      {/if}
                    {/each}
                  </g>

                  <!-- Center text showing total -->
                  <g>
                    <text x="0" y="-5" text-anchor="middle" class="fill-muted-foreground text-xs">
                      Total
                    </text>
                    <text
                      x="0"
                      y="10"
                      text-anchor="middle"
                      class="fill-foreground text-sm font-semibold">
                      {currencyFormatter.format(aggregateData?.totalAllocated || 0)}
                    </text>
                  </g>
                </svg>
              </div>

              <!-- Legend below the chart -->
              <div class="mt-4 flex flex-wrap justify-center gap-3">
                {#each donutChartData as item}
                  <div class="flex items-center gap-1.5 text-xs">
                    <div class="h-2 w-2 rounded-full" style="background-color: {item.color}"></div>
                    <span class="text-muted-foreground">{item.name}</span>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="text-muted-foreground flex h-[250px] items-center justify-center">
                No budget allocation data available
              </div>
            {/if}
          </Card.Content>
        </Card.Root>

        <!-- Budget List -->
        <Card.Root>
          <Card.Header>
            <Card.Title>Budget Details</Card.Title>
            <Card.Description>Individual budget progress and status</Card.Description>
          </Card.Header>
          <Card.Content>
            <div class="space-y-3">
              {#each budgetProgressData as budget (budget.id)}
                <div class="flex items-center justify-between rounded-lg border p-3">
                  <div class="flex items-center gap-3">
                    <div
                      class="h-3 w-3 rounded-full"
                      style="background-color: {budget.progressColor}">
                    </div>
                    <div>
                      <div class="font-medium">{budget.name}</div>
                      <div class="text-muted-foreground text-xs">{budget.type}</div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-medium">{currencyFormatter.format(budget.allocated)}</div>
                    <div class="text-muted-foreground text-xs">
                      {budget.progressPercentage.toFixed(0)}% used
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </Card.Content>
        </Card.Root>
      </div>
    </Tabs.Content>
  </Tabs.Root>
</div>
