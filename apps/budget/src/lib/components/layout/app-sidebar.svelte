<script lang="ts">
import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import CalendarSync from '@lucide/svelte/icons/calendar-sync';
import Ellipsis from '@lucide/svelte/icons/ellipsis';
import HandCoins from '@lucide/svelte/icons/hand-coins';
import Plus from '@lucide/svelte/icons/plus';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import Tags from '@lucide/svelte/icons/tags';
import FolderTree from '@lucide/svelte/icons/folder-tree';
import Wallet from '@lucide/svelte/icons/wallet';
import Download from '@lucide/svelte/icons/download';
import {goto} from '$app/navigation';
import {
  deleteAccountDialog,
  deleteAccountId,
  deleteScheduleDialog,
  deleteScheduleId,
  deleteBudgetDialog,
  deleteBudgetId,
} from '$lib/states/ui/global.svelte';
import {AccountsState} from '$lib/states/entities/accounts.svelte';
import {SchedulesState} from '$lib/states/entities/schedules.svelte';
import {BudgetState} from '$lib/states/budgets.svelte';
import {rpc} from '$lib/query';
import {getIconByName} from '$lib/components/ui/icon-picker/icon-categories';
import {currencyFormatter} from '$lib/utils/formatters';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Receipt from '@lucide/svelte/icons/receipt';
import {Badge} from '$lib/components/ui/badge';
import {formatAccountBalance, getBalanceColorClass, calculateDebtMetrics} from '$lib/utils/account-display';
import {isDebtAccount} from '$lib/schema/accounts';

const accountsState = $derived(AccountsState.get());
const accounts = $derived(accountsState.sorted);
const totalBalance = $derived(accountsState.getTotalBalance());
const onBudgetBalance = $derived(accountsState.getOnBudgetBalance());

const _deleteAccountDialog = $derived(deleteAccountDialog);
const _deleteAccountId = $derived(deleteAccountId);

const schedulesState = $derived(SchedulesState.get());
const schedules = $derived(schedulesState.schedules.values());
const _deleteScheduleDialog = $derived(deleteScheduleDialog);
const _deleteScheduleId = $derived(deleteScheduleId);

const budgetState = $derived(BudgetState.get());
const budgetsQuery = $derived(rpc.budgets.listBudgets().options());
const budgets = $derived(budgetsQuery.data ?? budgetState.all);
const _deleteBudgetDialog = $derived(deleteBudgetDialog);
const _deleteBudgetId = $derived(deleteBudgetId);
</script>

<Sidebar.Root>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({props})}
                <a href="/" {...props} class="flex items-center gap-3">
                  <LayoutDashboard class="h-4 w-4"></LayoutDashboard>
                  <span class="font-medium">Dashboard</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({props})}
                <a href="/budgets" {...props} class="flex items-center gap-3">
                  <Wallet class="h-4 w-4"></Wallet>
                  <span class="font-medium">Budgets</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({props})}
                <a href="/schedules" {...props} class="flex items-center gap-3">
                  <CalendarSync class="h-4 w-4"></CalendarSync>
                  <span class="font-medium">Schedules</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({props})}
                <a href="/payees" {...props} class="flex items-center gap-3">
                  <HandCoins class="h-4 w-4"></HandCoins>
                  <span class="font-medium">Payees</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({props})}
                <a href="/categories" {...props} class="flex items-center gap-3">
                  <Tags class="h-4 w-4"></Tags>
                  <span class="font-medium">Categories</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({props})}
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

    <Sidebar.Group>
      <Sidebar.GroupLabel>
        <div class="flex flex-col w-full">
          <a href="/accounts">Accounts</a>
        </div>
      </Sidebar.GroupLabel>
      <div class="flex items-center justify-between text-xs px-2">
        <span class="font-medium"
              class:text-green-600={onBudgetBalance > 0}
              class:text-red-600={onBudgetBalance < 0}
              class:text-muted-foreground={onBudgetBalance === 0}
              title="On-Budget Balance">
          {currencyFormatter.format(onBudgetBalance)}
        </span>
        <span class="text-[10px] text-muted-foreground" title="Total Balance (including off-budget accounts)">
          {currencyFormatter.format(totalBalance)} total
        </span>
      </div>
      <!-- <div class="mt-2 px-2 w-full">
        <AccountSortDropdown variant="outline" />
      </div> -->
      <Sidebar.GroupAction
        title="Add Account"
        onclick={() => goto('/accounts/new')}>
        <Plus /> <span class="sr-only">Add Account</span>
      </Sidebar.GroupAction>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each accounts as account}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                {#snippet child({props})}
                  {@const formattedBalance = formatAccountBalance(account)}
                  <a href="/accounts/{account.slug}" {...props} class="flex gap-3 min-w-0 py-2">
                    <!-- Account Icon with colored background -->
                    <div class="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                         style="background-color: {(account as any).accountColor ? `${(account as any).accountColor}15` : 'hsl(var(--muted))'}">
                      {#if (account as any).accountIcon}
                        {@const iconData = getIconByName((account as any).accountIcon)}
                        {#if iconData?.icon}
                          <iconData.icon
                            class="h-4 w-4"
                            style={(account as any).accountColor ? `color: ${(account as any).accountColor}` : 'color: hsl(var(--muted-foreground))'}
                          />
                        {:else}
                          <CreditCard class="h-4 w-4" style={(account as any).accountColor ? `color: ${(account as any).accountColor}` : 'color: hsl(var(--muted-foreground))'} />
                        {/if}
                      {:else}
                        <CreditCard class="h-4 w-4" style={(account as any).accountColor ? `color: ${(account as any).accountColor}` : 'color: hsl(var(--muted-foreground))'} />
                      {/if}
                    </div>

                    <!-- Account Info -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between gap-2">
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-2">
                            <span data-testid="account-name" class="font-medium text-sm truncate">
                              {account.name}
                            </span>
                            {#if account.closed}
                              <Badge variant="secondary" class="text-xs px-1.5 py-0">Closed</Badge>
                            {/if}
                          </div>
                          <div class="flex items-center gap-2 mt-0.5">
                            {#if (account as any).accountType}
                              <span class="text-xs text-muted-foreground capitalize">
                                {(account as any).accountType.replace('_', ' ')}
                              </span>
                            {/if}
                            {#if account.onBudget === false}
                              <Badge variant="outline" class="text-xs px-1.5 py-0 border-muted-foreground/30 text-muted-foreground">Off Budget</Badge>
                            {/if}
                          </div>
                        </div>
                      </div>

                      <!-- Account Details -->
                      <div class="flex items-center gap-1 text-xs text-muted-foreground truncate">
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

                      <!-- Account Balance -->
                      <div class="text-xs font-medium text-right">
                        {#if account.accountType === 'credit_card' && account.debtLimit}
                          {@const metrics = calculateDebtMetrics(account)}
                          {#if metrics}
                            <div class="flex flex-col gap-0.5">
                              <div class="{getBalanceColorClass(formattedBalance.color)}">
                                {currencyFormatter.format(metrics.availableCredit ?? 0)} <span class="text-[10px] opacity-70">available</span>
                              </div>
                              <div class="text-[10px] text-muted-foreground">
                                {currencyFormatter.format(Math.abs(account.balance || 0))} / {currencyFormatter.format(account.debtLimit)}
                              </div>
                            </div>
                          {:else}
                            <div class="{getBalanceColorClass(formattedBalance.color)}">
                              {currencyFormatter.format(formattedBalance.displayAmount)}
                              <span class="text-[10px] ml-1 opacity-70">{formattedBalance.label}</span>
                            </div>
                          {/if}
                        {:else}
                          <div class="{getBalanceColorClass(formattedBalance.color)}">
                            {currencyFormatter.format(formattedBalance.displayAmount)}
                            {#if account.accountType && isDebtAccount(account.accountType)}
                              <span class="text-[10px] ml-1 opacity-70">{formattedBalance.label}</span>
                            {/if}
                          </div>
                        {/if}
                      </div>
                    </div>

                    {#if account.name === 'Test Account'}
                      <Receipt class="h-4 w-4 ml-2 flex-shrink-0 text-destructive" />
                    {/if}
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  {#snippet child({props})}
                    <Sidebar.MenuAction {...props}>
                      <Ellipsis />
                    </Sidebar.MenuAction>
                  {/snippet}
                </DropdownMenu.Trigger>
                <DropdownMenu.Content side="right" align="start">
                  <DropdownMenu.Item>
                    <a href="/accounts/{account.slug}/edit" class="w-full">Edit</a>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onclick={() => {
                      _deleteAccountId.current = account.id;
                      _deleteAccountDialog.setTrue();
                    }}>
                    <span>Delete</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    <!-- <Sidebar.Group>
      <Sidebar.GroupLabel><a href="/schedules">Schedules</a></Sidebar.GroupLabel>
      <Sidebar.GroupAction
        title="Add Schedule"
        onclick={() => goto('/schedules/new')}>
        <Plus /> <span class="sr-only">Add Schedule</span>
      </Sidebar.GroupAction>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each schedules as schedule}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                {#snippet child({props})}
                  <a href="/schedules/{schedule.slug}" {...props}>
                    <span class="text-sm">{schedule.name}</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  {#snippet child({props})}
                    <Sidebar.MenuAction {...props}>
                      <Ellipsis />
                    </Sidebar.MenuAction>
                  {/snippet}
                </DropdownMenu.Trigger>
                <DropdownMenu.Content side="right" align="start">
                  <DropdownMenu.Item>
                    <a href="/schedules/{schedule.slug}/edit" class="w-full">Edit</a>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onclick={() => {
                    _deleteScheduleId.current = schedule.id;
                    _deleteScheduleDialog.setTrue();
                  }}>
                    <span>Delete</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    <Sidebar.Group>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({props})}
                <a href="/patterns" {...props} class="flex items-center gap-3">
                  <Sparkles class="h-4 w-4"></Sparkles>
                  <span class="font-medium">Patterns</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    <Sidebar.Group>
      <Sidebar.GroupLabel><a href="/budgets">Budgets</a></Sidebar.GroupLabel>
      <Sidebar.GroupAction
        title="Add Budget"
        onclick={() => goto('/budgets/new')}>
        <Plus /> <span class="sr-only">Add Budget</span>
      </Sidebar.GroupAction>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each budgets as budget}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                {#snippet child({props})}
                  <a href="/budgets/{budget.slug}" {...props}>
                    <span class="text-sm">{budget.name}</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  {#snippet child({props})}
                    <Sidebar.MenuAction {...props}>
                      <Ellipsis />
                    </Sidebar.MenuAction>
                  {/snippet}
                </DropdownMenu.Trigger>
                <DropdownMenu.Content side="right" align="start">
                  <DropdownMenu.Item>
                    <a href="/budgets/{budget.slug}/edit" class="w-full">Edit</a>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onclick={() => {
                      _deleteBudgetId.current = budget.id;
                      _deleteBudgetDialog.setTrue();
                    }}>
                    <span>Delete</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    <Sidebar.Group>
      <Sidebar.GroupLabel><a href="/payees">Payees</a></Sidebar.GroupLabel>
      <Sidebar.GroupAction
        title="Add Payee"
        onclick={() => goto('/payees/new')}>
        <Plus /> <span class="sr-only">Add Payee</span>
      </Sidebar.GroupAction>
    </Sidebar.Group>

    <Sidebar.Group>
      <Sidebar.GroupLabel><a href="/categories">Categories</a></Sidebar.GroupLabel>
      <Sidebar.GroupAction
        title="Add Category"
        onclick={() => goto('/categories/new')}>
        <Plus /> <span class="sr-only">Add Category</span>
      </Sidebar.GroupAction>
    </Sidebar.Group> -->
  </Sidebar.Content>
</Sidebar.Root>
