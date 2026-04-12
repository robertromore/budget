<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import * as Popover from '$lib/components/ui/popover/index.js';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { PayeesState } from '$lib/states/entities/payees.svelte';
import { CategoriesState } from '$lib/states/entities/categories.svelte';
import { SchedulesState } from '$lib/states/entities/schedules.svelte';
import { BudgetState } from '$lib/states/budgets.svelte';
import { cn } from '$lib/utils';
import Fuse from 'fuse.js';
import CalendarSync from '@lucide/svelte/icons/calendar-sync';
import HandCoins from '@lucide/svelte/icons/hand-coins';
import Search from '@lucide/svelte/icons/search';
import Tags from '@lucide/svelte/icons/tags';
import Wallet from '@lucide/svelte/icons/wallet';
import { onMount } from 'svelte';
import { browser } from '$app/environment';

interface SearchItem {
  type: 'account' | 'payee' | 'category' | 'schedule' | 'budget';
  name: string;
  slug: string;
  subtitle?: string;
}

let query = $state('');
let open = $state(false);
let inputRef = $state<HTMLInputElement | null>(null);
let selectedIndex = $state(-1);

const accountsState = AccountsState.get();
const payeesState = PayeesState.get();
const categoriesState = CategoriesState.get();
const schedulesState = SchedulesState.get();
const budgetState = BudgetState.safeGet();

const searchItems = $derived.by(() => {
  const items: SearchItem[] = [];

  for (const account of accountsState.accounts.values()) {
    if (account.closed) continue;
    items.push({
      type: 'account',
      name: account.name,
      slug: account.slug,
      subtitle: account.institution ?? undefined,
    });
  }

  for (const payee of payeesState.payees.values()) {
    items.push({
      type: 'payee',
      name: payee.name ?? '',
      slug: payee.slug ?? '',
    });
  }

  for (const category of categoriesState.categories.values()) {
    items.push({
      type: 'category',
      name: category.name ?? '',
      slug: category.slug ?? '',
      subtitle: category.categoryType ?? undefined,
    });
  }

  for (const schedule of schedulesState.schedules.values()) {
    items.push({
      type: 'schedule',
      name: schedule.name ?? '',
      slug: schedule.slug ?? '',
    });
  }

  if (budgetState) {
    for (const budget of budgetState.budgets.values()) {
      items.push({
        type: 'budget',
        name: budget.name,
        slug: budget.slug,
        subtitle: budget.type ?? undefined,
      });
    }
  }

  return items;
});

const fuse = $derived(
  new Fuse(searchItems, {
    keys: ['name', 'subtitle'],
    threshold: 0.4,
    minMatchCharLength: 2,
    includeScore: true,
  })
);

const results = $derived.by(() => {
  if (!query || query.length < 2) return [];
  return fuse.search(query, { limit: 15 });
});

const groupedResults = $derived.by(() => {
  const groups: Record<string, typeof results> = {};
  for (const result of results) {
    const type = result.item.type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(result);
  }
  return groups;
});

const flatResults = $derived(results.map((r) => r.item));
const hasResults = $derived(results.length > 0);
const showDropdown = $derived(open && query.length >= 2);

function getHref(item: SearchItem): string {
  switch (item.type) {
    case 'account':
      return `/accounts/${item.slug}`;
    case 'payee':
      return `/payees/${item.slug}`;
    case 'category':
      return `/categories/${item.slug}`;
    case 'schedule':
      return `/schedules/${item.slug}`;
    case 'budget':
      return `/budgets/${item.slug}`;
  }
}

function getIcon(type: SearchItem['type']) {
  switch (type) {
    case 'account':
      return Wallet;
    case 'payee':
      return HandCoins;
    case 'category':
      return Tags;
    case 'schedule':
      return CalendarSync;
    case 'budget':
      return Wallet;
  }
}

function getLabel(type: SearchItem['type']): string {
  switch (type) {
    case 'account':
      return 'Accounts';
    case 'payee':
      return 'Payees';
    case 'category':
      return 'Categories';
    case 'schedule':
      return 'Schedules';
    case 'budget':
      return 'Budgets';
  }
}

function navigate(item: SearchItem) {
  query = '';
  open = false;
  selectedIndex = -1;
  goto(getHref(item));
}

function handleKeydown(e: KeyboardEvent) {
  if (!showDropdown) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex = Math.min(selectedIndex + 1, flatResults.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex = Math.max(selectedIndex - 1, -1);
  } else if (e.key === 'Enter' && selectedIndex >= 0 && flatResults[selectedIndex]) {
    e.preventDefault();
    navigate(flatResults[selectedIndex]);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    query = '';
    open = false;
    inputRef?.blur();
  }
}

// Reset selection when results change
$effect(() => {
  results;
  selectedIndex = -1;
});

// Close dropdown on route change
$effect(() => {
  $page.url.pathname;
  query = '';
  open = false;
});

// Global Cmd+K shortcut
onMount(() => {
  if (!browser) return;

  function handleGlobalKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      inputRef?.focus();
      open = true;
    }
  }

  window.addEventListener('keydown', handleGlobalKeydown);
  return () => window.removeEventListener('keydown', handleGlobalKeydown);
});

const isMac = $derived(browser ? navigator.platform?.includes('Mac') : true);
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <div
        {...props}
        class="relative w-full"
        role="combobox"
        aria-expanded={showDropdown}
        aria-haspopup="listbox">
        <Search
          class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <input
          bind:this={inputRef}
          bind:value={query}
          onfocus={() => (open = true)}
          onkeydown={handleKeydown}
          type="text"
          placeholder="Search..."
          aria-label="Global search"
          class={cn(
            'bg-muted/50 border-input placeholder:text-muted-foreground h-9 w-full rounded-md border py-2 pr-16 pl-9 text-sm outline-none transition-colors',
            'focus:bg-background focus:ring-ring/20 focus:ring-2'
          )} />
        <kbd
          class="text-muted-foreground/70 pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
          {isMac ? '⌘' : 'Ctrl'}K
        </kbd>
      </div>
    {/snippet}
  </Popover.Trigger>
  {#if showDropdown}
    <Popover.Content
      class="max-h-80 w-[var(--bits-popover-anchor-width)] overflow-y-auto p-0"
      sideOffset={4}
      align="start"
      onOpenAutoFocus={(e) => e.preventDefault()}>
      {#if hasResults}
        <div class="py-1" role="listbox">
          {#each Object.entries(groupedResults) as [type, items]}
            <div class="px-2 pt-2 pb-1">
              <span class="text-muted-foreground text-xs font-medium">{getLabel(type as SearchItem['type'])}</span>
            </div>
            {#each items as result}
              {@const item = result.item}
              {@const globalIndex = flatResults.indexOf(item)}
              {@const Icon = getIcon(item.type)}
              <a
                href={getHref(item)}
                onclick={(e) => {
                  e.preventDefault();
                  navigate(item);
                }}
                role="option"
                aria-selected={globalIndex === selectedIndex}
                class={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                  globalIndex === selectedIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                )}>
                <Icon class="text-muted-foreground h-4 w-4 shrink-0"></Icon>
                <div class="min-w-0 flex-1">
                  <div class="truncate font-medium">{item.name}</div>
                  {#if item.subtitle}
                    <div class="text-muted-foreground truncate text-xs">{item.subtitle}</div>
                  {/if}
                </div>
                <span class="text-muted-foreground/60 shrink-0 text-xs capitalize">{item.type}</span>
              </a>
            {/each}
          {/each}
        </div>
      {:else}
        <div class="text-muted-foreground px-4 py-6 text-center text-sm">
          No results for "{query}"
        </div>
      {/if}
    </Popover.Content>
  {/if}
</Popover.Root>
