<script lang="ts">
import { goto } from '$app/navigation';
import BudgetRecommendationsPanel from '$lib/components/budgets/budget-recommendations-panel.svelte';
import { EntitySearchToolbar } from '$lib/components/shared/search';
import type {
  SortOption,
  ViewMode,
  SortOrder,
  FilterSummary,
} from '$lib/components/shared/search';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { Checkbox } from '$lib/components/ui/checkbox';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import * as Empty from '$lib/components/ui/empty';
import { Label } from '$lib/components/ui/label';
import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
import * as Tabs from '$lib/components/ui/tabs';
import {
  bulkArchiveBudgets,
  bulkDeleteBudgets,
  deleteBudget,
  duplicateBudget,
  getPendingRecommendationsCount,
  listBudgets,
  updateBudget,
} from '$lib/query/budgets';
import type { BudgetGroup, BudgetMetadata } from '$core/schema/budgets';
import type { BudgetWithRelations } from '$core/server/domains/budgets';
import { demoMode, type DemoBudget } from '$lib/states/ui/demo-mode.svelte';
import { spotlightTour } from '$lib/states/ui/spotlight-tour.svelte';
import { headerActionsMode } from '$lib/stores/header-actions.svelte';
import { getPageTabsContext, type PageTab } from '$lib/stores/page-tabs.svelte';
import {
  calculateActualSpent,
  calculateAllocated,
  calculateUtilization,
} from '$lib/utils/budget-calculations';
import { resolveBudgetProgressStatus } from '$lib/utils/budget-status';
import { formatCurrency, formatCurrencyAbs, formatPercentRaw } from '$lib/utils/formatters';
import {
  ChartBar,
  ChevronDown,
  CircleCheck,
  DollarSign,
  FileText,
  FolderTree,
  Grid3x3,
  LayoutGrid,
  List as ListIcon,
  Plus,
  Sparkles,
  TrendingUp,
  TriangleAlert,
} from '@lucide/svelte/icons';
import { untrack } from 'svelte';
import BudgetAnalyticsDashboard from './(components)/analytics/budget-analytics-dashboard.svelte';
import BudgetGroupDialog from './(components)/dialogs/budget-group-dialog.svelte';
import BudgetManageDialog from './(components)/dialogs/budget-manage-dialog.svelte';
import BudgetTemplatePicker from './(components)/dialogs/budget-template-picker.svelte';
import BudgetForecastDisplay from './(components)/forecast/budget-forecast-display.svelte';
import BudgetGroupsSection from './(components)/forecast/budget-groups-section.svelte';
import BudgetSearchResults from './(components)/search/budget-search-results.svelte';

// Demo mode detection
const isDemoView = $derived(demoMode.isActive);
const isTourActive = $derived(spotlightTour.isActive);
const currentChapter = $derived(spotlightTour.currentChapter);

// Check if we're in budget-page chapter (interactable) vs navigation chapter (view-only)
const isBudgetPageChapter = $derived(currentChapter?.startsWith('budget-page') ?? false);
const isViewOnly = $derived(isDemoView && isTourActive && !isBudgetPageChapter);

// Reactive client-side queries. `enabled` is flipped off in demo mode
// so the underlying fetches pause — no need to reconstruct the query
// options each time `isDemoView` toggles.
const budgetsQuery = listBudgets().options(() => ({ enabled: !isDemoView }));
const budgetsLoading = $derived(isDemoView ? false : budgetsQuery.isLoading);

// Convert demo budgets to BudgetWithRelations-like structure for display
function demoBudgetToBudgetWithRelations(demoBudget: DemoBudget): BudgetWithRelations {
  return {
    id: demoBudget.id,
    // TODO: wire a real sequential id for demo budgets; using `id`
    // as `seq` happens to work today because nothing on this page
    // sorts by `seq`, but it's not a guarantee going forward.
    seq: demoBudget.id,
    workspaceId: demoBudget.workspaceId,
    name: demoBudget.name,
    slug: demoBudget.slug,
    description: demoBudget.description,
    type: demoBudget.type,
    scope: demoBudget.scope,
    status: demoBudget.status,
    enforcementLevel: demoBudget.enforcementLevel,
    metadata: {
      allocatedAmount: demoBudget.allocatedAmount,
      goal: demoBudget.goal,
    },
    createdAt: demoBudget.createdAt,
    updatedAt: demoBudget.updatedAt,
    deletedAt: null,
    // Relations as expected by BudgetWithRelations
    accounts: demoBudget.accounts.map((a) => ({
      id: 0,
      budgetId: demoBudget.id,
      accountId: a.id,
      associationType: 'spending' as const,
      account: { id: a.id, name: a.name } as any,
    })),
    categories: demoBudget.categories.map((c) => ({
      id: 0,
      budgetId: demoBudget.id,
      categoryId: c.id,
      category: { id: c.id, name: c.name, categoryColor: c.color } as any,
    })),
    transactions: [],
    groupMemberships: [],
    periodTemplates: [],
  } as BudgetWithRelations;
}

// Use demo data when in demo mode, otherwise use query data.
const budgets = $derived<BudgetWithRelations[]>(
  isDemoView
    ? demoMode.demoBudgets.map(demoBudgetToBudgetWithRelations)
    : (budgetsQuery.data ?? [])
);

// Pending recommendations count for the tab badge. Same `enabled` gate
// as budgets above — demo mode uses pre-filtered demo data.
const pendingCountQuery = getPendingRecommendationsCount().options(() => ({
  enabled: !isDemoView,
}));
const pendingCount = $derived(
  // Demo recommendations don't model dismissal — every demo recommendation
  // is implicitly pending, so a simple `.length` matches the real
  // "pending only" semantics for demo data shape.
  isDemoView
    ? demoMode.demoBudgetRecommendations.length
    : (pendingCountQuery.data ?? 0)
);

let manageDialogOpen = $state(false);
let selectedBudget = $state<BudgetWithRelations | null>(null);
let templatePickerOpen = $state(false);
let groupDialogOpen = $state(false);
let selectedGroup = $state<BudgetGroup | undefined>(undefined);
let activeTab = $state<string>('overview');

function setActiveTab(value: string | null | undefined) {
  const nextTab = value ? value : 'overview';
  if (nextTab === activeTab) return;
  activeTab = nextTab;
}

// Register tabs for header display
const pageTabsContext = getPageTabsContext();
const showTabsOnPage = $derived(headerActionsMode.tabsMode === 'off');

// Hoisted so both the header and in-page Tabs.List render from one
// source of truth. Groups used to be a sibling tab but is now a view
// mode inside Overview — see `overviewLayout` below.
const TABS: PageTab[] = [
  { id: 'overview', label: 'Budget Overview', icon: Grid3x3 },
  { id: 'recommendations', label: 'Recommendations', icon: Sparkles },
  { id: 'analytics', label: 'Analytics & Insights', icon: ChartBar },
];

// Register once on mount + clear on unmount. `untrack` stops Svelte
// from tracking `activeTab` here so this effect doesn't re-fire on
// tab switches — the sibling effect below pushes that via the cheap
// `setActive` path instead.
$effect(() => {
  if (!pageTabsContext) return;
  pageTabsContext.register({
    tabs: TABS,
    activeTab: untrack(() => activeTab),
    onTabChange: setActiveTab,
  });
  return () => pageTabsContext.clear();
});

// Propagate active-tab changes without re-registering the full config.
$effect(() => {
  pageTabsContext?.setActive(activeTab);
});

// Delete confirmation dialogs
let deleteDialogOpen = $state(false);
let bulkDeleteDialogOpen = $state(false);
let bulkArchiveDialogOpen = $state(false);
let budgetToDelete = $state<BudgetWithRelations | null>(null);
let budgetsToDelete = $state<BudgetWithRelations[]>([]);
let budgetsToArchive = $state<BudgetWithRelations[]>([]);
let deleteLinkedSchedule = $state(false);
let deleteLinkedSchedules = $state(false);

// Helper to check if a budget has a linked schedule
function getLinkedScheduleId(budget: BudgetWithRelations): number | null {
  const metadata = budget.metadata as BudgetMetadata | null;
  if (!metadata) return null;
  return metadata.scheduledExpense?.linkedScheduleId || metadata.goal?.linkedScheduleId || null;
}

const budgetToDeleteHasSchedule = $derived(
  budgetToDelete ? getLinkedScheduleId(budgetToDelete) !== null : false
);

const budgetsToDeleteWithSchedules = $derived(
  budgetsToDelete.filter((b) => getLinkedScheduleId(b) !== null)
);

const hasBudgetsWithSchedules = $derived(budgetsToDeleteWithSchedules.length > 0);

// ---- Search / filter / sort state for the Overview tab ----
type BudgetStatusFilter = 'all' | 'at-risk' | 'on-track' | 'paused';
type BudgetSortKey = 'name' | 'utilization' | 'updated';

const STATUS_FILTER_OPTIONS: Array<{ value: BudgetStatusFilter; label: string; short: string }> = [
  { value: 'all', label: 'All', short: 'All' },
  { value: 'at-risk', label: 'At risk (over + approaching)', short: 'At risk' },
  { value: 'on-track', label: 'On track', short: 'On track' },
  { value: 'paused', label: 'Paused / archived', short: 'Paused' },
];

const SORT_OPTIONS: SortOption<BudgetSortKey>[] = [
  { value: 'utilization', order: 'desc', label: 'Utilization (high → low)' },
  { value: 'utilization', order: 'asc', label: 'Utilization (low → high)' },
  { value: 'name', order: 'asc', label: 'Name' },
  { value: 'name', order: 'desc', label: 'Name' },
  { value: 'updated', order: 'desc', label: 'Recently updated' },
];

let searchQuery = $state('');
let viewMode = $state<ViewMode>('list');
/**
 * Overview sub-layout — flat list of budgets (filtered via toolbar) or
 * sections grouped by user-defined budget groups. Separate from
 * `viewMode` (list/grid) which only affects per-row rendering.
 */
let overviewLayout = $state<'flat' | 'grouped'>('flat');
let budgetFilters = $state<{ status: BudgetStatusFilter }>({ status: 'all' });
let sortBy = $state<BudgetSortKey>('utilization');
let sortOrder = $state<SortOrder>('desc');

const activeStatusFilter = $derived(budgetFilters.status);
const activeFilterCount = $derived(activeStatusFilter !== 'all' ? 1 : 0);

const filterSummaries = $derived<FilterSummary[]>(
  activeStatusFilter === 'all'
    ? []
    : [
        {
          key: 'status',
          label:
            STATUS_FILTER_OPTIONS.find((o) => o.value === activeStatusFilter)?.short ??
            activeStatusFilter,
        },
      ]
);

function statusMatchesFilter(
  filter: BudgetStatusFilter,
  budget: BudgetWithRelations
): boolean {
  if (filter === 'all') return true;
  const status = resolveBudgetProgressStatus(budget);
  if (filter === 'at-risk') return status === 'over' || status === 'approaching';
  if (filter === 'on-track') return status === 'on_track';
  if (filter === 'paused') return status === 'paused';
  return true;
}

const filteredBudgets = $derived.by(() => {
  const query = searchQuery.trim().toLowerCase();
  const list = budgets.filter((b) => {
    if (!statusMatchesFilter(activeStatusFilter, b)) return false;
    if (!query) return true;
    return (
      (b.name ?? '').toLowerCase().includes(query) ||
      (b.description ?? '').toLowerCase().includes(query)
    );
  });

  const sign = sortOrder === 'asc' ? 1 : -1;
  const sorted = [...list].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return sign * (a.name ?? '').localeCompare(b.name ?? '');
      case 'updated':
        return sign * (a.updatedAt ?? '').localeCompare(b.updatedAt ?? '');
      case 'utilization':
      default:
        return sign * (calculateUtilization(a) - calculateUtilization(b));
    }
  });
  return sorted;
});

function clearAllSearch() {
  searchQuery = '';
  budgetFilters = { status: 'all' };
}

/**
 * Alerts summary-card handler. Filter the Overview list to at-risk
 * budgets (overspent + approaching cap) and jump to the Overview tab
 * so the user lands directly on the actionable set.
 */
function focusAtRiskBudgets() {
  budgetFilters = { status: 'at-risk' };
  searchQuery = '';
  setActiveTab('overview');
}

// Mutations
const duplicateMutation = duplicateBudget.options();
const updateMutation = updateBudget.options();
const deleteMutation = deleteBudget.options();
const bulkArchiveMutation = bulkArchiveBudgets.options();
const bulkDeleteMutation = bulkDeleteBudgets.options();

async function handleDuplicateBudget(budget: BudgetWithRelations) {
  await duplicateMutation.mutateAsync({ id: budget.id });
}

async function handleArchiveBudget(budget: BudgetWithRelations) {
  await updateMutation.mutateAsync({ id: budget.id, data: { status: 'archived' } });
}

function handleDeleteBudget(budget: BudgetWithRelations) {
  budgetToDelete = budget;
  deleteLinkedSchedule = false; // Reset checkbox
  deleteDialogOpen = true;
}

async function confirmDeleteBudget() {
  if (!budgetToDelete) return;
  await deleteMutation.mutateAsync({
    id: budgetToDelete.id,
    deleteLinkedSchedule: budgetToDeleteHasSchedule && deleteLinkedSchedule,
  });
  deleteDialogOpen = false;
  budgetToDelete = null;
  deleteLinkedSchedule = false;
}

function handleCreateGroup() {
  selectedGroup = undefined;
  groupDialogOpen = true;
}

function handleEditGroup(group: BudgetGroup) {
  selectedGroup = group;
  groupDialogOpen = true;
}

// Action handlers for data table
function handleViewBudget(budget: BudgetWithRelations) {
  goto(`/budgets/${budget.slug}`);
}

function handleEditBudget(budget: BudgetWithRelations) {
  selectedBudget = budget;
  manageDialogOpen = true;
}

function handleBulkDeleteBudgets(budgets: BudgetWithRelations[]) {
  budgetsToDelete = budgets;
  deleteLinkedSchedules = false; // Reset checkbox
  bulkDeleteDialogOpen = true;
}

async function confirmBulkDelete() {
  const ids = budgetsToDelete.map((b) => b.id);
  await bulkDeleteMutation.mutateAsync({
    ids,
    deleteLinkedSchedules: hasBudgetsWithSchedules && deleteLinkedSchedules,
  });
  bulkDeleteDialogOpen = false;
  budgetsToDelete = [];
  deleteLinkedSchedules = false;
}

function handleBulkArchiveBudgets(budgets: BudgetWithRelations[]) {
  budgetsToArchive = budgets;
  bulkArchiveDialogOpen = true;
}

async function confirmBulkArchive() {
  const ids = budgetsToArchive.map((b) => b.id);
  await bulkArchiveMutation.mutateAsync(ids);
  bulkArchiveDialogOpen = false;
  budgetsToArchive = [];
}

// Active budgets (excludes paused/archived) — used by both the summary
// alert counts and the analytics forecast list. Sorted descending by
// utilization so the analytics "top 4" reflects where the attention
// actually needs to go.
const activeBudgets = $derived.by(() => {
  const list = budgets.filter((b) => b.status === 'active');
  return [...list].sort(
    (a, b) => calculateUtilization(b) - calculateUtilization(a)
  );
});

const summaryMetrics = $derived.by(() => {
  // Use demo budget data directly when in demo mode (pre-calculated values)
  if (isDemoView) {
    const demoBudgets = demoMode.demoBudgets;
    let totalAllocated = 0;
    let totalConsumed = 0;
    let atRiskCount = 0;
    let approachingCount = 0;

    demoBudgets.forEach((budget) => {
      totalAllocated += budget.allocatedAmount;
      totalConsumed += budget.spent;

      // Match real branch's resolveStatus: only active budgets contribute to alerts.
      if (budget.status !== 'active') return;
      if (budget.progressStatus === 'over') atRiskCount++;
      else if (budget.progressStatus === 'approaching') approachingCount++;
    });

    const remaining = totalAllocated - totalConsumed;
    const percentUsed = totalAllocated > 0 ? (totalConsumed / totalAllocated) * 100 : 0;

    return {
      totalAllocated,
      totalConsumed,
      remaining,
      percentUsed,
      atRiskCount,
      approachingCount,
      totalBudgets: demoBudgets.length,
      activeBudgets: demoBudgets.filter((b) => b.status === 'active').length,
    };
  }

  // Regular calculation for real budgets
  let totalAllocated = 0;
  let totalConsumed = 0;
  let atRiskCount = 0;
  let approachingCount = 0;

  budgets.forEach((budget) => {
    const allocated = calculateAllocated(budget);
    const consumed = calculateActualSpent(budget);
    const status = resolveBudgetProgressStatus(budget);

    totalAllocated += allocated;
    totalConsumed += consumed;

    if (status === 'over') atRiskCount++;
    else if (status === 'approaching') approachingCount++;
  });

  const remaining = totalAllocated - totalConsumed;
  const percentUsed = totalAllocated > 0 ? (totalConsumed / totalAllocated) * 100 : 0;

  return {
    totalAllocated,
    totalConsumed,
    remaining,
    percentUsed,
    atRiskCount,
    approachingCount,
    totalBudgets: budgets.length,
    activeBudgets: activeBudgets.length,
  };
});

// Alerts summary-card click state — derived here because it depends on
// `summaryMetrics` above.
const totalAlerts = $derived(
  summaryMetrics.atRiskCount + summaryMetrics.approachingCount
);
const alertsClickable = $derived(totalAlerts > 0);

// The single most-at-risk budget (highest utilization among active
// budgets whose status is `over` or `approaching`). Surfaced inline on
// Overview so the user sees a concrete forecast without having to jump
// to the Analytics tab. Null when nothing is at risk.
const topAtRiskBudget = $derived(
  activeBudgets.find((b) => {
    const s = resolveBudgetProgressStatus(b);
    return s === 'over' || s === 'approaching';
  }) ?? null
);
</script>

<svelte:head>
  <title>Budgets - Budget App</title>
  <meta name="description" content="Manage your budgets and spending limits" />
</svelte:head>

<div class="space-y-6" class:pointer-events-none={isViewOnly}>
  <!-- Header -->
  <div
    class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    data-help-id="budgets-page-header"
    data-help-title="Budgets Page"
    data-tour-id="budgets-page">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Budgets</h1>
      {#if budgets.length === 0}
        <p class="text-muted-foreground text-sm">No budgets yet — create your first to start tracking.</p>
      {:else}
        <p class="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          <span>
            <span class="text-foreground font-medium tabular-nums">
              {summaryMetrics.activeBudgets}
            </span>
            active
          </span>
          <span class="text-muted-foreground/50" aria-hidden="true">·</span>
          <span>
            <span class="text-foreground font-medium tabular-nums">
              {formatPercentRaw(summaryMetrics.percentUsed, 0)}
            </span>
            spent
          </span>
          {#if totalAlerts > 0}
            <span class="text-muted-foreground/50" aria-hidden="true">·</span>
            <button
              type="button"
              class="text-destructive hover:text-destructive inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
              onclick={focusAtRiskBudgets}>
              <span class="tabular-nums">{totalAlerts}</span>
              flagged
            </button>
          {/if}
        </p>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button {...props} data-tour-id="create-budget-button">
              <Plus class="mr-2 h-4 w-4" />
              New budget
              <ChevronDown class="ml-1 h-3 w-3" />
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" class="w-56">
          <DropdownMenu.Group>
            <DropdownMenu.GroupHeading>Create</DropdownMenu.GroupHeading>
            <DropdownMenu.Item onclick={() => goto('/budgets/new')}>
              <FileText class="mr-2 h-4 w-4" />
              Blank budget
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onclick={() => (templatePickerOpen = true)}
              data-help-id="templates-button"
              data-help-title="Budget Templates"
              data-help-modal="budget-template-picker">
              <Sparkles class="mr-2 h-4 w-4" />
              From template…
            </DropdownMenu.Item>
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  </div>

  <!-- Summary Dashboard -->
  {#if !budgetsLoading && budgets.length > 0}
    <div
      class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4"
      role="region"
      aria-label="Budget summary statistics"
      data-help-id="budget-summary"
      data-help-title="Budget Summary"
      data-tour-id="budget-summary">
      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-xs font-medium sm:text-sm">Total Allocated</Card.Title>
          <DollarSign class="text-muted-foreground h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
        </Card.Header>
        <Card.Content>
          <div
            class="truncate text-lg font-bold tabular-nums sm:text-2xl"
            title={formatCurrencyAbs(summaryMetrics.totalAllocated)}>
            {formatCurrencyAbs(summaryMetrics.totalAllocated)}
          </div>
          <p class="text-muted-foreground text-[10px] sm:text-xs">
            Across {summaryMetrics.totalBudgets}
            {summaryMetrics.totalBudgets === 1 ? 'budget' : 'budgets'}
          </p>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-xs font-medium sm:text-sm">Total Spent</Card.Title>
          <TrendingUp class="text-muted-foreground h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
        </Card.Header>
        <Card.Content>
          <div
            class="truncate text-lg font-bold tabular-nums sm:text-2xl {summaryMetrics.percentUsed > 100
              ? 'text-destructive'
              : ''}"
            title={formatCurrencyAbs(summaryMetrics.totalConsumed)}>
            {formatCurrencyAbs(summaryMetrics.totalConsumed)}
          </div>
          <p
            class="text-[10px] sm:text-xs {summaryMetrics.percentUsed > 100
              ? 'text-destructive'
              : 'text-muted-foreground'}">
            {formatPercentRaw(summaryMetrics.percentUsed, 1)} of allocated
          </p>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-xs font-medium sm:text-sm">
            {summaryMetrics.remaining < 0 ? 'Overspent' : 'Remaining'}
          </Card.Title>
          <CircleCheck class="text-muted-foreground h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
        </Card.Header>
        <Card.Content>
          <div
            class="truncate text-lg font-bold tabular-nums sm:text-2xl {summaryMetrics.remaining < 0
              ? 'text-destructive'
              : ''}"
            title={formatCurrency(summaryMetrics.remaining)}>
            {formatCurrency(summaryMetrics.remaining)}
          </div>
          <p class="text-muted-foreground text-[10px] sm:text-xs">
            {summaryMetrics.activeBudgets} active {summaryMetrics.activeBudgets === 1
              ? 'budget'
              : 'budgets'}
          </p>
        </Card.Content>
      </Card.Root>

      <Card.Root
        class={alertsClickable
          ? 'group cursor-pointer transition-colors hover:border-destructive/40 hover:bg-destructive/5'
          : ''}
        role={alertsClickable ? 'button' : undefined}
        tabindex={alertsClickable ? 0 : undefined}
        aria-label={alertsClickable
          ? `Filter list to ${totalAlerts} at-risk budget${totalAlerts === 1 ? '' : 's'}`
          : undefined}
        onclick={alertsClickable ? focusAtRiskBudgets : undefined}
        onkeydown={alertsClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                focusAtRiskBudgets();
              }
            }
          : undefined}>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-xs font-medium sm:text-sm">Alerts</Card.Title>
          <TriangleAlert
            class="h-3 w-3 shrink-0 sm:h-4 sm:w-4 {alertsClickable
              ? 'text-destructive'
              : 'text-muted-foreground'}" />
        </Card.Header>
        <Card.Content>
          <div
            class="text-lg font-bold sm:text-2xl {alertsClickable ? 'text-destructive' : ''}">
            {totalAlerts}
          </div>
          <p class="text-muted-foreground text-[10px] sm:text-xs">
            {#if alertsClickable}
              {summaryMetrics.atRiskCount} over, {summaryMetrics.approachingCount} approaching
              <span
                class="text-destructive ml-1 opacity-70 transition-opacity group-hover:opacity-100">
                · review
              </span>
            {:else}
              0 over, 0 approaching
            {/if}
          </p>
        </Card.Content>
      </Card.Root>
    </div>
  {/if}

  <!-- Content -->
  {#if budgetsLoading && budgets.length === 0}
    <!-- Initial loading skeletons -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {#each Array(8) as _, i (i)}
        <Card.Root>
          <Card.Header class="space-y-2">
            <div class="bg-muted h-5 w-3/4 animate-pulse rounded"></div>
            <div class="bg-muted h-3 w-full animate-pulse rounded"></div>
          </Card.Header>
          <Card.Content class="space-y-3">
            <div class="bg-muted h-3 w-1/2 animate-pulse rounded"></div>
            <div class="bg-muted h-3 w-2/3 animate-pulse rounded"></div>
            <div class="mt-4 flex gap-2">
              <div class="bg-muted h-8 w-16 animate-pulse rounded"></div>
              <div class="bg-muted h-8 w-16 animate-pulse rounded"></div>
            </div>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  {:else}
    {#snippet overviewContent()}
      {#if budgets.length === 0}
        <Empty.Empty>
          <Empty.EmptyMedia variant="icon">
            <DollarSign class="size-6" />
          </Empty.EmptyMedia>
          <Empty.EmptyHeader>
            <Empty.EmptyTitle>No Budgets Yet</Empty.EmptyTitle>
            <Empty.EmptyDescription>
              Get started by creating your first budget. Track your spending across different
              categories and manage your finances effectively.
            </Empty.EmptyDescription>
          </Empty.EmptyHeader>
          <Empty.EmptyContent>
            <div class="flex flex-col gap-2 sm:flex-row">
              <Button href="/budgets/new">
                <Plus class="mr-2 h-4 w-4" />
                Create Your First Budget
              </Button>
              <Button variant="outline" onclick={() => setActiveTab('recommendations')}>
                <Sparkles class="mr-2 h-4 w-4" />
                View Recommendations
              </Button>
            </div>
          </Empty.EmptyContent>
        </Empty.Empty>
      {:else}
        <div class="space-y-4" data-tour-id="budget-list">
          {#if topAtRiskBudget}
            <section
              class="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <header class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2 text-sm font-semibold">
                  <TriangleAlert class="text-destructive h-4 w-4 shrink-0" />
                  <span>Forecast needs attention: {topAtRiskBudget.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => setActiveTab('analytics')}>
                  View all forecasts →
                </Button>
              </header>
              <BudgetForecastDisplay
                budgetId={topAtRiskBudget.id}
                daysAhead={30}
                showAutoAllocate={false} />
            </section>
          {/if}

          <div class="flex flex-wrap items-center gap-2">
            <!-- Flat vs Grouped layout toggle — replaces the old Groups tab. -->
            <div
              class="inline-flex items-center rounded-md border"
              role="group"
              aria-label="Overview layout"
              data-tour-id="budget-layout-toggle">
              <Button
                variant={overviewLayout === 'flat' ? 'default' : 'ghost'}
                size="sm"
                class="h-9 rounded-r-none border-r"
                aria-pressed={overviewLayout === 'flat'}
                onclick={() => (overviewLayout = 'flat')}>
                <ListIcon class="mr-1.5 h-4 w-4" />
                Flat
              </Button>
              <Button
                variant={overviewLayout === 'grouped' ? 'default' : 'ghost'}
                size="sm"
                class="h-9 rounded-l-none"
                aria-pressed={overviewLayout === 'grouped'}
                onclick={() => (overviewLayout = 'grouped')}>
                <FolderTree class="mr-1.5 h-4 w-4" />
                Grouped
              </Button>
            </div>
            <div class="flex-1"></div>
          </div>

          {#if overviewLayout === 'grouped'}
            <BudgetGroupsSection
              onCreateGroup={handleCreateGroup}
              onEditGroup={handleEditGroup} />
          {:else}
            <EntitySearchToolbar
              bind:searchQuery
              searchPlaceholder="Search budgets by name or description…"
              bind:filters={budgetFilters}
              {activeFilterCount}
              {filterSummaries}
              bind:viewMode
              bind:sortBy
              bind:sortOrder
              sortOptions={SORT_OPTIONS}
              onSearchChange={(q) => (searchQuery = q)}
              onFiltersChange={(next) => (budgetFilters = next)}
              onViewModeChange={(m) => (viewMode = m)}
              onSortChange={(key, order) => {
                sortBy = key;
                sortOrder = order;
              }}
              onClearAll={clearAllSearch}>
              {#snippet filterContent()}
                <div class="space-y-3">
                  <div class="space-y-2">
                    <Label
                      class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </Label>
                    <RadioGroup
                      value={budgetFilters.status}
                      onValueChange={(value) =>
                        (budgetFilters = {
                          ...budgetFilters,
                          status: value as BudgetStatusFilter,
                        })}
                      class="space-y-1.5">
                      {#each STATUS_FILTER_OPTIONS as option (option.value)}
                        <div class="flex items-center gap-2">
                          <RadioGroupItem
                            id="budget-status-{option.value}"
                            value={option.value} />
                          <Label
                            for="budget-status-{option.value}"
                            class="cursor-pointer text-sm font-normal">
                            {option.label}
                          </Label>
                        </div>
                      {/each}
                    </RadioGroup>
                  </div>
                </div>
              {/snippet}
            </EntitySearchToolbar>

            <div class="text-muted-foreground text-xs">
              Showing {filteredBudgets.length} of {budgets.length} budgets
            </div>

            <BudgetSearchResults
              budgets={filteredBudgets}
              isLoading={budgetsLoading}
              {searchQuery}
              {viewMode}
              onView={handleViewBudget}
              onEdit={handleEditBudget}
              onDelete={handleDeleteBudget}
              onDuplicate={handleDuplicateBudget}
              onArchive={handleArchiveBudget}
              onBulkDelete={handleBulkDeleteBudgets}
              onBulkArchive={handleBulkArchiveBudgets} />
          {/if}
        </div>
      {/if}
    {/snippet}

    {#snippet recommendationsContent()}
      <BudgetRecommendationsPanel />
    {/snippet}

    {#snippet analyticsContent()}
      {#if activeBudgets.length > 0}
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <!--
            Top 2 highest-utilization forecasts by default — each
            `BudgetForecastDisplay` fires its own query, so this is the
            intentional cap. The #1 most-at-risk forecast is already
            surfaced inline on Overview, so Analytics covers the next
            tier without duplicating network load. A future "Expand
            all" control would fetch the rest on demand.
          -->
          {#each activeBudgets.slice(0, 2) as budget (budget.id)}
            <BudgetForecastDisplay
              budgetId={budget.id}
              daysAhead={30}
              showAutoAllocate={false} />
          {/each}
        </div>
      {/if}
      <BudgetAnalyticsDashboard {budgets} />
    {/snippet}

    {#if showTabsOnPage}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab} class="space-y-6">
        <Tabs.List
          class="grid w-full grid-cols-3"
          data-help-id="budget-tabs"
          data-help-title="Budget Tabs"
          data-tour-id="budget-tabs">
          {#each TABS as tab (tab.id)}
            {@const Icon = tab.icon}
            {@const badgeCount =
              tab.id === 'recommendations'
                ? pendingCount
                : tab.id === 'overview'
                  ? totalAlerts
                  : 0}
            {@const badgeVariant = tab.id === 'overview' ? 'destructive' : 'default'}
            <Tabs.Trigger
              value={tab.id}
              class="flex items-center gap-2"
              data-tour-id="budget-{tab.id}-tab">
              {#if Icon}<Icon class="h-4 w-4 shrink-0" />{/if}
              <span class="hidden truncate sm:inline">{tab.label}</span>
              {#if badgeCount > 0}
                <Badge variant={badgeVariant} class="ml-auto h-5 min-w-5 px-1.5 sm:ml-1">
                  {badgeCount}
                </Badge>
              {/if}
            </Tabs.Trigger>
          {/each}
        </Tabs.List>

        <Tabs.Content value="overview" class="space-y-6">
          {@render overviewContent()}
        </Tabs.Content>
        <Tabs.Content value="recommendations" class="space-y-6">
          {@render recommendationsContent()}
        </Tabs.Content>
        <Tabs.Content value="analytics" class="space-y-6">
          {@render analyticsContent()}
        </Tabs.Content>
      </Tabs.Root>
    {:else}
      <div class="space-y-6">
        {#if activeTab === 'overview'}
          {@render overviewContent()}
        {:else if activeTab === 'recommendations'}
          {@render recommendationsContent()}
        {:else if activeTab === 'analytics'}
          {@render analyticsContent()}
        {/if}
      </div>
    {/if}
  {/if}
</div>

<!-- Template Picker Dialog -->
<BudgetTemplatePicker bind:open={templatePickerOpen} />

<BudgetManageDialog budget={selectedBudget} bind:open={manageDialogOpen} />

<BudgetGroupDialog budgetGroup={selectedGroup} bind:open={groupDialogOpen} />

<!-- Delete Budget Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Budget</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete "{budgetToDelete?.name}"? This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>

    {#if budgetToDeleteHasSchedule}
      <div class="flex items-start gap-3 rounded-lg border p-4">
        <Checkbox id="delete-schedule-single" bind:checked={deleteLinkedSchedule} />
        <div class="space-y-1">
          <Label for="delete-schedule-single" class="cursor-pointer font-medium">
            Also delete the linked schedule
          </Label>
          <p class="text-muted-foreground text-xs">
            This budget has a linked recurring schedule. Check this box to delete the schedule as
            well, or leave unchecked to keep the schedule.
          </p>
        </div>
      </div>
    {/if}

    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmDeleteBudget}
        disabled={deleteMutation.isPending}
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
        {#if deleteMutation.isPending}
          Deleting...
        {:else}
          Delete Budget
        {/if}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- Bulk Delete Budgets Confirmation Dialog -->
<AlertDialog.Root bind:open={bulkDeleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete {budgetsToDelete.length} Budget(s)</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete {budgetsToDelete.length} budget(s)? This action cannot be undone
        and will remove all associated budget data.
      </AlertDialog.Description>
    </AlertDialog.Header>

    {#if hasBudgetsWithSchedules}
      <div class="flex items-start gap-3 rounded-lg border p-4">
        <Checkbox id="delete-schedules-bulk" bind:checked={deleteLinkedSchedules} />
        <div class="space-y-1">
          <Label for="delete-schedules-bulk" class="cursor-pointer font-medium">
            Also delete linked schedules
          </Label>
          <p class="text-muted-foreground text-xs">
            {budgetsToDeleteWithSchedules.length} of the selected budget(s) have linked recurring schedules.
            Check this box to delete the schedules as well, or leave unchecked to keep them.
          </p>
        </div>
      </div>
    {/if}

    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmBulkDelete}
        disabled={bulkDeleteMutation.isPending}
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
        {#if bulkDeleteMutation.isPending}
          Deleting...
        {:else}
          Delete {budgetsToDelete.length} Budget(s)
        {/if}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- Bulk Archive Budgets Confirmation Dialog -->
<AlertDialog.Root bind:open={bulkArchiveDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Archive {budgetsToArchive.length} Budget(s)</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to archive {budgetsToArchive.length} budget(s)? Archived budgets can be
        restored later.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={confirmBulkArchive} disabled={bulkArchiveMutation.isPending}>
        {#if bulkArchiveMutation.isPending}
          Archiving...
        {:else}
          Archive {budgetsToArchive.length} Budget(s)
        {/if}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
