<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { Badge } from '$lib/components/ui/badge';
import { getIconByName } from '$lib/components/ui/icon-picker/icon-categories';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import * as Popover from '$lib/components/ui/popover/index.js';
import * as Command from '$lib/components/ui/command/index.js';
import { rpc } from '$lib/query';
import { getAccountNature } from '$core/schema/accounts';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { demoMode } from '$lib/states/ui/demo-mode.svelte';
import { formatAccountBalance, getBalanceColorClass } from '$lib/utils/account-display';
import { currencyFormatter } from '$lib/utils/formatters';
import { ACTIVE_NAV, BASE_NAV, isRouteActive } from '$lib/utils/route-match';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Download from '@lucide/svelte/icons/download';
import EyeOff from '@lucide/svelte/icons/eye-off';
import HandCoins from '@lucide/svelte/icons/hand-coins';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import Pin from '@lucide/svelte/icons/pin';
import PinOff from '@lucide/svelte/icons/pin-off';
import Plus from '@lucide/svelte/icons/plus';
import Receipt from '@lucide/svelte/icons/receipt';
import Tags from '@lucide/svelte/icons/tags';
import SidebarUserFooter from './sidebar-user-footer.svelte';
import WorkspaceSwitcher from '../../../routes/(budget)/workspaces/(components)/workspace-switcher.svelte';
import type { LayoutData } from '../../../routes/$types';

interface Props {
  user?: LayoutData['user'];
}

let { user = null }: Props = $props();

const UNPINNED_DROPDOWN_THRESHOLD = 6;
const INACTIVE_DAYS = 90;

const accountsState = $derived(AccountsState.get());

const accounts = $derived.by(() => {
  const realAccounts = accountsState.sorted;
  if (demoMode.isActive && demoMode.demoAccount) {
    return [demoMode.demoAccount as (typeof realAccounts)[0], ...realAccounts];
  }
  return realAccounts;
});

// User preferences (pins + inactive toggle)
const preferencesQuery = rpc.auth.getPreferences().options();
const updatePreferencesMutation = rpc.auth.updatePreferences.options();

const pinnedIds = $derived<number[]>(preferencesQuery.data?.accountPins ?? []);
const hideInactive = $derived<boolean>(preferencesQuery.data?.hideInactiveAccounts ?? false);

// "Inactive" = zero balance AND no transactions in the last 90 days.
// Most-recent transaction is at index 0 because the route orders desc.
const inactiveCutoffIso = $derived(
  new Date(Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
);
function isInactive(account: (typeof accounts)[number]): boolean {
  if ((account.balance ?? 0) !== 0) return false;
  const tx = (account as { transactions?: Array<{ date: string }> }).transactions;
  const latest = tx && tx.length > 0 ? tx[0]?.date : null;
  if (!latest) return true;
  return latest < inactiveCutoffIso;
}

function splitSection(input: (typeof accounts)[number][]) {
  const pinned: typeof input = [];
  const unpinned: typeof input = [];
  const inactiveHidden: typeof input = [];
  for (const a of input) {
    if (pinnedIds.includes(a.id)) {
      pinned.push(a);
      continue;
    }
    if (hideInactive && isInactive(a)) {
      inactiveHidden.push(a);
      continue;
    }
    unpinned.push(a);
  }
  // Honor preference order for pinned accounts.
  pinned.sort((a, b) => pinnedIds.indexOf(a.id) - pinnedIds.indexOf(b.id));
  return { pinned, unpinned, inactiveHidden };
}

const assetAccounts = $derived(
  accounts.filter((a) => (a.accountType ? getAccountNature(a.accountType) === 'asset' : true))
);
const liabilityAccounts = $derived(
  accounts.filter((a) => (a.accountType ? getAccountNature(a.accountType) === 'liability' : false))
);

const assetSplit = $derived(splitSection(assetAccounts));
const liabilitySplit = $derived(splitSection(liabilityAccounts));

const assetTotal = $derived(assetAccounts.reduce((sum, a) => sum + (a.balance ?? 0), 0));
const liabilityTotal = $derived(liabilityAccounts.reduce((sum, a) => sum + (a.balance ?? 0), 0));

// Show the toggle only when there's actually something to hide.
const hasAnyInactive = $derived(
  accounts.some((a) => !pinnedIds.includes(a.id) && isInactive(a))
);

const pathname = $derived(page.url.pathname);

// Per-section dropdown open state
let assetDropdownOpen = $state(false);
let liabilityDropdownOpen = $state(false);

function togglePin(accountId: number) {
  const next = pinnedIds.includes(accountId)
    ? pinnedIds.filter((id) => id !== accountId)
    : [...pinnedIds, accountId];
  updatePreferencesMutation.mutate({ accountPins: next });
}

function toggleHideInactive() {
  updatePreferencesMutation.mutate({ hideInactiveAccounts: !hideInactive });
}
</script>

{#snippet accountRow(account: (typeof accounts)[number], options?: { showPin?: boolean })}
  {@const formattedBalance = formatAccountBalance(account)}
  {@const accountColor = (account as { accountColor?: string }).accountColor}
  {@const accountIcon = (account as { accountIcon?: string }).accountIcon}
  {@const iconData = accountIcon ? getIconByName(accountIcon) : null}
  {@const acctActive = isRouteActive(pathname, `/accounts/${account.slug}`)}
  {@const isPinned = pinnedIds.includes(account.id)}
  {@const showPinControl = options?.showPin !== false}
  <Sidebar.MenuItem>
    <div class="group/account relative">
      <Sidebar.MenuButton class="h-auto! py-1.5" isActive={acctActive}>
        {#snippet child({ props })}
          <a
            href="/accounts/{account.slug}"
            {...props}
            class={['flex flex-col gap-0.5', BASE_NAV, acctActive && ACTIVE_NAV.budget]}>
            <div class="flex items-center gap-2">
              <div
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                style="background-color: {accountColor
                  ? `${accountColor}15`
                  : 'hsl(var(--muted))'}">
                {#if iconData?.icon}
                  <iconData.icon
                    class="h-3.5 w-3.5"
                    style={accountColor
                      ? `color: ${accountColor}`
                      : 'color: hsl(var(--muted-foreground))'} />
                {:else}
                  <CreditCard
                    class="h-3.5 w-3.5"
                    style={accountColor
                      ? `color: ${accountColor}`
                      : 'color: hsl(var(--muted-foreground))'} />
                {/if}
              </div>
              <span class="min-w-0 flex-1 truncate text-sm font-medium" data-testid="account-name">
                {account.name}
              </span>
              {#if account.slug === 'demo-checking'}
                <Badge
                  variant="outline"
                  class="border-amber-500/50 bg-amber-50 px-1 py-0 text-[10px] text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                  >Demo</Badge>
              {:else if account.onBudget === false}
                <Badge
                  variant="outline"
                  class="border-muted-foreground/30 text-muted-foreground px-1 py-0 text-[10px]"
                  >Off</Badge>
              {/if}
              {#if showPinControl}
                <!--
                  Pin sits as an inline flex sibling so the truncated name
                  naturally shrinks to make room — no absolute positioning,
                  no overlap with the badge.

                  It's a <span role="button"> (not a <button>) because nesting
                  interactive content inside an <a> isn't valid HTML. The
                  click handler calls preventDefault/stopPropagation so the
                  anchor's navigation doesn't fire when toggling the pin.

                  Default state: 0×0 with no margin so it doesn't shift the
                  layout. When hovering the row OR when pinned, it expands to
                  a full button cell.
                -->
                <span
                  role="button"
                  tabindex="-1"
                  aria-label={isPinned ? 'Unpin account' : 'Pin account'}
                  title={isPinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
                  onclick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    togglePin(account.id);
                  }}
                  onkeydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      togglePin(account.id);
                    }
                  }}
                  class={[
                    'hover:bg-sidebar-accent flex items-center justify-center overflow-hidden rounded',
                    isPinned
                      ? 'h-6 w-6'
                      : 'h-6 w-0 group-hover/account:w-6',
                  ]}>
                  {#if isPinned}
                    <Pin class="text-foreground h-3 w-3 fill-current" />
                  {:else}
                    <Pin class="text-muted-foreground h-3 w-3" />
                  {/if}
                </span>
              {/if}
            </div>
            <span class={`pl-9 text-right text-xs font-medium ${getBalanceColorClass(formattedBalance.color)}`}>
              {currencyFormatter.format(formattedBalance.displayAmount)}
            </span>
          </a>
        {/snippet}
      </Sidebar.MenuButton>
    </div>
  </Sidebar.MenuItem>
{/snippet}

{#snippet overflowDropdown(
  unpinned: (typeof accounts)[number][],
  open: boolean,
  setOpen: (v: boolean) => void,
  label: string
)}
  {@const activeAccount = unpinned.find((a) => isRouteActive(pathname, `/accounts/${a.slug}`))}
  {@const activeColor = activeAccount
    ? (activeAccount as { accountColor?: string }).accountColor
    : undefined}
  {@const activeIconName = activeAccount
    ? (activeAccount as { accountIcon?: string }).accountIcon
    : undefined}
  {@const activeIconData = activeIconName ? getIconByName(activeIconName) : null}
  {@const activeFormatted = activeAccount ? formatAccountBalance(activeAccount) : null}
  <Sidebar.MenuItem>
    <Popover.Root bind:open={() => open, setOpen}>
      <Popover.Trigger>
        {#snippet child({ props })}
          {#if activeAccount}
            <button
              {...props}
              class={[
                'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm',
                BASE_NAV,
                ACTIVE_NAV.budget,
              ]}>
              <div class="flex min-w-0 items-center gap-2">
                <div
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                  style="background-color: {activeColor
                    ? `${activeColor}15`
                    : 'hsl(var(--muted))'}">
                  {#if activeIconData?.icon}
                    <activeIconData.icon
                      class="h-3.5 w-3.5"
                      style={activeColor
                        ? `color: ${activeColor}`
                        : 'color: hsl(var(--muted-foreground))'} />
                  {:else}
                    <CreditCard
                      class="h-3.5 w-3.5"
                      style={activeColor
                        ? `color: ${activeColor}`
                        : 'color: hsl(var(--muted-foreground))'} />
                  {/if}
                </div>
                <span class="min-w-0 flex-1 truncate font-medium">{activeAccount.name}</span>
              </div>
              <div class="flex shrink-0 items-center gap-1.5">
                {#if activeFormatted}
                  <span class={`tabular-nums text-xs ${getBalanceColorClass(activeFormatted.color)}`}>
                    {currencyFormatter.format(activeFormatted.displayAmount)}
                  </span>
                {/if}
                <ChevronDown class="text-muted-foreground h-3.5 w-3.5" />
              </div>
            </button>
          {:else}
            <button
              {...props}
              class={[
                'hover:bg-sidebar-accent flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm',
              ]}>
              <span class="text-muted-foreground">{unpinned.length} more {label}</span>
              <ChevronDown class="text-muted-foreground h-3.5 w-3.5" />
            </button>
          {/if}
        {/snippet}
      </Popover.Trigger>
      <Popover.Content side="right" align="start" class="w-72 p-0">
        <Command.Root>
          <Command.Input placeholder="Search accounts…" />
          <Command.List>
            <Command.Empty>No accounts found.</Command.Empty>
            <Command.Group>
              {#each unpinned as account (account.id)}
                {@const formatted = formatAccountBalance(account)}
                <Command.Item
                  value={account.name}
                  onSelect={() => {
                    setOpen(false);
                    goto(`/accounts/${account.slug}`);
                  }}>
                  <div class="flex w-full items-center justify-between gap-2">
                    <span class="truncate">{account.name}</span>
                    <div class="flex items-center gap-1">
                      <span class={`tabular-nums text-xs ${getBalanceColorClass(formatted.color)}`}>
                        {currencyFormatter.format(formatted.displayAmount)}
                      </span>
                      <button
                        type="button"
                        aria-label="Pin account"
                        onclick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          togglePin(account.id);
                        }}
                        class="hover:bg-accent flex h-5 w-5 items-center justify-center rounded">
                        <Pin class="text-muted-foreground h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </Command.Item>
              {/each}
            </Command.Group>
          </Command.List>
        </Command.Root>
      </Popover.Content>
    </Popover.Root>
  </Sidebar.MenuItem>
{/snippet}

<Sidebar.Root data-help-id="sidebar" data-help-title="Sidebar Navigation" data-tour-id="sidebar">
  <Sidebar.Header class="border-sidebar-border h-16 border-b">
    <WorkspaceSwitcher />
  </Sidebar.Header>
  <Sidebar.Content>
    <Sidebar.Group data-tour-id="main-navigation">
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {@const dashActive = isRouteActive(pathname, '/')}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={dashActive}>
              {#snippet child({ props })}
                <a
                  href="/"
                  {...props}
                  class={['flex items-center gap-3', BASE_NAV, dashActive && ACTIVE_NAV.budget]}>
                  <LayoutDashboard class="h-4 w-4"></LayoutDashboard>
                  <span class="font-medium">Dashboard</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          {@const txActive = isRouteActive(pathname, '/transactions', 'prefix')}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={txActive}>
              {#snippet child({ props })}
                <a
                  href="/transactions"
                  {...props}
                  class={['flex items-center gap-3', BASE_NAV, txActive && ACTIVE_NAV.budget]}>
                  <Receipt class="h-4 w-4"></Receipt>
                  <span class="font-medium">Transactions</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          {@const catActive = isRouteActive(pathname, '/categories', 'prefix')}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={catActive}>
              {#snippet child({ props })}
                <a
                  href="/categories"
                  {...props}
                  class={['flex items-center gap-3', BASE_NAV, catActive && ACTIVE_NAV.budget]}>
                  <Tags class="h-4 w-4"></Tags>
                  <span class="font-medium">Categories</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          {@const payeesActive = isRouteActive(pathname, '/payees', 'prefix')}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={payeesActive}>
              {#snippet child({ props })}
                <a
                  href="/payees"
                  {...props}
                  class={['flex items-center gap-3', BASE_NAV, payeesActive && ACTIVE_NAV.budget]}>
                  <HandCoins class="h-4 w-4"></HandCoins>
                  <span class="font-medium">Payees</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          {@const importActive = isRouteActive(pathname, '/import', 'prefix')}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={importActive}>
              {#snippet child({ props })}
                <a
                  href="/import"
                  {...props}
                  class={['flex items-center gap-3', BASE_NAV, importActive && ACTIVE_NAV.budget]}>
                  <Download class="h-4 w-4"></Download>
                  <span class="font-medium">Import</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    {#if assetAccounts.length > 0}
      <Sidebar.Group data-help-id="accounts-list" data-help-title="Accounts List">
        <Sidebar.GroupLabel class="flex items-center justify-between">
          <a href="/accounts" class="font-medium">Assets</a>
          <span
            class="text-xs"
            class:text-amount-positive={assetTotal > 0}
            class:text-muted-foreground={assetTotal <= 0}>
            {currencyFormatter.format(assetTotal)}
          </span>
        </Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            {#each assetSplit.pinned as account (account.id)}
              {@render accountRow(account)}
            {/each}
            {#if assetSplit.unpinned.length > UNPINNED_DROPDOWN_THRESHOLD}
              {@render overflowDropdown(
                assetSplit.unpinned,
                assetDropdownOpen,
                (v) => (assetDropdownOpen = v),
                'assets'
              )}
            {:else}
              {#each assetSplit.unpinned as account (account.id)}
                {@render accountRow(account)}
              {/each}
            {/if}
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    {/if}

    {#if liabilityAccounts.length > 0}
      <Sidebar.Group>
        <Sidebar.GroupLabel class="flex items-center justify-between">
          <a href="/accounts" class="font-medium">Liabilities</a>
          <span
            class="text-xs"
            class:text-amount-negative={liabilityTotal < 0}
            class:text-muted-foreground={liabilityTotal >= 0}>
            {currencyFormatter.format(liabilityTotal)}
          </span>
        </Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            {#each liabilitySplit.pinned as account (account.id)}
              {@render accountRow(account)}
            {/each}
            {#if liabilitySplit.unpinned.length > UNPINNED_DROPDOWN_THRESHOLD}
              {@render overflowDropdown(
                liabilitySplit.unpinned,
                liabilityDropdownOpen,
                (v) => (liabilityDropdownOpen = v),
                'liabilities'
              )}
            {:else}
              {#each liabilitySplit.unpinned as account (account.id)}
                {@render accountRow(account)}
              {/each}
            {/if}
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    {/if}

    <Sidebar.Group>
      <Sidebar.GroupContent>
        {#if hasAnyInactive || hideInactive}
          <button
            type="button"
            onclick={toggleHideInactive}
            class="text-muted-foreground hover:text-foreground mb-2 flex w-full items-center gap-2 px-2 py-1 text-xs">
            {#if hideInactive}
              <PinOff class="h-3 w-3" />
              <span>Show inactive accounts</span>
            {:else}
              <EyeOff class="h-3 w-3" />
              <span>Hide inactive accounts</span>
            {/if}
          </button>
        {/if}
        <button
          onclick={() => goto('/accounts/new')}
          data-tour-id="add-account-button"
          class="border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-2 text-sm font-medium transition-colors">
          <Plus class="h-4 w-4" />
          Add account
        </button>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>

  <SidebarUserFooter {user} />
</Sidebar.Root>
