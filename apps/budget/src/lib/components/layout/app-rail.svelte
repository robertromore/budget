<script lang="ts">
import HelpButton from '$lib/components/help/help-button.svelte';
import { useSidebar } from '$lib/components/ui/sidebar/context.svelte';
import * as Tooltip from '$lib/components/ui/tooltip';
import { cn } from '$lib/utils';
import { onMount } from 'svelte';

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
    match: (p) =>
      !p.startsWith('/price-watcher') &&
      !p.startsWith('/home') &&
      !p.startsWith('/budgets') &&
      !p.startsWith('/goals') &&
      !p.startsWith('/schedules') &&
      !p.startsWith('/subscriptions') &&
      !p.startsWith('/documents') &&
      !p.startsWith('/intelligence') &&
      !p.startsWith('/patterns') &&
      !p.startsWith('/automation'),
    activeClass: 'bg-emerald-600 text-white dark:bg-emerald-500',
    inactiveClass: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  },
  {
    id: 'budgets',
    label: 'Budgets',
    letter: 'B',
    href: '/budgets',
    match: (p) => p.startsWith('/budgets'),
    activeClass: 'bg-amber-600 text-white dark:bg-amber-500',
    inactiveClass: 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  },
  {
    id: 'planning',
    label: 'Planning',
    letter: 'Pl',
    href: '/goals',
    match: (p) => p.startsWith('/goals') || p.startsWith('/schedules'),
    activeClass: 'bg-rose-600 text-white dark:bg-rose-500',
    inactiveClass: 'bg-rose-500/10 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    letter: 'Su',
    href: '/subscriptions',
    match: (p) => p.startsWith('/subscriptions'),
    activeClass: 'bg-fuchsia-600 text-white dark:bg-fuchsia-500',
    inactiveClass: 'bg-fuchsia-500/10 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400',
  },
  {
    id: 'documents',
    label: 'Documents',
    letter: 'D',
    href: '/documents',
    match: (p) => p.startsWith('/documents'),
    activeClass: 'bg-teal-600 text-white dark:bg-teal-500',
    inactiveClass: 'bg-teal-500/10 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400',
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    letter: 'I',
    href: '/intelligence',
    match: (p) => p.startsWith('/intelligence') || p.startsWith('/patterns'),
    activeClass: 'bg-indigo-600 text-white dark:bg-indigo-500',
    inactiveClass: 'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400',
  },
  {
    id: 'automation',
    label: 'Automation',
    letter: 'Au',
    href: '/automation',
    match: (p) => p.startsWith('/automation'),
    activeClass: 'bg-orange-600 text-white dark:bg-orange-500',
    inactiveClass: 'bg-orange-500/10 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
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

const budgetApps = apps.filter(
  (a) => a.id !== 'price-watcher' && a.id !== 'home'
);
const externalApps = apps.filter((a) => a.id === 'price-watcher' || a.id === 'home');

const sidebar = useSidebar();
const visible = $derived(sidebar.open);

let mounted = $state(false);
onMount(() => {
  mounted = true;
});
</script>

<nav
  class={cn(
    'bg-sidebar border-sidebar-border fixed inset-y-0 left-0 z-20 hidden w-(--app-rail-width) flex-col items-center gap-2 border-r px-1.5 py-3 transition-transform duration-200 ease-linear md:flex',
    visible ? 'translate-x-0' : '-translate-x-full'
  )}
  aria-label="App switcher">
  {#snippet chipAnchor(app: AppDef, props: Record<string, unknown> = {})}
    {@const isActive = activeAppId === app.id}
    <a
      href={app.href}
      {...props}
      class={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-all',
        isActive ? app.activeClass : app.inactiveClass
      )}
      aria-current={isActive ? 'page' : undefined}
      aria-label={app.label}>
      {app.letter}
    </a>
  {/snippet}

  {#snippet appLink(app: AppDef)}
    {#if mounted}
      <Tooltip.Root>
        <Tooltip.Trigger>
          {#snippet child({ props })}
            {@render chipAnchor(app, props)}
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content side="right" sideOffset={8}>{app.label}</Tooltip.Content>
      </Tooltip.Root>
    {:else}
      {@render chipAnchor(app, { title: app.label })}
    {/if}
  {/snippet}

  {#each budgetApps as app (app.id)}
    {@render appLink(app)}
  {/each}

  <div class="border-sidebar-border my-1 w-6 border-t" aria-hidden="true"></div>

  {#each externalApps as app (app.id)}
    {@render appLink(app)}
  {/each}

  <div class="flex-1"></div>

  {#if mounted}
    <HelpButton />
  {:else}
    <div class="h-8 w-8" aria-hidden="true"></div>
  {/if}
</nav>
