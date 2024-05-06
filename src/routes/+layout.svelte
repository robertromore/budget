<script lang="ts">
  import Menu from '$lib/components/Menu.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import { setAccountState } from '$lib/states/AccountState.svelte';
  import '../app.pcss';

  let { data, children } = $props();

  setAccountState({
    accounts: data.accounts
  });
</script>

<Menu />
<div class="border-t">
  <div class="bg-background">
    <div class="grid lg:grid-cols-5">
      <Sidebar className="hidden lg:block" />
      <div class="col-span-3 lg:col-span-4 lg:border-l">
        <div class="h-full px-4 py-6 lg:px-8">
          {@render children()}
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="postcss">
  /* #breadcrumbs {
    @apply mb-4 flex items-center space-x-1 text-sm text-muted-foreground;
  } */
</style>
