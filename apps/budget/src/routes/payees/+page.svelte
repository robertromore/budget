<script lang="ts">
import { goto } from '$app/navigation';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Button, buttonVariants } from '$lib/components/ui/button';
import * as Empty from '$lib/components/ui/empty';
import { rpc } from '$lib/query';
import { bulkDeletePayees as bulkDeletePayeesMutation } from '$lib/query/payees';
import type { Payee } from '$lib/schema';
import { PayeesState } from '$lib/states/entities/payees.svelte';
import { deletePayeeDialog, deletePayeeId } from '$lib/states/ui/payees.svelte';
import { headerActionsMode } from '$lib/stores/header-actions.svelte';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import FolderCog from '@lucide/svelte/icons/folder-cog';
import Plus from '@lucide/svelte/icons/plus';
import Sparkles from '@lucide/svelte/icons/sparkles';
import User from '@lucide/svelte/icons/user';
import PayeeSearchResults from './(components)/search/payee-search-results.svelte';

const payeesState = $derived(PayeesState.get());
const allPayees = $derived(payeesState.payees.values());
const allPayeesArray = $derived(Array.from(allPayees));
const hasNoPayees = $derived(allPayeesArray.length === 0);

// Fetch payees with transaction stats for display
const payeesWithStatsQuery = rpc.payees.listPayeesWithStats().options();
const payeesWithStats = $derived(payeesWithStatsQuery.data ?? []);

// Merge stats into payees for display
const payeesWithStatsData = $derived.by(() => {
  const statsMap = new Map(payeesWithStats.map((p) => [p.id, p.stats]));

  return allPayeesArray.map((payee) => ({
    ...payee,
    avgAmount: statsMap.get(payee.id)?.avgAmount ?? null,
    lastTransactionDate: statsMap.get(payee.id)?.lastTransactionDate ?? null,
  }));
});

// Dialog state
let deleteDialogId = $derived(deletePayeeId);
let deleteDialogOpen = $derived(deletePayeeDialog);

// Bulk delete dialog state
let bulkDeleteDialogOpen = $state(false);
let payeesToDelete = $state<Payee[]>([]);
let isDeletingBulk = $state(false);

const deletePayee = (payee: Payee) => {
  deleteDialogId.current = payee.id;
  deleteDialogOpen.setTrue();
};

const bulkDeletePayees = async (payees: Payee[]) => {
  if (payees.length === 0) return;

  payeesToDelete = payees;
  bulkDeleteDialogOpen = true;
};

// Create mutation instance at component initialization
const bulkDeleteMutation = bulkDeletePayeesMutation.options();

const confirmBulkDelete = async () => {
  if (isDeletingBulk || payeesToDelete.length === 0) return;

  isDeletingBulk = true;
  try {
    const idsToDelete = payeesToDelete.map((p) => p.id);
    await bulkDeleteMutation.mutateAsync(idsToDelete);

    // Update local state to remove deleted payees
    payeesState.removePayees(idsToDelete);

    bulkDeleteDialogOpen = false;
    payeesToDelete = [];
  } catch (error) {
    console.error('Failed to delete payees:', error);
  } finally {
    isDeletingBulk = false;
  }
};

const viewPayee = (payee: Payee) => {
  goto(`/payees/${payee.slug}`);
};

const editPayee = (payee: Payee) => {
  goto(`/payees/${payee.slug}/edit`);
};

const viewAnalytics = (payee: Payee) => {
  goto(`/payees/${payee.slug}/analytics`);
};

// Computed: should show secondary buttons on page
const showSecondaryOnPage = $derived(headerActionsMode.value === 'off');
// Computed: should show primary button on page
const showPrimaryOnPage = $derived(headerActionsMode.value !== 'all');
</script>

<svelte:head>
  <title>Payees - Budget App</title>
  <meta name="description" content="Manage your payees and payment contacts" />
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" data-help-id="payees-page-header" data-help-title="Payees Page" data-tour-id="payees-page">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Payees</h1>
      <p class="text-muted-foreground">{allPayeesArray.length} payees total</p>
    </div>
    <div class="flex items-center gap-2">
      {#if showSecondaryOnPage}
        <Button variant="outline" href="/payees/categories">
          <FolderCog class="mr-2 h-4 w-4" />
          Manage Categories
        </Button>
        <Button variant="outline" href="/payees/analytics">
          <BarChart3 class="mr-2 h-4 w-4" />
          Analytics
        </Button>
        <Button variant="outline" href="/payees/cleanup">
          <Sparkles class="mr-2 h-4 w-4" />
          Cleanup
        </Button>
      {/if}
      {#if showPrimaryOnPage}
        <Button href="/payees/new">
          <Plus class="mr-2 h-4 w-4" />
          Add Payee
        </Button>
      {/if}
    </div>
  </div>

  <!-- Content -->
  {#if hasNoPayees}
    <!-- Empty State - No Payees -->
    <Empty.Empty>
      <Empty.EmptyMedia variant="icon">
        <User class="size-6" />
      </Empty.EmptyMedia>
      <Empty.EmptyHeader>
        <Empty.EmptyTitle>No Payees Yet</Empty.EmptyTitle>
        <Empty.EmptyDescription>
          Get started by creating your first payee. You can add merchants, companies, people, or any
          other entity you pay or receive money from.
        </Empty.EmptyDescription>
      </Empty.EmptyHeader>
      <Empty.EmptyContent>
        <Button href="/payees/new">
          <Plus class="mr-2 h-4 w-4" />
          Create Your First Payee
        </Button>
      </Empty.EmptyContent>
    </Empty.Empty>
  {:else}
    <!-- Payee Data Table -->
    <div data-help-id="payees-table" data-help-title="Payees Table">
    <PayeeSearchResults
      payees={payeesWithStatsData}
      isLoading={false}
      searchQuery=""
      viewMode="list"
      onView={viewPayee}
      onEdit={editPayee}
      onDelete={deletePayee}
      onBulkDelete={bulkDeletePayees}
      onViewAnalytics={viewAnalytics} />
    </div>
  {/if}
</div>

<!-- Bulk Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={bulkDeleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title
        >Delete {payeesToDelete.length} Payee{payeesToDelete.length > 1
          ? 's'
          : ''}</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete {payeesToDelete.length} payee{payeesToDelete.length > 1
          ? 's'
          : ''}? This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmBulkDelete}
        disabled={isDeletingBulk}
        class={buttonVariants({ variant: 'destructive' })}>
        {isDeletingBulk ? 'Deleting...' : 'Delete'}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
