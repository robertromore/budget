<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import "../app.css";
  import type { LayoutData } from "./$types";
  import type { Snippet } from "svelte";
  import { categoriesContext, CategoriesState } from "$lib/states/categories.svelte";
  import { payeesContext, PayeesState } from "$lib/states/payees.svelte";
  import { dev } from '$app/environment';
  import { RenderScan } from 'svelte-render-scan';
  import AddAccountDialog from "$lib/components/dialogs/add-account-dialog.svelte";
  import { AccountsState } from "$lib/states/accounts.svelte";
  import DeleteAccountDialog from "$lib/components/dialogs/delete-account-dialog.svelte";
  import AddScheduleDialog from "$lib/components/dialogs/add-schedule-dialog.svelte";
  import { SchedulesState } from "$lib/states/schedules.svelte";
  import QueryProvider from "$lib/components/query-provider.svelte";

  let { data, children }: { data: LayoutData; children: Snippet } = $props();
  const { accounts, payees, categories, schedules } = $derived(data);
  AccountsState.set((() => accounts)());
  SchedulesState.set((() => schedules)());
  categoriesContext.set(new CategoriesState((() => categories)()));
  payeesContext.set(new PayeesState((() => payees)()));
</script>

{#if dev}
	<RenderScan />
{/if}

<AddAccountDialog/>
<AddScheduleDialog/>
<DeleteAccountDialog/>

<QueryProvider>
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
</QueryProvider>
