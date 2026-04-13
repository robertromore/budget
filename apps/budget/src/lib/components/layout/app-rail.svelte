<script lang="ts">
import { page } from '$app/stores';
import { cn } from '$lib/utils';
import Tag from '@lucide/svelte/icons/tag';
import Wallet from '@lucide/svelte/icons/wallet';

interface AppDef {
  id: string;
  label: string;
  icon: typeof Wallet;
  href: string;
  match: (pathname: string) => boolean;
}

const apps: AppDef[] = [
  {
    id: 'budget',
    label: 'Budget',
    icon: Wallet,
    href: '/',
    match: (p) => !p.startsWith('/price-watcher'),
  },
  {
    id: 'price-watcher',
    label: 'Price Watcher',
    icon: Tag,
    href: '/price-watcher',
    match: (p) => p.startsWith('/price-watcher'),
  },
];

const activeAppId = $derived(
  apps.find((app) => app.match($page.url.pathname))?.id ?? 'budget'
);
</script>

<nav
  class="bg-sidebar border-sidebar-border fixed inset-y-0 left-0 z-20 hidden w-(--app-rail-width) flex-col items-center gap-1 border-r px-1.5 py-3 md:flex"
  aria-label="App switcher">
  {#each apps as app (app.id)}
    {@const isActive = activeAppId === app.id}
    <a
      href={app.href}
      title={app.label}
      class={cn(
        'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
      )}
      aria-current={isActive ? 'page' : undefined}
      aria-label={app.label}>
      <app.icon class="h-5 w-5" />
    </a>
  {/each}
</nav>
