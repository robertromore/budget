<!--
  Budgets Tab — budgets attached to this account, plus recommendations
  sheet. Bulk-delete uses the global delete-budget-dialog state. Used
  both in the per-account Tabs view and the header-tabs render path on
  the parent page.
-->
<script lang="ts">
import { Button } from '$lib/components/ui/button';
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import BudgetRecommendationsPanel from '$lib/components/budgets/budget-recommendations-panel.svelte';
import type { BudgetWithRelations } from '$core/server/domains/budgets';
import { goto } from '$app/navigation';
import { rpc } from '$lib/query';
import { getRelatedBudgets } from '$lib/query/budgets';
import { deleteBudgetDialog, deleteBudgetId } from '$lib/states/ui/global.svelte';
import Sparkles from '@lucide/svelte/icons/sparkles';
import AccountBudgetsGrouped from './account-budgets-grouped.svelte';

interface Props {
  accountId: number;
  accountSlug: string;
  isDemoView?: boolean;
}

let { accountId, accountSlug, isDemoView = false }: Props = $props();

const groupedBudgetsQuery = $derived(
  accountId && !isDemoView ? getRelatedBudgets(accountId).options() : undefined
);
const groupedBudgets = $derived(
  groupedBudgetsQuery?.data ?? {
    spendingLimits: [],
    savingsGoals: [],
    recurringExpenses: [],
    totalCount: 0,
  }
);
const isLoading = $derived(groupedBudgetsQuery?.isLoading ?? false);

const duplicateBudgetMutation = rpc.budgets.duplicateBudget.options();
const updateBudgetMutation = rpc.budgets.updateBudget.options();
const bulkDeleteBudgetsMutation = rpc.budgets.bulkDeleteBudgets.options();
const bulkArchiveBudgetsMutation = rpc.budgets.bulkArchiveBudgets.options();

let recommendationsSheetOpen = $state(false);

function viewBudget(budget: BudgetWithRelations) {
  goto(`/budgets/${budget.slug}`);
}

function editBudget(budget: BudgetWithRelations) {
  goto(`/budgets/${budget.slug}/edit`);
}

async function handleDuplicateBudget(budget: BudgetWithRelations) {
  try {
    await duplicateBudgetMutation.mutateAsync({ id: budget.id });
  } catch {
    // Mutation surfaces the error via toast.
  }
}

async function archiveBudget(budget: BudgetWithRelations) {
  try {
    await updateBudgetMutation.mutateAsync({
      id: budget.id,
      data: { status: 'archived' },
    });
  } catch {
    // Mutation surfaces the error via toast.
  }
}

function handleDeleteBudget(budget: BudgetWithRelations) {
  deleteBudgetId.current = budget.id;
  deleteBudgetDialog.setTrue();
}

async function bulkDeleteBudgets(list: BudgetWithRelations[]) {
  try {
    await bulkDeleteBudgetsMutation.mutateAsync({ ids: list.map((b) => b.id) });
  } catch {
    // Mutation surfaces the error via toast.
  }
}

async function bulkArchiveBudgets(list: BudgetWithRelations[]) {
  try {
    await bulkArchiveBudgetsMutation.mutateAsync(list.map((b) => b.id));
  } catch {
    // Mutation surfaces the error via toast.
  }
}
</script>

{#if groupedBudgets && !isLoading}
  <div class="flex items-center justify-between" data-tour-id="budgets-progress">
    <div></div>
    <Button
      variant="outline"
      onclick={() => (recommendationsSheetOpen = true)}
      data-tour-id="budgets-allocation">
      <Sparkles class="mr-2 h-4 w-4" />
      Recommendations
    </Button>
  </div>
  <AccountBudgetsGrouped
    {groupedBudgets}
    {accountId}
    {accountSlug}
    onView={viewBudget}
    onEdit={editBudget}
    onDuplicate={handleDuplicateBudget}
    onArchive={archiveBudget}
    onDelete={handleDeleteBudget}
    onBulkDelete={bulkDeleteBudgets}
    onBulkArchive={bulkArchiveBudgets} />
{:else if isLoading}
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="bg-muted h-8 w-48 animate-pulse rounded"></div>
      <div class="bg-muted h-10 w-64 animate-pulse rounded"></div>
    </div>
    <div class="bg-muted h-100 animate-pulse rounded-lg"></div>
  </div>
{/if}

<!-- Recommendations Sheet -->
<ResponsiveSheet
  bind:open={recommendationsSheetOpen}
  defaultWidth={800}
  minWidth={600}
  maxWidth={1200}>
  {#snippet header()}
    <div>
      <h2 class="text-lg font-semibold">Budget Recommendations</h2>
      <p class="text-muted-foreground text-sm">
        Budget recommendations based on spending patterns in this account
      </p>
    </div>
  {/snippet}

  {#snippet content()}
    <BudgetRecommendationsPanel {accountId} />
  {/snippet}
</ResponsiveSheet>
