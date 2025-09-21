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
import AddAccountDialog from '$lib/components/dialogs/add-account-dialog.svelte';
import {AccountsState} from '$lib/states/entities/accounts.svelte';
import DeleteAccountDialog from '$lib/components/dialogs/delete-account-dialog.svelte';
import AddScheduleDialog from '$lib/components/dialogs/add-schedule-dialog.svelte';
import DeleteScheduleDialog from '$lib/components/dialogs/delete-schedule-dialog.svelte';
import {SchedulesState} from '$lib/states/entities/schedules.svelte';
import {setQueryClientContext} from '@tanstack/svelte-query';
import {queryClient} from '$lib/query';
import {autoScheduler} from '$lib/stores/auto-scheduler.svelte';
import {onMount} from 'svelte';

let {data, children}: {data: LayoutData; children: Snippet} = $props();
const {accounts, payees, categories, schedules} = $derived(data);

// Set QueryClient context immediately using centralized client
setQueryClientContext(queryClient);

AccountsState.set((() => accounts)());
SchedulesState.set((() => schedules)());
CategoriesState.set((() => categories)());
PayeesState.set((() => payees)());

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

<AddAccountDialog />
<AddScheduleDialog />
<DeleteAccountDialog />
<DeleteScheduleDialog />

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
