<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import {
    Target,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Clock,
    DollarSign,
    BarChart3,
    Lightbulb
  } from "@lucide/svelte/icons";
  import BudgetMetricCard from "../budget-metric-card.svelte";
  import type { BudgetWithRelations } from "$lib/server/domains/budgets";
  import type { Category } from "$lib/schema/categories";

  interface Props {
    budget: BudgetWithRelations;
    categories: Category[];
    class?: string;
  }

  let {
    budget,
    categories,
    class: className,
  }: Props = $props();

  // Calculate budget metrics and insights
  const budgetInsights = $derived.by(() => {
    const allocated = Math.abs((budget.metadata as any)?.allocatedAmount ?? 0);
    const latest = budget.periodTemplates?.[0]?.periods?.[0];
    const spent = Math.abs(latest?.actualAmount ?? 0);
    const remaining = allocated - spent;
    const progressPercentage = allocated > 0 ? (spent / allocated) * 100 : 0;

    const daysInPeriod = 30;
    const daysElapsed = 15;
    const daysRemaining = daysInPeriod - daysElapsed;
    const burnRate = daysElapsed > 0 ? spent / daysElapsed : 0;
    const projectedSpend = burnRate * daysInPeriod;

    // Status determination
    let status: "excellent" | "good" | "warning" | "danger" = "excellent";
    let healthScore = 100;

    if (progressPercentage > 100) {
      status = "danger";
      healthScore = Math.max(0, 100 - (progressPercentage - 100) * 2);
    } else if (progressPercentage > 90) {
      status = "warning";
      healthScore = 100 - (progressPercentage - 75) * 2;
    } else if (progressPercentage > 75) {
      status = "good";
      healthScore = 100 - (progressPercentage - 50) * 0.5;
    }

    // Generate executive insights
    const insights = [];

    if (status === "excellent") {
      insights.push({
        type: "success",
        title: "Budget Performance Excellent",
        message: "Spending is well within limits with healthy reserves remaining.",
        icon: CheckCircle2
      });
    } else if (status === "danger") {
      insights.push({
        type: "danger",
        title: "Budget Exceeded",
        message: "Immediate action required to control spending.",
        icon: XCircle
      });
    } else if (status === "warning") {
      insights.push({
        type: "warning",
        title: "Approaching Budget Limit",
        message: "Monitor spending closely to avoid overruns.",
        icon: AlertCircle
      });
    }

    // Spending velocity insight
    if (projectedSpend > allocated * 1.1) {
      insights.push({
        type: "warning",
        title: "High Spending Velocity",
        message: `Current pace projects $${projectedSpend.toFixed(2)} total spend.`,
        icon: TrendingUp
      });
    }

    // Time vs budget insight
    const timeProgress = ((daysInPeriod - daysRemaining) / daysInPeriod) * 100;
    if (progressPercentage > timeProgress + 20) {
      insights.push({
        type: "info",
        title: "Ahead of Schedule",
        message: "Spending is outpacing the time remaining in period.",
        icon: Clock
      });
    }

    // Positive insights
    if (remaining > allocated * 0.3 && daysRemaining < 10) {
      insights.push({
        type: "success",
        title: "Strong Budget Control",
        message: "Excellent spending discipline maintained throughout period.",
        icon: Target
      });
    }

    return {
      allocated,
      spent,
      remaining,
      progressPercentage,
      status,
      healthScore,
      daysRemaining,
      burnRate,
      projectedSpend,
      insights,
      isOnTrack: projectedSpend <= allocated,
      recommendation: remaining > 0
        ? `$${(remaining / Math.max(daysRemaining, 1)).toFixed(2)} per day available`
        : "Spending reduction recommended"
    };
  });
</script>

<div class="space-y-8 {className}">
  <!-- Executive Summary Header -->
  <div class="text-center space-y-4 pb-8 border-b">
    <div class="flex items-center justify-center gap-3">
      <div class="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
        {#if budgetInsights.status === "excellent"}
          <CheckCircle2 class="h-6 w-6 text-green-500" />
        {:else if budgetInsights.status === "danger"}
          <XCircle class="h-6 w-6 text-red-500" />
        {:else if budgetInsights.status === "warning"}
          <AlertCircle class="h-6 w-6 text-yellow-500" />
        {:else}
          <Target class="h-6 w-6 text-blue-500" />
        {/if}
      </div>
      <div>
        <h2 class="text-2xl font-bold">Budget Health: {budgetInsights.healthScore.toFixed(0)}/100</h2>
        <p class="text-muted-foreground capitalize">{budgetInsights.status} Performance</p>
      </div>
    </div>

    <div class="max-w-2xl mx-auto">
      <p class="text-lg text-muted-foreground">
        {#if budgetInsights.status === "excellent"}
          Your budget is performing excellently with strong spending control and healthy reserves.
        {:else if budgetInsights.status === "good"}
          Budget performance is good with minor areas for attention.
        {:else if budgetInsights.status === "warning"}
          Budget requires monitoring - approaching critical spending levels.
        {:else}
          Budget has exceeded limits - immediate action required.
        {/if}
      </p>
    </div>
  </div>

  <!-- Key Performance Indicators -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <BudgetMetricCard
      title="Budget Status"
      value={budgetInsights.progressPercentage}
      format="percentage"
      subtitle="of budget used"
      icon={Target}
      status={budgetInsights.status}
    />

    <BudgetMetricCard
      title="Financial Impact"
      value={budgetInsights.remaining}
      format="currency"
      subtitle="remaining balance"
      icon={DollarSign}
      status={budgetInsights.remaining >= 0 ? "good" : "danger"}
    />

    <BudgetMetricCard
      title="Time Remaining"
      value={budgetInsights.daysRemaining}
      format="days"
      subtitle="in current period"
      icon={Clock}
      status="good"
    />

    <BudgetMetricCard
      title="Projected Outcome"
      value={budgetInsights.projectedSpend}
      format="currency"
      subtitle="estimated total"
      icon={BarChart3}
      status={budgetInsights.isOnTrack ? "good" : "warning"}
    />
  </div>

  <!-- Executive Insights -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <!-- Key Insights -->
    <Card.Root>
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Lightbulb class="h-5 w-5" />
          Key Insights
        </Card.Title>
        <Card.Description>Critical observations and recommendations</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4">
        {#each budgetInsights.insights as insight}
          <div class="flex items-start gap-3 p-4 rounded-lg {
            insight.type === 'success' ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800' :
            insight.type === 'danger' ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800' :
            insight.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800' :
            'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800'
          }">
            <div class="mt-0.5">
              <insight.icon class="h-5 w-5 {
                insight.type === 'success' ? 'text-green-600' :
                insight.type === 'danger' ? 'text-red-600' :
                insight.type === 'warning' ? 'text-yellow-600' :
                'text-blue-600'
              }" />
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="font-semibold text-sm">{insight.title}</h4>
              <p class="text-sm text-muted-foreground mt-1">{insight.message}</p>
            </div>
          </div>
        {/each}
      </Card.Content>
    </Card.Root>

    <!-- Performance Summary -->
    <Card.Root>
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <BarChart3 class="h-5 w-5" />
          Performance Summary
        </Card.Title>
        <Card.Description>Budget performance at a glance</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-6">
        <!-- Budget Progress Visualization -->
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-sm font-medium">Budget Utilization</span>
            <Badge variant={budgetInsights.status === 'danger' ? 'destructive' : budgetInsights.status === 'warning' ? 'secondary' : 'default'}>
              {budgetInsights.progressPercentage.toFixed(1)}%
            </Badge>
          </div>
          <div class="w-full bg-secondary rounded-full h-3">
            <div
              class="h-3 rounded-full {
                budgetInsights.status === 'danger' ? 'bg-red-500' :
                budgetInsights.status === 'warning' ? 'bg-yellow-500' :
                'bg-green-500'
              }"
              style="width: {Math.min(budgetInsights.progressPercentage, 100)}%"
            ></div>
          </div>
        </div>

        <!-- Key Metrics -->
        <div class="grid grid-cols-2 gap-4 pt-4 border-t">
          <div class="text-center">
            <p class="text-2xl font-bold text-green-600">${budgetInsights.allocated.toFixed(0)}</p>
            <p class="text-sm text-muted-foreground">Allocated</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold {budgetInsights.spent > budgetInsights.allocated ? 'text-red-600' : 'text-blue-600'}">
              ${budgetInsights.spent.toFixed(0)}
            </p>
            <p class="text-sm text-muted-foreground">Spent</p>
          </div>
        </div>

        <!-- Executive Recommendation -->
        <div class="pt-4 border-t">
          <div class="flex items-center gap-2 mb-2">
            <TrendingUp class="h-4 w-4 text-primary" />
            <span class="font-medium text-sm">Recommendation</span>
          </div>
          <p class="text-sm text-muted-foreground">{budgetInsights.recommendation}</p>
        </div>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Health Score Breakdown -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Budget Health Factors</Card.Title>
      <Card.Description>Components contributing to your overall budget health score</Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="text-center space-y-2">
          <div class="h-16 w-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
            <Target class="h-8 w-8 text-primary" />
          </div>
          <h3 class="font-semibold">Spending Control</h3>
          <p class="text-sm text-muted-foreground">
            {budgetInsights.progressPercentage < 75 ? "Excellent" :
             budgetInsights.progressPercentage < 90 ? "Good" :
             budgetInsights.progressPercentage < 100 ? "Fair" : "Poor"}
          </p>
        </div>

        <div class="text-center space-y-2">
          <div class="h-16 w-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
            <Clock class="h-8 w-8 text-primary" />
          </div>
          <h3 class="font-semibold">Pacing</h3>
          <p class="text-sm text-muted-foreground">
            {budgetInsights.isOnTrack ? "On Track" : "Behind"}
          </p>
        </div>

        <div class="text-center space-y-2">
          <div class="h-16 w-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
            <TrendingUp class="h-8 w-8 text-primary" />
          </div>
          <h3 class="font-semibold">Trend</h3>
          <p class="text-sm text-muted-foreground">
            {budgetInsights.burnRate < (budgetInsights.allocated / 30) ? "Improving" : "Stable"}
          </p>
        </div>
      </div>
    </Card.Content>
  </Card.Root>
</div>