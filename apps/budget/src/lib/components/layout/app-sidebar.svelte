<script lang="ts">
import { goto } from '$app/navigation';
import { signOut, useSession } from '$lib/auth-client';
import * as Avatar from '$lib/components/ui/avatar/index.js';
import { Badge } from '$lib/components/ui/badge';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
import { getIconByName } from '$lib/components/ui/icon-picker/icon-categories';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import { isDebtAccount } from '$core/schema/accounts';
import * as Collapsible from '$lib/components/ui/collapsible/index.js';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { rpc } from '$lib/query';
import type { DashboardWithWidgets } from '$core/schema/dashboards';
import { demoMode } from '$lib/states/ui/demo-mode.svelte';
import { clearEncryptionCache } from '$lib/states/ui/encryption-unlock.svelte';
import { deleteAccountDialog, deleteAccountId } from '$lib/states/ui/global.svelte';
import {
  calculateDebtMetrics,
  formatAccountBalance,
  getBalanceColorClass,
} from '$lib/utils/account-display';
import { currencyFormatter } from '$lib/utils/formatters';
import Brain from '@lucide/svelte/icons/brain';
import CalendarSync from '@lucide/svelte/icons/calendar-sync';
import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Download from '@lucide/svelte/icons/download';
import Ellipsis from '@lucide/svelte/icons/ellipsis';
import FileText from '@lucide/svelte/icons/file-text';
import HandCoins from '@lucide/svelte/icons/hand-coins';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import LogOut from '@lucide/svelte/icons/log-out';
import Plus from '@lucide/svelte/icons/plus';
import Receipt from '@lucide/svelte/icons/receipt';
import Settings from '@lucide/svelte/icons/settings';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Tags from '@lucide/svelte/icons/tags';
import User from '@lucide/svelte/icons/user';
import Wallet from '@lucide/svelte/icons/wallet';
import BookOpen from '@lucide/svelte/icons/book-open';
import RefreshCw from '@lucide/svelte/icons/refresh-cw';
import Zap from '@lucide/svelte/icons/zap';
import WorkspaceSwitcher from '../../../routes/(budget)/workspaces/(components)/workspace-switcher.svelte';
import type { LayoutData } from '../../../routes/$types';

interface Props {
  user?: LayoutData['user'];
}

let { user: initialUser = null }: Props = $props();

// Session and user data (useSession returns a nanostores atom)
const sessionStore = useSession();
const session = $derived($sessionStore);
const user = $derived(session.data?.user ?? initialUser);

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return '?';
}

async function handleSignOut() {
  // Clear encryption key cache before signing out
  clearEncryptionCache();
  await signOut();
  await goto('/login');
}

const accountsState = $derived(AccountsState.get());
// Include demo account at the top when demo mode is active
const accounts = $derived.by(() => {
  const realAccounts = accountsState.sorted;
  if (demoMode.isActive && demoMode.demoAccount) {
    // Cast demo account to match account type and prepend
    return [demoMode.demoAccount as (typeof realAccounts)[0], ...realAccounts];
  }
  return realAccounts;
});
const totalBalance = $derived(accountsState.getTotalBalance());
const onBudgetBalance = $derived(accountsState.getOnBudgetBalance());

const _deleteAccountDialog = $derived(deleteAccountDialog);
const _deleteAccountId = $derived(deleteAccountId);

// Dashboard nav
const dashboardsQuery = rpc.dashboards.listDashboards().options();
const enabledDashboards = $derived((dashboardsQuery.data ?? []) as DashboardWithWidgets[]);
</script>

<Sidebar.Root data-help-id="sidebar" data-help-title="Sidebar Navigation" data-tour-id="sidebar">
  <Sidebar.Header class="border-sidebar-border h-16 border-b">
    <WorkspaceSwitcher />
  </Sidebar.Header>
  <Sidebar.Content>
    <!-- Dashboard -->
    <Sidebar.Group data-tour-id="main-navigation">
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          <Collapsible.Root open class="group/dashboards">
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                {#snippet child({ props })}
                  <a href="/" {...props} class="flex items-center gap-3">
                    <LayoutDashboard class="h-4 w-4"></LayoutDashboard>
                    <span class="font-medium">Dashboard</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
              {#if enabledDashboards.length > 1}
                <Collapsible.Trigger>
                  {#snippet child({ props })}
                    <Sidebar.MenuAction {...props} class="data-[state=open]:rotate-90">
                      <ChevronRight class="h-4 w-4" />
                      <span class="sr-only">Toggle dashboards</span>
                    </Sidebar.MenuAction>
                  {/snippet}
                </Collapsible.Trigger>
              {/if}
              {#if enabledDashboards.length > 1}
                <Collapsible.Content>
                  <Sidebar.MenuSub>
                    {#each enabledDashboards as dash (dash.id)}
                      <Sidebar.MenuSubItem>
                        <Sidebar.MenuSubButton>
                          {#snippet child({ props })}
                            <a href={dash.isDefault ? '/' : `/dashboard/${dash.slug}`} {...props}>
                              <span>{dash.name}</span>
                            </a>
                          {/snippet}
                        </Sidebar.MenuSubButton>
                      </Sidebar.MenuSubItem>
                    {/each}
                  </Sidebar.MenuSub>
                </Collapsible.Content>
              {/if}
            </Sidebar.MenuItem>
          </Collapsible.Root>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    <!-- Accounts -->
    <Sidebar.Group data-help-id="accounts-list" data-help-title="Accounts List">
      <Sidebar.GroupLabel>
        <div class="flex w-full flex-col">
          <a href="/accounts">Accounts</a>
        </div>
      </Sidebar.GroupLabel>
      <div class="flex items-center justify-between px-2 text-xs">
        <span
          class="font-medium"
          class:text-amount-positive={onBudgetBalance > 0}
          class:text-amount-negative={onBudgetBalance < 0}
          class:text-muted-foreground={onBudgetBalance === 0}
          title="On-Budget Balance">
          {currencyFormatter.format(onBudgetBalance)}
        </span>
        <span
          class="text-muted-foreground text-[10px]"
          title="Total Balance (including off-budget accounts)">
          {currencyFormatter.format(totalBalance)} total
        </span>
      </div>
      <Sidebar.GroupAction
        title="Add Account"
        onclick={() => goto('/accounts/new')}
        data-tour-id="add-account-button">
        <Plus /> <span class="sr-only">Add Account</span>
      </Sidebar.GroupAction>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each accounts as account}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                {#snippet child({ props })}
                  {@const formattedBalance = formatAccountBalance(account)}
                  <a href="/accounts/{account.slug}" {...props} class="flex min-w-0 gap-3 py-2">
                    <div
                      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style="background-color: {(account as any).accountColor
                        ? `${(account as any).accountColor}15`
                        : 'hsl(var(--muted))'}">
                      {#if (account as any).accountIcon}
                        {@const iconData = getIconByName((account as any).accountIcon)}
                        {#if iconData?.icon}
                          <iconData.icon
                            class="h-4 w-4"
                            style={(account as any).accountColor
                              ? `color: ${(account as any).accountColor}`
                              : 'color: hsl(var(--muted-foreground))'} />
                        {:else}
                          <CreditCard
                            class="h-4 w-4"
                            style={(account as any).accountColor
                              ? `color: ${(account as any).accountColor}`
                              : 'color: hsl(var(--muted-foreground))'} />
                        {/if}
                      {:else}
                        <CreditCard
                          class="h-4 w-4"
                          style={(account as any).accountColor
                            ? `color: ${(account as any).accountColor}`
                            : 'color: hsl(var(--muted-foreground))'} />
                      {/if}
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center justify-between gap-2">
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-2">
                            <span data-testid="account-name" class="truncate text-sm font-medium">
                              {account.name}
                            </span>
                            {#if account.slug === 'demo-checking'}
                              <Badge
                                variant="outline"
                                class="border-amber-500/50 bg-amber-50 px-1.5 py-0 text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                                >Demo</Badge>
                            {/if}
                            {#if account.closed}
                              <Badge variant="secondary" class="px-1.5 py-0 text-xs">Closed</Badge>
                            {/if}
                          </div>
                          <div class="mt-0.5 flex items-center gap-2">
                            {#if (account as any).accountType}
                              <span class="text-muted-foreground text-xs capitalize">
                                {(account as any).accountType.replace('_', ' ')}
                              </span>
                            {/if}
                            {#if account.onBudget === false}
                              <Badge
                                variant="outline"
                                class="border-muted-foreground/30 text-muted-foreground px-1.5 py-0 text-xs"
                                >Off Budget</Badge>
                            {/if}
                          </div>
                        </div>
                      </div>
                      <div class="text-muted-foreground flex items-center gap-1 truncate text-xs">
                        {#if (account as any).accountNumber}
                          <span class="font-mono">
                            ••{(account as any).accountNumber.slice(-4)}
                          </span>
                        {/if}
                        {#if (account as any).institution}
                          {#if (account as any).accountNumber}
                            <span>•</span>
                          {/if}
                          <span class="truncate">{(account as any).institution}</span>
                        {/if}
                      </div>
                      <div class="text-right text-xs font-medium">
                        {#if account.accountType === 'credit_card' && account.debtLimit}
                          {@const metrics = calculateDebtMetrics(account)}
                          {#if metrics}
                            <div class="flex flex-col gap-0.5">
                              <div class={getBalanceColorClass(formattedBalance.color)}>
                                {currencyFormatter.format(metrics.availableCredit ?? 0)}
                                <span class="text-[10px] opacity-70">available</span>
                              </div>
                              <div class="text-muted-foreground text-[10px]">
                                {currencyFormatter.format(
                                  account.balance && account.balance < 0
                                    ? Math.abs(account.balance)
                                    : 0
                                )} / {currencyFormatter.format(account.debtLimit)}
                              </div>
                            </div>
                          {:else}
                            <div class={getBalanceColorClass(formattedBalance.color)}>
                              {currencyFormatter.format(formattedBalance.displayAmount)}
                              <span class="ml-1 text-[10px] opacity-70"
                                >{formattedBalance.label}</span>
                            </div>
                          {/if}
                        {:else}
                          <div class={getBalanceColorClass(formattedBalance.color)}>
                            {currencyFormatter.format(formattedBalance.displayAmount)}
                            {#if account.accountType && isDebtAccount(account.accountType)}
                              <span class="ml-1 text-[10px] opacity-70"
                                >{formattedBalance.label}</span>
                            {/if}
                          </div>
                        {/if}
                      </div>
                    </div>
                    {#if account.name === 'Test Account'}
                      <Receipt class="text-destructive ml-2 h-4 w-4 shrink-0" />
                    {/if}
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
              {#if account.slug !== 'demo-checking'}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    {#snippet child({ props })}
                      <Sidebar.MenuAction {...props}>
                        <Ellipsis />
                      </Sidebar.MenuAction>
                    {/snippet}
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content side="right" align="start">
                    <DropdownMenu.Item onclick={() => goto(`/accounts/${account.slug}/edit`)}>
                      Edit
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onclick={() => {
                        _deleteAccountId.current = account.id;
                        _deleteAccountDialog.setTrue();
                      }}>
                      Delete
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              {/if}
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    <!-- Manage -->
    <Sidebar.Group>
      <Sidebar.GroupLabel>Manage</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/budgets" {...props} class="flex items-center gap-3">
                  <Wallet class="h-4 w-4"></Wallet>
                  <span class="font-medium">Budgets</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/schedules" {...props} class="flex items-center gap-3">
                  <CalendarSync class="h-4 w-4"></CalendarSync>
                  <span class="font-medium">Schedules</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/payees" {...props} class="flex items-center gap-3">
                  <HandCoins class="h-4 w-4"></HandCoins>
                  <span class="font-medium">Payees</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/categories" {...props} class="flex items-center gap-3">
                  <Tags class="h-4 w-4"></Tags>
                  <span class="font-medium">Categories</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/subscriptions" {...props} class="flex items-center gap-3">
                  <RefreshCw class="h-4 w-4"></RefreshCw>
                  <span class="font-medium">Subscriptions</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    <!-- Data -->
    <Sidebar.Group>
      <Sidebar.GroupLabel>Data</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          <Collapsible.Root class="group/import">
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                {#snippet child({ props })}
                  <a href="/import" {...props} class="flex items-center gap-3">
                    <Download class="h-4 w-4"></Download>
                    <span class="font-medium">Import</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
              <Collapsible.Trigger>
                {#snippet child({ props })}
                  <Sidebar.MenuAction {...props} class="data-[state=open]:rotate-90">
                    <ChevronRight class="h-4 w-4"></ChevronRight>
                    <span class="sr-only">Toggle import options</span>
                  </Sidebar.MenuAction>
                {/snippet}
              </Collapsible.Trigger>
              <Collapsible.Content>
                <Sidebar.MenuSub>
                  <Sidebar.MenuSubItem>
                    <Sidebar.MenuSubButton>
                      {#snippet child({ props })}
                        <a href="/import/bulk" {...props} class="flex items-center gap-2">
                          <Sparkles class="h-3.5 w-3.5"></Sparkles>
                          <span>AI Statement Import</span>
                        </a>
                      {/snippet}
                    </Sidebar.MenuSubButton>
                  </Sidebar.MenuSubItem>
                </Sidebar.MenuSub>
              </Collapsible.Content>
            </Sidebar.MenuItem>
          </Collapsible.Root>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/documents" {...props} class="flex items-center gap-3">
                  <FileText class="h-4 w-4"></FileText>
                  <span class="font-medium">Documents</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    <!-- Advanced -->
    <Sidebar.Group>
      <Sidebar.GroupLabel>Advanced</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/intelligence" {...props} class="flex items-center gap-3">
                  <Brain class="h-4 w-4"></Brain>
                  <span class="font-medium">Intelligence</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/automation" {...props} class="flex items-center gap-3">
                  <Zap class="h-4 w-4"></Zap>
                  <span class="font-medium">Automation</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/help" {...props} class="flex items-center gap-3">
                  <BookOpen class="h-4 w-4"></BookOpen>
                  <span class="font-medium">Help</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

  </Sidebar.Content>

  <Sidebar.Footer class="border-sidebar-border border-t">
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <Sidebar.MenuButton
                {...props}
                size="lg"
                class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                <Avatar.Root class="h-8 w-8 rounded-lg">
                  {#if user?.image}
                    <Avatar.Image src={user.image} alt={user.name ?? 'User'} />
                  {/if}
                  <Avatar.Fallback class="rounded-lg">
                    {getInitials(user?.name, user?.email)}
                  </Avatar.Fallback>
                </Avatar.Root>
                <div class="grid flex-1 text-left text-sm leading-tight">
                  <span class="truncate font-semibold">{user?.name ?? 'User'}</span>
                  <span class="text-muted-foreground truncate text-xs">{user?.email ?? ''}</span>
                </div>
                <ChevronsUpDown class="ml-auto size-4" />
              </Sidebar.MenuButton>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            class="w-[--bits-dropdown-menu-anchor-width] min-w-56 rounded-lg"
            side="bottom"
            align="end"
            sideOffset={4}>
            <DropdownMenu.Label class="p-0 font-normal">
              <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar.Root class="h-8 w-8 rounded-lg">
                  {#if user?.image}
                    <Avatar.Image src={user.image} alt={user.name ?? 'User'} />
                  {/if}
                  <Avatar.Fallback class="rounded-lg">
                    {getInitials(user?.name, user?.email)}
                  </Avatar.Fallback>
                </Avatar.Root>
                <div class="grid flex-1 text-left text-sm leading-tight">
                  <span class="truncate font-semibold">{user?.name ?? 'User'}</span>
                  <span class="text-muted-foreground truncate text-xs">{user?.email ?? ''}</span>
                </div>
              </div>
            </DropdownMenu.Label>
            <DropdownMenu.Separator />
            <DropdownMenu.Group>
              <DropdownMenu.Item onclick={() => goto('/settings/profile')}>
                <User class="mr-2 h-4 w-4" />
                Profile
              </DropdownMenu.Item>
              <DropdownMenu.Item onclick={() => goto('/settings')}>
                <Settings class="mr-2 h-4 w-4" />
                Settings
              </DropdownMenu.Item>
            </DropdownMenu.Group>
            <DropdownMenu.Separator />
            <DropdownMenu.Item onclick={handleSignOut}>
              <LogOut class="mr-2 h-4 w-4" />
              Log out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.Footer>
</Sidebar.Root>
