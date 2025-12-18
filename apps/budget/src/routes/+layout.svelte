<script lang="ts">
import AddPayeeDialog from '$lib/components/dialogs/add-payee-dialog.svelte';
import DeleteAccountDialog from '$lib/components/dialogs/delete-account-dialog.svelte';
import DeleteBudgetDialog from '$lib/components/dialogs/delete-budget-dialog.svelte';
import DeleteCategoryDialog from '$lib/components/dialogs/delete-category-dialog.svelte';
import DeletePayeeDialog from '$lib/components/dialogs/delete-payee-dialog.svelte';
import DeleteScheduleDialog from '$lib/components/dialogs/delete-schedule-dialog.svelte';
import SkipOccurrenceDialog from '$lib/components/dialogs/skip-occurrence-dialog.svelte';
import AppSidebar from '$lib/components/layout/app-sidebar.svelte';
import FontSizeToggle from '$lib/components/layout/font-size-toggle.svelte';
import HeaderPageActions from '$lib/components/layout/header-page-actions.svelte';
import HeaderPageTabs from '$lib/components/layout/header-page-tabs.svelte';
import SettingsButton from '$lib/components/layout/settings-button.svelte';
import ThemeButton from '$lib/components/layout/theme-button.svelte';
import ThemeToggle from '$lib/components/layout/theme-toggle.svelte';
import * as Tooltip from '$lib/components/ui/tooltip';
import { queryClient, rpc } from '$lib/query';
import { BudgetState } from '$lib/states/budgets.svelte';
import { CurrentWorkspaceState, currentWorkspace } from '$lib/states/current-workspace.svelte';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { CategoriesState } from '$lib/states/entities/categories.svelte';
import { PayeesState } from '$lib/states/entities/payees.svelte';
import { SchedulesState } from '$lib/states/entities/schedules.svelte';
import { autoScheduler } from '$lib/stores/auto-scheduler.svelte';
import { setPageActionsContext } from '$lib/stores/page-actions.svelte';
import { setPageTabsContext } from '$lib/stores/page-tabs.svelte';
import * as Sidebar from '$ui/lib/components/ui/sidebar/index.js';
import { setQueryClientContext } from '@tanstack/svelte-query';
import { ModeWatcher } from 'mode-watcher';
import { NuqsAdapter } from 'nuqs-svelte/adapters/svelte-kit';
import type { Snippet } from 'svelte';
import { onMount } from 'svelte';
import { Toaster } from 'svelte-sonner';
import '../app.css';
import type { LayoutData } from './$types';

let { data, children }: { data: LayoutData; children: Snippet } = $props();

// Set QueryClient context immediately using centralized client
setQueryClientContext(queryClient);

// Set up page actions context for child pages
setPageActionsContext();

// Set up page tabs context for child pages
setPageTabsContext();

// Use TanStack Query for reactive updates
const accountsQuery = rpc.accounts.listAccounts().options();
const payeesQuery = rpc.payees.listPayees().options();
const categoriesQuery = rpc.categories.listCategories().options();
const schedulesQuery = rpc.schedules.getAll().options();

// Set up state contexts (populated reactively by effects below)
const accountsState = AccountsState.set([]);
const payeesState = PayeesState.set([]);
const categoriesState = CategoriesState.set([]);
const schedulesState = SchedulesState.set([]);
const budgetState = BudgetState.set([]);

// Initialize current workspace state context
const currentWorkspaceState = new CurrentWorkspaceState(null);
currentWorkspace.set(currentWorkspaceState);

// Keep current workspace state in sync with data changes
$effect.pre(() => {
  if (data.currentWorkspace) {
    currentWorkspaceState.setWorkspace(data.currentWorkspace);
  } else {
    currentWorkspaceState.clearWorkspace();
  }
});

// Keep states in sync with query data (uses $effect.pre to run before render)
$effect.pre(() => {
  const accounts = accountsQuery.data ?? data.accounts;
  accountsState.init(accounts);
});

$effect.pre(() => {
  const payees = payeesQuery.data ?? data.payees;
  payeesState.init(payees);
});

$effect.pre(() => {
  const categories = categoriesQuery.data ?? data.categories;
  categoriesState.init(categories);
});

$effect.pre(() => {
  const schedules = schedulesQuery.data ?? data.schedules;
  schedulesState.init(schedules);
});

$effect.pre(() => {
  budgetState.replaceBudgets(data.budgets);
});

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

<ModeWatcher />
<Toaster richColors position="top-center" />

<DeleteAccountDialog />
<DeleteScheduleDialog />
<DeleteBudgetDialog />
<AddPayeeDialog />
<DeletePayeeDialog />
<DeleteCategoryDialog />
<SkipOccurrenceDialog />

<NuqsAdapter>
  <div class="bg-background">
    <div class="grid">
      <Sidebar.Provider>
        <AppSidebar />
        <Sidebar.Inset>
          <header
            class="bg-background sticky top-0 z-1 flex h-16 shrink-0 items-center gap-2 border-b p-2"
          >
            <div class="flex items-center gap-2 px-4">
              <Tooltip.Root>
                <Tooltip.Trigger>
                  {#snippet child({ props })}
                    <Sidebar.Trigger {...props} class="-ml-1" />
                  {/snippet}
                </Tooltip.Trigger>
                <Tooltip.Content>Toggle sidebar</Tooltip.Content>
              </Tooltip.Root>
              <ThemeToggle />
              <FontSizeToggle />
              <ThemeButton />
              <SettingsButton />
              <HeaderPageActions />
              <HeaderPageTabs />
            </div>
          </header>
          <div class="col-span-3 lg:col-span-4">
            <div class="h-full py-6 pr-4 pl-4 lg:pr-6 lg:pl-6">
              {@render children?.()}
            </div>
          </div>
        </Sidebar.Inset>
      </Sidebar.Provider>
    </div>
  </div>
</NuqsAdapter>
