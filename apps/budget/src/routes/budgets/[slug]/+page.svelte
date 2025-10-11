<script lang="ts">
import {Button} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Tabs from '$lib/components/ui/tabs';
import {Badge} from '$lib/components/ui/badge';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import BudgetProgress from '$lib/components/budgets/budget-progress.svelte';
import BudgetAnalyticsDashboard from '../(components)/analytics/budget-analytics-dashboard.svelte';
import PeriodAutomation from '../(components)/managers/period-automation.svelte';
import BudgetRolloverManager from '../(components)/managers/budget-rollover-manager.svelte';
import EnvelopeBudgetManager from '../(components)/managers/envelope-budget-manager.svelte';
import BudgetBurndownChart from '../(components)/analytics/budget-burndown-chart.svelte';
import GoalProgressTracker from '../(components)/forecast/goal-progress-tracker.svelte';
import BudgetForecastDisplay from '../(components)/forecast/budget-forecast-display.svelte';
import {BudgetPeriodPicker} from '$lib/components/budgets';
import BudgetPeriodInstanceManager from '$lib/components/budgets/budget-period-instance-manager.svelte';
import BudgetPeriodManager from '$lib/components/budgets/budget-period-manager.svelte';
import PeriodTemplateSheet from '../(components)/sheets/period-template-sheet.svelte';
import PeriodInstanceEditSheet from '../(components)/sheets/period-instance-edit-sheet.svelte';
import PeriodMaintenanceSheet from '../(components)/sheets/period-maintenance-sheet.svelte';
import {currencyFormatter} from '$lib/utils/formatters';
import {calculateActualSpent, calculateAllocated} from '$lib/utils/budget-calculations';
import {
  getBudgetDetail,
  listPeriodInstances,
  getEnvelopeAllocations,
  createEnvelopeAllocation,
  updateEnvelopeAllocation,
  transferEnvelopeFunds,
  processEnvelopeRollover,
  executeDeficitRecovery,
  generateNextPeriod,
  getPeriodAnalytics,
  comparePeriods,
  getPeriodHistory,
  deletePeriodTemplate
} from '$lib/query/budgets';
import {listCategories} from '$lib/query/categories';
import {trpc} from '$lib/trpc/client';
import {deleteBudgetDialog, deleteBudgetId} from '$lib/states/ui/global.svelte';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import Edit from '@lucide/svelte/icons/edit';
import Trash2 from '@lucide/svelte/icons/trash-2';
import PiggyBank from '@lucide/svelte/icons/piggy-bank';
import BarChart from '@lucide/svelte/icons/bar-chart';
import Calendar from '@lucide/svelte/icons/calendar';
import Repeat from '@lucide/svelte/icons/repeat';
import Wallet from '@lucide/svelte/icons/wallet';

let {data} = $props();

const budgetSlug = $derived(data.budgetSlug);
let budgetQuery = $derived(getBudgetDetail(budgetSlug).options());
let budget = $derived(budgetQuery.data);
let isLoading = $derived(budgetQuery.isLoading);

const isEnvelopeBudget = $derived(budget?.type === 'category-envelope');

// Period management state
let selectedPeriodId = $state<string>("");
let periodTemplateSheetOpen = $state(false);
let periodInstanceEditSheetOpen = $state(false);
let periodMaintenanceSheetOpen = $state(false);
let deleteTemplateDialogOpen = $state(false);
let selectedPeriodInstance = $state<typeof periods[0] | null>(null);
const firstTemplateId = $derived(budget?.periodTemplates?.[0]?.id);
let periodsQuery = $derived(firstTemplateId ? listPeriodInstances(firstTemplateId).options() : null);
let periods = $derived(periodsQuery?.data ?? []);

// Period analytics data
const currentPeriod = $derived(periods[0]);
const previousPeriod = $derived(periods[1]);
const currentPeriodAnalyticsQuery = $derived.by(() => {
  if (!currentPeriod) return null;
  return getPeriodAnalytics(currentPeriod.id).options();
});
const currentPeriodAnalytics = $derived(currentPeriodAnalyticsQuery?.data);
const periodComparisonQuery = $derived.by(() => {
  if (!currentPeriod || !previousPeriod) return null;
  return comparePeriods(currentPeriod.id, previousPeriod.id).options();
});
const periodComparison = $derived(periodComparisonQuery?.data);
const periodHistoryQuery = $derived.by(() => {
  if (!budget?.id) return null;
  return getPeriodHistory(budget.id, 10).options();
});
const periodHistoryData = $derived(periodHistoryQuery?.data ?? []);

// Envelope budget data
const envelopesQuery = $derived.by(() => {
  if (!isEnvelopeBudget || !budget?.id) return null;
  return getEnvelopeAllocations(budget.id).options();
});
const envelopes = $derived(envelopesQuery?.data ?? []);

const categoriesQuery = $derived.by(() => {
  if (!isEnvelopeBudget) return null;
  return listCategories().options();
});
const categories = $derived(categoriesQuery?.data ?? []);

// Envelope mutations
const createEnvelopeMutation = createEnvelopeAllocation;
const transferFundsMutation = transferEnvelopeFunds;

// Period mutations
const deletePeriodTemplateMutation = deletePeriodTemplate.options();

async function handleEnvelopeUpdate(envelopeId: number, newAmount: number) {
  try {
    if (!budget) return;
    await createEnvelopeMutation.execute({
      budgetId: budget.id,
      categoryId: envelopes.find(e => e.id === envelopeId)?.categoryId ?? 0,
      periodInstanceId: envelopes.find(e => e.id === envelopeId)?.periodInstanceId ?? 0,
      allocatedAmount: newAmount
    });
  } catch (error) {
    console.error('Failed to update envelope:', error);
  }
}

async function handleFundTransfer(fromId: number, toId: number, amount: number) {
  try {
    await transferFundsMutation.execute({
      fromEnvelopeId: fromId,
      toEnvelopeId: toId,
      amount,
      transferredBy: 'user' // TODO: get from auth context
    });
  } catch (error) {
    console.error('Failed to transfer funds:', error);
  }
}

async function handleDeficitRecover(envelopeId: number) {
  try {
    // Create a recovery plan for the deficit envelope
    const plan = await trpc().budgetRoutes.createDeficitRecoveryPlan.query({envelopeId});

    if (plan) {
      // Execute the recovery plan
      await executeDeficitRecovery.execute({
        plan,
        executedBy: 'user' // TODO: get from auth context
      });
    }
  } catch (error) {
    console.error('Failed to recover deficit:', error);
  }
}

async function handleActivateEnvelope(envelope: any) {
  try {
    await updateEnvelopeAllocation.execute({
      envelopeId: envelope.id,
      allocatedAmount: envelope.allocatedAmount,
      metadata: {
        ...(envelope.metadata || {}),
        // Status is managed by the service based on allocation calculations
      }
    });
  } catch (error) {
    console.error('Failed to activate envelope:', error);
  }
}

async function handleAddEnvelope(categoryId: number, amount: number) {
  try {
    if (!budget) return;

    // Get the first (or current) period instance
    const currentPeriod = periods[0];
    if (!currentPeriod) {
      console.error('No period instance available');
      return;
    }

    await createEnvelopeMutation.execute({
      budgetId: budget.id,
      categoryId,
      periodInstanceId: currentPeriod.id,
      allocatedAmount: amount
    });
  } catch (error) {
    console.error('Failed to create envelope:', error);
  }
}

function handlePeriodTemplateCreated() {
  // Refresh budget data to get updated period templates
  budgetQuery.refetch?.();
}

// Period instance handlers
async function handleGenerateNext() {
  if (!firstTemplateId) return;
  try {
    await generateNextPeriod.execute(firstTemplateId);
    periodsQuery?.refetch?.();
  } catch (error) {
    console.error('Failed to generate next period:', error);
  }
}

function handleEditPeriod(instanceId: number) {
  const instance = periods.find(p => p.id === instanceId);
  if (instance) {
    selectedPeriodInstance = instance;
    periodInstanceEditSheetOpen = true;
  }
}

function handleEditTemplate() {
  periodTemplateSheetOpen = true;
}

function handleDeleteTemplate() {
  deleteTemplateDialogOpen = true;
}

async function confirmDeleteTemplate() {
  if (!firstTemplateId) return;

  try {
    await deletePeriodTemplateMutation.mutateAsync(firstTemplateId);
    deleteTemplateDialogOpen = false;
    await budgetQuery?.refetch?.();
  } catch (error) {
    console.error('Failed to delete period template:', error);
  }
}

async function handleCreatePeriod(config: any) {
  if (!firstTemplateId) return;
  try {
    const periodManager = await import('$lib/server/domains/budgets/period-manager');
    // This will be implemented when backend endpoint is available
    console.log('Create periods with config:', config);
    periodsQuery?.refetch?.();
  } catch (error) {
    console.error('Failed to create periods:', error);
  }
}

function handleScheduleMaintenance() {
  periodMaintenanceSheetOpen = true;
}

function handlePeriodInstanceUpdated() {
  periodsQuery?.refetch?.();
  budgetQuery.refetch?.();
}

function handleMaintenanceScheduled() {
  // Refresh any relevant data
  budgetQuery.refetch?.();
}

// Extract allocated amount from metadata or period instance
const allocatedAmount = $derived(budget ? calculateAllocated(budget) : 0);

// Calculate actual spent from transactions
const actualAmount = $derived(budget ? calculateActualSpent(budget) : 0);

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
    <div class="flex items-center gap-2">
      {#if isEnvelopeBudget && !firstTemplateId}
        <Button variant="default" onclick={() => periodTemplateSheetOpen = true}>
          <Calendar class="mr-2 h-4 w-4" />
          Setup Periods
        </Button>
      {/if}
      <Button variant="outline" href="/budgets/{budget.slug}/edit">
        <Edit class="mr-2 h-4 w-4" />
        Edit
      </Button>
      <Button variant="destructive" onclick={() => {
        deleteBudgetId.current = budget.id;
        deleteBudgetDialog.setTrue();
      }}>
        <Trash2 class="mr-2 h-4 w-4" />
        Delete
      </Button>
    </div>
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
      <BudgetForecastDisplay budgetId={budget.id} showAutoAllocate={true}></BudgetForecastDisplay>

      <BudgetAnalyticsDashboard budgets={[budget]}></BudgetAnalyticsDashboard>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetBurndownChart budget={budget}></BudgetBurndownChart>
        <GoalProgressTracker budget={budget}></GoalProgressTracker>
      </div>

      {#if currentPeriod && currentPeriodAnalytics}
        <BudgetPeriodManager
          currentPeriod={currentPeriod}
          analytics={currentPeriodAnalytics}
          comparison={periodComparison}
          periodHistory={periodHistoryData}
          onCreatePeriod={handleCreatePeriod}
          onScheduleMaintenance={handleScheduleMaintenance}
        />
      {/if}
    </Tabs.Content>

    <!-- Period Management Tab -->
    <Tabs.Content value="periods" class="space-y-6">
      {#if firstTemplateId && budget.periodTemplates?.[0]}
        <BudgetPeriodInstanceManager
          budgetId={budget.id}
          budgetName={budget.name}
          template={budget.periodTemplates[0]}
          instances={periods}
          onGenerateNext={handleGenerateNext}
          onEditPeriod={handleEditPeriod}
          onEditTemplate={handleEditTemplate}
          onDeleteTemplate={handleDeleteTemplate}
        />
      {:else}
        <Card.Root>
          <Card.Content class="py-16 text-center">
            <p class="text-lg font-medium mb-2">No Period Template</p>
            <p class="text-sm text-muted-foreground mb-6">
              Set up a period template to start tracking budget periods over time.
            </p>
            <Button onclick={() => periodTemplateSheetOpen = true}>
              <Calendar class="mr-2 h-4 w-4" />
              Create Period Template
            </Button>
          </Card.Content>
        </Card.Root>
      {/if}
      <PeriodAutomation budget={budget}></PeriodAutomation>
    </Tabs.Content>

    <!-- Rollover Tab -->
    <Tabs.Content value="rollover">
      <BudgetRolloverManager budgets={[budget]}></BudgetRolloverManager>
    </Tabs.Content>

    <!-- Envelopes Tab (conditional) -->
    {#if isEnvelopeBudget}
      <Tabs.Content value="envelopes">
        {#if budget}
          <EnvelopeBudgetManager
            budget={budget}
            envelopes={envelopes}
            categories={categories}
            onEnvelopeUpdate={handleEnvelopeUpdate}
            onFundTransfer={handleFundTransfer}
            onDeficitRecover={handleDeficitRecover}
            onActivate={handleActivateEnvelope}
            onAddEnvelope={handleAddEnvelope}
          />
        {:else}
          <p class="text-muted-foreground text-center py-8">Loading envelope data...</p>
        {/if}
      </Tabs.Content>
    {/if}
  </Tabs.Root>
</div>
{/if}

<!-- Period Management Sheets -->
{#if budget}
  <PeriodTemplateSheet
    bind:open={periodTemplateSheetOpen}
    budgetId={budget.id}
    onSuccess={handlePeriodTemplateCreated}
  />

  <PeriodInstanceEditSheet
    bind:open={periodInstanceEditSheetOpen}
    instance={selectedPeriodInstance}
    onSuccess={handlePeriodInstanceUpdated}
  />

  <PeriodMaintenanceSheet
    bind:open={periodMaintenanceSheetOpen}
    budgetId={budget.id}
    onSuccess={handleMaintenanceScheduled}
  />

  <!-- Delete Template Confirmation Dialog -->
  <AlertDialog.Root bind:open={deleteTemplateDialogOpen}>
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>Delete Period Template</AlertDialog.Title>
        <AlertDialog.Description>
          Are you sure you want to delete this period template? This will remove the automated period generation configuration, but existing period instances will be kept. This action cannot be undone.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
        <AlertDialog.Action
          onclick={confirmDeleteTemplate}
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          Delete Template
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Root>
{/if}
