<script lang="ts">
import {Button, buttonVariants} from '$lib/components/ui/button';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import Plus from '@lucide/svelte/icons/plus';
import User from '@lucide/svelte/icons/user';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import {PayeesState} from '$lib/states/entities/payees.svelte';
import {
  deletePayeeDialog,
  deletePayeeId,
} from '$lib/states/ui/payees.svelte';
import {payeeSearchState} from '$lib/states/ui/payee-search.svelte';
import EntitySearchToolbar from '$lib/components/shared/search/entity-search-toolbar.svelte';
import PayeeSearchFilters from './(components)/search/payee-search-filters.svelte';
import PayeeSearchResults from './(components)/search/payee-search-results.svelte';
import PayeeFacetedFilters from './(components)/bulk-operations/payee-faceted-filters.svelte';
import {searchPayeesAdvanced, bulkDeletePayees as bulkDeletePayeesMutation, listPayeesWithStats} from '$lib/query/payees';
import {goto} from '$app/navigation';
import type {Payee, PayeeType, PaymentFrequency} from '$lib/schema';
import {rpc} from '$lib/query';

const payeesState = $derived(PayeesState.get());
const allPayees = $derived(payeesState.payees.values());
const allPayeesArray = $derived(Array.from(allPayees));
const hasNoPayees = $derived(allPayeesArray.length === 0);

// Fetch payees with transaction stats for sorting
const payeesWithStatsQuery = rpc.payees.listPayeesWithStats().options();
const payeesWithStats = $derived(payeesWithStatsQuery.data ?? []);

// Search state
const search = payeeSearchState;
let searchResults = $state<Payee[]>([]);
let isSearching = $state(false);

// Sort payees based on user selection
const sortedPayeesArray = $derived.by(() => {
  // Create a map of payee stats for quick lookup
  const statsMap = new Map(payeesWithStats.map(p => [p.id, p.stats]));

  return [...allPayeesArray].sort((a, b) => {
    let comparison = 0;
    const statsA = statsMap.get(a.id);
    const statsB = statsMap.get(b.id);

    switch (search.sortBy) {
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '');
        break;
      case 'created':
        comparison = (a.createdAt || '').localeCompare(b.createdAt || '');
        break;
      case 'lastTransaction':
        comparison = (statsA?.lastTransactionDate || '').localeCompare(statsB?.lastTransactionDate || '');
        break;
      case 'avgAmount':
        comparison = (statsA?.avgAmount || 0) - (statsB?.avgAmount || 0);
        break;
      default:
        comparison = (a.name || '').localeCompare(b.name || '');
    }

    return search.sortOrder === 'asc' ? comparison : -comparison;
  });
});

// Merge stats into payees for display
const payeesWithStatsData = $derived.by(() => {
  const statsMap = new Map(payeesWithStats.map(p => [p.id, p.stats]));

  return sortedPayeesArray.map(payee => ({
    ...payee,
    avgAmount: statsMap.get(payee.id)?.avgAmount ?? null,
    lastTransactionDate: statsMap.get(payee.id)?.lastTransactionDate ?? null,
  }));
});

// Computed values
const displayedPayees = $derived.by(() => {
  return search.isSearchActive ? searchResults : payeesWithStatsData;
});

// Sort options for toolbar
const payeeSortOptions = [
  {value: 'name' as const, label: 'Name', order: 'asc' as const},
  {value: 'name' as const, label: 'Name', order: 'desc' as const},
  {value: 'lastTransaction' as const, label: 'Last Transaction', order: 'desc' as const},
  {value: 'avgAmount' as const, label: 'Avg Amount', order: 'desc' as const},
  {value: 'created' as const, label: 'Created', order: 'desc' as const},
];

const shouldShowNoPayees = $derived.by(() => {
  return !search.isSearchActive && hasNoPayees;
});

// Dialog state
let deleteDialogId = $derived(deletePayeeId);
let deleteDialogOpen = $derived(deletePayeeDialog);

// Bulk delete dialog state
let bulkDeleteDialogOpen = $state(false);
let payeesToDelete = $state<Payee[]>([]);
let isDeletingBulk = $state(false);

// Server-side search function
const performSearch = async () => {
  if (!search.isSearchActive) {
    searchResults = [];
    isSearching = false;
    return;
  }

  isSearching = true;
  try {
    const params = search.getSearchParams();
    const finalParams = {
      ...params,
      query: params.query || '',
      limit: 100
    };
    const searchQuery = searchPayeesAdvanced(finalParams);

    const result = await searchQuery.execute();
    searchResults = result || [];
    search.setResults(searchResults);
  } catch (error) {
    console.error('Error searching payees:', error);
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


const deletePayee = (payee: Payee) => {
  deleteDialogId.current = payee.id;
  deleteDialogOpen.setTrue();
};

const bulkDeletePayees = async (payees: Payee[]) => {
  if (payees.length === 0) return;

  payeesToDelete = payees;
  bulkDeleteDialogOpen = true;
};

// Create mutation instance at component initialization
const bulkDeleteMutation = bulkDeletePayeesMutation.options();

const confirmBulkDelete = async () => {
  if (isDeletingBulk || payeesToDelete.length === 0) return;

  isDeletingBulk = true;
  try {
    const idsToDelete = payeesToDelete.map((p) => p.id);
    await bulkDeleteMutation.mutateAsync(idsToDelete);

    bulkDeleteDialogOpen = false;
    payeesToDelete = [];
  } catch (error) {
    console.error('Failed to delete payees:', error);
  } finally {
    isDeletingBulk = false;
  }
};

const viewPayee = (payee: Payee) => {
  goto(`/payees/${payee.slug}`);
};

const editPayee = (payee: Payee) => {
  goto(`/payees/${payee.slug}/edit`);
};

const viewAnalytics = (payee: Payee) => {
  goto(`/payees/${payee.slug}/analytics`);
};


const payeeTypeOptions = [
  {label: 'Merchant', value: 'merchant'},
  {label: 'Utility', value: 'utility'},
  {label: 'Employer', value: 'employer'},
  {label: 'Financial Institution', value: 'financial_institution'},
  {label: 'Government', value: 'government'},
  {label: 'Individual', value: 'individual'},
  {label: 'Other', value: 'other'}
];

const statusOptions = [
  {label: 'Active', value: 'true'},
  {label: 'Inactive', value: 'false'}
];

const frequencyOptions = [
  {label: 'Weekly', value: 'weekly'},
  {label: 'Bi-Weekly', value: 'bi_weekly'},
  {label: 'Monthly', value: 'monthly'},
  {label: 'Quarterly', value: 'quarterly'},
  {label: 'Annual', value: 'annual'},
  {label: 'Irregular', value: 'irregular'}
];
</script>

<svelte:head>
  <title>Payees - Budget App</title>
  <meta name="description" content="Manage your payees and payment contacts" />
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Payees</h1>
      <p class="text-muted-foreground">
        {#if search.isSearchActive}
          {searchResults.length} of {allPayeesArray.length} payees
        {:else}
          {allPayeesArray.length} payees total
        {/if}
      </p>
    </div>
    <div class="flex items-center gap-2">
      <Button variant="outline" href="/payees/analytics">
        <BarChart3 class="mr-2 h-4 w-4" />
        Analytics Dashboard
      </Button>
      <Button href="/payees/new">
        <Plus class="mr-2 h-4 w-4" />
        Add Payee
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
      searchPlaceholder="Search payees..."
      sortOptions={payeeSortOptions}
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
        <PayeeSearchFilters
          filters={search.filters}
          onFilterChange={(key, value) => search.updateFilter(key, value)}
        />
      {/snippet}
    </EntitySearchToolbar>

    <!-- Faceted Filters -->
    <div class="flex flex-wrap items-center gap-2">
      <PayeeFacetedFilters
        title="Type"
        options={payeeTypeOptions}
        selectedValues={search.filters.payeeType ? [search.filters.payeeType] : []}
        payees={allPayeesArray}
        fieldName="payeeType"
        onSelectionChange={(values) => {
          search.updateFilter('payeeType', (values[0] as PayeeType) || undefined);
        }}
      />

      <PayeeFacetedFilters
        title="Status"
        options={statusOptions}
        selectedValues={search.filters.isActive !== undefined ? [search.filters.isActive.toString()] : []}
        payees={allPayeesArray}
        fieldName="isActive"
        onSelectionChange={(values) => {
          const value = values[0];
          search.updateFilter('isActive', value === 'true' ? true : value === 'false' ? false : undefined);
        }}
      />

      <PayeeFacetedFilters
        title="Frequency"
        options={frequencyOptions}
        selectedValues={search.filters.paymentFrequency ? [search.filters.paymentFrequency] : []}
        payees={allPayeesArray}
        fieldName="paymentFrequency"
        onSelectionChange={(values) => {
          search.updateFilter('paymentFrequency', (values[0] as PaymentFrequency) || undefined);
        }}
      />
    </div>
  </div>

  <!-- Content -->
  {#if shouldShowNoPayees}
    <!-- Empty State - No Payees -->
    <div class="rounded-lg border border-blue-200 bg-blue-50 p-8 text-center">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
        <User class="h-8 w-8 text-blue-600" />
      </div>
      <h2 class="mb-2 text-xl font-semibold text-blue-900">No Payees Yet</h2>
      <p class="mb-6 text-blue-700 max-w-md mx-auto">
        Get started by creating your first payee. You can add merchants, companies, people, or any other
        entity you pay or receive money from.
      </p>
      <Button
        href="/payees/new"
        class="bg-blue-600 hover:bg-blue-700">
        <Plus class="mr-2 h-4 w-4" />
        Create Your First Payee
      </Button>
    </div>
  {:else}
    <!-- Search Results -->
    <PayeeSearchResults
      payees={displayedPayees}
      isLoading={isSearching}
      searchQuery={search.query}
      viewMode={search.viewMode}
      onView={viewPayee}
      onEdit={editPayee}
      onDelete={deletePayee}
      onBulkDelete={bulkDeletePayees}
      onViewAnalytics={viewAnalytics}
    />
  {/if}
</div>

<!-- Bulk Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={bulkDeleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete {payeesToDelete.length} Payee{payeesToDelete.length > 1 ? 's' : ''}</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete {payeesToDelete.length} payee{payeesToDelete.length > 1 ? 's' : ''}? This action cannot be undone.
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
