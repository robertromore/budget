<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import {Button} from "$lib/components/ui/button";
  import * as Tabs from "$lib/components/ui/tabs";
  import BudgetManageDialog from "$lib/components/budgets/budget-manage-dialog.svelte";
  import BudgetAnalyticsDashboard from "$lib/components/budgets/budget-analytics-dashboard.svelte";
  import BudgetFundTransfer from "$lib/components/budgets/budget-fund-transfer.svelte";
  import BudgetRolloverManager from "$lib/components/budgets/budget-rollover-manager.svelte";
  import BudgetTemplatePicker from "$lib/components/budgets/budget-template-picker.svelte";
  import BudgetGroupsSection from "$lib/components/budgets/budget-groups-section.svelte";
  import BudgetGroupDialog from "$lib/components/budgets/budget-group-dialog.svelte";
  import BudgetSearchToolbar from "$lib/components/budgets/budget-search-toolbar.svelte";
  import {BudgetForecastDisplay, BudgetSearchResults} from "$lib/components/budgets";
  import {listBudgets, duplicateBudget, updateBudget, deleteBudget, bulkArchiveBudgets, bulkDeleteBudgets} from "$lib/query/budgets";
  import type {BudgetWithRelations} from "$lib/server/domains/budgets";
  import type {BudgetGroup} from "$lib/schema/budgets";
  import {currencyFormatter} from "$lib/utils/formatters";
  import {calculateActualSpent} from "$lib/utils/budget-calculations";
  import {goto} from "$app/navigation";
  import * as Select from "$lib/components/ui/select";
  import {
    ChartBar,
    Grid3X3,
    ArrowRightLeft,
    RotateCcw,
    DollarSign,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Sparkles,
    FolderTree,
    Plus,
    Filter,
  } from "@lucide/svelte/icons";

  // Use reactive client-side query instead of server data
  const budgetsQuery = listBudgets().options();
  const budgets = $derived<BudgetWithRelations[]>(budgetsQuery.data ?? []);
  const budgetsLoading = $derived(budgetsQuery.isLoading);

  let manageDialogOpen = $state(false);
  let selectedBudget = $state<BudgetWithRelations | null>(null);
  let templatePickerOpen = $state(false);
  let groupDialogOpen = $state(false);
  let selectedGroup = $state<BudgetGroup | undefined>(undefined);

  // Filter and sort state
  let searchTerm = $state("");
  let viewMode = $state<'grid' | 'list'>('grid');
  let statusFilter = $state<"all" | "active" | "inactive" | "paused">("all");
  let typeFilter = $state<"all" | string>("all");
  let sortBy = $state<"name" | "allocated" | "consumed" | "remaining">("name");
  let sortOrder = $state<'asc' | 'desc'>('asc');

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

  async function handleDeleteBudget(budget: BudgetWithRelations) {
    const confirmed = confirm(`Are you sure you want to delete "${budget.name}"? This action cannot be undone.`);
    if (!confirmed) return;
    await deleteMutation.mutateAsync(budget.id);
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

  async function handleBulkDeleteBudgets(budgets: BudgetWithRelations[]) {
    const ids = budgets.map(b => b.id);
    const confirmed = confirm(`Are you sure you want to delete ${ids.length} budget(s)? This action cannot be undone.`);
    if (!confirmed) return;
    await bulkDeleteMutation.mutateAsync(ids);
  }

  async function handleBulkArchiveBudgets(budgets: BudgetWithRelations[]) {
    const ids = budgets.map(b => b.id);
    const confirmed = confirm(`Archive ${ids.length} budget(s)?`);
    if (!confirmed) return;
    await bulkArchiveMutation.mutateAsync(ids);
  }

  // Summary metrics
  // Filtered and sorted budgets
  const filteredBudgets = $derived.by(() => {
    let filtered = [...budgets];

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(budget =>
        budget.name.toLowerCase().includes(term) ||
        budget.description?.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(budget => budget.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(budget => budget.type === typeFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
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
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
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
        {#if searchTerm.trim()}
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
        <CheckCircle2 class="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
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
        <AlertTriangle class="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
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
  {#if budgetsLoading && !budgets.length}
    <Card.Root class="border-dashed">
      <Card.Content class="py-16 text-center text-sm text-muted-foreground">
        Loading budgets...
      </Card.Content>
    </Card.Root>
  {:else if !budgets.length}
    <Card.Root class="border-dashed">
      <Card.Content class="py-16 text-center text-sm text-muted-foreground">
        No budgets yet. Create your first budget to get started.
      </Card.Content>
    </Card.Root>
  {:else}
  <Tabs.Root value="overview" class="space-y-6">
    <Tabs.List class="grid w-full grid-cols-5">
      <Tabs.Trigger value="overview" class="flex items-center gap-2">
        <Grid3X3 class="h-4 w-4" />
        Budget Overview
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
      <!-- Search and Filters -->
      <div class="space-y-4">
        <!-- Search Toolbar -->
        <BudgetSearchToolbar
          bind:searchQuery={searchTerm}
          bind:viewMode={viewMode}
          bind:sortBy={sortBy}
          bind:sortOrder={sortOrder}
          onClearAll={() => searchTerm = ''}
        />

        <!-- Faceted Filters -->
        <div class="flex flex-wrap items-center gap-2">
          <Select.Root type="single" bind:value={statusFilter}>
            <Select.Trigger class="w-[140px]">
              <div class="flex items-center gap-2">
                <Filter class="h-4 w-4" />
                <span class="capitalize text-sm">{statusFilter === "all" ? "Status" : statusFilter}</span>
              </div>
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All Status</Select.Item>
              <Select.Item value="active">Active</Select.Item>
              <Select.Item value="inactive">Inactive</Select.Item>
              <Select.Item value="paused">Paused</Select.Item>
            </Select.Content>
          </Select.Root>

          <Select.Root type="single" bind:value={typeFilter}>
            <Select.Trigger class="w-[180px]">
              <div class="flex items-center gap-2">
                <Filter class="h-4 w-4" />
                <span class="capitalize text-sm">{typeFilter === "all" ? "Type" : typeFilter.replace("-", " ")}</span>
              </div>
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All Types</Select.Item>
              <Select.Item value="account-monthly">Account Monthly</Select.Item>
              <Select.Item value="category-envelope">Category Envelope</Select.Item>
              <Select.Item value="goal-based">Goal Based</Select.Item>
              <Select.Item value="scheduled-expense">Scheduled Expense</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      <!-- Budget Results -->
      <BudgetSearchResults
        budgets={filteredBudgets}
        isLoading={budgetsLoading}
        searchQuery={searchTerm}
        {viewMode}
        onView={handleViewBudget}
        onEdit={handleEditBudget}
        onDelete={handleDeleteBudget}
        onDuplicate={handleDuplicateBudget}
        onArchive={handleArchiveBudget}
        onBulkDelete={handleBulkDeleteBudgets}
        onBulkArchive={handleBulkArchiveBudgets}
      />
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
  onBudgetUpdated={() => {
    // TanStack Query will automatically refetch after the mutation's cache invalidation
  }}
  onBudgetDeleted={() => {
    // TanStack Query will automatically refetch after the mutation's cache invalidation
  }}
/>

<BudgetGroupDialog
  budgetGroup={selectedGroup}
  bind:open={groupDialogOpen}
/>
