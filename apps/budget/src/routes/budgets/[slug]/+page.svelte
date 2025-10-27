<script lang="ts">
/**
 * Budget Detail Page - Redesigned with Linear UX
 *
 * Design Principles:
 * 1. Dashboard-first: Most important info at top
 * 2. Progressive disclosure: Advanced features collapsed
 * 3. Context-aware: Show relevant actions based on state
 * 4. Vertical flow: No tabs, scroll to explore
 * 5. Inline editing: Reduce modal dialogs
 */

import {SvelteSet} from 'svelte/reactivity';
import {Button} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Select from '$lib/components/ui/select';
import * as Tabs from '$lib/components/ui/tabs';
import {Badge} from '$lib/components/ui/badge';
import {Separator} from '$lib/components/ui/separator';
import * as Dialog from '$lib/components/ui/dialog';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import {Input} from '$lib/components/ui/input';
import {Label} from '$lib/components/ui/label';
import BudgetProgress from '$lib/components/budgets/budget-progress.svelte';
import EnvelopeAllocationCard from '$lib/components/budgets/envelope-allocation-card.svelte';
import EnvelopeSettingsSheet from '$lib/components/budgets/envelope-settings-sheet.svelte';
import EnvelopeCreateSheet from '$lib/components/budgets/envelope-create-sheet.svelte';
import EnvelopeDeficitRecoveryDialog from '$lib/components/budgets/envelope-deficit-recovery-dialog.svelte';
import BudgetPeriodInstanceManager from '$lib/components/budgets/budget-period-instance-manager.svelte';
import PeriodAutomation from '../(components)/managers/period-automation.svelte';
import BudgetRolloverManager from '../(components)/managers/budget-rollover-manager.svelte';
import PeriodTemplateSheet from '../(components)/sheets/period-template-sheet.svelte';
import {currencyFormatter} from '$lib/utils/formatters';
import {calculateActualSpent, calculateAllocated} from '$lib/utils/budget-calculations';
import {parseDate, getLocalTimeZone} from '@internationalized/date';
import {parseISOString, currentDate} from '$lib/utils/dates';
import {monthYearFmt, dayFmt} from '$lib/utils/date-formatters';
import {getBudgetValidationIssues} from '$lib/utils/budget-validation';
import * as Alert from '$lib/components/ui/alert';
import {
  getBudgetDetail,
  listPeriodInstances,
  getEnvelopeAllocations,
  createEnvelopeAllocation,
  updateEnvelopeAllocation,
  transferEnvelopeFunds,
  processEnvelopeRollover,
  executeDeficitRecovery,
  getBudgetRolloverHistory,
  generateNextPeriod,
  updatePeriodTemplate,
  schedulePeriodMaintenance,
  updateBudget,
  deletePeriodTemplate,
} from '$lib/query/budgets';
import {listCategories} from '$lib/query/categories';
import {trpc} from '$lib/trpc/client';
import {deleteBudgetDialog, deleteBudgetId} from '$lib/states/ui/global.svelte';
import type {EnvelopeAllocation} from '$lib/schema/budgets/envelope-allocations';
import type {Schedule} from '$lib/schema/schedules';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import SquarePen from '@lucide/svelte/icons/square-pen';
import Trash2 from '@lucide/svelte/icons/trash-2';
import PiggyBank from '@lucide/svelte/icons/piggy-bank';
import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import Calendar from '@lucide/svelte/icons/calendar';
import Repeat from '@lucide/svelte/icons/repeat';
import Wallet from '@lucide/svelte/icons/wallet';
import Info from '@lucide/svelte/icons/info';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import Settings2 from '@lucide/svelte/icons/settings-2';
import ChevronLeft from '@lucide/svelte/icons/chevron-left';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import List from '@lucide/svelte/icons/list';
import Columns3 from '@lucide/svelte/icons/columns-3';
import Plus from '@lucide/svelte/icons/plus';
import Pause from '@lucide/svelte/icons/pause';
import Play from '@lucide/svelte/icons/play';

let {data} = $props();

const budgetSlug = $derived(data.budgetSlug);
let budgetQuery = $derived(getBudgetDetail(budgetSlug).options());
let budget = $derived(budgetQuery.data);
let isLoading = $derived(budgetQuery.isLoading);

// Mutation for toggling budget status
const updateBudgetMutation = updateBudget.options();

const isEnvelopeBudget = $derived(budget?.type === 'category-envelope');

// Fetch linked schedule if this is a scheduled-expense budget
const linkedScheduleId = $derived(budget?.metadata?.scheduledExpense?.linkedScheduleId as number | undefined);
let linkedSchedule = $state<Schedule | null>(null);

$effect(() => {
  if (linkedScheduleId) {
    trpc().scheduleRoutes.load.query({id: linkedScheduleId})
      .then(schedule => linkedSchedule = schedule)
      .catch(err => {
        console.error('Failed to load linked schedule:', err);
        linkedSchedule = null;
      });
  } else {
    linkedSchedule = null;
  }
});

// Validation state
const validation = $derived(budget ? getBudgetValidationIssues(budget) : { hasIssues: false, invalidCategories: 0, invalidAccounts: 0, messages: [] });

// Active tab state
let activeTab = $state<string>('overview');

// View mode state for envelope display
type ViewMode = 'kanban' | 'list' | 'grid';
let viewMode = $state<ViewMode>('list');

// Period management state
const firstTemplateId = $derived(budget?.periodTemplates?.[0]?.id);
let periodsQuery = $derived(firstTemplateId ? listPeriodInstances(firstTemplateId).options() : null);
let periods = $derived(periodsQuery?.data ?? []);

// Find the actual current period (the one that includes today)
// and the most recent period (which might be in the future)
const currentPeriod = $derived.by(() => {
  return periods.find(p => {
    const start = parseISOString(p.startDate);
    const end = parseISOString(p.endDate);
    if (!start || !end) return false;
    return start.compare(currentDate) <= 0 && end.compare(currentDate) >= 0;
  }) || periods[periods.length - 1]; // Fallback to newest if none match
});

const previousPeriod = $derived.by(() => {
  const currentIndex = periods.findIndex(p => p.id === currentPeriod?.id);
  return currentIndex > 0 ? periods[currentIndex - 1] : undefined;
});

// Get the most recent period (last in array, might be future)
const mostRecentPeriod = $derived(periods[periods.length - 1]);

// Selected period for filtering envelopes (defaults to current period)
let selectedPeriodId = $state<number | undefined>(undefined);
let selectedPeriodIdString = $state<string>('');

// Auto-select current period when it's available
$effect(() => {
  if (currentPeriod && !selectedPeriodId) {
    selectedPeriodId = currentPeriod.id;
    selectedPeriodIdString = String(currentPeriod.id);
  }
});

// Sync string value with numeric value
$effect(() => {
  selectedPeriodId = selectedPeriodIdString ? Number(selectedPeriodIdString) : undefined;
});

// Get the selected period object
const selectedPeriod = $derived.by(() => {
  if (!selectedPeriodId) return currentPeriod;
  return periods.find(p => p.id === selectedPeriodId) || currentPeriod;
});

// Check if the selected period is in the past
const isSelectedPeriodPast = $derived.by(() => {
  const period = selectedPeriod || currentPeriod;
  if (!period) return false;
  const end = parseISOString(period.endDate);
  if (!end) return false;
  return end.compare(currentDate) < 0;
});

// Determine the selected period status (past, current, future)
const selectedPeriodStatus = $derived.by(() => {
  const period = selectedPeriod || currentPeriod;
  if (!period) return 'unknown';

  const start = parseISOString(period.startDate);
  const end = parseISOString(period.endDate);
  if (!start || !end) return 'unknown';

  // Check if it's the current period (today falls within the period)
  if (start.compare(currentDate) <= 0 && end.compare(currentDate) >= 0) {
    return 'current';
  }

  // Check if it's a future period (starts after today)
  if (start.compare(currentDate) > 0) {
    return 'future';
  }

  // Otherwise it's a past period (ended before today)
  return 'past';
});

// Check if we can create the next period
// Only show button if there are no future periods (periods that start after today)
const canCreateNextPeriod = $derived.by(() => {
  if (periods.length === 0 || !budget?.periodTemplates?.[0]) return false;

  // Check if any period starts in the future (after today)
  const hasFuturePeriod = periods.some(p => {
    const start = parseISOString(p.startDate);
    if (!start) return false;
    return start.compare(currentDate) > 0;
  });

  // Only show button if NO future periods exist
  return !hasFuturePeriod;
});

// Get the period before the selected one
const previousToSelectedPeriod = $derived.by(() => {
  if (!selectedPeriod) return undefined;
  const selectedIndex = periods.findIndex(p => p.id === selectedPeriod.id);
  if (selectedIndex > 0) {
    return periods[selectedIndex - 1];
  }
  return undefined;
});

// Get the period after the selected one
const nextToSelectedPeriod = $derived.by(() => {
  if (!selectedPeriod) return undefined;
  const selectedIndex = periods.findIndex(p => p.id === selectedPeriod.id);
  if (selectedIndex >= 0 && selectedIndex < periods.length - 1) {
    return periods[selectedIndex + 1];
  }
  return undefined;
});

// Envelope budget data
const envelopesQuery = $derived.by(() => {
  if (!isEnvelopeBudget || !budget?.id) return null;
  return getEnvelopeAllocations(budget.id).options();
});
const allEnvelopes = $derived(envelopesQuery?.data ?? []);

// Filter envelopes by selected period
const envelopes = $derived.by(() => {
  if (!selectedPeriodId) return allEnvelopes;
  return allEnvelopes.filter(env => env.periodInstanceId === selectedPeriodId);
});

const categoriesQuery = $derived.by(() => {
  if (!isEnvelopeBudget) return null;
  return listCategories().options();
});
const categories = $derived(categoriesQuery?.data ?? []);
const categoryMap = $derived(
  new Map(Array.isArray(categories) ? categories.map(cat => [cat.id, cat]) : [])
);

// Get categories that don't already have envelopes
const availableCategories = $derived.by(() => {
  if (!allEnvelopes || !categories) return [];
  const usedCategoryIds = new Set(allEnvelopes.map(e => e.categoryId));
  return categories.filter(cat => !usedCategoryIds.has(cat.id));
});

// Rollover history query - check if rollover already processed
const rolloverHistoryQuery = $derived.by(() => {
  if (!budget?.id) return null;
  return getBudgetRolloverHistory(budget.id, 50).options();
});
const rolloverHistory = $derived(rolloverHistoryQuery?.data ?? []);

// Helper function to check if rollover has been processed between two periods
function isRolloverProcessed(fromPeriodId: number, toPeriodId: number): boolean {
  // Check session-tracked rollovers first (immediate)
  const rolloverKey = `${fromPeriodId}-${toPeriodId}`;
  if (completedRollovers.has(rolloverKey)) return true;

  // Then check rollover history from DB
  return rolloverHistory.some(
    history =>
      history.fromPeriodId === fromPeriodId &&
      history.toPeriodId === toPeriodId
  );
}

// Check if rollover has already been processed for the main period transition
const hasRolloverBeenProcessed = $derived.by(() => {
  if (!previousPeriod || !currentPeriod) return false;
  return isRolloverProcessed(previousPeriod.id, currentPeriod.id);
});

// Dialog state
let envelopeSettingsOpen = $state(false);
let envelopeCreateOpen = $state(false);
let periodTemplateDialogOpen = $state(false);
let selectedEnvelopeForSettings = $state<EnvelopeAllocation | null>(null);
let deficitRecoveryDialogOpen = $state(false);
let selectedDeficitEnvelope = $state<EnvelopeAllocation | null>(null);
let deficitAnalysis = $state<any>(null);
let deficitRecoveryPlan = $state<any>(null);
let isAnalyzingDeficit = $state(false);
let isCreatingDeficitPlan = $state(false);
let isExecutingDeficitPlan = $state(false);
let isProcessingRollover = $state(false);
let editTemplateDialogOpen = $state(false);
let deleteTemplateDialogOpen = $state(false);

// Template editing form state
let templateForm = $state({
  intervalCount: 1,
  startDayOfMonth: 1,
});

// Track completed rollovers in this session to prevent duplicates
// Key format: "fromPeriodId-toPeriodId"
// Using SvelteSet for reactive mutations
let completedRollovers = new SvelteSet<string>();

// Calculate metrics
const allocatedAmount = $derived(budget ? calculateAllocated(budget) : 0);
const actualAmount = $derived(budget ? calculateActualSpent(budget) : 0);
const remainingAmount = $derived(allocatedAmount - actualAmount);

// Envelope metrics
const totalEnvelopeAllocated = $derived.by(() => {
  if (!Array.isArray(envelopes) || envelopes.length === 0) return 0;
  return envelopes.reduce((sum, env) => sum + env.allocatedAmount, 0);
});

const totalEnvelopeSpent = $derived.by(() => {
  if (!Array.isArray(envelopes) || envelopes.length === 0) return 0;
  return envelopes.reduce((sum, env) => sum + env.spentAmount, 0);
});

const totalEnvelopeAvailable = $derived.by(() => {
  if (!Array.isArray(envelopes) || envelopes.length === 0) return 0;
  return envelopes.reduce((sum, env) => sum + env.availableAmount, 0);
});

const overspentEnvelopes = $derived.by(() => {
  if (!Array.isArray(envelopes)) return [];
  return envelopes.filter(e => e.status === 'overspent');
});

const depletedEnvelopes = $derived.by(() => {
  if (!Array.isArray(envelopes)) return [];
  return envelopes.filter(e => e.status === 'depleted');
});

const activeEnvelopes = $derived.by(() => {
  if (!Array.isArray(envelopes)) return [];
  return envelopes.filter(e => e.status === 'active' || e.status === 'depleted');
});

// Context-aware primary action
const primaryAction = $derived.by(() => {
  if (overspentEnvelopes.length > 0) {
    return {
      type: 'deficit' as const,
      title: 'Manage Overspent Envelopes',
      description: `${overspentEnvelopes.length} envelope${overspentEnvelopes.length > 1 ? 's are' : ' is'} overspent and need${overspentEnvelopes.length === 1 ? 's' : ''} attention`,
      icon: TriangleAlert,
      variant: 'destructive' as const,
      count: overspentEnvelopes.length,
    };
  }

  // Check both the rollover history AND the current processing state
  if (previousPeriod && currentPeriod && !hasRolloverBeenProcessed && !isProcessingRollover && !rolloverMutation.isPending) {
    const previousPeriodName = monthYearFmt.format(parseDate(previousPeriod.startDate).toDate(getLocalTimeZone()));
    const currentPeriodName = monthYearFmt.format(parseDate(currentPeriod.startDate).toDate(getLocalTimeZone()));

    return {
      type: 'rollover' as const,
      title: 'Process Period Rollover',
      description: `Roll over funds from ${previousPeriodName} to ${currentPeriodName}`,
      icon: Repeat,
      variant: 'default' as const,
    };
  }

  if (depletedEnvelopes.length > 0) {
    return {
      type: 'depleted' as const,
      title: 'Refill Depleted Envelopes',
      description: `${depletedEnvelopes.length} envelope${depletedEnvelopes.length > 1 ? 's are' : ' is'} depleted`,
      icon: Wallet,
      variant: 'secondary' as const,
      count: depletedEnvelopes.length,
    };
  }

  return {
    type: 'healthy' as const,
    title: 'Budget On Track',
    description: 'All envelopes are within their allocations',
    icon: CircleCheck,
    variant: 'outline' as const,
  };
});

// Mutations - createMutation returns a reactive store
const createEnvelopeMutation = createEnvelopeAllocation.options();
const updateEnvelopeMutation = updateEnvelopeAllocation.options();
const transferFundsMutation = transferEnvelopeFunds.options();
const rolloverMutation = processEnvelopeRollover.options();
const generatePeriodMutation = generateNextPeriod.options();
const updateTemplateMutation = updatePeriodTemplate.options();
const maintenanceMutation = schedulePeriodMaintenance.options();
const deleteTemplateMutation = deletePeriodTemplate.options();

function formatCurrency(value: number) {
  return currencyFormatter.format(Math.abs(value ?? 0));
}

function getStatus() {
  if (!budget) return 'paused' as const;
  // If budget is inactive, show as paused
  if (budget.status === 'inactive') return 'paused' as const;
  // If budget is active but has no allocated amount, show setup needed
  if (!allocatedAmount) return 'setup_needed' as const;
  const ratio = actualAmount / allocatedAmount;
  if (ratio > 1) return 'over' as const;
  if (ratio >= 0.8) return 'approaching' as const;
  return 'on_track' as const;
}

function getCategoryName(categoryId: number): string {
  return categoryMap.get(categoryId)?.name ?? `Category ${categoryId}`;
}

async function handlePrimaryAction() {
  if (primaryAction.type === 'deficit' && overspentEnvelopes.length > 0) {
    const firstOverspent = overspentEnvelopes[0];
    if (firstOverspent) {
      selectedDeficitEnvelope = firstOverspent;
      deficitRecoveryDialogOpen = true;
    }
  } else if (primaryAction.type === 'rollover' && previousPeriod && currentPeriod) {
    // Prevent duplicate clicks - check all possible states
    if (isProcessingRollover || rolloverMutation.isPending || hasRolloverBeenProcessed) {
      return;
    }

    const rolloverKey = `${previousPeriod.id}-${currentPeriod.id}`;
    isProcessingRollover = true;
    try {
      await rolloverMutation.mutateAsync({
        fromPeriodId: previousPeriod.id,
        toPeriodId: currentPeriod.id,
      });
      // Mark this rollover as completed in the session
      completedRollovers.add(rolloverKey);
    } finally {
      isProcessingRollover = false;
    }
  }
}

async function handleEnvelopeUpdate(envelopeId: number, newAmount: number) {
  const envelope = envelopes.find(e => e.id === envelopeId);
  if (!envelope) return;

  await updateEnvelopeMutation.mutateAsync({
    envelopeId,
    allocatedAmount: newAmount,
  });
}

function handleEnvelopeSettings(envelope: typeof envelopes[0]) {
  selectedEnvelopeForSettings = envelope;
  envelopeSettingsOpen = true;
}

async function handleDeficitRecover(envelope: typeof envelopes[0]) {
  selectedDeficitEnvelope = envelope;
  deficitAnalysis = null;
  deficitRecoveryPlan = null;
  deficitRecoveryDialogOpen = true;
}

async function handleAnalyzeDeficit() {
  if (!selectedDeficitEnvelope) return;

  isAnalyzingDeficit = true;
  try {
    // Call backend to analyze deficit
    const analysis = await trpc().budgetRoutes.analyzeEnvelopeDeficit.query({
      envelopeId: selectedDeficitEnvelope.id,
    });
    deficitAnalysis = analysis;
  } catch (error) {
    console.error('Failed to analyze deficit:', error);
  } finally {
    isAnalyzingDeficit = false;
  }
}

async function handleCreateDeficitPlan() {
  if (!selectedDeficitEnvelope) return;

  isCreatingDeficitPlan = true;
  try {
    const plan = await trpc().budgetRoutes.createDeficitRecoveryPlan.query({
      envelopeId: selectedDeficitEnvelope.id,
    });
    deficitRecoveryPlan = plan;
  } catch (error) {
    console.error('Failed to create deficit recovery plan:', error);
  } finally {
    isCreatingDeficitPlan = false;
  }
}

const executeDeficitRecoveryMutation = executeDeficitRecovery.options();

async function handleExecuteDeficitPlan(plan: any) {
  isExecutingDeficitPlan = true;
  try {
    await executeDeficitRecoveryMutation.mutateAsync({
      plan,
      executedBy: 'user', // TODO: Get from auth context
    });
    deficitRecoveryDialogOpen = false;
    deficitAnalysis = null;
    deficitRecoveryPlan = null;
  } catch (error) {
    console.error('Failed to execute deficit recovery plan:', error);
  } finally {
    isExecutingDeficitPlan = false;
  }
}

function handleTransferRequest(envelope: typeof envelopes[0]) {
  // TODO: Implement inline transfer UI
  console.log('Transfer from envelope:', envelope.id);
}

async function toggleBudgetStatus() {
  if (!budget) return;

  const newStatus = budget.status === 'active' ? 'inactive' : 'active';
  await updateBudgetMutation.mutateAsync({
    id: budget.id,
    data: { status: newStatus }
  });
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
<div class="container mx-auto py-6">
  <!-- 1. Quick Status Hero -->
  <div class="flex items-start justify-between gap-4 mb-6">
    <div class="flex items-start gap-4 flex-1 min-w-0">
      <Button variant="ghost" size="icon" href="/budgets" class="mt-1 shrink-0">
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back to Budgets</span>
      </Button>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-3 mb-1">
          <PiggyBank class="h-6 w-6 text-muted-foreground shrink-0" />
          <h1 class="text-2xl md:text-3xl font-bold tracking-tight truncate">{budget.name}</h1>
          <Badge variant={budget.status === 'active' ? 'default' : 'secondary'} class="shrink-0">
            {budget.status}
          </Badge>
        </div>
        {#if budget.description}
          <p class="text-sm text-muted-foreground">{budget.description}</p>
        {/if}
      </div>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      {#if isEnvelopeBudget && periods.length > 0}
        <div class="flex items-center gap-1">
          <!-- Previous Period Button -->
          <Button
            variant="outline"
            size="icon"
            class="h-9 w-9"
            disabled={!previousToSelectedPeriod}
            onclick={() => {
              if (previousToSelectedPeriod) {
                selectedPeriodId = previousToSelectedPeriod.id;
              }
            }}
          >
            <ChevronLeft class="h-4 w-4" />
            <span class="sr-only">Previous Period</span>
          </Button>

          <!-- Period Selector -->
          <Select.Root
            type="single"
            bind:value={selectedPeriodIdString}
          >
            <Select.Trigger class="w-[180px]">
              {#if selectedPeriodId}
                {@const selectedPeriod = periods.find(p => p.id === selectedPeriodId)}
                {#if selectedPeriod}
                  <Calendar class="h-4 w-4 mr-2" />
                  {monthYearFmt.format(parseDate(selectedPeriod.startDate).toDate(getLocalTimeZone()))}
                {:else}
                  Select Period
                {/if}
              {:else}
                Select Period
              {/if}
            </Select.Trigger>
            <Select.Content>
              {#each periods.slice().reverse() as period}
                <Select.Item value={String(period.id)}>
                  {monthYearFmt.format(parseDate(period.startDate).toDate(getLocalTimeZone()))}
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>

          <!-- Next Period Button -->
          <Button
            variant="outline"
            size="icon"
            class="h-9 w-9"
            disabled={!nextToSelectedPeriod}
            onclick={() => {
              if (nextToSelectedPeriod) {
                selectedPeriodId = nextToSelectedPeriod.id;
              }
            }}
          >
            <ChevronRight class="h-4 w-4" />
            <span class="sr-only">Next Period</span>
          </Button>
        </div>
      {/if}

      <Button
        variant="outline"
        size="sm"
        onclick={toggleBudgetStatus}
        disabled={updateBudgetMutation.isPending}
      >
        {#if budget.status === 'active'}
          <Pause class="h-4 w-4" />
          <span class="hidden sm:inline ml-2">Pause</span>
        {:else}
          <Play class="h-4 w-4" />
          <span class="hidden sm:inline ml-2">Resume</span>
        {/if}
      </Button>

      <Button variant="outline" size="sm" href="/budgets/{budget.slug}/edit">
        <SquarePen class="h-4 w-4" />
        <span class="hidden sm:inline ml-2">Edit</span>
      </Button>
      <Button variant="ghost" size="sm" onclick={() => {
        deleteBudgetId.current = budget.id;
        deleteBudgetDialog.setTrue();
      }}>
        <Trash2 class="h-4 w-4" />
        <span class="sr-only">Delete</span>
      </Button>
    </div>
  </div>

  <!-- Validation Warning Banner -->
  {#if validation.hasIssues}
    <Alert.Root variant="destructive" class="mb-6">
      <TriangleAlert class="h-4 w-4" />
      <Alert.Title>Budget Configuration Issue</Alert.Title>
      <Alert.Description class="flex flex-col gap-3">
        <p>
          This budget has {validation.messages.join(' and ')}. This may affect budget calculations and reporting.
        </p>
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onclick={() => editTemplateDialogOpen = true}
            class="bg-background"
          >
            <Settings2 class="h-4 w-4 mr-2" />
            Edit Budget Settings
          </Button>
        </div>
      </Alert.Description>
    </Alert.Root>
  {/if}

  <!-- Tabs Navigation -->
  <Tabs.Root bind:value={activeTab} class="w-full">
    <Tabs.List class="w-full justify-start mb-6">
      <Tabs.Trigger value="overview" class="gap-2">
        <LayoutDashboard class="h-4 w-4" />
        Overview
      </Tabs.Trigger>
      {#if isEnvelopeBudget}
        <Tabs.Trigger value="envelopes" class="gap-2">
          <Wallet class="h-4 w-4" />
          Envelopes
        </Tabs.Trigger>
      {/if}
      <Tabs.Trigger value="analytics" class="gap-2">
        <TrendingUp class="h-4 w-4" />
        Analytics
      </Tabs.Trigger>
      <Tabs.Trigger value="periods" class="gap-2">
        <Calendar class="h-4 w-4" />
        Period Management
      </Tabs.Trigger>
      <Tabs.Trigger value="automation" class="gap-2">
        <Repeat class="h-4 w-4" />
        Automation
      </Tabs.Trigger>
    </Tabs.List>

    <!-- Overview Tab -->
    <Tabs.Content value="overview">
  <!-- Two-column layout on larger screens -->
  <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 overflow-hidden">
    <!-- Main Content Column -->
    <div class="space-y-6 min-w-0">
      <!-- Overall Progress -->
      <BudgetProgress
        consumed={actualAmount}
        allocated={allocatedAmount}
        status={getStatus()}
        enforcementLevel={budget.enforcementLevel || 'warning'}
        label="Overall Budget Progress"
      />

      <!-- 2. Primary Action Card (Context-Aware) -->
      <Card.Root class={primaryAction.variant === 'destructive' ? 'border-destructive/50 bg-destructive/5' : ''}>
        <Card.Content class="py-4">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3 flex-1">
              <div class={`p-3 rounded-lg ${
                primaryAction.variant === 'destructive' ? 'bg-destructive/10' :
                primaryAction.variant === 'default' ? 'bg-primary/10' :
                'bg-muted'
              }`}>
                <primaryAction.icon class={`h-6 w-6 ${
                  primaryAction.variant === 'destructive' ? 'text-destructive' :
                  primaryAction.variant === 'default' ? 'text-primary' :
                  'text-muted-foreground'
                }`} />
              </div>
              <div>
                <h3 class="font-semibold text-lg">{primaryAction.title}</h3>
                <p class="text-sm text-muted-foreground">{primaryAction.description}</p>
              </div>
            </div>

            {#if primaryAction.type !== 'healthy'}
              <Button
                variant={primaryAction.variant}
                onclick={handlePrimaryAction}
                disabled={rolloverMutation.isPending || isProcessingRollover}
              >
                {#if (rolloverMutation.isPending || isProcessingRollover) && primaryAction.type === 'rollover'}
                  <Repeat class="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                {:else}
                  Take Action
                {/if}
              </Button>
            {/if}
          </div>
        </Card.Content>
      </Card.Root>
    </div>

    <!-- Sidebar Column (visible on lg+ screens) -->
    <div class="space-y-6">
      <!-- Quick Stats Card -->
      <Card.Root>
        <Card.Header class="pb-3">
          <Card.Title class="text-base">Quick Stats</Card.Title>
        </Card.Header>
        <Card.Content class="space-y-4">
          <div>
            <p class="text-xs text-muted-foreground mb-1">Allocated</p>
            <p class="text-xl font-bold">{formatCurrency(allocatedAmount)}</p>
          </div>
          <Separator />
          <div>
            <p class="text-xs text-muted-foreground mb-1">Spent</p>
            <p class="text-xl font-bold">{formatCurrency(actualAmount)}</p>
          </div>
          <Separator />
          <div>
            <p class="text-xs text-muted-foreground mb-1">Remaining</p>
            <p class={`text-xl font-bold ${remainingAmount < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
              {formatCurrency(remainingAmount)}
            </p>
          </div>

          {#if isEnvelopeBudget}
            <Separator />
            <div>
              <p class="text-xs text-muted-foreground mb-1">Total Available</p>
              <p class="text-xl font-bold text-emerald-600">{formatCurrency(totalEnvelopeAvailable)}</p>
            </div>
          {/if}
        </Card.Content>
      </Card.Root>

      <!-- Budget Details Card -->
      <Card.Root>
        <Card.Header class="pb-3">
          <Card.Title class="text-base">Budget Details</Card.Title>
        </Card.Header>
        <Card.Content class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-muted-foreground">Type</span>
            <span class="font-medium capitalize">{budget.type.replace('-', ' ')}</span>
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
  </div>
    </Tabs.Content>

    <!-- Envelopes Tab -->
    {#if isEnvelopeBudget}
      <Tabs.Content value="envelopes">
        <div class="space-y-6">
          <!-- Period Selector -->
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold">Envelope Management</h2>
              <p class="text-sm text-muted-foreground mt-1">
                {envelopes.length} envelope{envelopes.length !== 1 ? 's' : ''} for this period
                {#if overspentEnvelopes.length > 0}
                  <span class="text-destructive ml-2">• {overspentEnvelopes.length} overspent</span>
                {/if}
              </p>
            </div>

            <div class="flex items-center gap-3">
              <!-- Add Envelope Button -->
              {#if currentPeriod && availableCategories.length > 0}
                <Button
                  variant="default"
                  size="sm"
                  onclick={() => envelopeCreateOpen = true}
                  disabled={!currentPeriod || isSelectedPeriodPast}
                  title={isSelectedPeriodPast ? 'Cannot add envelopes to past periods' : ''}
                >
                  <Plus class="h-4 w-4 mr-2" />
                  Add Envelope
                </Button>
              {/if}

              <!-- View Mode Switcher -->
              <div class="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  class="h-8 px-3"
                  onclick={() => viewMode = 'list'}
                >
                  <List class="h-4 w-4" />
                  <span class="ml-2 hidden sm:inline">List</span>
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  class="h-8 px-3"
                  onclick={() => viewMode = 'grid'}
                >
                  <LayoutGrid class="h-4 w-4" />
                  <span class="ml-2 hidden sm:inline">Grid</span>
                </Button>
                <Button
                  variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                  size="sm"
                  class="h-8 px-3"
                  onclick={() => viewMode = 'kanban'}
                >
                  <Columns3 class="h-4 w-4" />
                  <span class="ml-2 hidden sm:inline">Board</span>
                </Button>
              </div>
            </div>
          </div>

          {#if envelopes.length === 0}
            <Card.Root class="border-dashed">
              <Card.Content class="py-12 text-center">
                <Wallet class="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p class="text-lg font-medium mb-2">No Envelopes Yet</p>
                {#if !firstTemplateId}
                  <p class="text-sm text-muted-foreground mb-2">
                    Before creating envelopes, you need to set up a period template.
                  </p>
                  <p class="text-sm text-muted-foreground mb-6">
                    Period templates define how often your budget cycles (weekly, monthly, etc.).
                  </p>
                  <Button variant="outline" onclick={() => periodTemplateDialogOpen = true}>
                    <Calendar class="h-4 w-4 mr-2" />
                    Create Period Template
                  </Button>
                {:else if !currentPeriod}
                  <p class="text-sm text-muted-foreground mb-4">
                    No periods have been created yet. Click below to generate periods for your budget.
                  </p>
                  <Button
                    variant="outline"
                    onclick={async () => {
                      if (budget?.id) {
                        await maintenanceMutation.mutateAsync(budget.id);
                      }
                    }}
                    disabled={maintenanceMutation.isPending}
                  >
                    {#if maintenanceMutation.isPending}
                      <Repeat class="h-4 w-4 mr-2 animate-spin" />
                      Creating Periods...
                    {:else}
                      <Calendar class="h-4 w-4 mr-2" />
                      Create Periods
                    {/if}
                  </Button>
                {:else}
                  <p class="text-sm text-muted-foreground mb-6">
                    {#if isSelectedPeriodPast}
                      Cannot add envelopes to past periods. Please select a current or future period.
                    {:else}
                      Create your first envelope to start tracking category budgets.
                    {/if}
                  </p>
                  <Button
                    variant="default"
                    onclick={() => envelopeCreateOpen = true}
                    disabled={isSelectedPeriodPast}
                  >
                    <Wallet class="h-4 w-4 mr-2" />
                    Add Envelope
                  </Button>
                {/if}
              </Card.Content>
            </Card.Root>
          {:else}
            <!-- List View -->
            {#if viewMode === 'list'}
              <div class="space-y-2">
                {#each envelopes as envelope (envelope.id)}
                  <div class="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <h3 class="font-medium truncate">{getCategoryName(envelope.categoryId)}</h3>
                        <Badge variant={
                          envelope.status === 'overspent' ? 'destructive' :
                          envelope.status === 'depleted' ? 'secondary' :
                          envelope.status === 'active' ? 'default' : 'outline'
                        } class="text-xs">
                          {envelope.status}
                        </Badge>
                      </div>
                      <div class="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Allocated: {currencyFormatter.format(envelope.allocatedAmount)}</span>
                        <span>•</span>
                        <span>Spent: {currencyFormatter.format(envelope.spentAmount)}</span>
                        <span>•</span>
                        <span class={envelope.availableAmount < 0 ? 'text-destructive font-medium' : 'text-emerald-600 font-medium'}>
                          {envelope.availableAmount < 0 ? 'Over' : 'Available'}: {currencyFormatter.format(Math.abs(envelope.availableAmount))}
                        </span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onclick={() => handleEnvelopeSettings(envelope)}
                      >
                        <Settings2 class="h-4 w-4" />
                      </Button>
                      {#if envelope.status === 'overspent'}
                        <Button
                          size="sm"
                          variant="destructive"
                          onclick={() => handleDeficitRecover(envelope)}
                        >
                          Recover
                        </Button>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>

            <!-- Grid View -->
            {:else if viewMode === 'grid'}
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {#each envelopes as envelope (envelope.id)}
                  <EnvelopeAllocationCard
                    {envelope}
                    categoryName={getCategoryName(envelope.categoryId)}
                    editable={true}
                    onUpdateAllocation={(newAmount) => handleEnvelopeUpdate(envelope.id, newAmount)}
                    onTransferRequest={() => handleTransferRequest(envelope)}
                    onDeficitRecover={() => handleDeficitRecover(envelope)}
                    onSettingsClick={() => handleEnvelopeSettings(envelope)}
                  />
                {/each}
              </div>

            <!-- Kanban Board View -->
            {:else if viewMode === 'kanban'}
              <div class="overflow-x-auto">
                <div class="flex gap-4 min-w-max pb-4">
                  <!-- Overspent Column -->
                  <div class="space-y-3 w-80 shrink-0">
                    <div class="flex items-center justify-between px-3 py-2 bg-destructive/5 border border-destructive/20 rounded-lg">
                      <div class="flex items-center gap-2">
                        <TriangleAlert class="h-4 w-4 text-destructive" />
                        <h3 class="font-semibold text-sm text-destructive">Overspent</h3>
                      </div>
                      <Badge variant="destructive" class="text-xs">{overspentEnvelopes.length}</Badge>
                    </div>
                    <div class="space-y-3 min-h-[200px]">
                      {#each overspentEnvelopes as envelope (envelope.id)}
                        <EnvelopeAllocationCard
                          {envelope}
                          categoryName={getCategoryName(envelope.categoryId)}
                          editable={true}
                          onUpdateAllocation={(newAmount) => handleEnvelopeUpdate(envelope.id, newAmount)}
                          onTransferRequest={() => handleTransferRequest(envelope)}
                          onDeficitRecover={() => handleDeficitRecover(envelope)}
                          onSettingsClick={() => handleEnvelopeSettings(envelope)}
                        />
                      {/each}
                      {#if overspentEnvelopes.length === 0}
                        <div class="flex items-center justify-center h-32 border-2 border-dashed border-muted rounded-lg">
                          <p class="text-xs text-muted-foreground">No overspent envelopes</p>
                        </div>
                      {/if}
                    </div>
                  </div>

                  <!-- Depleted Column -->
                  <div class="space-y-3 w-80 shrink-0">
                    <div class="flex items-center justify-between px-3 py-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <div class="flex items-center gap-2">
                        <TriangleAlert class="h-4 w-4 text-orange-600" />
                        <h3 class="font-semibold text-sm text-orange-700 dark:text-orange-400">Depleted</h3>
                      </div>
                      <Badge variant="secondary" class="text-xs">{depletedEnvelopes.length}</Badge>
                    </div>
                    <div class="space-y-3 min-h-[200px]">
                      {#each depletedEnvelopes as envelope (envelope.id)}
                        <EnvelopeAllocationCard
                          {envelope}
                          categoryName={getCategoryName(envelope.categoryId)}
                          editable={true}
                          onUpdateAllocation={(newAmount) => handleEnvelopeUpdate(envelope.id, newAmount)}
                          onTransferRequest={() => handleTransferRequest(envelope)}
                          onSettingsClick={() => handleEnvelopeSettings(envelope)}
                        />
                      {/each}
                      {#if depletedEnvelopes.length === 0}
                        <div class="flex items-center justify-center h-32 border-2 border-dashed border-muted rounded-lg">
                          <p class="text-xs text-muted-foreground">No depleted envelopes</p>
                        </div>
                      {/if}
                    </div>
                  </div>

                  <!-- Active Column -->
                  <div class="space-y-3 w-80 shrink-0">
                    <div class="flex items-center justify-between px-3 py-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                      <div class="flex items-center gap-2">
                        <CircleCheck class="h-4 w-4 text-emerald-600" />
                        <h3 class="font-semibold text-sm text-emerald-700 dark:text-emerald-400">Active</h3>
                      </div>
                      <Badge variant="secondary" class="text-xs">{envelopes.filter(e => e.status === 'active').length}</Badge>
                    </div>
                    <div class="space-y-3 min-h-[200px]">
                      {#each envelopes.filter(e => e.status === 'active') as envelope (envelope.id)}
                        <EnvelopeAllocationCard
                          {envelope}
                          categoryName={getCategoryName(envelope.categoryId)}
                          editable={true}
                          onUpdateAllocation={(newAmount) => handleEnvelopeUpdate(envelope.id, newAmount)}
                          onTransferRequest={() => handleTransferRequest(envelope)}
                          onSettingsClick={() => handleEnvelopeSettings(envelope)}
                        />
                      {/each}
                      {#if envelopes.filter(e => e.status === 'active').length === 0}
                        <div class="flex items-center justify-center h-32 border-2 border-dashed border-muted rounded-lg">
                          <p class="text-xs text-muted-foreground">No active envelopes</p>
                        </div>
                      {/if}
                    </div>
                  </div>

                  <!-- Paused Column -->
                  <div class="space-y-3 w-80 shrink-0">
                    <div class="flex items-center justify-between px-3 py-2 bg-muted/50 border border-muted-foreground/20 rounded-lg">
                      <div class="flex items-center gap-2">
                        <TrendingUp class="h-4 w-4 text-muted-foreground" />
                        <h3 class="font-semibold text-sm text-muted-foreground">Paused</h3>
                      </div>
                      <Badge variant="outline" class="text-xs">{envelopes.filter(e => e.status === 'paused').length}</Badge>
                    </div>
                    <div class="space-y-3 min-h-[200px]">
                      {#each envelopes.filter(e => e.status === 'paused') as envelope (envelope.id)}
                        <EnvelopeAllocationCard
                          {envelope}
                          categoryName={getCategoryName(envelope.categoryId)}
                          editable={true}
                          onUpdateAllocation={(newAmount) => handleEnvelopeUpdate(envelope.id, newAmount)}
                          onTransferRequest={() => handleTransferRequest(envelope)}
                          onSettingsClick={() => handleEnvelopeSettings(envelope)}
                        />
                      {/each}
                      {#if envelopes.filter(e => e.status === 'paused').length === 0}
                        <div class="flex items-center justify-center h-32 border-2 border-dashed border-muted rounded-lg">
                          <p class="text-xs text-muted-foreground">No paused envelopes</p>
                        </div>
                      {/if}
                    </div>
                  </div>
                </div>
              </div>
            {/if}
          {/if}
        </div>
      </Tabs.Content>
    {/if}

    <!-- Analytics Tab -->
    <Tabs.Content value="analytics">
      <Card.Root>
        <Card.Header>
          <Card.Title>Analytics</Card.Title>
          <Card.Description>View spending trends and insights for your budget</Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="py-12 text-center text-muted-foreground">
            <TrendingUp class="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p class="text-lg font-medium mb-2">Analytics Coming Soon</p>
            <p class="text-sm">Detailed spending trends and budget insights will be available here.</p>
          </div>
        </Card.Content>
      </Card.Root>
    </Tabs.Content>

    <!-- Period Management Tab -->
    <Tabs.Content value="periods">
      <!-- Two-column layout on larger screens, single column on mobile -->
      <div class="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <!-- Main Content - Left Column -->
        <div class="space-y-6">
          <!-- Selected Period Summary -->
          {#if selectedPeriod}
          <Card.Root>
            <Card.Header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Calendar class="h-5 w-5 text-muted-foreground" />
                  <Card.Title>
                    {monthYearFmt.format(parseDate(selectedPeriod.startDate).toDate(getLocalTimeZone()))}
                  </Card.Title>
                </div>
                <Badge variant={
                  selectedPeriodStatus === 'current' ? 'default' :
                  selectedPeriodStatus === 'future' ? 'outline' :
                  'secondary'
                }>
                  {selectedPeriodStatus === 'current' ? 'Active' :
                   selectedPeriodStatus === 'future' ? 'Future' :
                   'Historical'}
                </Badge>
              </div>
              <p class="text-sm text-muted-foreground mt-2">
                {dayFmt.format(parseDate(selectedPeriod.startDate).toDate(getLocalTimeZone()))} - {dayFmt.format(parseDate(selectedPeriod.endDate).toDate(getLocalTimeZone()))}
              </p>
            </Card.Header>
            <Card.Content class="space-y-4">
              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <p class="text-sm text-muted-foreground mb-1">Allocated</p>
                  <p class="text-xl font-bold">{formatCurrency(selectedPeriod.allocatedAmount ?? 0)}</p>
                </div>
                <div>
                  <p class="text-sm text-muted-foreground mb-1">Status</p>
                  <p class="text-xl font-bold text-emerald-600">On Track</p>
                </div>
              </div>
            </Card.Content>
          </Card.Root>
          {/if}

          <!-- Navigation Cards -->
          <div class="space-y-4">
            <!-- Previous Period Card -->
            {#if previousToSelectedPeriod}
            <Card.Root>
              <Card.Header class="pb-3">
                <Card.Title class="text-base">Previous Period</Card.Title>
              </Card.Header>
              <Card.Content class="space-y-3">
                <div>
                  <p class="text-sm font-medium mb-1">
                    {monthYearFmt.format(parseDate(previousToSelectedPeriod.startDate).toDate(getLocalTimeZone()))}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {dayFmt.format(parseDate(previousToSelectedPeriod.startDate).toDate(getLocalTimeZone()))} - {dayFmt.format(parseDate(previousToSelectedPeriod.endDate).toDate(getLocalTimeZone()))}
                  </p>
                </div>
                <Separator />
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-muted-foreground">Allocated</span>
                    <span class="font-medium">{formatCurrency(previousToSelectedPeriod.allocatedAmount ?? 0)}</span>
                  </div>
                </div>
              </Card.Content>
            </Card.Root>
            {/if}

            <!-- Next Period Card -->
            {#if nextToSelectedPeriod}
            <Card.Root>
              <Card.Header class="pb-3">
                <Card.Title class="text-base">Next Period</Card.Title>
              </Card.Header>
              <Card.Content class="space-y-3">
                <div>
                  <p class="text-sm font-medium mb-1">
                    {monthYearFmt.format(parseDate(nextToSelectedPeriod.startDate).toDate(getLocalTimeZone()))}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {dayFmt.format(parseDate(nextToSelectedPeriod.startDate).toDate(getLocalTimeZone()))} - {dayFmt.format(parseDate(nextToSelectedPeriod.endDate).toDate(getLocalTimeZone()))}
                  </p>
                </div>
                <Separator />
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-muted-foreground">Allocated</span>
                    <span class="font-medium">{formatCurrency(nextToSelectedPeriod.allocatedAmount ?? 0)}</span>
                  </div>
                </div>
              </Card.Content>
            </Card.Root>
            {/if}
          </div>

          <!-- Period Instance Manager -->
          {#if budget && firstTemplateId}
            {@const template = budget.periodTemplates?.[0]}
            <BudgetPeriodInstanceManager
              budgetId={budget.id}
              budgetName={budget.name}
              {...(template && {
                template: {
                  id: template.id,
                  budgetId: template.budgetId,
                  periodType: template.type as 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom',
                  interval: template.intervalCount,
                  ...(template.startDayOfWeek != null && { startDayOfWeek: template.startDayOfWeek }),
                  ...(template.startDayOfMonth != null && { startDayOfMonth: template.startDayOfMonth }),
                  ...(template.startMonth != null && { startMonth: template.startMonth }),
                }
              })}
              hideCurrentPeriod={true}
              hideConfiguration={true}
              instances={periods.map(p => ({
                id: p.id,
                budgetId: budget.id,
                templateId: firstTemplateId,
                startDate: p.startDate,
                endDate: p.endDate,
                allocated: p.allocatedAmount ?? 0,
                spent: 0,
                remaining: p.allocatedAmount ?? 0,
                status: p.id === currentPeriod?.id ? 'active' : (new Date(p.startDate) > new Date() ? 'upcoming' : 'completed'),
              }))}
            />
          {:else}
            <Card.Root>
              <Card.Content class="py-12 text-center text-muted-foreground">
                <Calendar class="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p class="text-lg font-medium mb-2">No Period Template</p>
                <p class="text-sm mb-6">Create a period template to manage recurring budget periods.</p>
                <Button variant="outline" onclick={() => periodTemplateDialogOpen = true}>
                  <Calendar class="h-4 w-4 mr-2" />
                  Create Period Template
                </Button>
              </Card.Content>
            </Card.Root>
          {/if}
        </div>

        <!-- Sidebar - Right Column -->
        <div class="space-y-6">
          <!-- Quick Actions Card -->
          <Card.Root>
            <Card.Header class="pb-3">
              <Card.Title class="text-base">Quick Actions</Card.Title>
            </Card.Header>
            <Card.Content class="space-y-3">
              <!-- Create New Period button removed - the backend generateNextPeriod uses lookAheadMonths
                   which doesn't work correctly for manual period creation. Periods are auto-created. -->
              <Button
                variant="outline"
                class="w-full justify-start"
                size="sm"
                disabled={!firstTemplateId}
                onclick={() => {
                  const template = budget?.periodTemplates?.[0];
                  if (template) {
                    templateForm.intervalCount = template.intervalCount;
                    templateForm.startDayOfMonth = template.startDayOfMonth ?? 1;
                  }
                  editTemplateDialogOpen = true;
                }}
              >
                <Settings2 class="h-4 w-4 mr-2" />
                Edit Template
              </Button>
              <Button
                variant="outline"
                class="w-full justify-start text-destructive hover:text-destructive"
                size="sm"
                disabled={!firstTemplateId}
                onclick={() => {
                  deleteTemplateDialogOpen = true;
                }}
              >
                <Trash2 class="h-4 w-4 mr-2" />
                Delete Template
              </Button>
              {#if previousToSelectedPeriod && selectedPeriod && !isRolloverProcessed(previousToSelectedPeriod.id, selectedPeriod.id)}
                <Separator />
                <Button
                  variant="outline"
                  class="w-full justify-start"
                  size="sm"
                  disabled={selectedPeriod.id !== currentPeriod?.id || rolloverMutation.isPending || isProcessingRollover}
                  onclick={async () => {
                    if (isProcessingRollover || rolloverMutation.isPending) return;

                    // Check if already processed (both session and database)
                    if (isRolloverProcessed(previousToSelectedPeriod.id, selectedPeriod.id)) return;

                    const rolloverKey = `${previousToSelectedPeriod.id}-${selectedPeriod.id}`;
                    isProcessingRollover = true;
                    try {
                      await rolloverMutation.mutateAsync({
                        fromPeriodId: previousToSelectedPeriod.id,
                        toPeriodId: selectedPeriod.id,
                      });
                      // Mark this rollover as completed in the session
                      completedRollovers.add(rolloverKey);
                    } finally {
                      isProcessingRollover = false;
                    }
                  }}
                >
                  <Repeat class={`h-4 w-4 mr-2 ${rolloverMutation.isPending || isProcessingRollover ? 'animate-spin' : ''}`} />
                  {rolloverMutation.isPending || isProcessingRollover ? 'Processing...' : 'Process Rollover'}
                </Button>
              {/if}
            </Card.Content>
          </Card.Root>

          <!-- Period Configuration Card -->
          {#if budget && budget.periodTemplates?.[0]}
            {@const template = budget.periodTemplates[0]}
          <Card.Root>
            <Card.Header class="pb-3">
              <div class="flex items-center gap-2">
                <Calendar class="h-4 w-4 text-muted-foreground" />
                <Card.Title class="text-base">Period Configuration</Card.Title>
              </div>
            </Card.Header>
            <Card.Content class="space-y-3">
              <div class="flex justify-between text-sm">
                <span class="text-muted-foreground">Type</span>
                <span class="font-medium capitalize">{template.type}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted-foreground">Interval</span>
                <span class="font-medium">
                  Every {template.intervalCount} {template.intervalCount === 1 ? template.type.slice(0, -2) : template.type}
                </span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted-foreground">Total Periods</span>
                <span class="font-medium">{periods.length}</span>
              </div>
              {#if template.startDayOfMonth}
              <div class="flex justify-between text-sm">
                <span class="text-muted-foreground">Starts On</span>
                <span class="font-medium">Day {template.startDayOfMonth}</span>
              </div>
              {/if}
            </Card.Content>
          </Card.Root>
          {/if}

          <!-- Period Context Card -->
          {#if selectedPeriod && periods.length > 0}
          <Card.Root>
            <Card.Header class="pb-3">
              <Card.Title class="text-base">Period Context</Card.Title>
            </Card.Header>
            <Card.Content class="space-y-3">
              <div class="flex justify-between text-sm">
                <span class="text-muted-foreground">Position</span>
                <span class="font-medium">
                  {periods.findIndex(p => p.id === selectedPeriod.id) + 1} of {periods.length}
                </span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted-foreground">Status</span>
                <span class="font-medium">
                  {selectedPeriod.id === currentPeriod?.id ? 'Current' :
                   new Date(selectedPeriod.startDate) > new Date() ? 'Upcoming' : 'Completed'}
                </span>
              </div>
              <Separator />
              <div class="text-xs text-muted-foreground">
                <div class="flex justify-between mb-1">
                  <span>Total Periods</span>
                  <span class="font-medium text-foreground">{periods.length}</span>
                </div>
                <div class="flex justify-between">
                  <span>Completed</span>
                  <span class="font-medium text-foreground">
                    {periods.filter(p => p.id !== currentPeriod?.id && new Date(p.startDate) <= new Date()).length}
                  </span>
                </div>
              </div>
            </Card.Content>
          </Card.Root>
          {/if}
        </div>
      </div>
    </Tabs.Content>

    <!-- Automation Tab -->
    <Tabs.Content value="automation">
      <div class="space-y-6">
        <!-- Period Automation Component -->
        {#if budget}
          <PeriodAutomation {budget} hideStatus={true} />
        {/if}

        <!-- Rollover Manager Component -->
        {#if budget}
          <BudgetRolloverManager budgets={[budget]} hidePeriodInfo={true} hideMetrics={true} />
        {/if}

        <!-- Budget Alerts - Coming Soon -->
        <Card.Root>
          <Card.Header>
            <div class="flex items-center gap-2">
              <TriangleAlert class="h-5 w-5 text-muted-foreground" />
              <Card.Title>Budget Alerts</Card.Title>
            </div>
            <Card.Description>Get notified about important budget events</Card.Description>
          </Card.Header>
          <Card.Content>
            <div class="py-8 text-center text-muted-foreground">
              <Info class="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p class="text-sm font-medium mb-1">Coming Soon</p>
              <p class="text-sm">Configure alerts for overspending, low balances, and period transitions.</p>
            </div>
          </Card.Content>
        </Card.Root>
      </div>
    </Tabs.Content>
  </Tabs.Root>
</div>
{/if}

<!-- Dialogs -->
{#if selectedEnvelopeForSettings && budget}
  <EnvelopeSettingsSheet
    bind:open={envelopeSettingsOpen}
    envelope={selectedEnvelopeForSettings}
    categoryName={getCategoryName(selectedEnvelopeForSettings.categoryId)}
  />
{/if}

{#if budget}
  {@const period = selectedPeriod || currentPeriod}
  {#if period}
    <EnvelopeCreateSheet
      bind:open={envelopeCreateOpen}
      budgetId={budget.id}
      periodInstance={period}
      availableCategories={availableCategories}
      onEnvelopeCreated={async (data) => {
        await createEnvelopeMutation.mutateAsync(data);
        envelopeCreateOpen = false;
      }}
    />
  {/if}
{/if}

{#if budget}
  <PeriodTemplateSheet
    bind:open={periodTemplateDialogOpen}
    budgetId={budget.id}
    defaultAllocatedAmount={allocatedAmount}
    onSuccess={() => {
      // TanStack Query will automatically refetch after mutation
      periodTemplateDialogOpen = false;
    }}
  />
{/if}

{#if selectedDeficitEnvelope}
  <EnvelopeDeficitRecoveryDialog
    bind:open={deficitRecoveryDialogOpen}
    envelope={selectedDeficitEnvelope}
    categoryName={getCategoryName(selectedDeficitEnvelope.categoryId)}
    analysis={deficitAnalysis}
    recoveryPlan={deficitRecoveryPlan}
    isAnalyzing={isAnalyzingDeficit}
    isCreatingPlan={isCreatingDeficitPlan}
    isExecuting={isExecutingDeficitPlan}
    onAnalyze={handleAnalyzeDeficit}
    onCreatePlan={handleCreateDeficitPlan}
    onExecutePlan={handleExecuteDeficitPlan}
  />
{/if}

<!-- Edit Template Dialog -->
<Dialog.Root bind:open={editTemplateDialogOpen}>
  <Dialog.Content class="sm:max-w-[425px]">
    <Dialog.Header>
      <Dialog.Title>Edit Period Template</Dialog.Title>
      <Dialog.Description>
        Update the settings for your budget period template. Changes will only affect future periods.
      </Dialog.Description>
    </Dialog.Header>
    <div class="grid gap-4 py-4">
      <div class="grid gap-2">
        <Label for="interval">Period Interval</Label>
        <Input
          id="interval"
          type="number"
          min="1"
          bind:value={templateForm.intervalCount}
          placeholder="1"
        />
        <p class="text-sm text-muted-foreground">
          How many months per period
        </p>
      </div>
      <div class="grid gap-2">
        <Label for="startDay">Start Day of Month</Label>
        <Input
          id="startDay"
          type="number"
          min="1"
          max="28"
          bind:value={templateForm.startDayOfMonth}
          placeholder="1"
        />
        <p class="text-sm text-muted-foreground">
          Day of month when each period starts (1-28)
        </p>
      </div>
    </div>
    <Dialog.Footer>
      <Button
        variant="outline"
        onclick={() => {
          editTemplateDialogOpen = false;
        }}
      >
        Cancel
      </Button>
      <Button
        disabled={updateTemplateMutation.isPending}
        onclick={async () => {
          const template = budget?.periodTemplates?.[0];
          if (!template) return;

          await updateTemplateMutation.mutateAsync({
            id: template.id,
            intervalCount: templateForm.intervalCount,
            startDayOfMonth: templateForm.startDayOfMonth,
          });

          editTemplateDialogOpen = false;
        }}
      >
        {updateTemplateMutation.isPending ? 'Saving...' : 'Save Changes'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Delete Template Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteTemplateDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Period Template?</AlertDialog.Title>
      <AlertDialog.Description>
        This will permanently delete this period template and remove all automated period creation.
        This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={async () => {
          if (!firstTemplateId) return;
          await deleteTemplateMutation.mutateAsync(firstTemplateId);
          deleteTemplateDialogOpen = false;
        }}
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {deleteTemplateMutation.isPending ? 'Deleting...' : 'Delete Template'}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
