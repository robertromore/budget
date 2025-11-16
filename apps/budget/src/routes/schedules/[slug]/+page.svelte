<script lang="ts">
import type {PageData} from './$types';
import {Button} from '$lib/components/ui/button';
import * as Tabs from '$lib/components/ui/tabs';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import {goto} from '$app/navigation';
import {
  createScheduleDetailQuery,
  createToggleScheduleStatusMutation,
  createExecuteAutoAddMutation,
  createDeleteScheduleMutation,
} from '$lib/queries/schedules';

// Import extracted components
import {
  OverviewTab,
  TimelineTab,
  TransactionsTab,
  SettingsTab,
  ScheduleHeader,
} from './(components)';

// Import data processing functions
import {generateCumulativeBalanceData, generateFutureProjections} from './(data)';

// Icons
import ChevronLeft from '@lucide/svelte/icons/chevron-left';
import Activity from '@lucide/svelte/icons/activity';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import Receipt from '@lucide/svelte/icons/receipt';
import Settings from '@lucide/svelte/icons/settings';

let {data}: {data: PageData} = $props();

// Create reactive query that updates when the data prop changes (route changes)
const scheduleQuery = $derived(
  data.schedule?.id ? createScheduleDetailQuery(data.schedule.id) : null
);
const toggleStatusMutation = createToggleScheduleStatusMutation();
const executeAutoAddMutation = createExecuteAutoAddMutation();
const deleteScheduleMutation = createDeleteScheduleMutation();

// Use reactive schedule data when available, fallback to current data from route
const schedule = $derived(scheduleQuery?.data ?? data.schedule);

// Calculate statistics reactively based on current schedule data
const statistics = $derived.by(() => {
  const totalTransactions = schedule.transactions?.length ?? 0;
  const totalAmount =
    schedule.transactions?.reduce((sum: number, t: any) => sum + t.amount, 0) ?? 0;
  const averageAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;
  const lastExecuted = schedule.transactions?.length > 0 ? schedule.transactions[0].date : null;

  return {
    totalTransactions,
    totalAmount,
    averageAmount,
    lastExecuted,
  };
});

// Tab state
let activeTab = $state('overview');

// Auto-add state
let isExecutingAutoAdd = $state(false);
let autoAddResult = $state<string | null>(null);

// Delete state
let showDeleteDialog = $state(false);

// Generate data using extracted functions
const cumulativeBalanceData = $derived.by(() => generateCumulativeBalanceData(schedule));
const futureProjections = $derived.by(() => generateFutureProjections(schedule));

// Actions
function editSchedule() {
  goto(`/schedules/${schedule.slug}/edit`);
}

async function toggleStatus() {
  toggleStatusMutation.mutate(schedule.id);
}

async function executeAutoAdd() {
  if (isExecutingAutoAdd) return;

  isExecutingAutoAdd = true;
  autoAddResult = null;

  try {
    const result = (await executeAutoAddMutation.mutateAsync(schedule.id)) as any;

    if (result.transactionsCreated > 0) {
      autoAddResult = `Created ${result.transactionsCreated} transaction${result.transactionsCreated === 1 ? '' : 's'}`;
    } else {
      autoAddResult = 'No new transactions needed';
    }
  } catch (error) {
    console.error('Auto-add failed:', error);
    autoAddResult = 'Failed to create transactions';
  } finally {
    isExecutingAutoAdd = false;
    // Clear result after 5 seconds
    setTimeout(() => {
      autoAddResult = null;
    }, 5000);
  }
}

function openDeleteDialog() {
  showDeleteDialog = true;
}

async function confirmDeleteSchedule() {
  try {
    await deleteScheduleMutation.mutateAsync(schedule.id);
    showDeleteDialog = false;
    // Navigate back to schedules list
    goto('/schedules');
  } catch (error) {
    console.error('Failed to delete schedule:', error);
    // Error is handled by the mutation onError
  }
}

function duplicateSchedule() {
  // Navigate to new schedule page with duplication data in query params
  goto(`/schedules/new?duplicate=${schedule.id}`);
}
</script>

<div class="container mx-auto space-y-4 p-4">
  <!-- Navigation -->
  <div class="text-muted-foreground flex items-center space-x-2 text-sm">
    <Button variant="ghost" size="sm" href="/schedules" class="h-auto p-0">
      <ChevronLeft class="mr-1 h-4 w-4" />
      Schedules
    </Button>
    <span>/</span>
    <span class="text-foreground">{schedule.name}</span>
  </div>

  <!-- Header Section -->
  <ScheduleHeader
    {schedule}
    {autoAddResult}
    {editSchedule}
    {toggleStatus}
    deleteSchedule={openDeleteDialog} />

  <!-- Tab Navigation -->
  <Tabs.Root bind:value={activeTab}>
    <Tabs.List class="grid w-full grid-cols-4">
      <Tabs.Trigger value="overview" class="flex items-center gap-2">
        <Activity class="h-4 w-4" />
        Overview
      </Tabs.Trigger>
      <Tabs.Trigger value="timeline" class="flex items-center gap-2">
        <BarChart3 class="h-4 w-4" />
        Timeline
      </Tabs.Trigger>
      <Tabs.Trigger value="transactions" class="flex items-center gap-2">
        <Receipt class="h-4 w-4" />
        Transactions
      </Tabs.Trigger>
      <Tabs.Trigger value="settings" class="flex items-center gap-2">
        <Settings class="h-4 w-4" />
        Settings
      </Tabs.Trigger>
    </Tabs.List>

    <!-- Overview Tab -->
    <Tabs.Content value="overview" class="mt-4 space-y-4">
      <OverviewTab {schedule} {statistics} {futureProjections} />
    </Tabs.Content>

    <!-- Timeline Tab -->
    <Tabs.Content value="timeline" class="mt-4 space-y-4">
      <TimelineTab {schedule} {cumulativeBalanceData} {futureProjections} />
    </Tabs.Content>

    <!-- Transactions Tab -->
    <Tabs.Content value="transactions" class="mt-4 space-y-4">
      <TransactionsTab {schedule} />
    </Tabs.Content>

    <!-- Settings Tab -->
    <Tabs.Content value="settings" class="mt-4 space-y-4">
      <SettingsTab
        {schedule}
        {statistics}
        {isExecutingAutoAdd}
        {executeAutoAdd}
        {editSchedule}
        {toggleStatus}
        deleteSchedule={openDeleteDialog}
        {duplicateSchedule} />
    </Tabs.Content>
  </Tabs.Root>
</div>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={showDeleteDialog}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Schedule</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete the schedule "{schedule.name}"? This action cannot be
        undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmDeleteSchedule}
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
        Delete
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
