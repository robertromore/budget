<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import {Button} from "$lib/components/ui/button";
  import {Badge} from "$lib/components/ui/badge";
  import {ArrowLeft, Settings, CircleDollarSign} from "@lucide/svelte/icons";
  import EnvelopeBudgetAdvanced from "$lib/components/budgets/envelope-budget-advanced.svelte";
  import BudgetProgressCharts from "$lib/components/budgets/budget-progress-charts.svelte";

  let {data} = $props();

  // Get data from server
  const budget = data.budget;
  const categories = data.categories;

</script>

<svelte:head>
  <title>{budget.name} - Budget Details</title>
</svelte:head>

<!-- Header -->
<section class="flex items-center justify-between gap-4 py-6">
  <div class="flex items-center gap-4">
    <Button variant="ghost" size="sm" onclick={() => history.back()}>
      <ArrowLeft class="h-4 w-4" />
    </Button>
    <div>
      <h1 class="text-3xl font-semibold text-foreground">{budget.name}</h1>
      <div class="flex items-center gap-2 mt-1">
        <Badge variant="secondary">{budget.type}</Badge>
        <Badge variant="outline">{budget.status}</Badge>
        <span class="text-sm text-muted-foreground">{budget.description}</span>
      </div>
    </div>
  </div>
  <Button variant="outline" size="sm">
    <Settings class="h-4 w-4 mr-2" />
    Settings
  </Button>
</section>

<!-- Budget type specific content -->
{#if budget.type === "category-envelope"}
  <!-- Demo message -->
  <Card.Root class="bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-700 mb-6">
    <Card.Content class="py-4">
      <div class="flex items-center gap-3">
        <CircleDollarSign class="h-5 w-5 text-blue-600" />
        <div>
          <h3 class="font-medium text-blue-900 dark:text-blue-100">Envelope Budget System Active</h3>
          <p class="text-sm text-blue-700 dark:text-blue-300">
            This demonstrates the complete envelope budgeting system with fund allocation,
            deficit recovery, and transfer capabilities between envelopes.
          </p>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Budget Progress Charts -->
  <div class="mb-6">
    <BudgetProgressCharts
      budgets={[budget]}
      selectedBudgetId={budget.id}
      timeRange="month"
    />
  </div>

  <!-- Envelope Budget Advanced -->
  {#if budget && categories}
    <EnvelopeBudgetAdvanced
      {budget}
      {categories}
    />
  {:else}
    <Card.Root>
      <Card.Content class="py-16 text-center">
        <p class="text-muted-foreground">Loading envelope budget data...</p>
      </Card.Content>
    </Card.Root>
  {/if}
{:else}
  <!-- Progress Charts for other budget types -->
  <div class="mb-6">
    <BudgetProgressCharts
      budgets={[budget]}
      selectedBudgetId={budget.id}
      timeRange="month"
    />
  </div>

  <!-- Fallback for other budget types -->
  <Card.Root>
    <Card.Content class="py-16 text-center">
      <p class="text-muted-foreground">
        Budget type "{budget.type}" management interface coming soon.
      </p>
      <p class="text-sm text-muted-foreground mt-2">
        Currently showing progress visualization and envelope-style management for category-envelope budgets.
      </p>
    </Card.Content>
  </Card.Root>
{/if}