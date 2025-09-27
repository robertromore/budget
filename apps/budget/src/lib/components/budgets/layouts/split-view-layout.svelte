<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Tabs from "$lib/components/ui/tabs";
  import {Target, Wallet, TrendingUp, Calendar, Activity, ChartBar} from "@lucide/svelte/icons";
  import {Separator} from "$lib/components/ui/separator";
  import BudgetMetricCard from "../budget-metric-card.svelte";
  import BudgetChartPlaceholder from "../budget-chart-placeholder.svelte";
  import EnvelopeBudgetAdvanced from "../envelope-budget-advanced.svelte";
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

  // Budget metrics as individual derived variables
  const allocated = $derived(Math.abs((budget.metadata as any)?.allocatedAmount ?? 0));
  const latest = $derived(budget.periodTemplates?.[0]?.periods?.[0]);
  const spent = $derived(Math.abs(latest?.actualAmount ?? 0));
  const remaining = $derived(allocated - spent);
  const progressPercentage = $derived(allocated > 0 ? (spent / allocated) * 100 : 0);

  const daysInPeriod = $derived(30);
  const daysElapsed = $derived(15);
  const daysRemaining = $derived(daysInPeriod - daysElapsed);

  const status = $derived.by((): BudgetHealthStatus => {
    if (progressPercentage > 100) return "danger";
    if (progressPercentage > 90) return "warning";
    if (progressPercentage > 75) return "good";
    return "excellent";
  });
</script>

<div class="flex gap-6 {className}">
  <!-- Left Panel: Budget Overview (40%) -->
  <div class="w-2/5 space-y-4 flex-shrink-0">
    <!-- Budget Metadata -->
    <Card.Root>
      <Card.Header class="pb-4">
        <Card.Title class="flex items-center gap-2">
          <ChartBar class="h-4 w-4" />
          Budget Overview
        </Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span class="text-muted-foreground">Type:</span>
            <p class="font-medium capitalize">{budget.type.replace('-', ' ')}</p>
          </div>
          <div>
            <span class="text-muted-foreground">Status:</span>
            <p class="font-medium capitalize">{budget.status}</p>
          </div>
          <div>
            <span class="text-muted-foreground">Scope:</span>
            <p class="font-medium capitalize">{budget.scope}</p>
          </div>
          <div>
            <span class="text-muted-foreground">Enforcement:</span>
            <p class="font-medium capitalize">{budget.enforcementLevel || 'none'}</p>
          </div>
        </div>

        {#if budget.description}
          <Separator />
          <p class="text-sm text-muted-foreground">{budget.description}</p>
        {/if}
      </Card.Content>
    </Card.Root>

    <!-- Stacked Metrics -->
    <div class="space-y-3">
      <BudgetMetricCard
        title="Allocated Amount"
        value={allocated}
        format="currency"
        icon={Target}
        class="compact"
      />

      <BudgetMetricCard
        title="Amount Spent"
        value={spent}
        format="currency"
        subtitle="{progressPercentage.toFixed(1)}% of budget"
        icon={Wallet}
        status={status}
        progress={allocated > 0 ? {
          current: spent,
          total: allocated
        } : undefined}
      />

      <BudgetMetricCard
        title="Remaining"
        value={remaining}
        format="currency"
        icon={TrendingUp}
        status={remaining >= 0 ? "excellent" : "danger"}
      />

      <BudgetMetricCard
        title="Days Left"
        value={daysRemaining}
        format="days"
        icon={Calendar}
      />
    </div>

    <!-- Mini Progress Chart -->
    <BudgetChartPlaceholder
      title="Progress Summary"
      type="bar"
      height="150px"
    />
  </div>

  <!-- Right Panel: Interactive Content (60%) -->
  <div class="flex-1 min-w-0">
    <Tabs.Root value="management" class="h-full">
      <Tabs.List class="w-full">
        <Tabs.Trigger value="management" class="flex-1">Management</Tabs.Trigger>
        <Tabs.Trigger value="analytics" class="flex-1">Analytics</Tabs.Trigger>
        <Tabs.Trigger value="history" class="flex-1">History</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="management" class="mt-6">
        {#if budget.type === "category-envelope"}
          <EnvelopeBudgetAdvanced {budget} {categories} />
        {:else}
          <Card.Root>
            <Card.Header>
              <Card.Title>Budget Management</Card.Title>
              <Card.Description>
                Configure and manage your {budget.type} budget
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <div class="py-16 text-center text-muted-foreground">
                <Target class="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p class="text-lg font-medium mb-2">Management Interface</p>
                <p class="text-sm">
                  Budget management tools for {budget.type} budgets will appear here.
                </p>
              </div>
            </Card.Content>
          </Card.Root>
        {/if}
      </Tabs.Content>

      <Tabs.Content value="analytics" class="mt-6 space-y-6">
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <BudgetChartPlaceholder
            title="Spending Trends"
            type="line"
            description="Track spending over time"
          />
          <BudgetChartPlaceholder
            title="Category Breakdown"
            type="pie"
            description="Spending by category"
          />
        </div>

        <BudgetChartPlaceholder
          title="Budget Performance"
          type="area"
          description="Historical budget performance"
          height="250px"
        />
      </Tabs.Content>

      <Tabs.Content value="history" class="mt-6">
        <Card.Root>
          <Card.Header>
            <Card.Title>Transaction History</Card.Title>
            <Card.Description>
              Recent transactions affecting this budget
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <div class="py-16 text-center text-muted-foreground">
              <Activity class="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p class="text-lg font-medium mb-2">Transaction History</p>
              <p class="text-sm">
                Budget-related transaction history will be displayed here.
              </p>
            </div>
          </Card.Content>
        </Card.Root>
      </Tabs.Content>
    </Tabs.Root>
  </div>
</div>

<style>
  @media (max-width: 1024px) {
    .flex {
      flex-direction: column;
    }

    .w-2\/5 {
      width: 100%;
    }
  }
</style>
