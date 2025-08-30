<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import "../app.css";
  import type { LayoutData } from "./$types";
  import type { Snippet } from "svelte";
  import { categoriesContext, CategoriesState } from "$lib/stores/entities/categories.svelte";
  import { payeesContext, PayeesState } from "$lib/stores/entities/payees.svelte";
  import { dev } from '$app/environment';
  import { RenderScan } from 'svelte-render-scan';
  import AddAccountDialog from "$lib/components/dialogs/add-account-dialog.svelte";
  import { AccountsState } from "$lib/stores/entities/accounts.svelte";
  import DeleteAccountDialog from "$lib/components/dialogs/delete-account-dialog.svelte";
  import AddScheduleDialog from "$lib/components/dialogs/add-schedule-dialog.svelte";
  import { SchedulesState } from "$lib/stores/entities/schedules.svelte";

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
