<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Table from '$lib/components/ui/table';
import { getSkipHistory, removeSkip } from '$lib/query/schedules';
import { openSkipOccurrenceDialog } from '$lib/states/ui/global.svelte';
import { toast } from '$lib/utils/toast-interceptor';
import type { PageData } from '../$types';

import CalendarX from '@lucide/svelte/icons/calendar-x';
import FastForward from '@lucide/svelte/icons/fast-forward';
import History from '@lucide/svelte/icons/history';
import Loader2 from '@lucide/svelte/icons/loader-2';
import Plus from '@lucide/svelte/icons/plus';
import RotateCcw from '@lucide/svelte/icons/rotate-ccw';

let {
  schedule,
}: {
  schedule: PageData['schedule'];
} = $props();

const skipHistoryQuery = $derived(schedule ? getSkipHistory(schedule.id).options() : null);
const skips = $derived(skipHistoryQuery?.data ?? []);
const isLoading = $derived(skipHistoryQuery?.isLoading ?? false);

const removeSkipMutation = removeSkip().options();

// State for restore confirmation
let restoreConfirmOpen = $state(false);
let skipToRestore = $state<{ id: number; date: string } | null>(null);

const formatDate = (date: string) => {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const handleSkipUpcoming = () => {
  if (schedule?.scheduleDate?.start) {
    // Use the next upcoming date - for simplicity, we'll calculate it here
    // In a real implementation, this would come from the schedule service
    const today = new Date().toISOString().split('T')[0]!;
    openSkipOccurrenceDialog(schedule.id, schedule.name, today);
  }
};

const handleRestore = (skipId: number, date: string) => {
  skipToRestore = { id: skipId, date };
  restoreConfirmOpen = true;
};

const confirmRestore = async () => {
  if (!skipToRestore || !schedule) return;

  try {
    await removeSkipMutation.mutateAsync({
      skipId: skipToRestore.id,
      scheduleId: schedule.id,
    });
    toast.success('Occurrence restored', {
      description: `${formatDate(skipToRestore.date)} has been restored`,
    });
  } catch (error) {
    console.error('Failed to restore occurrence:', error);
    toast.error('Failed to restore occurrence');
  } finally {
    restoreConfirmOpen = false;
    skipToRestore = null;
  }
};

// Count by type
const singleSkipsCount = $derived(skips.filter((s) => s.skipType === 'single').length);
const pushForwardCount = $derived(skips.filter((s) => s.skipType === 'push_forward').length);
</script>

{#if schedule}
  <div class="space-y-4">
    <!-- Summary Cards -->
    <div class="grid gap-3 md:grid-cols-3">
      <Card.Root>
        <Card.Header class="pb-2">
          <Card.Title class="flex items-center gap-2 text-sm">
            <CalendarX class="h-4 w-4" />
            Single Skips
          </Card.Title>
        </Card.Header>
        <Card.Content class="pt-0">
          <p class="text-2xl font-bold">{singleSkipsCount}</p>
          <p class="text-muted-foreground text-xs">Individual dates skipped</p>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header class="pb-2">
          <Card.Title class="flex items-center gap-2 text-sm">
            <FastForward class="h-4 w-4" />
            Push Forward
          </Card.Title>
        </Card.Header>
        <Card.Content class="pt-0">
          <p class="text-2xl font-bold">{pushForwardCount}</p>
          <p class="text-muted-foreground text-xs">All dates shifted forward</p>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header class="pb-2">
          <Card.Title class="flex items-center gap-2 text-sm">
            <History class="h-4 w-4" />
            Total Skips
          </Card.Title>
        </Card.Header>
        <Card.Content class="pt-0">
          <p class="text-2xl font-bold">{skips.length}</p>
          <p class="text-muted-foreground text-xs">All skip actions recorded</p>
        </Card.Content>
      </Card.Root>
    </div>

    <!-- Skip History Table -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between pb-2">
        <div>
          <Card.Title class="flex items-center gap-2 text-sm">
            <History class="h-4 w-4" />
            Skip History
          </Card.Title>
          <Card.Description class="text-xs">
            View and manage skipped occurrences
          </Card.Description>
        </div>
        <Button size="sm" variant="outline" onclick={handleSkipUpcoming}>
          <Plus class="mr-1 h-3 w-3" />
          Skip Occurrence
        </Button>
      </Card.Header>
      <Card.Content class="pt-2">
        {#if isLoading}
          <div class="flex items-center justify-center py-8">
            <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        {:else if skips.length === 0}
          <div class="flex flex-col items-center justify-center py-8 text-center">
            <CalendarX class="h-12 w-12 text-muted-foreground/50" />
            <p class="mt-4 text-sm font-medium">No skipped occurrences</p>
            <p class="text-muted-foreground text-xs">
              All scheduled transactions are active
            </p>
          </div>
        {:else}
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>Date</Table.Head>
                <Table.Head>Type</Table.Head>
                <Table.Head>Reason</Table.Head>
                <Table.Head>Skipped At</Table.Head>
                <Table.Head class="w-[100px]">Actions</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each skips as skip (skip.id)}
                <Table.Row>
                  <Table.Cell class="font-medium">
                    {formatDate(skip.skippedDate)}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge
                      variant={skip.skipType === 'single' ? 'secondary' : 'default'}
                      class="text-xs">
                      {#if skip.skipType === 'single'}
                        <CalendarX class="mr-1 h-3 w-3" />
                        Single
                      {:else}
                        <FastForward class="mr-1 h-3 w-3" />
                        Push Forward
                      {/if}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell class="text-muted-foreground text-sm">
                    {skip.reason || '-'}
                  </Table.Cell>
                  <Table.Cell class="text-muted-foreground text-xs">
                    {formatTimestamp(skip.createdAt)}
                  </Table.Cell>
                  <Table.Cell>
                    <Button
                      size="sm"
                      variant="ghost"
                      class="h-8 w-8 p-0"
                      onclick={() => handleRestore(skip.id, skip.skippedDate)}>
                      <RotateCcw class="h-4 w-4" />
                      <span class="sr-only">Restore</span>
                    </Button>
                  </Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        {/if}
      </Card.Content>
    </Card.Root>

    <!-- Info Note -->
    <Card.Root class="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
      <Card.Content class="pt-4">
        <p class="text-sm text-blue-800 dark:text-blue-300">
          <strong>Single Skip:</strong> Only skips one specific date. Other occurrences remain unchanged.
        </p>
        <p class="mt-2 text-sm text-blue-800 dark:text-blue-300">
          <strong>Push Forward:</strong> Shifts all future occurrences forward by one interval. This is reversible - restoring will shift dates back.
        </p>
      </Card.Content>
    </Card.Root>
  </div>
{/if}

<!-- Restore Confirmation Dialog -->
<AlertDialog.Root bind:open={restoreConfirmOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Restore Occurrence</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to restore the occurrence on {skipToRestore
          ? formatDate(skipToRestore.date)
          : ''}? This will undo the skip action.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={() => (skipToRestore = null)}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={confirmRestore}>
        <RotateCcw class="mr-2 h-4 w-4" />
        Restore
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
