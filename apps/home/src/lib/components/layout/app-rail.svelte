<script lang="ts">
import { page } from '$app/stores';
import { cn } from '$lib/utils';

interface AppDef {
  id: string;
  label: string;
  letter: string;
  href: string;
  external?: boolean;
  match: (pathname: string) => boolean;
  activeClass: string;
  inactiveClass: string;
}

const apps: AppDef[] = [
  {
    id: 'budget',
    label: 'Finances',
    letter: 'F',
    href: 'http://localhost:5173',
    external: true,
    match: () => false,
    activeClass: 'bg-emerald-600 text-white dark:bg-emerald-500',
    inactiveClass: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  },
  {
    id: 'home',
    label: 'Home Manager',
    letter: 'H',
    href: '/',
    match: () => true,
    activeClass: 'bg-sky-600 text-white dark:bg-sky-500',
    inactiveClass: 'bg-sky-500/10 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
  },
];

const activeAppId = $derived(
  apps.find((app) => app.match($page.url.pathname))?.id ?? 'home'
);
</script>

<nav
  class="bg-sidebar border-sidebar-border fixed inset-y-0 left-0 z-20 hidden w-12 flex-col items-center gap-3 border-r px-1.5 py-3 md:flex"
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
