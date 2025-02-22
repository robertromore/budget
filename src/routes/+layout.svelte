<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import "../app.pcss";
  import type { LayoutData } from "./$types";
  import type { Snippet } from "svelte";
  import { categoriesContext, CategoriesState } from "$lib/states/categories.svelte";
  import { payeesContext, PayeesState } from "$lib/states/payees.svelte";
  // import { dev } from '$app/environment';
  // import { RenderScan } from 'svelte-render-scan';
  import { newAccountDialog } from "$lib/states/global.svelte";
  import { UseBoolean } from "$lib/hooks/use-boolean.svelte";
  import AddAccountDialog from "$lib/components/dialogs/add-account-dialog.svelte";

  let { data, children }: { data: LayoutData; children: Snippet } = $props();
  const { payees, categories } = $derived(data);
  categoriesContext.set(new CategoriesState((() => categories)()));
  payeesContext.set(new PayeesState((() => payees)()));

  newAccountDialog.set(new UseBoolean(false));
</script>

<!-- {#if dev}
	<RenderScan />
{/if} -->

<AddAccountDialog />

<div class="bg-background">
  <div class="grid">
    <Sidebar.Provider>
      <AppSidebar />
      <main class="max-w-fit">
        <Sidebar.Trigger />
        <div class="col-span-3 lg:col-span-4">
          <div class="h-full px-4 py-6 lg:px-8">
            {@render children?.()}
          </div>
        </div>
      </main>
    </Sidebar.Provider>
  </div>
</div>
