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
          <Breadcrumbs url={$page.url} routeId={$page.route.id} let:crumbs pageData={$page}>
            <div id="breadcrumbs">
              <span><a href="/">Home</a></span>
              {#each crumbs as c}
                <span><svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4"><path d="M6.1584 3.13508C6.35985 2.94621 6.67627 2.95642 6.86514 3.15788L10.6151 7.15788C10.7954 7.3502 10.7954 7.64949 10.6151 7.84182L6.86514 11.8418C6.67627 12.0433 6.35985 12.0535 6.1584 11.8646C5.95694 11.6757 5.94673 11.3593 6.1356 11.1579L9.565 7.49985L6.1356 3.84182C5.94673 3.64036 5.95694 3.32394 6.1584 3.13508Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path></svg></span>
                {#if $page.url.pathname !== c.url}
                <span class="font-medium text-foreground">
                  <a href={c.url}>
                    {c.title}
                  </a>
                </span>
                {:else}
                <span class="overflow-hidden text-ellipsis whitespace-nowrap">
                  {c.title}
                </span>
                {/if}
              {/each}
            </div>
          </Breadcrumbs>

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
