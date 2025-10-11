<script lang="ts">
import {Button} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import {Badge} from '$lib/components/ui/badge';
import {Separator} from '$lib/components/ui/separator';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import type {Schedule} from '$lib/schema/schedules.js';
import {SchedulesState} from '$lib/states/entities';
import {currencyFormatter, recurringFormatter} from '$lib/utils/formatters';
import Calendar from '@lucide/svelte/icons/calendar';
import Clock from '@lucide/svelte/icons/clock';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import Edit from '@lucide/svelte/icons/edit';
import Trash from '@lucide/svelte/icons/trash';
import RotateCw from '@lucide/svelte/icons/rotate-cw';
import Sparkles from '@lucide/svelte/icons/sparkles';

// Get existing schedules state from layout context
const schedulesState = SchedulesState.get();
const schedules: Schedule[] = $derived(schedulesState.all);

// Delete confirmation dialog state
let deleteDialogOpen = $state(false);
let scheduleToDelete = $state<Schedule | null>(null);

// Helper function to format recurring pattern
function formatRecurringPattern(schedule: Schedule): string {
  if (!schedule.scheduleDate || !schedule.scheduleDate.frequency) return 'One-time';

  return recurringFormatter.format(
    schedule.scheduleDate.frequency,
    schedule.scheduleDate.interval || 1
  );
}

// Helper function to format amount display
function formatAmount(schedule: Schedule): string {
  if (schedule.amount_type === 'range') {
    return `${currencyFormatter.format(schedule.amount)} - ${currencyFormatter.format(schedule.amount_2)}`;
  } else if (schedule.amount_type === 'approximate') {
    return `~${currencyFormatter.format(schedule.amount)}`;
  } else {
    return currencyFormatter.format(schedule.amount);
  }
}

// Helper function to get status color
function getStatusVariant(status: string | null) {
  return status === 'active' ? 'default' : 'secondary';
}

// Show delete confirmation dialog
function showDeleteDialog(schedule: Schedule) {
  scheduleToDelete = schedule;
  deleteDialogOpen = true;
}

// Delete schedule after confirmation
async function confirmDeleteSchedule() {
  if (!scheduleToDelete) return;

  try {
    await schedulesState.deleteSchedule(scheduleToDelete.id);
    deleteDialogOpen = false;
    scheduleToDelete = null;
  } catch (error) {
    console.error('Failed to delete schedule:', error);
    // Could show toast notification here instead of alert
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

<div class="container mx-auto p-6">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Schedules</h1>
      <p class="text-muted-foreground">Manage your recurring and scheduled transactions</p>
    </div>
    <div class="flex gap-2">
      <Button variant="outline" href="/patterns">
        <Sparkles class="h-4 w-4 mr-2" />
        Patterns
      </Button>
      <Button href="/schedules/new">
        <DollarSign class="h-4 w-4 mr-2" />
        Add Schedule
      </Button>
    </div>
  </div>

  {#if !schedules || schedules.length === 0}
    <Card.Root class="p-8 text-center">
      <Calendar class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 class="text-lg font-semibold mb-2">No schedules yet</h3>
      <p class="text-muted-foreground mb-4">Create your first schedule to track recurring transactions</p>
      <Button href="/schedules/new">
        <DollarSign class="h-4 w-4 mr-2" />
        Create Schedule
      </Button>
    </Card.Root>
  {:else}
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each schedules as schedule}
        <Card.Root class="hover:shadow-md transition-shadow relative">
          <div class="absolute top-3 right-3 z-10 flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8"
              href="/schedules/{schedule.slug}/edit">
              <Edit class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8 text-destructive"
              onclick={() => showDeleteDialog(schedule)}>
              <Trash class="h-4 w-4" />
            </Button>
          </div>

          <a href="/schedules/{schedule.slug}" class="block">
            <Card.Header class="pb-3 pr-20">
              <div class="flex-1">
                <Card.Title class="text-lg hover:text-primary transition-colors">{schedule.name}</Card.Title>
                <div class="flex items-center gap-2 mt-1">
                  <Badge variant={getStatusVariant(schedule.status)}>
                    {schedule.status}
                  </Badge>
                  {#if schedule.scheduleDate}
                    <Badge variant="outline" class="text-xs">
                      <RotateCw class="h-3 w-3 mr-1" />
                      Recurring
                    </Badge>
                  {/if}
                </div>
              </div>
            </Card.Header>

          <Card.Content class="pt-0">
            <div class="space-y-3">
              <!-- Amount Display -->
              <div class="flex items-center gap-2">
                <DollarSign class="h-4 w-4 text-muted-foreground" />
                <span class="font-semibold text-lg">{formatAmount(schedule)}</span>
                {#if schedule.amount_type !== 'exact'}
                  <Badge variant="outline" class="text-xs">{schedule.amount_type}</Badge>
                {/if}
              </div>

              <Separator />

              <!-- Recurring Pattern -->
              <div class="flex items-center gap-2 text-sm">
                <Clock class="h-4 w-4 text-muted-foreground" />
                <span>{formatRecurringPattern(schedule)}</span>
              </div>

              {#if schedule.scheduleDate}
                <div class="text-xs text-muted-foreground">
                  Started: {new Date(schedule.scheduleDate.start).toLocaleDateString()}
                  {#if schedule.scheduleDate.end}
                    • Ends: {new Date(schedule.scheduleDate.end).toLocaleDateString()}
                  {/if}
                </div>
              {/if}
            </div>
          </Card.Content>
          </a>
        </Card.Root>
      {/each}
    </div>
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
          Are you sure you want to delete the schedule "{scheduleToDelete?.name}"? This action cannot be undone.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel onclick={cancelDelete}>Cancel</AlertDialog.Cancel>
        <AlertDialog.Action onclick={confirmDeleteSchedule} class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          Delete
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>
