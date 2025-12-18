<script lang="ts">
import { goto } from '$app/navigation';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Button, buttonVariants } from '$lib/components/ui/button';
import * as Empty from '$lib/components/ui/empty';
import type { Schedule } from '$lib/schema/schedules';
import { SchedulesState } from '$lib/states/entities';
import Calendar from '@lucide/svelte/icons/calendar';
import Plus from '@lucide/svelte/icons/plus';
import Sparkles from '@lucide/svelte/icons/sparkles';
import ScheduleSearchResults from './(components)/search/schedule-search-results.svelte';

// Get existing schedules state from layout context
const schedulesState = SchedulesState.get();
const allSchedules: Schedule[] = $derived(schedulesState.all);
const hasNoSchedules = $derived(allSchedules.length === 0);

// Delete confirmation dialog state
let deleteDialogOpen = $state(false);
let scheduleToDelete = $state<Schedule | null>(null);

// Bulk delete dialog state
let bulkDeleteDialogOpen = $state(false);
let schedulesToDelete = $state<Schedule[]>([]);
let isDeletingBulk = $state(false);

const deleteSchedule = (schedule: Schedule) => {
  scheduleToDelete = schedule;
  deleteDialogOpen = true;
};

const viewSchedule = (schedule: Schedule) => {
  goto(`/schedules/${schedule.slug}`);
};

const editSchedule = (schedule: Schedule) => {
  goto(`/schedules/${schedule.slug}/edit`);
};

const bulkDeleteSchedules = async (schedules: Schedule[]) => {
  if (schedules.length === 0) return;

  schedulesToDelete = schedules;
  bulkDeleteDialogOpen = true;
};

const confirmBulkDelete = async () => {
  if (isDeletingBulk || schedulesToDelete.length === 0) return;

  isDeletingBulk = true;
  try {
    for (const schedule of schedulesToDelete) {
      await schedulesState.deleteSchedule(schedule.id);
    }

    bulkDeleteDialogOpen = false;
    schedulesToDelete = [];
  } catch (error) {
    console.error('Failed to delete schedules:', error);
  } finally {
    isDeletingBulk = false;
  }
};

// Delete schedule after confirmation
async function confirmDeleteSchedule() {
  if (!scheduleToDelete) return;

  try {
    await schedulesState.deleteSchedule(scheduleToDelete.id);
    deleteDialogOpen = false;
    scheduleToDelete = null;
  } catch (error) {
    console.error('Failed to delete schedule:', error);
    alert('Failed to delete schedule. Please try again.');
  }
}

// Cancel delete dialog
function cancelDelete() {
  deleteDialogOpen = false;
  scheduleToDelete = null;
}
</script>

<svelte:head>
  <title>Schedules - Budget App</title>
  <meta name="description" content="Manage your scheduled transactions" />
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Schedules</h1>
      <p class="text-muted-foreground">{allSchedules.length} schedules total</p>
    </div>
    <div class="flex items-center gap-2">
      <Button variant="outline" href="/patterns">
        <Sparkles class="mr-2 h-4 w-4" />
        Patterns
      </Button>
      <Button href="/schedules/new">
        <Plus class="mr-2 h-4 w-4" />
        Add Schedule
      </Button>
    </div>
  </div>

  <!-- Content -->
  {#if hasNoSchedules}
    <!-- Empty State - No Schedules -->
    <Empty.Empty>
      <Empty.EmptyMedia variant="icon">
        <Calendar class="size-6" />
      </Empty.EmptyMedia>
      <Empty.EmptyHeader>
        <Empty.EmptyTitle>No Schedules Yet</Empty.EmptyTitle>
        <Empty.EmptyDescription>
          Create your first schedule to track recurring transactions like bills, subscriptions, and
          regular income.
        </Empty.EmptyDescription>
      </Empty.EmptyHeader>
      <Empty.EmptyContent>
        <Button href="/schedules/new">
          <Plus class="mr-2 h-4 w-4" />
          Create Your First Schedule
        </Button>
      </Empty.EmptyContent>
    </Empty.Empty>
  {:else}
    <!-- Schedule Data Table -->
    <ScheduleSearchResults
      schedules={allSchedules}
      isLoading={false}
      searchQuery=""
      viewMode="list"
      onView={viewSchedule}
      onEdit={editSchedule}
      onDelete={deleteSchedule}
      onBulkDelete={bulkDeleteSchedules} />
  {/if}
</div>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Portal>
    <AlertDialog.Overlay />
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>Delete Schedule</AlertDialog.Title>
        <AlertDialog.Description>
          Are you sure you want to delete the schedule "{scheduleToDelete?.name}"? This action
          cannot be undone.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel onclick={cancelDelete}>Cancel</AlertDialog.Cancel>
        <AlertDialog.Action
          onclick={confirmDeleteSchedule}
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          Delete
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>

<!-- Bulk Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={bulkDeleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title
        >Delete {schedulesToDelete.length} Schedule{schedulesToDelete.length > 1
          ? 's'
          : ''}</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete {schedulesToDelete.length} schedule{schedulesToDelete.length >
        1
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
