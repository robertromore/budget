<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import {Button} from "$lib/components/ui/button";
  import * as Tabs from "$lib/components/ui/tabs";
  import BudgetProgress from "$lib/components/budgets/budget-progress.svelte";
  import BudgetManageDialog from "$lib/components/budgets/budget-manage-dialog.svelte";
  import BudgetAnalyticsDashboard from "$lib/components/budgets/budget-analytics-dashboard.svelte";
  import BudgetFundTransfer from "$lib/components/budgets/budget-fund-transfer.svelte";
  import BudgetRolloverManager from "$lib/components/budgets/budget-rollover-manager.svelte";
  import BudgetTemplatePicker from "$lib/components/budgets/budget-template-picker.svelte";
  import BudgetGroupsSection from "$lib/components/budgets/budget-groups-section.svelte";
  import BudgetGroupDialog from "$lib/components/budgets/budget-group-dialog.svelte";
  import {listBudgets, duplicateBudget, updateBudget, deleteBudget, bulkArchiveBudgets, bulkDeleteBudgets} from "$lib/query/budgets";
  import type {BudgetWithRelations} from "$lib/server/domains/budgets";
  import type {BudgetPeriodInstance, BudgetGroup} from "$lib/schema/budgets";
  import {cn} from "$lib/utils";
  import {currencyFormatter} from "$lib/utils/formatters";
  import {rawDateFormatter} from "$lib/utils/date-formatters";
  import {parseDate, getLocalTimeZone} from "@internationalized/date";
  import {
    ChartBar,
    Grid3X3,
    ArrowRightLeft,
    RotateCcw,
    DollarSign,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Filter,
    Search,
    ArrowUpDown,
    MoreVertical,
    Pencil,
    Copy,
    Trash2,
    Archive,
    Sparkles,
    FolderTree,
  } from "@lucide/svelte/icons";
  import {Input} from "$lib/components/ui/input";
  import * as Select from "$lib/components/ui/select";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import {Checkbox} from "$lib/components/ui/checkbox";

  // Use reactive client-side query instead of server data
  const budgetsQuery = listBudgets().options();
  const budgets = $derived($budgetsQuery.data ?? []);
  const budgetsLoading = $derived($budgetsQuery.isLoading);
  const tz = $derived.by(() => getLocalTimeZone());

  let manageDialogOpen = $state(false);
  let selectedBudget = $state<BudgetWithRelations | null>(null);
  let templatePickerOpen = $state(false);
  let groupDialogOpen = $state(false);
  let selectedGroup = $state<BudgetGroup | undefined>(undefined);

  // Filter and sort state
  let searchTerm = $state("");
  let statusFilter = $state<"all" | "active" | "inactive" | "paused">("all");
  let typeFilter = $state<"all" | string>("all");
  let sortBy = $state<"name" | "allocated" | "consumed" | "remaining">("name");

  // Bulk selection state
  let selectedIds = $state<Set<number>>(new Set());
  const selectedCount = $derived(selectedIds.size);

  function toggleSelection(id: number) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    selectedIds = newSet;
  }

  function selectAll() {
    selectedIds = new Set(filteredBudgets.map(b => b.id));
  }

  function clearSelection() {
    selectedIds = new Set();
  }

  function getLatestPeriod(budget: BudgetWithRelations) {
    const templates = budget.periodTemplates ?? [];
    const periods = templates.flatMap((template) => template.periods ?? []);
    if (!periods.length) return null;

    return periods.reduce((latest, current) =>
      latest.endDate > current.endDate ? latest : current
    );
  }

  function formatRange(period: BudgetPeriodInstance): string {
    const start = rawDateFormatter.format(parseDate(period.startDate).toDate(tz));
    const end = rawDateFormatter.format(parseDate(period.endDate).toDate(tz));
    return `${start} – ${end}`;
  }

  function getAllocated(budget: BudgetWithRelations) {
    const latest = getLatestPeriod(budget);
    if (latest) return Math.abs(latest.allocatedAmount ?? 0);
    return Math.abs((budget.metadata as Record<string, unknown>)?.['allocatedAmount'] as number ?? 0);
  }

  function getConsumed(budget: BudgetWithRelations) {
    const latest = getLatestPeriod(budget);
    if (latest) return Math.abs(latest.actualAmount ?? 0);
    return 0;
  }

  function resolveStatus(budget: BudgetWithRelations) {
    if (budget.status !== "active") return "paused" as const;
    const allocated = getAllocated(budget);
    const consumed = getConsumed(budget);
    if (!allocated) return "paused" as const;

    const ratio = consumed / allocated;
    if (ratio > 1) return "over" as const;
    if (ratio >= 0.8) return "approaching" as const;
    return "on_track" as const;
  }

  function resolveEnforcement(budget: BudgetWithRelations) {
    return (budget.enforcementLevel ?? "warning") as "none" | "warning" | "strict";
  }

  function formatCurrency(value: number) {
    return currencyFormatter.format(Math.abs(value ?? 0));
  }

  function openManageDialog(budget: BudgetWithRelations) {
    selectedBudget = budget;
    manageDialogOpen = true;
  }

  // Mutations
  const duplicateMutation = duplicateBudget.options();
  const updateMutation = updateBudget.options();
  const deleteMutation = deleteBudget.options();
  const bulkArchiveMutation = bulkArchiveBudgets.options();
  const bulkDeleteMutation = bulkDeleteBudgets.options();

  async function handleDuplicateBudget(budget: BudgetWithRelations) {
    await $duplicateMutation.mutateAsync({ id: budget.id });
  }

  async function handleArchiveBudget(budget: BudgetWithRelations) {
    await $updateMutation.mutateAsync({ id: budget.id, data: { status: 'archived' } });
  }

  async function handleDeleteBudget(budget: BudgetWithRelations) {
    const confirmed = confirm(`Are you sure you want to delete "${budget.name}"? This action cannot be undone.`);
    if (!confirmed) return;
    await $deleteMutation.mutateAsync(budget.id);
  }

  async function handleBulkArchive() {
    const ids = Array.from(selectedIds);
    const confirmed = confirm(`Archive ${ids.length} budget(s)?`);
    if (!confirmed) return;
    await $bulkArchiveMutation.mutateAsync(ids);
    clearSelection();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    const confirmed = confirm(`Are you sure you want to delete ${ids.length} budget(s)? This action cannot be undone.`);
    if (!confirmed) return;
    await $bulkDeleteMutation.mutateAsync(ids);
    clearSelection();
  }

  async function handleFundTransfer(fromId: number, toId: number, amount: number) {
    console.log(`Transferring ${amount} from budget ${fromId} to budget ${toId}`);
    // This would integrate with your tRPC mutations once the backend is ready
    // For now, just log the transfer action

    // Example:
    // await transferFunds.mutateAsync({ fromBudgetId: fromId, toBudgetId: toId, amount });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // You could invalidate queries here to refresh data
    // queryClient.invalidateQueries(['budgets']);
  }

  function handleCreateGroup() {
    selectedGroup = undefined;
    groupDialogOpen = true;
  }

  function handleEditGroup(group: BudgetGroup) {
    selectedGroup = group;
    groupDialogOpen = true;
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
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "allocated":
          return getAllocated(b) - getAllocated(a);
        case "consumed":
          return getConsumed(b) - getConsumed(a);
        case "remaining": {
          const aRemaining = getAllocated(a) - getConsumed(a);
          const bRemaining = getAllocated(b) - getConsumed(b);
          return bRemaining - aRemaining;
        }
        default:
          return 0;
      }
    });

    return filtered;
  });

  const allSelected = $derived(filteredBudgets.length > 0 && selectedIds.size === filteredBudgets.length);

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

<section class="flex items-center justify-between gap-4 py-6" aria-labelledby="budgets-heading">
  <div>
    <h1 id="budgets-heading" class="text-3xl font-semibold text-foreground">Budgets</h1>
    <p class="text-sm text-muted-foreground">Track how spending aligns with your plans.</p>
  </div>
  <div class="flex gap-2">
    <Button variant="outline" onclick={() => (templatePickerOpen = true)} aria-label="Browse budget templates">
      <Sparkles class="h-4 w-4 mr-2" />
      Templates
    </Button>
    <Button href="/budgets/new" aria-label="Create a new budget">Create Budget</Button>
  </div>
</section>

{#if budgetsLoading && !budgets.length}
  <Card.Root class="border-dashed">
    <Card.Content class="py-16 text-center text-sm text-muted-foreground">
      Loading budgets...
    </Card.Content>
  </Card.Root>
{:else if !budgets.length}
  <Card.Root class="border-dashed">
    <Card.Content class="py-16 text-center text-sm text-muted-foreground">
      No budgets yet. Budget creation will be available soon.
    </Card.Content>
  </Card.Root>
{:else}
  <!-- Summary Dashboard -->
  <div class="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 mb-6" role="region" aria-label="Budget summary statistics">
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

  <!-- Filter and Sort Controls -->
  <Card.Root>
    <Card.Content class="py-4">
      <div class="flex flex-col gap-3 sm:gap-4" role="search" aria-label="Budget filters and search">
        <div class="relative w-full">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search budgets..."
            bind:value={searchTerm}
            class="pl-9"
            aria-label="Search budgets by name or description"
          />
        </div>
        <div class="grid grid-cols-3 gap-2 sm:flex sm:gap-2" role="group" aria-label="Filter and sort options">
          <Select.Root type="single" bind:value={statusFilter}>
            <Select.Trigger class="w-full sm:w-[140px]" aria-label="Filter by budget status">
              <div class="flex items-center gap-1 sm:gap-2">
                <Filter class="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" aria-hidden="true" />
                <span class="capitalize text-xs sm:text-sm truncate">{statusFilter === "all" ? "Status" : statusFilter}</span>
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
            <Select.Trigger class="w-full sm:w-[160px]" aria-label="Filter by budget type">
              <div class="flex items-center gap-1 sm:gap-2">
                <Filter class="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" aria-hidden="true" />
                <span class="capitalize text-xs sm:text-sm truncate">{typeFilter === "all" ? "Type" : typeFilter.replace("-", " ")}</span>
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

          <Select.Root type="single" bind:value={sortBy}>
            <Select.Trigger class="w-full sm:w-[140px]" aria-label="Sort budgets by">
              <div class="flex items-center gap-1 sm:gap-2">
                <ArrowUpDown class="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" aria-hidden="true" />
                <span class="capitalize text-xs sm:text-sm truncate">{sortBy === "name" ? "Name" : sortBy}</span>
              </div>
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="name">Name</Select.Item>
              <Select.Item value="allocated">Allocated</Select.Item>
              <Select.Item value="consumed">Consumed</Select.Item>
              <Select.Item value="remaining">Remaining</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

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
      <!-- Screen reader announcement for filter results -->
      <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {filteredBudgets.length} {filteredBudgets.length === 1 ? 'budget' : 'budgets'} found
      </div>

      {#if filteredBudgets.length === 0}
        <Card.Root class="border-dashed">
          <Card.Content class="py-16 text-center text-sm text-muted-foreground">
            <p class="font-medium">No budgets found</p>
            <p class="mt-2">Try adjusting your filters or search term</p>
          </Card.Content>
        </Card.Root>
      {:else}
        <!-- Bulk Actions Toolbar -->
        {#if selectedCount > 0}
          <Card.Root class="border-primary/50 bg-accent/10">
            <Card.Content class="py-3">
              <div class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={clearSelection}
                    aria-label="Clear selection"
                  >
                    ✕
                  </Button>
                  <span class="text-sm font-medium">
                    {selectedCount} budget{selectedCount === 1 ? '' : 's'} selected
                  </span>
                </div>
                <div class="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onclick={handleBulkArchive}
                    disabled={$bulkArchiveMutation.isPending}
                  >
                    <Archive class="h-4 w-4 mr-2" />
                    Archive
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onclick={handleBulkDelete}
                    disabled={$bulkDeleteMutation.isPending}
                  >
                    <Trash2 class="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card.Content>
          </Card.Root>
        {/if}

        <!-- Select All Option -->
        <div class="flex items-center gap-2 mb-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => {
              if (checked) selectAll();
              else clearSelection();
            }}
            aria-label="Select all budgets"
          />
          <span class="text-sm text-muted-foreground">Select all</span>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" role="list" aria-label="Budget cards">
          {#each filteredBudgets as budget (budget.id)}
            {@const allocated = getAllocated(budget)}
            {@const consumed = getConsumed(budget)}
            {@const latest = getLatestPeriod(budget)}
            {@const remaining = allocated - consumed}
            {@const status = resolveStatus(budget)}
            <Card.Root
              class="flex flex-col gap-4"
              role="listitem"
              aria-label="{budget.name} budget, {formatCurrency(consumed)} of {formatCurrency(allocated)} spent, {formatCurrency(remaining)} remaining, status: {status.replace('_', ' ')}"
            >
            <Card.Header class="gap-1">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds.has(budget.id)}
                    onCheckedChange={() => toggleSelection(budget.id)}
                    aria-label="Select {budget.name}"
                  />
                  <Card.Title class="text-xl font-semibold text-foreground flex-1 min-w-0">
                    <a
                      class="rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary hover:text-primary break-words"
                      href={`/budgets/${budget.id}`}
                    >
                      {budget.name}
                    </a>
                  </Card.Title>
                </div>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger
                    class="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md p-0 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                    aria-label="Budget actions for {budget.name}"
                  >
                    <MoreVertical class="h-4 w-4" />
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end">
                    <DropdownMenu.Label>Actions</DropdownMenu.Label>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item>
                      <ChartBar class="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenu.Item>
                    <DropdownMenu.Item>
                      <Pencil class="h-4 w-4 mr-2" />
                      Edit Budget
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item onclick={() => handleDuplicateBudget(budget)}>
                      <Copy class="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onclick={() => handleArchiveBudget(budget)}>
                      <Archive class="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item
                      onclick={() => handleDeleteBudget(budget)}
                      class="text-destructive focus:text-destructive"
                    >
                      <Trash2 class="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </div>
              {#if budget.description}
                <Card.Description>{budget.description}</Card.Description>
              {:else}
                <Card.Description class="italic text-muted-foreground">No description</Card.Description>
              {/if}
            </Card.Header>

            <Card.Content class="flex flex-col gap-4">
              <BudgetProgress
                consumed={consumed}
                allocated={allocated}
                status={resolveStatus(budget)}
                enforcementLevel={resolveEnforcement(budget)}
                label="Current Progress"
              />

              <div class="grid gap-2 text-sm text-muted-foreground">
                <div class="flex items-center justify-between gap-2">
                  <span class="flex-shrink-0">Scope</span>
                  <span class="font-medium text-foreground text-right capitalize">{budget.scope}</span>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <span class="flex-shrink-0">Type</span>
                  <span class="font-medium text-foreground text-right capitalize">{budget.type.replace("-", " ")}</span>
                </div>
                {#if latest}
                  <div class="flex items-center justify-between gap-2">
                    <span class="flex-shrink-0">Period</span>
                    <span class="font-medium text-foreground text-right text-xs sm:text-sm">{formatRange(latest)}</span>
                  </div>
                {/if}
              </div>
            </Card.Content>

            <Card.Footer class="mt-auto flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span class="whitespace-nowrap">Status: <span class="font-medium text-foreground capitalize">{budget.status}</span></span>
              <span class="whitespace-nowrap">Remaining: <span class={cn(consumed > allocated && "text-destructive", "font-medium text-foreground")}
                >{formatCurrency(allocated - consumed)}</span
              ></span>
            </Card.Footer>
          </Card.Root>
        {/each}
      </div>
      {/if}
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
      <BudgetAnalyticsDashboard budgets={budgets} />
    </Tabs.Content>
  </Tabs.Root>
{/if}

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
