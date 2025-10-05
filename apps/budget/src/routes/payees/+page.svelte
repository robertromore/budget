<script lang="ts">
import {Button} from '$lib/components/ui/button';
import Plus from '@lucide/svelte/icons/plus';
import User from '@lucide/svelte/icons/user';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import {PayeesState} from '$lib/states/entities/payees.svelte';
import {
  deletePayeeDialog,
  deletePayeeId,
} from '$lib/states/ui/payees.svelte';
import {payeeSearchState} from '$lib/states/ui/payee-search.svelte';
import PayeeSearchToolbar from '$lib/components/payees/payee-search-toolbar.svelte';
import PayeeSearchResults from '$lib/components/payees/payee-search-results.svelte';
import PayeeFacetedFilters from '$lib/components/payees/payee-faceted-filters.svelte';
import {searchPayeesAdvanced} from '$lib/query/payees';
import {goto} from '$app/navigation';
import type {Payee, PayeeType, PaymentFrequency} from '$lib/schema';

const payeesState = $derived(PayeesState.get());
const allPayees = $derived(payeesState.payees.values());
const allPayeesArray = $derived(Array.from(allPayees));
const hasNoPayees = $derived(allPayeesArray.length === 0);

// Search state
const search = payeeSearchState;
let searchResults = $state<Payee[]>([]);
let isSearching = $state(false);

// Computed values
const displayedPayees = $derived.by(() => {
  return search.isSearchActive() ? searchResults : allPayeesArray;
});

const shouldShowNoPayees = $derived.by(() => {
  return !search.isSearchActive() && hasNoPayees;
});

// Dialog state
let deleteDialogId = $derived(deletePayeeId);
let deleteDialogOpen = $derived(deletePayeeDialog);

// Server-side search function
const performSearch = async () => {
  if (!search.isSearchActive()) {
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
        {#if search.isSearchActive()}
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
    <PayeeSearchToolbar
      bind:searchQuery={search.query}
      bind:filters={search.filters}
      bind:viewMode={search.viewMode}
      bind:sortBy={search.sortBy}
      bind:sortOrder={search.sortOrder}
      onSearchChange={(query) => search.updateQuery(query)}
      onFiltersChange={(filters) => search.updateFilters(filters)}
      onViewModeChange={(mode) => search.viewMode = mode}
      onSortChange={(sortBy, sortOrder) => {
        search.sortBy = sortBy;
        search.sortOrder = sortOrder;
      }}
      onClearAll={() => search.clearAllFilters()}
    />

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
      onView={viewPayee}
      onEdit={editPayee}
      onDelete={deletePayee}
      onViewAnalytics={viewAnalytics}
    />
  {/if}
</div>
