<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { buttonVariants } from '$lib/components/ui/button';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { deleteScheduleDialog, deleteScheduleId } from '$lib/states/ui/global.svelte';
import { SchedulesState } from '$lib/states/entities/schedules.svelte';

const _deleteScheduleDialog = $derived(deleteScheduleDialog);
const _deleteScheduleId = $derived(deleteScheduleId);
const schedulesState = SchedulesState.get();

const confirmDeleteSchedule = async () => {
  _deleteScheduleDialog.current = false;

  // Get the schedule being deleted to check its slug
  const scheduleToDelete = schedulesState.getById(_deleteScheduleId.current);

  // Delete the schedule
  schedulesState.deleteSchedule(_deleteScheduleId.current);

  // Only redirect if we're currently viewing the schedule being deleted
  if (
    scheduleToDelete &&
    page.route.id === '/schedules/[slug]' &&
    page.params['slug'] === scheduleToDelete.slug
  ) {
    await goto('/schedules');
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
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmDeleteSchedule}
        class={buttonVariants({ variant: 'destructive' })}>Continue</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
