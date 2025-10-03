<script lang="ts">
import {Button} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Tabs from '$lib/components/ui/tabs';
import {Badge} from '$lib/components/ui/badge';
import BudgetProgress from '$lib/components/budgets/budget-progress.svelte';
import BudgetAnalyticsDashboard from '$lib/components/budgets/budget-analytics-dashboard.svelte';
import PeriodAutomation from '$lib/components/budgets/period-automation.svelte';
import BudgetRolloverManager from '$lib/components/budgets/budget-rollover-manager.svelte';
import EnvelopeBudgetManager from '$lib/components/budgets/envelope-budget-manager.svelte';
import {BudgetBurndownChart, GoalProgressTracker, BudgetForecastDisplay} from '$lib/components/budgets';
import {currencyFormatter} from '$lib/utils/formatters';
import {getBudgetDetail} from '$lib/query/budgets';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import Settings from '@lucide/svelte/icons/settings';
import PiggyBank from '@lucide/svelte/icons/piggy-bank';
import BarChart from '@lucide/svelte/icons/bar-chart';
import Calendar from '@lucide/svelte/icons/calendar';
import Repeat from '@lucide/svelte/icons/repeat';
import Wallet from '@lucide/svelte/icons/wallet';

let {data} = $props();

let budgetQuery = $derived(getBudgetDetail(data.budgetId).options());
let budget = $derived(budgetQuery.data);
let isLoading = $derived(budgetQuery.isLoading);

const isEnvelopeBudget = $derived(budget?.type === 'category-envelope');

// Extract allocated amount from metadata
const allocatedAmount = $derived(
  (budget?.metadata as Record<string, unknown>)?.['allocatedAmount'] as number ?? 0
);

// Placeholder for actual amount (would come from period instances)
const actualAmount = $derived(0);

function formatCurrency(value: number) {
  return currencyFormatter.format(Math.abs(value ?? 0));
}

function getStatus() {
  if (!budget || budget.status !== 'active') return 'paused' as const;
  if (!allocatedAmount) return 'paused' as const;
  const ratio = actualAmount / allocatedAmount;
  if (ratio > 1) return 'over' as const;
  if (ratio >= 0.8) return 'approaching' as const;
  return 'on_track' as const;
}
</script>

<svelte:head>
  <title>{budget?.name || 'Budget'} - Budget Details</title>
  <meta name="description" content="View and manage budget details" />
</svelte:head>

{#if isLoading}
  <div class="container mx-auto py-6">
    <Card.Root>
      <Card.Content class="py-16 text-center text-sm text-muted-foreground">
        Loading budget details...
      </Card.Content>
    </Card.Root>
  </div>
{:else if !budget}
  <div class="container mx-auto py-6">
    <Card.Root>
      <Card.Content class="py-16 text-center">
        <p class="text-lg font-medium mb-2">Budget not found</p>
        <Button href="/budgets" variant="outline">Back to Budgets</Button>
      </Card.Content>
    </Card.Root>
  </div>
{:else}
<div class="container mx-auto py-6 space-y-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="sm" href="/budgets" class="p-2">
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back to Budgets</span>
      </Button>
      <div>
        <h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
          <PiggyBank class="h-8 w-8 text-muted-foreground" />
          {budget.name}
        </h1>
        <p class="text-muted-foreground mt-1">
          {budget.description || 'No description'}
        </p>
      </div>
    </div>
    <Button variant="outline" size="sm" href="/budgets/{budget.id}/edit">
      <Settings class="h-4 w-4 mr-2" />
      Edit Budget
    </Button>
  </div>

  <!-- Budget Overview -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <!-- Main Progress Card -->
    <Card.Root class="md:col-span-2">
      <Card.Header>
        <Card.Title>Budget Progress</Card.Title>
        <Card.Description>Current period performance</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-6">
        <BudgetProgress
          consumed={actualAmount}
          allocated={allocatedAmount}
          status={getStatus()}
          enforcementLevel={budget.enforcementLevel || 'warning'}
          label="Current Progress"
        />

        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-muted-foreground">Allocated</p>
            <p class="text-2xl font-bold">{formatCurrency(allocatedAmount)}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Spent</p>
            <p class="text-2xl font-bold">{formatCurrency(actualAmount)}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Remaining</p>
            <p class="text-2xl font-bold text-muted-foreground">
              {formatCurrency(Math.max(0, allocatedAmount - actualAmount))}
            </p>
          </div>
          <div>
            <p class="text-muted-foreground">Status</p>
            <Badge variant={budget.status === 'active' ? 'default' : 'secondary'}>
              {budget.status}
            </Badge>
          </div>
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Budget Details Card -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Budget Details</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-3 text-sm">
        <div class="flex justify-between">
          <span class="text-muted-foreground">Type</span>
          <span class="font-medium">{budget.type}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground">Scope</span>
          <span class="font-medium">{budget.scope}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground">Enforcement</span>
          <span class="font-medium capitalize">{budget.enforcementLevel || 'warning'}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground">Created</span>
          <span class="font-medium">
            {new Date(budget.createdAt).toLocaleDateString()}
          </span>
        </div>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Advanced Features Tabs -->
  <Tabs.Root value="analytics" class="space-y-6">
    <Tabs.List class="grid w-full grid-cols-4">
      <Tabs.Trigger value="analytics" class="flex items-center gap-2">
        <BarChart class="h-4 w-4" />
        Analytics
      </Tabs.Trigger>
      <Tabs.Trigger value="periods" class="flex items-center gap-2">
        <Calendar class="h-4 w-4" />
        Period Management
      </Tabs.Trigger>
      <Tabs.Trigger value="rollover" class="flex items-center gap-2">
        <Repeat class="h-4 w-4" />
        Rollover
      </Tabs.Trigger>
      {#if isEnvelopeBudget}
        <Tabs.Trigger value="envelopes" class="flex items-center gap-2">
          <Wallet class="h-4 w-4" />
          Envelopes
        </Tabs.Trigger>
      {/if}
    </Tabs.List>

    <!-- Analytics Tab -->
    <Tabs.Content value="analytics" class="space-y-6">
      <BudgetForecastDisplay budgetId={budget.id} showAutoAllocate={true} />

      <BudgetAnalyticsDashboard budgets={[budget]} />

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetBurndownChart budget={budget} />
        <GoalProgressTracker budget={budget} />
      </div>
    </Tabs.Content>

    <!-- Period Management Tab -->
    <Tabs.Content value="periods">
      <PeriodAutomation budget={budget} />
    </Tabs.Content>

    <!-- Rollover Tab -->
    <Tabs.Content value="rollover">
      <BudgetRolloverManager budgets={[budget]} />
    </Tabs.Content>

    <!-- Envelopes Tab (conditional) -->
    {#if isEnvelopeBudget}
      <Tabs.Content value="envelopes">
        <!-- EnvelopeBudgetManager requires envelopes and categories data -->
        <p class="text-muted-foreground text-center py-8">Envelope management coming soon</p>
      </Tabs.Content>
    {/if}
  </Tabs.Root>
</div>
{/if}
