<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { Badge } from '$lib/components/ui/badge';
import { getIconByName } from '$lib/components/ui/icon-picker/icon-categories';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import { getAccountNature } from '$core/schema/accounts';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { demoMode } from '$lib/states/ui/demo-mode.svelte';
import { formatAccountBalance, getBalanceColorClass } from '$lib/utils/account-display';
import { currencyFormatter } from '$lib/utils/formatters';
import { isRouteActive } from '$lib/utils/route-match';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Download from '@lucide/svelte/icons/download';
import HandCoins from '@lucide/svelte/icons/hand-coins';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
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

const accountsState = $derived(AccountsState.get());

const accounts = $derived.by(() => {
  const realAccounts = accountsState.sorted;
  if (demoMode.isActive && demoMode.demoAccount) {
    return [demoMode.demoAccount as (typeof realAccounts)[0], ...realAccounts];
  }
  return realAccounts;
});

const assetAccounts = $derived(
  accounts.filter((a) => (a.accountType ? getAccountNature(a.accountType) === 'asset' : true))
);
const liabilityAccounts = $derived(
  accounts.filter((a) => (a.accountType ? getAccountNature(a.accountType) === 'liability' : false))
);

const assetTotal = $derived(assetAccounts.reduce((sum, a) => sum + (a.balance ?? 0), 0));
const liabilityTotal = $derived(liabilityAccounts.reduce((sum, a) => sum + (a.balance ?? 0), 0));

const pathname = $derived(page.url.pathname);
</script>

{#snippet accountRow(account: (typeof accounts)[number])}
  {@const formattedBalance = formatAccountBalance(account)}
  {@const accountColor = (account as { accountColor?: string }).accountColor}
  {@const accountIcon = (account as { accountIcon?: string }).accountIcon}
  {@const iconData = accountIcon ? getIconByName(accountIcon) : null}
  <Sidebar.MenuItem>
    <Sidebar.MenuButton
      class="h-auto! py-1.5"
      isActive={isRouteActive(pathname, `/accounts/${account.slug}`)}>
      {#snippet child({ props })}
        <a href="/accounts/{account.slug}" {...props} class="flex flex-col gap-0.5">
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
          </div>
          <span class={`pl-9 text-right text-xs font-medium ${getBalanceColorClass(formattedBalance.color)}`}>
            {currencyFormatter.format(formattedBalance.displayAmount)}
          </span>
        </a>
      {/snippet}
    </Sidebar.MenuButton>
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
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={isRouteActive(pathname, '/')}>
              {#snippet child({ props })}
                <a href="/" {...props} class="flex items-center gap-3">
                  <LayoutDashboard class="h-4 w-4"></LayoutDashboard>
                  <span class="font-medium">Dashboard</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={isRouteActive(pathname, '/transactions', 'prefix')}>
              {#snippet child({ props })}
                <a href="/transactions" {...props} class="flex items-center gap-3">
                  <Receipt class="h-4 w-4"></Receipt>
                  <span class="font-medium">Transactions</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={isRouteActive(pathname, '/categories', 'prefix')}>
              {#snippet child({ props })}
                <a href="/categories" {...props} class="flex items-center gap-3">
                  <Tags class="h-4 w-4"></Tags>
                  <span class="font-medium">Categories</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={isRouteActive(pathname, '/payees', 'prefix')}>
              {#snippet child({ props })}
                <a href="/payees" {...props} class="flex items-center gap-3">
                  <HandCoins class="h-4 w-4"></HandCoins>
                  <span class="font-medium">Payees</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={isRouteActive(pathname, '/import', 'prefix')}>
              {#snippet child({ props })}
                <a href="/import" {...props} class="flex items-center gap-3">
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
            {#each assetAccounts as account (account.id)}
              {@render accountRow(account)}
            {/each}
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
            {#each liabilityAccounts as account (account.id)}
              {@render accountRow(account)}
            {/each}
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    {/if}

    <Sidebar.Group>
      <Sidebar.GroupContent>
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
