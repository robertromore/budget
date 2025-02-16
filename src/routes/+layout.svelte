<script lang="ts">
  import * as ShadSidebar from "$lib/components/ui/sidebar/index.js";
  import Sidebar from '$lib/components/Sidebar.svelte';
  import '../app.pcss';
  import type { LayoutData } from "./$types";
  import type { Snippet } from "svelte";
  import { categoriesContext, CategoriesState } from "$lib/states/categories.svelte";
  import { payeesContext, PayeesState } from "$lib/states/payees.svelte";
  import { dev } from '$app/environment';
	import { RenderScan } from 'svelte-render-scan';

  let { data, children }: { data: LayoutData, children: Snippet } = $props();
  const { accounts, payees, categories } = $derived(data);
  categoriesContext.set(new CategoriesState((() => categories)()));
  payeesContext.set(new PayeesState((() => payees)()));
</script>

{#if dev}
	<RenderScan />
{/if}

<div class="bg-background">
  <div class="grid">
    <ShadSidebar.Provider>
      <Sidebar />
      <main class="w-full">
        <ShadSidebar.Trigger />
        <div class="col-span-3 lg:col-span-4">
          <div class="h-full px-4 py-6 lg:px-8">
            {@render children?.()}
          </div>
        </div>
      </main>
    </ShadSidebar.Provider>
  </div>
</div>
