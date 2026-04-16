<script lang="ts">
  import { page } from "$app/stores";
  import { Button } from "$ui/lib/components/ui/button";
  import {
    Home,
    MapPin,
    Package,
    Tags,
    LayoutDashboard,
    Settings,
    ChevronLeft,
  } from "@lucide/svelte";
  import type { LayoutData } from "./$types";

  let { children, data }: { children: any; data: LayoutData } = $props();

  const navItems = $derived([
    {
      href: `/${data.home.slug}`,
      label: "Dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: `/${data.home.slug}/locations`,
      label: "Locations",
      icon: MapPin,
    },
    {
      href: `/${data.home.slug}/items`,
      label: "Items",
      icon: Package,
    },
    {
      href: `/${data.home.slug}/labels`,
      label: "Labels",
      icon: Tags,
    },
  ]);

  function isActive(href: string, exact: boolean = false) {
    if (exact) return $page.url.pathname === href;
    return $page.url.pathname.startsWith(href);
  }
</script>

<div class="flex min-h-screen">
  <aside class="bg-sidebar text-sidebar-foreground border-sidebar-border w-56 border-r">
    <div class="flex h-full flex-col">
      <div class="border-b p-4">
        <a href="/" class="text-muted-foreground mb-2 flex items-center gap-1 text-xs hover:underline">
          <ChevronLeft class="h-3 w-3" />
          All Homes
        </a>
        <div class="flex items-center gap-2">
          <Home class="h-5 w-5" />
          <h2 class="truncate font-semibold">{data.home.name}</h2>
        </div>
        {#if data.home.address}
          <p class="text-muted-foreground mt-1 truncate text-xs">{data.home.address}</p>
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
