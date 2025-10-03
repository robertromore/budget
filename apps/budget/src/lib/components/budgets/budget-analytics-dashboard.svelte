<script lang="ts">
  import {SvelteMap} from "svelte/reactivity";
  import * as Card from "$lib/components/ui/card";
  import {Badge, type BadgeVariant} from "$lib/components/ui/badge";
  import Progress from "$lib/components/ui/progress/progress.svelte";
  import * as Tabs from "$lib/components/ui/tabs";
  import ChartPlaceholder from "$lib/components/ui/chart-placeholder.svelte";
  import {cn} from "$lib/utils";
  import {currencyFormatter} from "$lib/utils/formatters";
  import {listBudgets, getSpendingTrends} from "$lib/query/budgets";
  import {
    TrendingUp,
    AlertTriangle,
    Target,
    PiggyBank,
    CreditCard,
    Calendar,
    ChartBar,
    ChartLine,
    ChartPie,
    DollarSign
  } from "@lucide/svelte/icons";
  import type {BudgetWithRelations} from "$lib/server/domains/budgets";

  interface Props {
    budgets?: BudgetWithRelations[];
    className?: string;
  }

  let {budgets = [], className}: Props = $props();

  const budgetsQuery = listBudgets().options();
  const allBudgets = $derived.by(() => budgets.length > 0 ? budgets : ($budgetsQuery.data ?? []));

  // Analytics calculations
  const totalAllocated = $derived.by(() => {
    return allBudgets.reduce((sum, budget) => {
      const allocated = Math.abs((budget.metadata as any)?.allocatedAmount ?? 0);
      return sum + allocated;
    }, 0);
  });

  const totalSpent = $derived.by(() => {
    return allBudgets.reduce((sum, budget) => {
      const latest = budget.periodTemplates?.[0]?.periods?.[0];
      const spent = Math.abs(latest?.actualAmount ?? 0);
      return sum + spent;
    }, 0);
  });

  const totalRemaining = $derived.by(() => totalAllocated - totalSpent);
  const overallProgress = $derived.by(() => totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0);

  const activeBudgets = $derived.by(() => allBudgets.filter(b => b.status === 'active'));
  const pausedBudgets = $derived.by(() => allBudgets.filter(b => b.status === 'inactive'));
  const overdraftBudgets = $derived.by(() =>
    allBudgets.filter(b => {
      const allocated = Math.abs((b.metadata as any)?.allocatedAmount ?? 0);
      const latest = b.periodTemplates?.[0]?.periods?.[0];
      const spent = Math.abs(latest?.actualAmount ?? 0);
      return spent > allocated;
    })
  );

  // Budget performance insights
  const budgetPerformance = $derived.by(() => {
    return allBudgets.map(budget => {
      const allocated = Math.abs((budget.metadata as any)?.allocatedAmount ?? 0);
      const latest = budget.periodTemplates?.[0]?.periods?.[0];
      const spent = Math.abs(latest?.actualAmount ?? 0);
      const remaining = allocated - spent;
      const utilizationRate = allocated > 0 ? (spent / allocated) * 100 : 0;

      let status: 'excellent' | 'good' | 'warning' | 'danger' = 'excellent';
      if (utilizationRate > 100) status = 'danger';
      else if (utilizationRate > 80) status = 'warning';
      else if (utilizationRate > 60) status = 'good';

      return {
        ...budget,
        allocated,
        spent,
        remaining,
        utilizationRate,
        status
      };
    }).sort((a, b) => b.utilizationRate - a.utilizationRate);
  });

  // Fetch spending trends for the first budget (for demonstration)
  const firstBudget = $derived(allBudgets[0]);
  const spendingTrendsQuery = $derived.by(() => {
    if (!firstBudget?.id) return null;
    return getSpendingTrends(firstBudget.id).options();
  });

  // Chart data for spending trends
  const spendingTrendData = $derived.by(() => {
    const trendsData = spendingTrendsQuery ? $spendingTrendsQuery.data : null;

    if (!trendsData || trendsData.length === 0) {
      // Fallback to empty data if no real data available
      return [];
    }

    return trendsData.map((period) => ({
      month: new Date(period.startDate).toLocaleDateString('en-US', { month: 'short' }),
      allocated: period.allocated,
      spent: period.actual,
      date: new Date(period.startDate)
    }));
  });

  // Color mapping for budget types
  const typeColorMap = new SvelteMap([
    ['account-monthly', 'hsl(var(--primary))'],
    ['category-envelope', 'hsl(var(--secondary))'],
    ['goal-based', 'hsl(var(--accent))'],
    ['scheduled-expense', 'hsl(var(--muted))'],
    ['general', 'hsl(var(--foreground))'],
  ]);

  function getTypeColor(type: string): string {
    return typeColorMap.get(type) ?? 'hsl(var(--foreground))';
  }

  // Budget category breakdown
  const categoryBreakdown = $derived.by(() => {
    const categories = allBudgets.reduce((acc, budget) => {
      const type = budget.type || 'general';
      const allocated = Math.abs((budget.metadata as any)?.allocatedAmount ?? 0);

      if (!acc[type]) {
        acc[type] = {
          name: type.charAt(0).toUpperCase() + type.slice(1),
          value: 0,
          count: 0,
          color: getTypeColor(type)
        };
      }

      acc[type].value += allocated;
      acc[type].count += 1;
      return acc;
    }, {} as Record<string, {name: string, value: number, count: number, color: string}>);

    return Object.values(categories);
  });

  function getStatusColor(status: string): string {
    const colors = {
      excellent: 'text-green-600',
      good: 'text-blue-600',
      warning: 'text-orange-600',
      danger: 'text-red-600'
    };
    return colors[status as keyof typeof colors] || colors.excellent;
  }

  function getStatusBadgeVariant(status: string): BadgeVariant {
    const variants = {
      excellent: 'default' as const,
      good: 'secondary' as const,
      warning: 'outline' as const,
      danger: 'destructive' as const
    };
    return variants[status as keyof typeof variants] || 'default';
  }

  // Chart configurations
  const chartConfig = {
    allocated: {
      label: "Allocated",
      color: "hsl(var(--primary))"
    },
    spent: {
      label: "Spent",
      color: "hsl(var(--destructive))"
    }
  };

  const pieChartConfig = $derived.by(() => {
    return categoryBreakdown.reduce((config, category) => {
      config[category.name.toLowerCase()] = {
        label: category.name,
        color: category.color
      };
      return config;
    }, {} as Record<string, {label: string, color: string}>);
  });
</script>

<div class={cn("space-y-6", className)}>
  <!-- Overview Cards -->
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
    <!-- Total Allocated -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Total Allocated</Card.Title>
        <DollarSign class="h-4 w-4 text-muted-foreground" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{currencyFormatter.format(totalAllocated)}</div>
        <p class="text-xs text-muted-foreground">
          Across {allBudgets.length} budget{allBudgets.length !== 1 ? 's' : ''}
        </p>
      </Card.Content>
    </Card.Root>

    <!-- Total Spent -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Total Spent</Card.Title>
        <CreditCard class="h-4 w-4 text-muted-foreground" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{currencyFormatter.format(totalSpent)}</div>
        <p class="text-xs text-muted-foreground">
          {overallProgress.toFixed(1)}% of allocated funds
        </p>
      </Card.Content>
    </Card.Root>

    <!-- Remaining Budget -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Remaining</Card.Title>
        <PiggyBank class="h-4 w-4 text-muted-foreground" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold {totalRemaining < 0 ? 'text-destructive' : 'text-green-600'}">
          {currencyFormatter.format(Math.abs(totalRemaining))}
        </div>
        <p class="text-xs text-muted-foreground">
          {totalRemaining < 0 ? 'Over budget' : 'Under budget'}
        </p>
      </Card.Content>
    </Card.Root>

    <!-- Budget Health -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Budget Health</Card.Title>
        <Target class="h-4 w-4 text-muted-foreground" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">
          {activeBudgets.length}/{allBudgets.length}
        </div>
        <p class="text-xs text-muted-foreground">
          Active budgets • {overdraftBudgets.length} over limit
        </p>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Charts and Analytics -->
  <Tabs.Root value="trends" class="space-y-4">
    <Tabs.List class="grid w-full grid-cols-3">
      <Tabs.Trigger value="trends">
        <ChartLine class="mr-2 h-4 w-4" />
        Trends
      </Tabs.Trigger>
      <Tabs.Trigger value="breakdown">
        <ChartPie class="mr-2 h-4 w-4" />
        Breakdown
      </Tabs.Trigger>
      <Tabs.Trigger value="performance">
        <ChartBar class="mr-2 h-4 w-4" />
        Performance
      </Tabs.Trigger>
    </Tabs.List>

    <!-- Spending Trends Tab -->
    <Tabs.Content value="trends" class="space-y-4">
      <Card.Root>
        <Card.Header>
          <Card.Title>Spending Trends</Card.Title>
          <Card.Description>
            Compare allocated vs actual spending over time
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <ChartPlaceholder class="h-[300px]" title="Spending Trends Chart" />
        </Card.Content>
      </Card.Root>
    </Tabs.Content>

    <!-- Category Breakdown Tab -->
    <Tabs.Content value="breakdown" class="space-y-4">
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <!-- Pie Chart -->
        <Card.Root>
          <Card.Header>
            <Card.Title>Budget Types</Card.Title>
            <Card.Description>
              Distribution of allocated funds by budget type
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <ChartPlaceholder class="h-[250px]" title="Budget Types Chart" />
          </Card.Content>
        </Card.Root>

        <!-- Category List -->
        <Card.Root>
          <Card.Header>
            <Card.Title>Category Details</Card.Title>
            <Card.Description>
              Breakdown by budget type and count
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <div class="space-y-3">
              {#each categoryBreakdown as category}
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="h-3 w-3 rounded-sm" style="background-color: {category.color}"></div>
                    <span class="text-sm font-medium">{category.name}</span>
                    <Badge variant="secondary" class="text-xs">
                      {category.count} budget{category.count !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <span class="text-sm font-mono">{currencyFormatter.format(category.value)}</span>
                </div>
              {/each}
            </div>
          </Card.Content>
        </Card.Root>
      </div>
    </Tabs.Content>

    <!-- Budget Performance Tab -->
    <Tabs.Content value="performance" class="space-y-4">
      <Card.Root>
        <Card.Header>
          <Card.Title>Budget Performance</Card.Title>
          <Card.Description>
            Individual budget utilization and status
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="space-y-4">
            {#each budgetPerformance as budget}
              <div class="flex items-center justify-between rounded-lg border p-3">
                <div class="flex flex-1 items-center gap-3">
                  <div class="flex flex-col">
                    <span class="font-medium">{budget.name}</span>
                    <span class="text-xs text-muted-foreground">{budget.type}</span>
                  </div>

                  <div class="flex flex-1 items-center gap-2">
                    <Progress value={Math.min(budget.utilizationRate, 100)} class="flex-1" />
                    <span class="text-xs font-mono text-muted-foreground">
                      {budget.utilizationRate.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <div class="text-right">
                    <div class="text-sm font-mono">
                      {currencyFormatter.format(budget.spent)} / {currencyFormatter.format(budget.allocated)}
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {currencyFormatter.format(Math.abs(budget.remaining))}
                      {budget.remaining < 0 ? 'over' : 'left'}
                    </div>
                  </div>

                  <Badge variant={getStatusBadgeVariant(budget.status)} class="ml-2">
                    {budget.status}
                  </Badge>
                </div>
              </div>
            {/each}

            {#if budgetPerformance.length === 0}
              <div class="py-8 text-center text-muted-foreground">
                No budget performance data available
              </div>
            {/if}
          </div>
        </Card.Content>
      </Card.Root>
    </Tabs.Content>
  </Tabs.Root>

  <!-- Insights and Alerts -->
  {#if overdraftBudgets.length > 0 || pausedBudgets.length > 0}
    <Card.Root class="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20">
      <Card.Header>
        <Card.Title class="flex items-center gap-2 text-orange-800 dark:text-orange-200">
          <AlertTriangle class="h-5 w-5" />
          Budget Alerts
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="space-y-2">
          {#if overdraftBudgets.length > 0}
            <div class="flex items-center gap-2 text-sm">
              <TrendingUp class="h-4 w-4 text-red-600" />
              <span class="text-red-800 dark:text-red-200">
                {overdraftBudgets.length} budget{overdraftBudgets.length !== 1 ? 's are' : ' is'} over limit
              </span>
            </div>
          {/if}

          {#if pausedBudgets.length > 0}
            <div class="flex items-center gap-2 text-sm">
              <Calendar class="h-4 w-4 text-orange-600" />
              <span class="text-orange-800 dark:text-orange-200">
                {pausedBudgets.length} budget{pausedBudgets.length !== 1 ? 's are' : ' is'} paused
              </span>
            </div>
          {/if}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
