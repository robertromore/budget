<script lang="ts">
import * as Sidebar from '$ui/lib/components/ui/sidebar/index.js';
import AppSidebar from '$lib/components/layout/app-sidebar.svelte';
import '../app.css';
import type {LayoutData} from './$types';
import type {Snippet} from 'svelte';
import {CategoriesState} from '$lib/states/entities/categories.svelte';
import {PayeesState} from '$lib/states/entities/payees.svelte';
import {dev} from '$app/environment';
import {RenderScan} from 'svelte-render-scan';
import {AccountsState} from '$lib/states/entities/accounts.svelte';
import DeleteAccountDialog from '$lib/components/dialogs/delete-account-dialog.svelte';
import DeleteScheduleDialog from '$lib/components/dialogs/delete-schedule-dialog.svelte';
import DeleteBudgetDialog from '$lib/components/dialogs/delete-budget-dialog.svelte';
import AddPayeeDialog from '$lib/components/dialogs/add-payee-dialog.svelte';
import DeletePayeeDialog from '$lib/components/dialogs/delete-payee-dialog.svelte';
import DeleteCategoryDialog from '$lib/components/dialogs/delete-category-dialog.svelte';
import {SchedulesState} from '$lib/states/entities/schedules.svelte';
import {BudgetState} from '$lib/states/budgets.svelte';
import {setQueryClientContext} from '@tanstack/svelte-query';
import {queryClient} from '$lib/query';
import {autoScheduler} from '$lib/stores/auto-scheduler.svelte';
import {onMount} from 'svelte';
import {rpc} from '$lib/query';
import {Toaster} from 'svelte-sonner';

let {data, children}: {data: LayoutData; children: Snippet} = $props();

// Set QueryClient context immediately using centralized client
setQueryClientContext(queryClient);

// Use TanStack Query for reactive data fetching on the client
// These queries replace the server-side data loading that was removed from +layout.server.ts
const accountsQuery = rpc.accounts.listAccounts().options();
const payeesQuery = rpc.payees.listPayees().options();
const categoriesQuery = rpc.categories.listCategories().options();
const budgetsQuery = rpc.budgets.listBudgets().options();

// Initialize states (will be populated by queries below)
const accountsState = AccountsState.set([]);
const payeesState = PayeesState.set([]);
const categoriesState = CategoriesState.set([]);
SchedulesState.set([]);
BudgetState.set([]);

// Keep states in sync with query data
$effect(() => {
  if (accountsQuery.data) {
    accountsState.init(accountsQuery.data);
  }
});

$effect(() => {
  if (payeesQuery.data) {
    payeesState.init(payeesQuery.data);
  }
});

$effect(() => {
  if (categoriesQuery.data) {
    categoriesState.init(categoriesQuery.data);
  }
});

$effect(() => {
  if (budgetsQuery.data) {
    BudgetState.set(budgetsQuery.data);
  }
});

// Schedules will be loaded on-demand by pages that need them

// Auto-scheduler: Automatically create scheduled transactions when app loads
onMount(() => {
  // Small delay to ensure everything is loaded, then run auto-scheduler
  setTimeout(() => {
    autoScheduler.runWithRetries();
  }, 1000);
});
</script>

<!-- Temporarily disabled RenderScan for debugging -->
<!-- {#if dev}
	<RenderScan />
{/if} -->

<Toaster richColors position="top-center" />

<DeleteAccountDialog />
<DeleteScheduleDialog />
<DeleteBudgetDialog />
<AddPayeeDialog />
<DeletePayeeDialog />
<DeleteCategoryDialog />

<div class="bg-background">
  <div class="grid">
    <Sidebar.Provider>
      <AppSidebar />
      <main class="w-full">
        <div class="fixed">
          <Sidebar.Trigger />
        </div>
        <div class="col-span-3 lg:col-span-4">
          <div class="h-full px-4 py-6 lg:px-8">
            {@render children?.()}
          </div>
        </div>
      </main>
    </Sidebar.Provider>
  </div>
</div>
