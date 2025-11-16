<script lang="ts">
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import {AccountsState} from '$lib/states/entities/accounts.svelte';
import {goto} from '$app/navigation';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Plus from '@lucide/svelte/icons/plus';
import Settings from '@lucide/svelte/icons/settings';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import {getIconByName} from '$lib/components/ui/icon-picker/icon-categories';
import {page} from '$app/stores';
import {Badge} from '$lib/components/ui/badge';
import {
  formatAccountBalance,
  getBalanceColorClass,
  calculateDebtMetrics,
} from '$lib/utils/account-display';
import {isDebtAccount} from '$lib/schema/accounts';
import {currencyFormatter} from '$lib/utils/formatters';
import {Button} from '$lib/components/ui/button';

const accountsState = $derived(AccountsState.get());
const accounts = $derived(accountsState.sorted);

// Get current account from URL - check both /accounts and /unified/accounts routes
let currentAccountSlug = $derived(
  $page.url.pathname.match(/\/(?:unified\/)?accounts\/([^\/]+)/)?.[1]
);
let currentAccount = $derived(accounts.find((a) => a.slug === currentAccountSlug));

function handleAccountSelect(accountSlug: string) {
  goto(`/unified/accounts/${accountSlug}`);
}

function handleNewAccount() {
  goto('/accounts/new');
}

function handleManageAccounts() {
  goto('/accounts');
}

function getAccountIcon(account: any) {
  if (account.accountIcon) {
    const iconData = getIconByName(account.accountIcon);
    return iconData?.icon;
  }
  return CreditCard;
}
</script>

<div class="w-full px-2 py-2">
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      {#snippet child({props})}
        <Button {...props} variant="outline" class="h-auto w-full justify-between py-2">
          <div class="flex min-w-0 flex-1 gap-3">
            {#if currentAccount}
              {@const IconComponent = getAccountIcon(currentAccount)}
              {@const formattedBalance = formatAccountBalance(currentAccount)}
              <!-- Account Icon -->
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style="background-color: {currentAccount.accountColor
                  ? `${currentAccount.accountColor}15`
                  : 'hsl(var(--muted))'}">
                <IconComponent
                  class="h-4 w-4"
                  style={currentAccount.accountColor
                    ? `color: ${currentAccount.accountColor}`
                    : 'color: hsl(var(--muted-foreground))'} />
              </div>

              <!-- Account Info -->
              <div class="min-w-0 flex-1 text-left">
                <div class="flex items-center gap-2">
                  <span class="truncate text-sm font-medium">
                    {currentAccount.name}
                  </span>
                  {#if currentAccount.closed}
                    <Badge variant="secondary" class="px-1.5 py-0 text-xs">Closed</Badge>
                  {/if}
                </div>
                <div class="mt-0.5 flex items-center gap-2">
                  {#if currentAccount.accountType}
                    <span class="text-muted-foreground text-xs capitalize">
                      {currentAccount.accountType.replace('_', ' ')}
                    </span>
                  {/if}
                  {#if currentAccount.onBudget === false}
                    <Badge
                      variant="outline"
                      class="border-muted-foreground/30 text-muted-foreground px-1.5 py-0 text-xs"
                      >Off Budget</Badge>
                  {/if}
                </div>

                <!-- Account Details -->
                <div class="text-muted-foreground flex items-center gap-1 truncate text-xs">
                  {#if currentAccount.accountNumber}
                    <span class="font-mono">
                      ••{currentAccount.accountNumber.slice(-4)}
                    </span>
                  {/if}
                  {#if currentAccount.institution}
                    {#if currentAccount.accountNumber}
                      <span>•</span>
                    {/if}
                    <span class="truncate">{currentAccount.institution}</span>
                  {/if}
                </div>

                <!-- Account Balance -->
                <div class="mt-1 text-left text-xs font-medium">
                  {#if currentAccount.accountType === 'credit_card' && currentAccount.debtLimit}
                    {@const metrics = calculateDebtMetrics(currentAccount)}
                    {#if metrics}
                      <div class="flex flex-col gap-0.5">
                        <div class={getBalanceColorClass(formattedBalance.color)}>
                          {currencyFormatter.format(metrics.availableCredit ?? 0)}
                          <span class="text-[10px] opacity-70">available</span>
                        </div>
                        <div class="text-muted-foreground text-[10px]">
                          {currencyFormatter.format(Math.abs(currentAccount.balance || 0))} / {currencyFormatter.format(
                            currentAccount.debtLimit
                          )}
                        </div>
                      </div>
                    {:else}
                      <div class={getBalanceColorClass(formattedBalance.color)}>
                        {currencyFormatter.format(formattedBalance.displayAmount)}
                        <span class="ml-1 text-[10px] opacity-70">{formattedBalance.label}</span>
                      </div>
                    {/if}
                  {:else}
                    <div class={getBalanceColorClass(formattedBalance.color)}>
                      {currencyFormatter.format(formattedBalance.displayAmount)}
                      {#if currentAccount.accountType && isDebtAccount(currentAccount.accountType)}
                        <span class="ml-1 text-[10px] opacity-70">{formattedBalance.label}</span>
                      {/if}
                    </div>
                  {/if}
                </div>
              </div>
            {:else}
              <CreditCard class="h-4 w-4 shrink-0" />
              <span class="truncate font-medium">Select Account</span>
            {/if}
          </div>
          <ChevronDown class="ml-2 h-4 w-4 shrink-0" />
        </Button>
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content class="w-[320px]">
      <DropdownMenu.Label>Accounts</DropdownMenu.Label>
      {#each accounts as account (account.id)}
        {@const IconComponent = getAccountIcon(account)}
        {@const formattedBalance = formatAccountBalance(account)}
        <DropdownMenu.Item
          class="cursor-pointer py-3"
          onclick={() => handleAccountSelect(account.slug)}>
          <div class="flex w-full min-w-0 gap-3">
            <!-- Account Icon -->
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style="background-color: {account.accountColor
                ? `${account.accountColor}15`
                : 'hsl(var(--muted))'}">
              <IconComponent
                class="h-4 w-4"
                style={account.accountColor
                  ? `color: ${account.accountColor}`
                  : 'color: hsl(var(--muted-foreground))'} />
            </div>

            <!-- Account Info -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span
                      class="truncate text-sm font-medium"
                      class:font-bold={account.id === currentAccount?.id}>
                      {account.name}
                    </span>
                    {#if account.closed}
                      <Badge variant="secondary" class="px-1.5 py-0 text-xs">Closed</Badge>
                    {/if}
                  </div>
                  <div class="mt-0.5 flex items-center gap-2">
                    {#if account.accountType}
                      <span class="text-muted-foreground text-xs capitalize">
                        {account.accountType.replace('_', ' ')}
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

              <!-- Account Details -->
              <div class="text-muted-foreground flex items-center gap-1 truncate text-xs">
                {#if account.accountNumber}
                  <span class="font-mono">
                    ••{account.accountNumber.slice(-4)}
                  </span>
                {/if}
                {#if account.institution}
                  {#if account.accountNumber}
                    <span>•</span>
                  {/if}
                  <span class="truncate">{account.institution}</span>
                {/if}
              </div>

              <!-- Account Balance -->
              <div class="mt-1 text-right text-xs font-medium">
                {#if account.accountType === 'credit_card' && account.debtLimit}
                  {@const metrics = calculateDebtMetrics(account)}
                  {#if metrics}
                    <div class="flex flex-col gap-0.5">
                      <div class={getBalanceColorClass(formattedBalance.color)}>
                        {currencyFormatter.format(metrics.availableCredit ?? 0)}
                        <span class="text-[10px] opacity-70">available</span>
                      </div>
                      <div class="text-muted-foreground text-[10px]">
                        {currencyFormatter.format(Math.abs(account.balance || 0))} / {currencyFormatter.format(
                          account.debtLimit
                        )}
                      </div>
                    </div>
                  {:else}
                    <div class={getBalanceColorClass(formattedBalance.color)}>
                      {currencyFormatter.format(formattedBalance.displayAmount)}
                      <span class="ml-1 text-[10px] opacity-70">{formattedBalance.label}</span>
                    </div>
                  {/if}
                {:else}
                  <div class={getBalanceColorClass(formattedBalance.color)}>
                    {currencyFormatter.format(formattedBalance.displayAmount)}
                    {#if account.accountType && isDebtAccount(account.accountType)}
                      <span class="ml-1 text-[10px] opacity-70">{formattedBalance.label}</span>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
          </div>
        </DropdownMenu.Item>
      {/each}
      <DropdownMenu.Separator />
      <DropdownMenu.Item onclick={handleNewAccount} class="cursor-pointer">
        <Plus class="mr-2 h-4 w-4" />
        <span>New Account</span>
      </DropdownMenu.Item>
      <DropdownMenu.Item onclick={handleManageAccounts} class="cursor-pointer">
        <Settings class="mr-2 h-4 w-4" />
        <span>Manage Accounts</span>
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>
