<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Collapsible from "$lib/components/ui/collapsible";
  import {Button} from "$lib/components/ui/button";
  import {ChevronDown, ChevronUp, Target, TrendingUp, BarChart, Activity, Settings} from "@lucide/svelte/icons";
  import BudgetMetricCard from "../budget-metric-card.svelte";
  import BudgetChartPlaceholder from "../budget-chart-placeholder.svelte";
  import EnvelopeBudgetAdvanced from "../envelope-budget-advanced.svelte";
  import type {BudgetWithRelations} from "$lib/server/domains/budgets";
  import type {Category} from "$lib/schema/categories";

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

  // Section visibility state
  let overviewOpen = $state(true);
  let performanceOpen = $state(false);
  let allocationsOpen = $state(false);
  let analyticsOpen = $state(false);

  // Calculate budget metrics
  const budgetMetrics = $derived.by(() => {
    const allocated = Math.abs((budget.metadata as any)?.allocatedAmount ?? 0);
    const latest = budget.periodTemplates?.[0]?.periods?.[0];
    const spent = Math.abs(latest?.actualAmount ?? 0);
    const remaining = allocated - spent;
    const progressPercentage = allocated > 0 ? (spent / allocated) * 100 : 0;

    const daysInPeriod = 30;
    const daysElapsed = 15;
    const daysRemaining = daysInPeriod - daysElapsed;
    const burnRate = daysElapsed > 0 ? spent / daysElapsed : 0;

    let status: "excellent" | "good" | "warning" | "danger" = "excellent";
    if (progressPercentage > 100) status = "danger";
    else if (progressPercentage > 90) status = "warning";
    else if (progressPercentage > 75) status = "good";

    return {
      allocated,
      spent,
      remaining,
      progressPercentage,
      status,
      daysRemaining,
      burnRate,
    };
  });

</script>

<div class="space-y-4 {className}">
  <!-- Overview & Health Section (Expanded by Default) -->
  <Card.Root>
    <Collapsible.Root bind:open={overviewOpen}>
      <Collapsible.Trigger class="w-full">
        <Card.Header class="hover:bg-muted/50 cursor-pointer transition-colors">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <Target class="h-5 w-5 text-muted-foreground" />
              <div>
                <Card.Title class="text-lg">Overview & Health</Card.Title>
                <Card.Description>Budget summary and current health status</Card.Description>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              {#if overviewOpen}
                <ChevronUp class="h-4 w-4" />
              {:else}
                <ChevronDown class="h-4 w-4" />
              {/if}
            </Button>
          </div>
        </Card.Header>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Card.Content class="pt-0">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <BudgetMetricCard
              title="Allocated"
              value={budgetMetrics.allocated}
              format="currency"
              status="good"
            />
            <BudgetMetricCard
              title="Spent"
              value={budgetMetrics.spent}
              format="currency"
              subtitle="{budgetMetrics.progressPercentage.toFixed(1)}%"
              status={budgetMetrics.status}
            />
            <BudgetMetricCard
              title="Remaining"
              value={budgetMetrics.remaining}
              format="currency"
              status={budgetMetrics.remaining >= 0 ? "excellent" : "danger"}
            />
          </div>

          <!-- Budget metadata in a compact layout -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm p-4 bg-muted/20 rounded-lg">
            <div>
              <span class="text-muted-foreground block">Type</span>
              <span class="font-medium capitalize">{budget.type.replace('-', ' ')}</span>
            </div>
            <div>
              <span class="text-muted-foreground block">Status</span>
              <span class="font-medium capitalize">{budget.status}</span>
            </div>
            <div>
              <span class="text-muted-foreground block">Scope</span>
              <span class="font-medium capitalize">{budget.scope}</span>
            </div>
            <div>
              <span class="text-muted-foreground block">Enforcement</span>
              <span class="font-medium capitalize">{budget.enforcementLevel || 'none'}</span>
            </div>
          </div>
        </Card.Content>
      </Collapsible.Content>
    </Collapsible.Root>
  </Card.Root>

  <!-- Period Performance Section -->
  <Card.Root>
    <Collapsible.Root bind:open={performanceOpen}>
      <Collapsible.Trigger class="w-full">
        <Card.Header class="hover:bg-muted/50 cursor-pointer transition-colors">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <TrendingUp class="h-5 w-5 text-muted-foreground" />
              <div>
                <Card.Title class="text-lg">Period Performance</Card.Title>
                <Card.Description>Current period spending analysis and trends</Card.Description>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              {#if performanceOpen}
                <ChevronUp class="h-4 w-4" />
              {:else}
                <ChevronDown class="h-4 w-4" />
              {/if}
            </Button>
          </div>
        </Card.Header>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Card.Content class="pt-0">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <BudgetMetricCard
              title="Days Remaining"
              value={budgetMetrics.daysRemaining}
              format="days"
              subtitle="In current period"
            />
            <BudgetMetricCard
              title="Burn Rate"
              value={budgetMetrics.burnRate}
              format="currency"
              subtitle="Per day average"
            />
            <BudgetMetricCard
              title="Budget Progress"
              value={budgetMetrics.progressPercentage}
              format="percentage"
              status={budgetMetrics.status}
            />
          </div>

          <BudgetChartPlaceholder
            title="Daily Spending Pattern"
            type="line"
            description="Track daily spending within the current period"
            height="200px"
          />
        </Card.Content>
      </Collapsible.Content>
    </Collapsible.Root>
  </Card.Root>

  <!-- Allocations & Management Section -->
  <Card.Root>
    <Collapsible.Root bind:open={allocationsOpen}>
      <Collapsible.Trigger class="w-full">
        <Card.Header class="hover:bg-muted/50 cursor-pointer transition-colors">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <Settings class="h-5 w-5 text-muted-foreground" />
              <div>
                <Card.Title class="text-lg">Allocations & Management</Card.Title>
                <Card.Description>Manage budget allocations, envelopes, and fund transfers</Card.Description>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              {#if allocationsOpen}
                <ChevronUp class="h-4 w-4" />
              {:else}
                <ChevronDown class="h-4 w-4" />
              {/if}
            </Button>
          </div>
        </Card.Header>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Card.Content class="pt-0">
          {#if budget.type === "category-envelope"}
            <EnvelopeBudgetAdvanced {budget} {categories} />
          {:else}
            <div class="py-12 text-center text-muted-foreground">
              <Settings class="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p class="text-lg font-medium mb-2">Allocation Management</p>
              <p class="text-sm">
                Management interface for {budget.type} budget allocations.
              </p>
            </div>
          {/if}
        </Card.Content>
      </Collapsible.Content>
    </Collapsible.Root>
  </Card.Root>

  <!-- Analytics & Trends Section -->
  <Card.Root>
    <Collapsible.Root bind:open={analyticsOpen}>
      <Collapsible.Trigger class="w-full">
        <Card.Header class="hover:bg-muted/50 cursor-pointer transition-colors">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <BarChart class="h-5 w-5 text-muted-foreground" />
              <div>
                <Card.Title class="text-lg">Analytics & Trends</Card.Title>
                <Card.Description>Historical data, trends, and detailed breakdowns</Card.Description>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              {#if analyticsOpen}
                <ChevronUp class="h-4 w-4" />
              {:else}
                <ChevronDown class="h-4 w-4" />
              {/if}
            </Button>
          </div>
        </Card.Header>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Card.Content class="pt-0">
          <div class="space-y-6">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BudgetChartPlaceholder
                title="Spending Trends"
                type="area"
                description="Historical spending patterns"
              />
              <BudgetChartPlaceholder
                title="Category Breakdown"
                type="pie"
                description="Spending distribution by category"
              />
            </div>

            <BudgetChartPlaceholder
              title="Budget Performance History"
              type="line"
              description="Track budget performance over multiple periods"
              height="250px"
            />

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BudgetChartPlaceholder
                title="Monthly Comparison"
                type="bar"
                description="Compare spending across months"
                height="200px"
              />
              <BudgetChartPlaceholder
                title="Variance Analysis"
                type="bar"
                description="Budget vs actual variance"
                height="200px"
              />
            </div>
          </div>
        </Card.Content>
      </Collapsible.Content>
    </Collapsible.Root>
  </Card.Root>
</div>