<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/state';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { buttonVariants } from '$lib/components/ui/button';
import { Checkbox } from '$lib/components/ui/checkbox';
import { Label } from '$lib/components/ui/label';
import { listBudgets, deleteBudget } from '$lib/query/budgets';
import { remove as removeSchedule } from '$lib/query/schedules';
import type { BudgetMetadata } from '$lib/schema/budgets';
import { deleteScheduleDialog, deleteScheduleId } from '$lib/states/ui/global.svelte';

const _deleteScheduleDialog = $derived(deleteScheduleDialog);
const _deleteScheduleId = $derived(deleteScheduleId);

// Fetch all budgets to check for linked ones
const budgetsQuery = $derived(
  _deleteScheduleId.current > 0 ? listBudgets().options() : null
);

// Find budgets linked to this schedule
const linkedBudgets = $derived.by(() => {
  if (!budgetsQuery?.data || !_deleteScheduleId.current) return [];

  return budgetsQuery.data.filter((budget) => {
    if (!budget.metadata) return false;
    const metadata = budget.metadata as BudgetMetadata;
    const linkedScheduleId = metadata.scheduledExpense?.linkedScheduleId || metadata.goal?.linkedScheduleId;
    return linkedScheduleId === _deleteScheduleId.current;
  });
});

const hasLinkedBudgets = $derived(linkedBudgets.length > 0);

// State for delete linked budgets checkbox
let deleteLinkedBudgets = $state(false);

// Reset checkbox when dialog opens/closes
$effect(() => {
  if (!_deleteScheduleDialog.current) {
    deleteLinkedBudgets = false;
  }
});

const deleteScheduleMutation = removeSchedule().options();
const deleteBudgetMutation = deleteBudget.options();

let isDeleting = $state(false);

const confirmDeleteSchedule = async () => {
  if (isDeleting) return;
  isDeleting = true;

  try {
    // If user opted to delete linked budgets, delete them first
    if (hasLinkedBudgets && deleteLinkedBudgets) {
      for (const budget of linkedBudgets) {
        await deleteBudgetMutation.mutateAsync({ id: budget.id, deleteLinkedSchedule: false });
      }
    }

    // Delete the schedule
    await deleteScheduleMutation.mutateAsync(_deleteScheduleId.current);

    _deleteScheduleDialog.current = false;

    // Only redirect if we're currently viewing the schedule being deleted
    if (page.route.id === '/schedules/[slug]') {
      await goto('/schedules');
    }
  } catch (error) {
    console.error('Failed to delete schedule:', error);
  } finally {
    isDeleting = false;
  }
};
</script>

<AlertDialog.Root
  bind:open={
    () => _deleteScheduleDialog.current, (newOpen) => (_deleteScheduleDialog.current = newOpen)
  }>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone. This will permanently delete your schedule and any associated
        information with it.
      </AlertDialog.Description>
    </AlertDialog.Header>

    {#if hasLinkedBudgets}
      <div class="flex items-start gap-3 rounded-lg border p-4">
        <Checkbox id="delete-budgets" bind:checked={deleteLinkedBudgets} />
        <div class="space-y-1">
          <Label for="delete-budgets" class="cursor-pointer font-medium">
            Also delete {linkedBudgets.length} linked budget{linkedBudgets.length > 1 ? 's' : ''}
          </Label>
          <p class="text-muted-foreground text-xs">
            {#if linkedBudgets.length === 1}
              The budget "{linkedBudgets[0].name}" is linked to this schedule. Check this box to delete
              it as well, or leave unchecked to keep the budget.
            {:else}
              The following budgets are linked to this schedule: {linkedBudgets.map(b => b.name).join(', ')}.
              Check this box to delete them as well, or leave unchecked to keep the budgets.
            {/if}
          </p>
        </div>
      </div>
    {/if}

    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={isDeleting}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmDeleteSchedule}
        disabled={isDeleting}
        class={buttonVariants({ variant: 'destructive' })}>
        {isDeleting ? 'Deleting...' : 'Continue'}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
