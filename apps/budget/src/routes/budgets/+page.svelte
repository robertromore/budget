<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import {Button} from "$lib/components/ui/button";
  import * as Tabs from "$lib/components/ui/tabs";
  import * as Empty from "$lib/components/ui/empty";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import BudgetManageDialog from "./(components)/dialogs/budget-manage-dialog.svelte";
  import BudgetAnalyticsDashboard from "./(components)/analytics/budget-analytics-dashboard.svelte";
  import BudgetFundTransfer from "./(components)/managers/budget-fund-transfer.svelte";
  import BudgetRolloverManager from "./(components)/managers/budget-rollover-manager.svelte";
  import BudgetTemplatePicker from "./(components)/dialogs/budget-template-picker.svelte";
  import BudgetGroupsSection from "./(components)/forecast/budget-groups-section.svelte";
  import BudgetGroupDialog from "./(components)/dialogs/budget-group-dialog.svelte";
  import BudgetForecastDisplay from "./(components)/forecast/budget-forecast-display.svelte";
  import BudgetSearchResults from "./(components)/search/budget-search-results.svelte";
  import BudgetSearchFilters from "./(components)/search/budget-search-filters.svelte";
  import EntitySearchToolbar from "$lib/components/shared/search/entity-search-toolbar.svelte";
  import {listBudgets, duplicateBudget, updateBudget, deleteBudget, bulkArchiveBudgets, bulkDeleteBudgets, getPendingRecommendationsCount} from "$lib/query/budgets";
  import type {BudgetWithRelations} from "$lib/server/domains/budgets";
  import type {BudgetGroup} from "$lib/schema/budgets";
  import {budgetSearchState} from "$lib/states/ui/budget-search.svelte";
  import {currencyFormatter} from "$lib/utils/formatters";
  import {calculateActualSpent} from "$lib/utils/budget-calculations";
  import {goto} from "$app/navigation";
  import BudgetRecommendationsPanel from "$lib/components/budgets/budget-recommendations-panel.svelte";
  import {Badge} from "$lib/components/ui/badge";
  import {
    ChartBar,
    Grid3x3,
    ArrowRightLeft,
    RotateCcw,
    DollarSign,
    TrendingUp,
    TriangleAlert,
    CircleCheck,
    Sparkles,
    FolderTree,
    Plus,
  } from "@lucide/svelte/icons";

  // Use reactive client-side query instead of server data
  const budgetsQuery = listBudgets().options();
  const budgets = $derived<BudgetWithRelations[]>(budgetsQuery.data ?? []);
  const budgetsLoading = $derived(budgetsQuery.isLoading);

  // Get pending recommendations count for badge
  const pendingCountQuery = getPendingRecommendationsCount().options();
  const pendingCount = $derived(pendingCountQuery.data ?? 0);

  let manageDialogOpen = $state(false);
  let selectedBudget = $state<BudgetWithRelations | null>(null);
  let templatePickerOpen = $state(false);
  let groupDialogOpen = $state(false);
  let selectedGroup = $state<BudgetGroup | undefined>(undefined);

  // Delete confirmation dialogs
  let deleteDialogOpen = $state(false);
  let bulkDeleteDialogOpen = $state(false);
  let bulkArchiveDialogOpen = $state(false);
  let budgetToDelete = $state<BudgetWithRelations | null>(null);
  let budgetsToDelete = $state<BudgetWithRelations[]>([]);
  let budgetsToArchive = $state<BudgetWithRelations[]>([]);

  // Use centralized search state
  const search = budgetSearchState;

  // Sort options for toolbar
  const budgetSortOptions = [
    {value: 'name' as const, label: 'Name', order: 'asc' as const},
    {value: 'name' as const, label: 'Name', order: 'desc' as const},
    {value: 'allocated' as const, label: 'Allocated', order: 'desc' as const},
    {value: 'consumed' as const, label: 'Consumed', order: 'desc' as const},
    {value: 'remaining' as const, label: 'Remaining', order: 'desc' as const},
  ];

  function getAllocated(budget: BudgetWithRelations) {
    const templates = budget.periodTemplates ?? [];
    const periods = templates.flatMap((template) => template.periods ?? []);
    if (!periods.length) return 0;

    const latest = periods.reduce((latest, current) =>
      latest.endDate > current.endDate ? latest : current
    );

    if (latest) return Math.abs(latest.allocatedAmount ?? 0);
    return Math.abs((budget.metadata as Record<string, unknown>)?.['allocatedAmount'] as number ?? 0);
  }

  function getConsumed(budget: BudgetWithRelations) {
    return calculateActualSpent(budget);
  }

  function formatCurrency(value: number) {
    return currencyFormatter.format(Math.abs(value ?? 0));
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
    deleteDialogOpen = true;
  }

  async function confirmDeleteBudget() {
    if (!budgetToDelete) return;
    await deleteMutation.mutateAsync(budgetToDelete.id);
    deleteDialogOpen = false;
    budgetToDelete = null;
  }

  async function handleFundTransfer(_fromId: number, _toId: number, _amount: number) {
    // This would integrate with your tRPC mutations once the backend is ready
    await new Promise(resolve => setTimeout(resolve, 1000));
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
    bulkDeleteDialogOpen = true;
  }

  async function confirmBulkDelete() {
    const ids = budgetsToDelete.map(b => b.id);
    await bulkDeleteMutation.mutateAsync(ids);
    bulkDeleteDialogOpen = false;
    budgetsToDelete = [];
  }

  function handleBulkArchiveBudgets(budgets: BudgetWithRelations[]) {
    budgetsToArchive = budgets;
    bulkArchiveDialogOpen = true;
  }

  async function confirmBulkArchive() {
    const ids = budgetsToArchive.map(b => b.id);
    await bulkArchiveMutation.mutateAsync(ids);
    bulkArchiveDialogOpen = false;
    budgetsToArchive = [];
  }

  // Summary metrics
  // Filtered and sorted budgets
  const filteredBudgets = $derived.by(() => {
    let filtered = [...budgets];

    // Apply search filter
    if (search.query.trim()) {
      const term = search.query.toLowerCase();
      filtered = filtered.filter(budget =>
        budget.name.toLowerCase().includes(term) ||
        budget.description?.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (search.filters.status) {
      filtered = filtered.filter(budget => budget.status === search.filters.status);
    }

    // Apply type filter
    if (search.filters.type) {
      filtered = filtered.filter(budget => budget.type === search.filters.type);
    }

    // Apply scope filter
    if (search.filters.scope) {
      filtered = filtered.filter(budget => budget.scope === search.filters.scope);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (search.sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "allocated":
          comparison = getAllocated(b) - getAllocated(a);
          break;
        case "consumed":
          comparison = getConsumed(b) - getConsumed(a);
          break;
        case "remaining": {
          const aRemaining = getAllocated(a) - getConsumed(a);
          const bRemaining = getAllocated(b) - getConsumed(b);
          comparison = bRemaining - aRemaining;
          break;
        }
        case "created":
          comparison = (a.createdAt || '').localeCompare(b.createdAt || '');
          break;
        case "type":
          comparison = a.type.localeCompare(b.type);
          break;
        default:
          comparison = 0;
      }
      return search.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  });

  function resolveStatus(budget: BudgetWithRelations) {
    if (budget.status !== 'active') return 'paused' as const;
    const allocated = getAllocated(budget);
    const consumed = getConsumed(budget);
    if (!allocated) return 'paused' as const;

    const ratio = consumed / allocated;
    if (ratio > 1) return 'over' as const;
    if (ratio >= 0.8) return 'approaching' as const;
    return 'on_track' as const;
  }

  const summaryMetrics = $derived.by(() => {
    let totalAllocated = 0;
    let totalConsumed = 0;
    let atRiskCount = 0;
    let approachingCount = 0;

    budgets.forEach(budget => {
      const allocated = getAllocated(budget);
      const consumed = getConsumed(budget);
      const status = resolveStatus(budget);

      totalAllocated += allocated;
      totalConsumed += consumed;

      if (status === 'over' || status === 'approaching') {
        if (status === 'over') atRiskCount++;
        else approachingCount++;
      }
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
      activeBudgets: budgets.filter(b => b.status === 'active').length,
    };
  });

</script>

<svelte:head>
  <title>Budgets - Budget App</title>
  <meta name="description" content="Manage your budgets and spending limits" />
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Budgets</h1>
      <p class="text-muted-foreground">
        {#if search.isSearchActive}
          {filteredBudgets.length} of {budgets.length} budgets
        {:else}
          {budgets.length} budgets total
        {/if}
      </p>
    </div>
    <div class="flex items-center gap-2">
      <Button variant="outline" onclick={() => (templatePickerOpen = true)}>
        <Sparkles class="h-4 w-4 mr-2" />
        Templates
      </Button>
      <Button href="/budgets/new">
        <Plus class="mr-2 h-4 w-4" />
        Create Budget
      </Button>
    </div>
  </div>

  <!-- Summary Dashboard -->
  {#if !budgetsLoading && budgets.length > 0}
  <div class="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4" role="region" aria-label="Budget summary statistics">
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-xs sm:text-sm font-medium">Total Allocated</Card.Title>
        <DollarSign class="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
      </Card.Header>
      <Card.Content>
        <div class="text-lg sm:text-2xl font-bold break-all">{formatCurrency(summaryMetrics.totalAllocated)}</div>
        <p class="text-[10px] sm:text-xs text-muted-foreground">
          Across {summaryMetrics.totalBudgets} {summaryMetrics.totalBudgets === 1 ? 'budget' : 'budgets'}
        </p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-xs sm:text-sm font-medium">Total Spent</Card.Title>
        <TrendingUp class="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
      </Card.Header>
      <Card.Content>
        <div class="text-lg sm:text-2xl font-bold break-all">{formatCurrency(summaryMetrics.totalConsumed)}</div>
        <p class="text-[10px] sm:text-xs text-muted-foreground">
          {summaryMetrics.percentUsed.toFixed(1)}% of allocated
        </p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-xs sm:text-sm font-medium">Remaining</Card.Title>
        <CircleCheck class="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
      </Card.Header>
      <Card.Content>
        <div class="text-lg sm:text-2xl font-bold break-all {summaryMetrics.remaining < 0 ? 'text-destructive' : ''}">
          {formatCurrency(summaryMetrics.remaining)}
        </div>
        <p class="text-[10px] sm:text-xs text-muted-foreground">
          {summaryMetrics.activeBudgets} active {summaryMetrics.activeBudgets === 1 ? 'budget' : 'budgets'}
        </p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-xs sm:text-sm font-medium">Alerts</Card.Title>
        <TriangleAlert class="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
      </Card.Header>
      <Card.Content>
        <div class="text-lg sm:text-2xl font-bold">
          {summaryMetrics.atRiskCount + summaryMetrics.approachingCount}
        </div>
        <p class="text-[10px] sm:text-xs text-muted-foreground">
          {summaryMetrics.atRiskCount} over, {summaryMetrics.approachingCount} approaching
        </p>
      </Card.Content>
    </Card.Root>
  </div>
  {/if}

  <!-- Content -->
  {#if budgetsLoading && budgets.length === 0}
    <!-- Initial loading skeletons -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {#each Array(8) as _}
        <Card.Root>
          <Card.Header class="space-y-2">
            <div class="h-5 w-3/4 bg-muted rounded animate-pulse"></div>
            <div class="h-3 w-full bg-muted rounded animate-pulse"></div>
          </Card.Header>
          <Card.Content class="space-y-3">
            <div class="h-3 w-1/2 bg-muted rounded animate-pulse"></div>
            <div class="h-3 w-2/3 bg-muted rounded animate-pulse"></div>
            <div class="flex gap-2 mt-4">
              <div class="h-8 w-16 bg-muted rounded animate-pulse"></div>
              <div class="h-8 w-16 bg-muted rounded animate-pulse"></div>
            </div>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  {:else}
  <!-- Show tabs even when there are no budgets so users can access Recommendations -->
  <Tabs.Root value={budgets.length === 0 ? "recommendations" : "overview"} class="space-y-6">
    <Tabs.List class="grid w-full grid-cols-6">
      <Tabs.Trigger value="overview" class="flex items-center gap-2">
        <Grid3x3 class="h-4 w-4" />
        Budget Overview
      </Tabs.Trigger>
      <Tabs.Trigger value="recommendations" class="flex items-center gap-2">
        <Sparkles class="h-4 w-4" />
        Recommendations
        {#if pendingCount > 0}
          <Badge variant="default" class="ml-1 h-5 min-w-5 px-1.5">
            {pendingCount}
          </Badge>
        {/if}
      </Tabs.Trigger>
      <Tabs.Trigger value="groups" class="flex items-center gap-2">
        <FolderTree class="h-4 w-4" />
        Groups
      </Tabs.Trigger>
      <Tabs.Trigger value="transfer" class="flex items-center gap-2">
        <ArrowRightLeft class="h-4 w-4" />
        Fund Transfer
      </Tabs.Trigger>
      <Tabs.Trigger value="rollover" class="flex items-center gap-2">
        <RotateCcw class="h-4 w-4" />
        Rollover Manager
      </Tabs.Trigger>
      <Tabs.Trigger value="analytics" class="flex items-center gap-2">
        <ChartBar class="h-4 w-4" />
        Analytics & Insights
      </Tabs.Trigger>
    </Tabs.List>

    <!-- Budget Overview Tab -->
    <Tabs.Content value="overview" class="space-y-6">
      {#if budgets.length === 0}
        <!-- Empty state when no budgets -->
        <Empty.Empty>
          <Empty.EmptyMedia variant="icon">
            <DollarSign class="size-6" />
          </Empty.EmptyMedia>
          <Empty.EmptyHeader>
            <Empty.EmptyTitle>No Budgets Yet</Empty.EmptyTitle>
            <Empty.EmptyDescription>
              Get started by creating your first budget. Track your spending across different categories and manage your finances effectively.
            </Empty.EmptyDescription>
          </Empty.EmptyHeader>
          <Empty.EmptyContent>
            <div class="flex flex-col sm:flex-row gap-2">
              <Button href="/budgets/new">
                <Plus class="mr-2 h-4 w-4" />
                Create Your First Budget
              </Button>
              <Button variant="outline" onclick={() => {
                const tabs = document.querySelector('[value="recommendations"]');
                if (tabs) tabs.click();
              }}>
                <Sparkles class="mr-2 h-4 w-4" />
                View Recommendations
              </Button>
            </div>
          </Empty.EmptyContent>
        </Empty.Empty>
      {:else}
        <!-- Search Toolbar -->
        <EntitySearchToolbar
          bind:searchQuery={search.query}
          bind:filters={search.filters}
          bind:viewMode={search.viewMode}
          bind:sortBy={search.sortBy}
          bind:sortOrder={search.sortOrder}
          searchPlaceholder="Search budgets..."
          sortOptions={budgetSortOptions}
          activeFilterCount={Object.keys(search.filters).length}
          onSearchChange={(query) => search.updateQuery(query)}
          onFiltersChange={(filters) => search.updateFilters(filters)}
          onViewModeChange={(mode) => (search.viewMode = mode)}
          onSortChange={(sortBy, sortOrder) => {
            search.sortBy = sortBy as any;
            search.sortOrder = sortOrder;
          }}
          onClearAll={() => search.clearAllFilters()}>
          {#snippet filterContent()}
            <BudgetSearchFilters
              filters={search.filters}
              onFilterChange={(key, value) => search.updateFilter(key, value)}
            />
          {/snippet}
        </EntitySearchToolbar>

        <!-- Budget Results -->
        <BudgetSearchResults
          budgets={filteredBudgets}
          isLoading={budgetsLoading}
          searchQuery={search.query}
          viewMode={search.viewMode}
          onView={handleViewBudget}
          onEdit={handleEditBudget}
          onDelete={handleDeleteBudget}
          onDuplicate={handleDuplicateBudget}
          onArchive={handleArchiveBudget}
          onBulkDelete={handleBulkDeleteBudgets}
          onBulkArchive={handleBulkArchiveBudgets}
        />
      {/if}
    </Tabs.Content>

    <!-- Recommendations Tab -->
    <Tabs.Content value="recommendations" class="space-y-6">
      <BudgetRecommendationsPanel />
    </Tabs.Content>

    <!-- Budget Groups Tab -->
    <Tabs.Content value="groups" class="space-y-6">
      <BudgetGroupsSection onCreateGroup={handleCreateGroup} onEditGroup={handleEditGroup} />
    </Tabs.Content>

    <!-- Fund Transfer Tab -->
    <Tabs.Content value="transfer" class="space-y-6">
      <BudgetFundTransfer budgets={budgets} onFundTransfer={handleFundTransfer} />
    </Tabs.Content>

    <!-- Rollover Manager Tab -->
    <Tabs.Content value="rollover" class="space-y-6">
      <BudgetRolloverManager budgets={budgets} />
    </Tabs.Content>

    <!-- Analytics & Insights Tab -->
    <Tabs.Content value="analytics" class="space-y-6">
      <!-- Forecast Summary for Active Budgets -->
      {#if budgets.filter(b => b.status === 'active').length > 0}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {#each budgets.filter(b => b.status === 'active').slice(0, 4) as budget}
            <BudgetForecastDisplay budgetId={budget.id} daysAhead={30} showAutoAllocate={false} />
          {/each}
        </div>
      {/if}

      <BudgetAnalyticsDashboard budgets={budgets} />
    </Tabs.Content>
  </Tabs.Root>
  {/if}
</div>

<!-- Template Picker Dialog -->
<BudgetTemplatePicker bind:open={templatePickerOpen} />

<BudgetManageDialog
  budget={selectedBudget}
  bind:open={manageDialogOpen}
  onBudgetUpdated={() => {}}
  onBudgetDeleted={() => {}}
/>

<BudgetGroupDialog
  budgetGroup={selectedGroup}
  bind:open={groupDialogOpen}
/>

<!-- Delete Budget Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Budget</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete "{budgetToDelete?.name}"? This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmDeleteBudget}
        disabled={deleteMutation.isPending}
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
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
        Are you sure you want to delete {budgetsToDelete.length} budget(s)? This action cannot be undone and will remove all associated budget data.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmBulkDelete}
        disabled={bulkDeleteMutation.isPending}
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
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
        Are you sure you want to archive {budgetsToArchive.length} budget(s)? Archived budgets can be restored later.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmBulkArchive}
        disabled={bulkArchiveMutation.isPending}
      >
        {#if bulkArchiveMutation.isPending}
          Archiving...
        {:else}
          Archive {budgetsToArchive.length} Budget(s)
        {/if}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
