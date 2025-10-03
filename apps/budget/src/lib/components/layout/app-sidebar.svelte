<script lang="ts">
import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import Ellipsis from '@lucide/svelte/icons/ellipsis';
import Plus from '@lucide/svelte/icons/plus';
import {goto} from '$app/navigation';
import {
  deleteAccountDialog,
  deleteAccountId,
  deleteScheduleDialog,
  deleteScheduleId,
  deleteBudgetDialog,
  deleteBudgetId,
} from '$lib/states/ui/global.svelte';
import {
  newPayeeDialog,
  managingPayeeId,
  deletePayeeDialog,
  deletePayeeId,
} from '$lib/states/ui/payees.svelte';
import {
  deleteCategoryDialog,
  deleteCategoryId,
} from '$lib/states/ui/categories.svelte';
import {AccountsState} from '$lib/states/entities/accounts.svelte';
import {SchedulesState} from '$lib/states/entities/schedules.svelte';
import {PayeesState} from '$lib/states/entities/payees.svelte';
import {CategoriesState} from '$lib/states/entities/categories.svelte';
import {listBudgets} from '$lib/query/budgets';
import AccountSortDropdown from '$lib/components/shared/account-sort-dropdown.svelte';
import {getIconByName} from '$lib/components/ui/icon-picker/icon-categories';
import {currencyFormatter} from '$lib/utils/formatters';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Receipt from '@lucide/svelte/icons/receipt';
import {Badge} from '$lib/components/ui/badge';

const accountsState = $derived(AccountsState.get());
const accounts = $derived(accountsState.sorted);
const totalBalance = $derived(accountsState.getTotalBalance());

const _deleteAccountDialog = $derived(deleteAccountDialog);
const _deleteAccountId = $derived(deleteAccountId);

const schedulesState = $derived(SchedulesState.get());
const schedules = $derived(schedulesState.schedules.values());
const _deleteScheduleDialog = $derived(deleteScheduleDialog);
const _deleteScheduleId = $derived(deleteScheduleId);

const budgetsQuery = listBudgets().options();
const budgets = $derived(budgetsQuery.data ?? []);
const _deleteBudgetDialog = $derived(deleteBudgetDialog);
const _deleteBudgetId = $derived(deleteBudgetId);

const payeesState = $derived(PayeesState.get());
const payees = $derived(payeesState.payees.values());
const _newPayeeDialog = $derived(newPayeeDialog);
const _managingPayeeId = $derived(managingPayeeId);
const _deletePayeeDialog = $derived(deletePayeeDialog);
const _deletePayeeId = $derived(deletePayeeId);

const categoriesState = $derived(CategoriesState.get());
const categories = $derived(categoriesState.categories.values());
const _deleteCategoryDialog = $derived(deleteCategoryDialog);
const _deleteCategoryId = $derived(deleteCategoryId);
</script>

<Sidebar.Root>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupLabel>
        <div class="flex items-center w-full">
          <a href="/accounts">Accounts</a>
          <div class="flex-1 flex justify-center">
            <span class="text-xs font-medium"
                  class:text-green-600={totalBalance > 0}
                  class:text-red-600={totalBalance < 0}
                  class:text-muted-foreground={totalBalance === 0}>
              {currencyFormatter.format(totalBalance)}
            </span>
          </div>
        </div>
      </Sidebar.GroupLabel>
      <AccountSortDropdown size="default" variant="outline" />
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
                  <a href="/accounts/{account.id}" {...props} class="flex items-center gap-3 min-w-0 py-2">
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
                          {#if (account as any).accountNumber}
                            <div class="text-xs text-muted-foreground font-mono">
                              ••{(account as any).accountNumber.slice(-4)}
                            </div>
                          {/if}
                        </div>
                      </div>

                      <!-- Account Details -->
                      <div class="flex items-center justify-between gap-1 mt-0.5">
                        <div class="flex items-center gap-1 text-xs text-muted-foreground truncate">
                          {#if (account as any).accountType}
                            <span class="capitalize">
                              {(account as any).accountType.replace('_', ' ')}
                            </span>
                          {/if}
                          {#if (account as any).institution}
                            <span>•</span>
                            <span class="truncate">{(account as any).institution}</span>
                          {/if}
                        </div>

                        <!-- Account Balance -->
                        <span class="text-xs font-medium text-right whitespace-nowrap"
                              class:text-green-600={account.balance && account.balance > 0}
                              class:text-red-600={account.balance && account.balance < 0}
                              class:text-muted-foreground={!account.balance || account.balance === 0}>
                          {currencyFormatter.format(account.balance || 0)}
                        </span>
                      </div>
                    </div>

                    {#if account.name === 'Test Account'}
                      <Receipt class="h-4 w-4 ml-2 flex-shrink-0" style="color: red;" />
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
                    <a href="/accounts/{account.id}/edit" class="w-full">Edit</a>
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

    <Sidebar.Group>
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
                  <a href="/budgets/{budget.id}" {...props}>
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
                    <a href="/budgets/{budget.id}/edit" class="w-full">Edit</a>
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
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each payees as payee}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                {#snippet child({props})}
                  <a href="/payees/{payee.id}" {...props}>
                    <span class="text-sm">{payee.name}</span>
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
                    <a href="/payees/{payee.id}" class="w-full">View Details</a>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item>
                    <a href="/payees/{payee.id}/edit" class="w-full">Edit</a>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item>
                    <a href="/payees/{payee.id}/analytics" class="w-full">Analytics</a>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onclick={() => {
                      _deletePayeeId.current = payee.id;
                      _deletePayeeDialog.setTrue();
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
      <Sidebar.GroupLabel><a href="/categories">Categories</a></Sidebar.GroupLabel>
      <Sidebar.GroupAction
        title="Add Category"
        onclick={() => goto('/categories/new')}>
        <Plus /> <span class="sr-only">Add Category</span>
      </Sidebar.GroupAction>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each categories as category}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                {#snippet child({props})}
                  <a href="/categories/{category.id}" {...props}>
                    <span class="text-sm">{category.name}</span>
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
                    <a href="/categories/{category.id}" class="w-full">View Details</a>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item>
                    <a href="/categories/{category.id}/edit" class="w-full">Edit</a>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item>
                    <a href="/categories/{category.id}/analytics" class="w-full">Analytics</a>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onclick={() => {
                      _deleteCategoryId.current = category.id;
                      _deleteCategoryDialog.setTrue();
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
  </Sidebar.Content>
</Sidebar.Root>
