<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import {Button} from "$lib/components/ui/button";
  import * as Tabs from "$lib/components/ui/tabs";
  import BudgetProgress from "$lib/components/budgets/budget-progress.svelte";
  import BudgetManageDialog from "$lib/components/budgets/budget-manage-dialog.svelte";
  import BudgetAnalyticsDashboard from "$lib/components/budgets/budget-analytics-dashboard.svelte";
  import BudgetFundTransfer from "$lib/components/budgets/budget-fund-transfer.svelte";
  import BudgetRolloverManager from "$lib/components/budgets/budget-rollover-manager.svelte";
  import type {BudgetWithRelations} from "$lib/server/domains/budgets";
  import type {BudgetPeriodInstance} from "$lib/schema/budgets";
  import {cn} from "$lib/utils";
  import {currencyFormatter} from "$lib/utils/formatters";
  import {rawDateFormatter} from "$lib/utils/date-formatters";
  import {parseDate, getLocalTimeZone} from "@internationalized/date";
  import {Settings, ChartBar, Grid3X3, ArrowRightLeft, RotateCcw} from "@lucide/svelte/icons";
  import {newBudgetDialog} from "$lib/states/ui/global.svelte";

  let {
    data,
  }: {
    data: {
      budgets?: BudgetWithRelations[];
    };
  } = $props();

  // Use server data directly to avoid circular reactivity
  const budgets = data.budgets ?? [];
  const budgetsLoading = false;
  const tz = $derived.by(() => getLocalTimeZone());

  let manageDialogOpen = $state(false);
  let selectedBudget = $state<BudgetWithRelations | null>(null);

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
</script>

<section class="flex items-center justify-between gap-4 py-6">
  <div>
    <h1 class="text-3xl font-semibold text-foreground">Budgets</h1>
    <p class="text-sm text-muted-foreground">Track how spending aligns with your plans.</p>
  </div>
  <Button onclick={() => newBudgetDialog.setTrue()}>Create Budget</Button>
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
  <Tabs.Root value="overview" class="space-y-6">
    <Tabs.List class="grid w-full grid-cols-4">
      <Tabs.Trigger value="overview" class="flex items-center gap-2">
        <Grid3X3 class="h-4 w-4" />
        Budget Overview
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
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {#each budgets as budget (budget.id)}
          {@const allocated = getAllocated(budget)}
          {@const consumed = getConsumed(budget)}
          {@const latest = getLatestPeriod(budget)}
          <Card.Root class="flex flex-col gap-4">
            <Card.Header class="gap-1">
              <div class="flex items-center justify-between">
                <Card.Title class="text-xl font-semibold text-foreground">
                  <a
                    class="rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary hover:text-primary"
                    href={`/budgets/${budget.id}`}
                  >
                    {budget.name}
                  </a>
                </Card.Title>
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => openManageDialog(budget)}
                  class="h-8 w-8 p-0"
                >
                  <Settings class="h-4 w-4" />
                  <span class="sr-only">Manage budget</span>
                </Button>
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
                <div class="flex items-center justify-between">
                  <span>Scope</span>
                  <span class="font-medium text-foreground">{budget.scope}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span>Type</span>
                  <span class="font-medium text-foreground">{budget.type}</span>
                </div>
                {#if latest}
                  <div class="flex items-center justify-between">
                    <span>Period</span>
                    <span class="font-medium text-foreground">{formatRange(latest)}</span>
                  </div>
                {/if}
              </div>
            </Card.Content>

            <Card.Footer class="mt-auto flex items-center justify-between text-xs text-muted-foreground">
              <span>Status: <span class="font-medium text-foreground">{budget.status}</span></span>
              <span>Remaining: <span class={cn(consumed > allocated && "text-destructive", "font-medium text-foreground")}
                >{formatCurrency(allocated - consumed)}</span
              ></span>
            </Card.Footer>
          </Card.Root>
        {/each}
      </div>
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
