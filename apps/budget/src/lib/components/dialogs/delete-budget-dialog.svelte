<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/state';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { buttonVariants } from '$lib/components/ui/button';
import { Checkbox } from '$lib/components/ui/checkbox';
import { Label } from '$lib/components/ui/label';
import { deleteBudget, getBudgetDetail } from '$lib/query/budgets';
import type { BudgetMetadata } from '$lib/schema/budgets';
import { deleteBudgetDialog, deleteBudgetId } from '$lib/states/ui/global.svelte';

const _deleteBudgetDialog = $derived(deleteBudgetDialog);
const _deleteBudgetId = $derived(deleteBudgetId);

// Fetch budget details to check for linked schedule
const budgetQuery = $derived(
  _deleteBudgetId.current > 0 ? getBudgetDetail(_deleteBudgetId.current).options() : null
);
const budget = $derived(budgetQuery?.data);

// Check if budget has a linked schedule
const linkedScheduleId = $derived.by(() => {
  if (!budget?.metadata) return null;
  const metadata = budget.metadata as BudgetMetadata;
  return metadata.scheduledExpense?.linkedScheduleId || metadata.goal?.linkedScheduleId || null;
});

const hasLinkedSchedule = $derived(linkedScheduleId !== null);

// State for delete schedule checkbox
let deleteLinkedSchedule = $state(false);

// Reset checkbox when dialog opens/closes
$effect(() => {
  if (!_deleteBudgetDialog.current) {
    deleteLinkedSchedule = false;
  }
});

const deleteBudgetMutation = deleteBudget.options();

const confirmDeleteBudget = async () => {
  _deleteBudgetDialog.current = false;

  // Delete the budget using the mutation
  await deleteBudgetMutation.mutateAsync({
    id: _deleteBudgetId.current,
    deleteLinkedSchedule: hasLinkedSchedule && deleteLinkedSchedule,
  });

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

    {#if hasLinkedSchedule}
      <div class="flex items-start gap-3 rounded-lg border p-4">
        <Checkbox id="delete-schedule" bind:checked={deleteLinkedSchedule} />
        <div class="space-y-1">
          <Label for="delete-schedule" class="cursor-pointer font-medium">
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
        class={buttonVariants({ variant: 'destructive' })}>Continue</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
