<script lang="ts">
import { cn } from '$lib/utils';

interface AppDef {
  id: string;
  label: string;
  letter: string;
  href: string;
  match: (pathname: string) => boolean;
  activeClass: string;
  inactiveClass: string;
}

const apps: AppDef[] = [
  {
    id: 'budget',
    label: 'Finances',
    letter: 'F',
    href: '/',
    match: (p) => !p.startsWith('/price-watcher') && !p.startsWith('/home'),
    activeClass: 'bg-emerald-600 text-white dark:bg-emerald-500',
    inactiveClass: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  },
  {
    id: 'price-watcher',
    label: 'Price Watcher',
    letter: 'P',
    href: '/price-watcher',
    match: (p) => p.startsWith('/price-watcher'),
    activeClass: 'bg-violet-600 text-white dark:bg-violet-500',
    inactiveClass: 'bg-violet-500/10 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  },
  {
    id: 'home',
    label: 'Home Manager',
    letter: 'H',
    href: '/home',
    match: (p) => p.startsWith('/home'),
    activeClass: 'bg-sky-600 text-white dark:bg-sky-500',
    inactiveClass: 'bg-sky-500/10 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
  },
];

let { activeAppId = "budget" }: { activeAppId?: string } = $props();
</script>

<nav
  class="bg-sidebar border-sidebar-border fixed inset-y-0 left-0 z-20 hidden w-(--app-rail-width) flex-col items-center gap-3 border-r px-1.5 py-3 md:flex"
  aria-label="App switcher">
  {#each apps as app (app.id)}
    {@const isActive = activeAppId === app.id}
    <a
      href={app.href}
      title={app.label}
      class={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition-all',
        isActive ? app.activeClass : app.inactiveClass
      )}
      aria-current={isActive ? 'page' : undefined}
      aria-label={app.label}>
      {app.letter}
    </a>
  {/each}
</nav>
