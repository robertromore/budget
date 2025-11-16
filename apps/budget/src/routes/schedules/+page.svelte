<script lang="ts">
import {Button, buttonVariants} from '$lib/components/ui/button';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import * as Empty from '$lib/components/ui/empty';
import Plus from '@lucide/svelte/icons/plus';
import Calendar from '@lucide/svelte/icons/calendar';
import Sparkles from '@lucide/svelte/icons/sparkles';
import type {Schedule} from '$lib/schema/schedules';
import {SchedulesState} from '$lib/states/entities';
import {scheduleSearchState} from '$lib/states/ui/schedule-search.svelte';
import EntitySearchToolbar from '$lib/components/shared/search/entity-search-toolbar.svelte';
import ScheduleSearchFilters from './(components)/search/schedule-search-filters.svelte';
import ScheduleSearchResults from './(components)/search/schedule-search-results.svelte';
import {columns} from './(data)/columns.svelte';
import {goto} from '$app/navigation';

// Get existing schedules state from layout context
const schedulesState = SchedulesState.get();
const allSchedules: Schedule[] = $derived(schedulesState.all);
const hasNoSchedules = $derived(allSchedules.length === 0);

// Search state
const search = scheduleSearchState;
let searchResults = $state<Schedule[]>([]);
let isSearching = $state(false);

// Sort schedules based on user selection
const sortedSchedulesArray = $derived.by(() => {
  return [...allSchedules].sort((a, b) => {
    let comparison = 0;

    switch (search.sortBy) {
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '');
        break;
      case 'amount':
        comparison = (a.amount || 0) - (b.amount || 0);
        break;
      case 'created':
        comparison = (a.createdAt || '').localeCompare(b.createdAt || '');
        break;
      case 'status':
        comparison = (a.status || '').localeCompare(b.status || '');
        break;
      default:
        comparison = (a.name || '').localeCompare(b.name || '');
    }

    return search.sortOrder === 'asc' ? comparison : -comparison;
  });
});

// Computed values
const displayedSchedules = $derived.by(() => {
  return search.isSearchActive ? searchResults : sortedSchedulesArray;
});

// Sort options for toolbar
const scheduleSortOptions = [
  {value: 'name' as const, label: 'Name', order: 'asc' as const},
  {value: 'name' as const, label: 'Name', order: 'desc' as const},
  {value: 'amount' as const, label: 'Amount', order: 'asc' as const},
  {value: 'amount' as const, label: 'Amount', order: 'desc' as const},
  {value: 'status' as const, label: 'Status', order: 'asc' as const},
  {value: 'created' as const, label: 'Created', order: 'desc' as const},
];

const shouldShowNoSchedules = $derived.by(() => {
  return !search.isSearchActive && hasNoSchedules;
});

// Delete confirmation dialog state
let deleteDialogOpen = $state(false);
let scheduleToDelete = $state<Schedule | null>(null);

// Bulk delete dialog state
let bulkDeleteDialogOpen = $state(false);
let schedulesToDelete = $state<Schedule[]>([]);
let isDeletingBulk = $state(false);

// Client-side search and filter function
const performSearch = () => {
  if (!search.isSearchActive) {
    searchResults = [];
    isSearching = false;
    return;
  }

  isSearching = true;

  try {
    let results = [...allSchedules];

    // Filter by search query
    if (search.query.trim()) {
      const query = search.query.toLowerCase();
      results = results.filter((schedule) => schedule.name?.toLowerCase().includes(query));
    }

    // Filter by status
    if (search.filters.status) {
      results = results.filter((schedule) => schedule.status === search.filters.status);
    }

    // Filter by recurring
    if (search.filters.recurring !== undefined) {
      results = results.filter((schedule) =>
        search.filters.recurring
          ? schedule.scheduleDate !== null && schedule.scheduleDate !== undefined
          : schedule.scheduleDate === null || schedule.scheduleDate === undefined
      );
    }

    // Filter by autoAdd
    if (search.filters.autoAdd !== undefined) {
      results = results.filter((schedule) => schedule.auto_add === search.filters.autoAdd);
    }

    // Filter by amountType
    if (search.filters.amountType) {
      results = results.filter((schedule) => schedule.amount_type === search.filters.amountType);
    }

    // Filter by accountId
    if (search.filters.accountId) {
      results = results.filter((schedule) => schedule.accountId === search.filters.accountId);
    }

    // Filter by payeeId
    if (search.filters.payeeId) {
      results = results.filter((schedule) => schedule.payeeId === search.filters.payeeId);
    }

    // Filter by categoryId
    if (search.filters.categoryId) {
      results = results.filter((schedule) => schedule.categoryId === search.filters.categoryId);
    }

    // Filter by budgetId
    if (search.filters.budgetId) {
      results = results.filter((schedule) => schedule.budgetId === search.filters.budgetId);
    }

    // Sort results
    results.sort((a, b) => {
      let comparison = 0;

      switch (search.sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'amount':
          comparison = (a.amount || 0) - (b.amount || 0);
          break;
        case 'created':
          comparison = (a.createdAt || '').localeCompare(b.createdAt || '');
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        default:
          comparison = (a.name || '').localeCompare(b.name || '');
      }

      return search.sortOrder === 'asc' ? comparison : -comparison;
    });

    searchResults = results;
    search.setResults(results);
  } catch (error) {
    console.error('Error filtering schedules:', error);
    searchResults = [];
  } finally {
    isSearching = false;
  }
};

// Track if this is the first run
let isFirstRun = true;

// Debounced search effect
$effect(() => {
  // Track search state reactively
  search.query;
  search.filters;
  search.sortBy;
  search.sortOrder;

  // Don't set loading state on initial mount
  if (!isFirstRun) {
    isSearching = true;
  }
  isFirstRun = false;

  const timeoutId = setTimeout(() => {
    performSearch();
  }, 300);

  return () => clearTimeout(timeoutId);
});

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
      <p class="text-muted-foreground">
        {#if search.isSearchActive}
          {searchResults.length} of {allSchedules.length} schedules
        {:else}
          {allSchedules.length} schedules total
        {/if}
      </p>
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

  <!-- Search and Filters -->
  <div class="space-y-4">
    <!-- Search Toolbar -->
    <EntitySearchToolbar
      bind:searchQuery={search.query}
      bind:filters={search.filters}
      bind:viewMode={search.viewMode}
      bind:sortBy={search.sortBy}
      bind:sortOrder={search.sortOrder}
      searchPlaceholder="Search schedules..."
      sortOptions={scheduleSortOptions}
      activeFilterCount={Object.keys(search.filters).length}
      onSearchChange={(query) => search.updateQuery(query)}
      onFiltersChange={(filters) => search.updateFilters(filters)}
      onViewModeChange={(mode) => (search.viewMode = mode)}
      onSortChange={(sortBy, sortOrder) => {
        search.sortBy = sortBy;
        search.sortOrder = sortOrder;
      }}
      onClearAll={() => search.clearAllFilters()}>
      {#snippet filterContent()}
        <ScheduleSearchFilters
          filters={search.filters}
          onFilterChange={(key, value) => search.updateFilter(key, value)} />
      {/snippet}
    </EntitySearchToolbar>
  </div>

  <!-- Content -->
  {#if shouldShowNoSchedules}
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
    <!-- Search Results -->
    <ScheduleSearchResults
      schedules={displayedSchedules}
      isLoading={isSearching}
      searchQuery={search.query}
      viewMode={search.viewMode}
      {schedulesState}
      {columns}
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
        class={buttonVariants({variant: 'destructive'})}>
        {isDeletingBulk ? 'Deleting...' : 'Delete'}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
