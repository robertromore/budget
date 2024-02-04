<script lang="ts">
  import { page } from '$app/stores';
  import Menu from "$lib/components/Menu.svelte";
  import Sidebar from "$lib/components/Sidebar.svelte";
  import { Breadcrumbs } from "svelte-breadcrumbs";
  import "../app.pcss";
</script>

<Menu/>
<div class="border-t">
  <div class="bg-background">
    <div class="grid lg:grid-cols-5">
      <Sidebar class="hidden lg:block" />
      <div class="col-span-3 lg:col-span-4 lg:border-l">
        <div class="h-full px-4 py-6 lg:px-8">
          <slot/>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="postcss">
  #breadcrumbs {
    @apply mb-4 flex items-center space-x-1 text-sm text-muted-foreground;
  }
</style>
