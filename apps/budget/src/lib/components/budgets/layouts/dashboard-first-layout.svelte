<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Tabs from "$lib/components/ui/tabs";
  import Target from "@lucide/svelte/icons/target";
  import Wallet from "@lucide/svelte/icons/wallet";
  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import Calendar from "@lucide/svelte/icons/calendar";
  import Activity from "@lucide/svelte/icons/activity";
  import AlertCircle from "@lucide/svelte/icons/alert-circle";
  import BudgetMetricCard from "../budget-metric-card.svelte";
  import BudgetChartPlaceholder from "../budget-chart-placeholder.svelte";
  import EnvelopeBudgetAdvanced from "../envelope-budget-advanced.svelte";
  import {calculateActualSpent} from "$lib/utils/budget-calculations";
  import type {BudgetWithRelations} from "$lib/server/domains/budgets";
  import type {Category} from "$lib/schema/categories";
  import type {BudgetHealthStatus} from "$lib/schema/budgets";

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

  // Basic budget values
  const allocated = $derived(Math.abs((budget.metadata as any)?.allocatedAmount ?? 0));
  const spent = $derived(calculateActualSpent(budget));
  const remaining = $derived(allocated - spent);
  const progressPercentage = $derived(allocated > 0 ? (spent / allocated) * 100 : 0);

  // Time period calculations (mock data for now)
  const daysInPeriod = $derived(30);
  const daysElapsed = $derived(15);
  const daysRemaining = $derived(daysInPeriod - daysElapsed);
  const burnRate = $derived(daysElapsed > 0 ? spent / daysElapsed : 0);
  const projectedSpend = $derived(burnRate * daysInPeriod);

  // Status and tracking
  const status = $derived.by((): BudgetHealthStatus => {
    if (progressPercentage > 100) return "danger";
    if (progressPercentage > 90) return "warning";
    if (progressPercentage > 75) return "good";
    return "excellent";
  });
  const isOnTrack = $derived(projectedSpend <= allocated);
</script>

<div class="space-y-6 {className}">
  <!-- KPI Cards Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <BudgetMetricCard
      title="Total Allocated"
      value={allocated}
      format="currency"
      subtitle="Budget limit"
      icon={Target}
      {...(allocated > 0 ? { status: "good" } : {})}
    />

    <BudgetMetricCard
      title="Spent"
      value={spent}
      format="currency"
      subtitle="{progressPercentage.toFixed(1)}% of budget"
      icon={Wallet}
      status={status}
      {...(allocated > 0 ? {
        progress: {
          current: spent,
          total: allocated
        }
      } : {})}
    />

    <BudgetMetricCard
      title="Remaining"
      value={remaining}
      format="currency"
      subtitle="Available to spend"
      icon={TrendingUp}
      status={remaining >= 0 ? "excellent" : "danger"}
    />

    <BudgetMetricCard
      title="Days Left"
      value={daysRemaining}
      format="days"
      subtitle="In current period"
      icon={Calendar}
      trend={isOnTrack ? {
        value: 5,
        direction: "up",
        period: "vs projected"
      } : {
        value: 15,
        direction: "down",
        period: "vs projected"
      }}
    />
  </div>

  <!-- Performance Indicators Row -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <BudgetMetricCard
      title="Daily Burn Rate"
      value={burnRate}
      format="currency"
      subtitle="Average per day"
      icon={Activity}
      status="good"
    />

    <BudgetMetricCard
      title="Projected Spend"
      value={projectedSpend}
      format="currency"
      subtitle="End of period estimate"
      icon={TrendingUp}
      status={isOnTrack ? "good" : "warning"}
    />

    <BudgetMetricCard
      title="Budget Health"
      value={progressPercentage}
      format="percentage"
      subtitle="Overall status"
      icon={AlertCircle}
      status={status}
    />
  </div>

  <!-- Visual Progress Section -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Budget Analytics</Card.Title>
      <Card.Description>Visual breakdown of budget performance and trends</Card.Description>
    </Card.Header>
    <Card.Content>
      <Tabs.Root value="overview" class="w-full">
        <Tabs.List class="grid w-full grid-cols-3">
          <Tabs.Trigger value="overview">Progress Overview</Tabs.Trigger>
          <Tabs.Trigger value="trends">Spending Trends</Tabs.Trigger>
          <Tabs.Trigger value="breakdown">Category Breakdown</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview" class="mt-6">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BudgetChartPlaceholder
              title="Budget Progress"
              type="bar"
              description="Allocated vs spent vs remaining"
              height="250px"
            />
            <BudgetChartPlaceholder
              title="Daily Spending"
              type="line"
              description="Daily spending pattern"
              height="250px"
            />
          </div>
        </Tabs.Content>

        <Tabs.Content value="trends" class="mt-6">
          <BudgetChartPlaceholder
            title="Spending Trends"
            type="area"
            description="Historical spending patterns over time"
            height="300px"
          />
        </Tabs.Content>

        <Tabs.Content value="breakdown" class="mt-6">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BudgetChartPlaceholder
              title="Category Distribution"
              type="pie"
              description="Spending by category"
              height="300px"
            />
            <BudgetChartPlaceholder
              title="Budget Utilization"
              type="bar"
              description="Utilization rate by category"
              height="300px"
            />
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </Card.Content>
  </Card.Root>

  <!-- Detail Management Section -->
  {#if budget.type === "category-envelope"}
    <EnvelopeBudgetAdvanced {budget} {categories} />
  {:else}
    <Card.Root>
      <Card.Header>
        <Card.Title>Budget Management</Card.Title>
        <Card.Description>
          Management interface for {budget.type} budgets
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="py-12 text-center text-muted-foreground">
          <Target class="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p class="text-lg font-medium mb-2">Management Interface Coming Soon</p>
          <p class="text-sm">
            Advanced management features for {budget.type} budgets will be available here.
          </p>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>