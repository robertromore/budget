<script lang="ts">
  import { page } from "$app/stores";
  import {
    Home,
    MapPin,
    Package,
    Tags,
    LayoutDashboard,
    ChevronLeft,
    PenTool,
  } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { rpc } from "$lib/query";

  let { children } = $props();

  const homeSlug = $derived($page.params.homeSlug);
  const homeQuery = $derived(rpc.homes.getHomeBySlug(homeSlug).options());
  /**
   * Hydration gate.
   *
   * TanStack Query caches results across client-side navigations. On a
   * fresh SSR, the home query is disabled (`enabled: browser`) so
   * `homeQuery.data` is `undefined` — the server renders the skeleton.
   * But if the user was already on another page under this slug before
   * hitting reload, the queryClient's in-memory cache survives HMR and
   * supplies data on the very first client render. The resulting HTML
   * doesn't match the SSR skeleton, so Svelte fires `hydration_mismatch`.
   *
   * Gate the real data behind an `onMount`-set flag so the first client
   * render produces the same DOM as SSR, then swap to the real data
   * after hydration completes.
   */
  let hydrated = $state(false);
  onMount(() => {
    hydrated = true;
  });
  const home = $derived(hydrated ? homeQuery.data : undefined);

  const navItems = $derived(
    home
      ? [
          {
            href: `/home/${home.slug}`,
            label: "Dashboard",
            icon: LayoutDashboard,
            exact: true,
          },
          {
            href: `/home/${home.slug}/locations`,
            label: "Locations",
            icon: MapPin,
          },
          {
            href: `/home/${home.slug}/items`,
            label: "Items",
            icon: Package,
          },
          {
            href: `/home/${home.slug}/labels`,
            label: "Labels",
            icon: Tags,
          },
          {
            href: `/home/${home.slug}/floor-plan`,
            label: "Floor Plan",
            icon: PenTool,
          },
        ]
      : []
  );

  function isActive(href: string, exact: boolean = false) {
    if (exact) return $page.url.pathname === href;
    return $page.url.pathname.startsWith(href);
  }
</script>

<div class="flex min-h-screen">
  <aside class="bg-sidebar text-sidebar-foreground border-sidebar-border w-56 border-r">
    <div class="flex h-full flex-col">
      <div class="border-b p-4">
        <a href="/home" class="text-muted-foreground mb-2 flex items-center gap-1 text-xs hover:underline">
          <ChevronLeft class="h-3 w-3" />
          All Homes
        </a>
        {#if home}
          <div class="flex items-center gap-2">
            <Home class="h-5 w-5" />
            <h2 class="truncate font-semibold">{home.name}</h2>
          </div>
          {#if home.address}
            <p class="text-muted-foreground mt-1 truncate text-xs">{home.address}</p>
          {/if}
        {:else}
          <div class="bg-muted h-5 w-32 animate-pulse rounded"></div>
        {/if}
      </div>

      <nav class="flex-1 p-2">
        {#each navItems as item}
          {@const active = isActive(item.href, item.exact)}
          <a
            href={item.href}
            class="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors {active
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50'}"
          >
            <item.icon class="h-4 w-4" />
            {item.label}
          </a>
        {/each}
      </nav>
    </div>
  </aside>

  <main class="flex-1 overflow-auto">
    {@render children?.()}
  </main>
</div>
