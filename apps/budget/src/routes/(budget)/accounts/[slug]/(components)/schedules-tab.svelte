<!--
  Schedules Tab — schedules attached to this account, plus recommendations
  sheet and bulk-delete confirmation. Used both in the per-account Tabs
  view and the header-tabs render path on the parent page.
-->
<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Button, buttonVariants } from '$lib/components/ui/button';
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import ScheduleRecommendationsPanel from '$lib/components/schedules/schedule-recommendations-panel.svelte';
import type { Schedule } from '$core/schema/schedules';
import { goto } from '$app/navigation';
import {
  bulkRemove as bulkRemoveSchedules,
  getByAccount as getSchedulesByAccount,
} from '$lib/query/schedules';
import { deleteScheduleDialog, deleteScheduleId } from '$lib/states/ui/global.svelte';
import { demoMode, type DemoSchedule } from '$lib/states/ui/demo-mode.svelte';
import Sparkles from '@lucide/svelte/icons/sparkles';
import AccountSchedulesTable from './account-schedules-table.svelte';

interface Props {
  accountId: number;
  accountSlug: string;
  isDemoView?: boolean;
}

let { accountId, accountSlug, isDemoView = false }: Props = $props();

function demoScheduleToSchedule(demoSchedule: DemoSchedule): Schedule {
  const now = new Date().toISOString();
  return {
    id: demoSchedule.id,
    workspaceId: -1,
    seq: null,
    name: demoSchedule.name,
    slug: demoSchedule.slug,
    status: 'active',
    amount: demoSchedule.amount,
    amount_2: null,
    amount_type: 'exact',
    recurring: true,
    auto_add: false,
    dateId: null,
    payeeId: demoSchedule.payee?.id ?? null,
    categoryId: demoSchedule.category?.id ?? null,
    accountId: -1,
    budgetId: null,
    createdAt: now,
    updatedAt: now,
    payee: demoSchedule.payee
      ? ({ id: demoSchedule.payee.id, name: demoSchedule.payee.name } as any)
      : null,
    category: demoSchedule.category
      ? ({ id: demoSchedule.category.id, name: demoSchedule.category.name } as any)
      : null,
    scheduleDate: {
      id: demoSchedule.id,
      frequency: demoSchedule.frequency,
      interval: demoSchedule.interval,
      nextOccurrence: demoSchedule.nextOccurrence,
    } as any,
  } as unknown as Schedule;
}

const schedulesQuery = $derived(
  accountId && !isDemoView ? getSchedulesByAccount(accountId).options() : undefined
);
const schedules = $derived.by<Schedule[]>(() => {
  if (isDemoView) return demoMode.demoSchedules.map(demoScheduleToSchedule);
  return schedulesQuery?.data ?? [];
});
const isLoading = $derived(schedulesQuery?.isLoading ?? false);

let recommendationsSheetOpen = $state(false);
let bulkDeleteDialogOpen = $state(false);
let schedulesToDelete = $state<Schedule[]>([]);
const bulkDeleteMutation = bulkRemoveSchedules.options();

function viewSchedule(schedule: Schedule) {
  goto(`/schedules/${schedule.slug}`);
}

function editSchedule(schedule: Schedule) {
  goto(`/schedules/${schedule.slug}/edit`);
}

function deleteSchedule(schedule: Schedule) {
  deleteScheduleId.current = schedule.id;
  deleteScheduleDialog.setTrue();
}

function bulkDeleteSchedules(list: Schedule[]) {
  if (list.length === 0) return;
  schedulesToDelete = list;
  bulkDeleteDialogOpen = true;
}

async function confirmBulkDelete() {
  if (schedulesToDelete.length === 0) return;
  try {
    await bulkDeleteMutation.mutateAsync(schedulesToDelete.map((s) => s.id));
    bulkDeleteDialogOpen = false;
    schedulesToDelete = [];
  } catch {
    // Mutation surfaces the error via toast.
  }
}
</script>

{#if schedules && !isLoading}
  <div class="flex items-center justify-between" data-tour-id="schedules-upcoming">
    <div></div>
    <Button
      variant="outline"
      onclick={() => (recommendationsSheetOpen = true)}
      data-tour-id="schedules-frequency">
      <Sparkles class="mr-2 h-4 w-4" />
      Recommendations
    </Button>
  </div>
  <AccountSchedulesTable
    {schedules}
    {accountId}
    {accountSlug}
    onView={viewSchedule}
    onEdit={editSchedule}
    onDelete={deleteSchedule}
    onBulkDelete={bulkDeleteSchedules} />
{:else if isLoading}
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="bg-muted h-8 w-48 animate-pulse rounded"></div>
      <div class="bg-muted h-10 w-64 animate-pulse rounded"></div>
    </div>
    <div class="bg-muted h-100 animate-pulse rounded-lg"></div>
  </div>
{/if}

<!-- Bulk Delete Schedules Confirmation -->
<AlertDialog.Root bind:open={bulkDeleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>
        Delete {schedulesToDelete.length} Schedule{schedulesToDelete.length > 1 ? 's' : ''}
      </AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete {schedulesToDelete.length} schedule{schedulesToDelete.length >
        1
          ? 's'
          : ''}? This action cannot be undone. Any transactions linked to these schedules will have
        their schedule reference removed.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmBulkDelete}
        disabled={bulkDeleteMutation.isPending}
        class={buttonVariants({ variant: 'destructive' })}>
        {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- Recommendations Sheet -->
<ResponsiveSheet
  bind:open={recommendationsSheetOpen}
  defaultWidth={800}
  minWidth={600}
  maxWidth={1200}>
  {#snippet header()}
    <div>
      <h2 class="text-lg font-semibold">Schedule Recommendations</h2>
      <p class="text-muted-foreground text-sm">
        Detected recurring transaction patterns that can become scheduled transactions
      </p>
    </div>
  {/snippet}

  {#snippet content()}
    <ScheduleRecommendationsPanel {accountId} />
  {/snippet}
</ResponsiveSheet>
