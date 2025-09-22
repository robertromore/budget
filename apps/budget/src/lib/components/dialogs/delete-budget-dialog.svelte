<script lang="ts">
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import { Badge } from '$lib/components/ui/badge';
  import type { UseBoolean } from '$lib/hooks/ui/use-boolean.svelte';
  import type { UseNumber } from '$lib/hooks/ui/use-number.svelte';
  import { deleteBudgetDialog, deleteBudgetId } from '$lib/states/ui/global.svelte';
  import { BudgetsState } from '$lib/states/budgets.svelte';
  import { deleteBudget } from '$lib/query/budgets';
  import { AlertTriangle, Wallet, Calendar, Target, Repeat } from '@lucide/svelte';

  const dialogOpen: UseBoolean = $derived(deleteBudgetDialog);
  const budgetId: UseNumber = $derived(deleteBudgetId);
  const budgetsState = BudgetsState.get();

  let isDeleting = $state(false);

  // Get the budget to delete
  const budgetToDelete = $derived.by(() => {
    if (budgetId.current === 0) return null;
    return budgetsState.getById(budgetId.current);
  });

  function getBudgetTypeInfo(type: string) {
    switch (type) {
      case 'account-monthly':
        return { label: 'Monthly Budget', icon: Calendar, color: 'hsl(var(--blue))' };
      case 'category-envelope':
        return { label: 'Envelope Budget', icon: Wallet, color: 'hsl(var(--green))' };
      case 'goal-based':
        return { label: 'Goal Budget', icon: Target, color: 'hsl(var(--purple))' };
      case 'scheduled-expense':
        return { label: 'Scheduled Budget', icon: Repeat, color: 'hsl(var(--orange))' };
      default:
        return { label: 'Budget', icon: Wallet, color: 'hsl(var(--muted-foreground))' };
    }
  }

  async function confirmDelete() {
    if (!budgetToDelete) return;

    isDeleting = true;
    try {
      await deleteBudget.execute(budgetToDelete.id);
      dialogOpen.current = false;
      budgetId.current = 0;
    } catch (error) {
      console.error('Failed to delete budget:', error);
      // In a real app, show a toast notification
      alert('Failed to delete budget. Please try again.');
    } finally {
      isDeleting = false;
    }
  }

  function cancelDelete() {
    dialogOpen.current = false;
    budgetId.current = 0;
  }
</script>

<AlertDialog.Root bind:open={dialogOpen.current}>
  <AlertDialog.Portal>
    <AlertDialog.Overlay />
    <AlertDialog.Content>
      <AlertDialog.Header>
        <div class="flex items-center gap-2">
          <AlertTriangle class="h-5 w-5 text-destructive" />
          <AlertDialog.Title>Delete Budget</AlertDialog.Title>
        </div>
        <AlertDialog.Description class="space-y-4">
          {#if budgetToDelete}
            {@const typeInfo = getBudgetTypeInfo(budgetToDelete.type)}
            <div class="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div class="flex items-start gap-3">
                <typeInfo.icon class="h-5 w-5 mt-0.5 flex-shrink-0" style="color: {typeInfo.color}" />
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-foreground">{budgetToDelete.name}</h3>
                  <div class="flex items-center gap-2 mt-1">
                    <Badge variant="outline" style="border-color: {typeInfo.color}; color: {typeInfo.color}" class="text-xs">
                      {typeInfo.label}
                    </Badge>
                    <Badge variant={budgetToDelete.status === 'active' ? 'default' : 'secondary'} class="text-xs">
                      {budgetToDelete.status}
                    </Badge>
                  </div>
                  {#if budgetToDelete.description}
                    <p class="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {budgetToDelete.description}
                    </p>
                  {/if}
                </div>
              </div>
            </div>

            <div class="space-y-2 text-sm">
              <p class="text-foreground font-medium">This action will permanently delete:</p>
              <ul class="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>The budget configuration and settings</li>
                <li>All budget periods and their data</li>
                <li>Historical spending tracking and progress</li>
                <li>Any associated budget transactions and allocations</li>
              </ul>
            </div>

            <div class="p-3 rounded-lg bg-muted border border-muted">
              <p class="text-sm text-muted-foreground">
                <strong>Note:</strong> This action cannot be undone. Consider setting the budget to "archived" status instead if you want to preserve the data for reference.
              </p>
            </div>
          {:else}
            <p>Budget not found. It may have already been deleted.</p>
          {/if}
        </AlertDialog.Description>
      </AlertDialog.Header>

      <AlertDialog.Footer>
        <AlertDialog.Cancel onclick={cancelDelete} disabled={isDeleting}>
          Cancel
        </AlertDialog.Cancel>
        <AlertDialog.Action
          onclick={confirmDelete}
          disabled={isDeleting || !budgetToDelete}
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {isDeleting ? 'Deleting...' : 'Delete Budget'}
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>