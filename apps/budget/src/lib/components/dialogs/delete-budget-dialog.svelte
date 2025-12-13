<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/state';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { buttonVariants } from '$lib/components/ui/button';
import { deleteBudget } from '$lib/query/budgets';
import { deleteBudgetDialog, deleteBudgetId } from '$lib/states/ui/global.svelte';

const _deleteBudgetDialog = $derived(deleteBudgetDialog);
const _deleteBudgetId = $derived(deleteBudgetId);

const deleteBudgetMutation = deleteBudget.options();

const confirmDeleteBudget = async () => {
  _deleteBudgetDialog.current = false;

  // Delete the budget using the mutation
  await deleteBudgetMutation.mutateAsync(_deleteBudgetId.current);

  // Redirect if we're currently viewing a budget detail or edit page
  if (page.route.id?.startsWith('/budgets/[slug]')) {
    await goto('/budgets');
  }
};
</script>

<AlertDialog.Root
  bind:open={
    () => _deleteBudgetDialog.current, (newOpen) => (_deleteBudgetDialog.current = newOpen)
  }>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone. This will permanently delete your budget and any associated
        information with it.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmDeleteBudget}
        class={buttonVariants({ variant: 'destructive' })}>Continue</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
